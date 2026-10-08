// Minimal local stand-in for Supabase (PostgREST + GoTrue subset) on top of real Postgres.
// Scope: exactly the API surface the Syllabdosth site uses. Test use only.
const http = require('http');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = +process.env.PORT || 54321;
const SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
const AUTOCONFIRM = process.env.AUTOCONFIRM === '1';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/sd_e2e' });
const mailbox = []; // captured emails / SMS (like Supabase's Inbucket)

/* ------------------------------ JWT ------------------------------ */
const b64u = (b) => Buffer.from(b).toString('base64url');
function sign(claims) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify(claims));
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
}
function verify(tok) {
  if (!tok) return null;
  const [h, p, s] = tok.split('.');
  if (!s) return null;
  const exp = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
  if (exp.length !== s.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(s))) return null;
  const c = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (c.exp && c.exp < Date.now() / 1000) return null;
  return c;
}
const ANON_KEY = sign({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 });
const SERVICE_KEY = sign({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 });

/* ------------------------------ helpers ------------------------------ */
function send(res, status, body, headers = {}) {
  const h = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers };
  res.writeHead(status, h);
  res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString();
  return s ? JSON.parse(s) : {};
}
const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { status: 400 });
  return `"${s}"`;
};
function claimsFrom(req) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return verify(bearer) || verify(req.headers.apikey);
}

/* ------------------------------ PostgREST ------------------------------ */
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' };
function parseFilter(col, expr, params) {
  const neg = expr.startsWith('not.');
  if (neg) expr = expr.slice(4);
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot);
  let val = expr.slice(dot + 1);
  let sql;
  if (op === 'cs') { // array contains
    params.push(val.replace(/^\{|\}$/g, '').split(',').filter(Boolean).map((v) => v.replace(/^"|"$/g, '')));
    const sql = `${ident(col)} @> $${params.length}::text[]`;
    return neg ? `not (${sql})` : sql;
  }
  if (op === 'in') {
    const items = val.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
    params.push(items);
    sql = `${ident(col)} = any($${params.length})`;
  } else if (op === 'is') {
    sql = `${ident(col)} is ${{ null: 'null', true: 'true', false: 'false' }[val] ?? 'null'}`;
  } else if (OPS[op]) {
    if (op === 'like' || op === 'ilike') val = val.replace(/\*/g, '%');
    params.push(val);
    sql = `${ident(col)} ${OPS[op]} $${params.length}`;
  } else throw Object.assign(new Error(`unsupported operator ${op}`), { status: 400 });
  return neg ? `not (${sql})` : sql;
}
function splitTop(s) { // split on commas not inside parentheses
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function buildWhere(q, params) {
  const conds = [];
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    if (k === 'or') {
      const parts = splitTop(v.replace(/^\(|\)$/g, '')).map((p) => {
        const [col, ...rest] = p.split('.');
        return parseFilter(col, rest.join('.'), params);
      });
      conds.push(`(${parts.join(' or ')})`);
    } else conds.push(parseFilter(k, v, params));
  }
  return conds.length ? ` where ${conds.join(' and ')}` : '';
}
function selectList(sel) {
  if (!sel || sel === '*') return '*';
  return sel.split(',').map((c) => ident(c.trim())).join(', ');
}
function orderBy(o) {
  if (!o) return '';
  return ' order by ' + o.split(',').map((p) => {
    const [c, dir, nulls] = p.split('.');
    return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : ''}`;
  }).join(', ');
}
function pgError(e) {
  const status = e.status || (e.code === '42501' ? 403 : e.code === '23505' ? 409 : e.code?.startsWith('23') ? 400 : e.code === '42P01' ? 404 : 400);
  return [status, { code: e.code || 'PGRST000', message: e.message, details: e.detail || null, hint: e.hint || null }];
}

async function asRole(claims, fn) {
  const role = ['anon', 'authenticated', 'service_role'].includes(claims?.role) ? claims.role : 'anon';
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims || { role: 'anon' })]);
    const r = await fn(client);
    await client.query('commit');
    return r;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally { client.release(); }
}

async function rest(req, res, url) {
  const claims = claimsFrom(req);
  if (!claims) return send(res, 401, { code: 'PGRST301', message: 'JWT invalid' });
  const table = ident(url.pathname.split('/')[3]);
  const q = [...url.searchParams.entries()];
  const sp = url.searchParams;
  const prefer = req.headers.prefer || '';
  const wantObject = (req.headers.accept || '').includes('vnd.pgrst.object');
  const returnRep = /return=representation/.test(prefer);
  const wantCount = /count=exact/.test(prefer);
  const params = [];
  let sql;
  const method = req.method;

  if (method === 'GET' || method === 'HEAD') {
    const where = buildWhere(q, params);
    sql = `select ${selectList(sp.get('select'))} from public.${table}${where}${orderBy(sp.get('order'))}`;
    if (sp.get('limit')) sql += ` limit ${parseInt(sp.get('limit'))}`;
    if (sp.get('offset')) sql += ` offset ${parseInt(sp.get('offset'))}`;
    const countSql = wantCount ? `select count(*)::int as n from public.${table}${where}` : null;
    const [rows, total] = await asRole(claims, async (c) => [
      (await c.query(sql, params)).rows,
      countSql ? (await c.query(countSql, params)).rows[0].n : null,
    ]);
    return finish(res, 200, rows, wantObject, method === 'HEAD', total);
  }

  const body = method === 'DELETE' ? null : await readBody(req);
  currentJson = await jsonColumns(table);
  const ret = returnRep ? ` returning ${selectList(sp.get('select'))}` : '';
  if (method === 'POST') {
    const rowsIn = Array.isArray(body) ? body : [body];
    const cols = [...new Set(rowsIn.flatMap(Object.keys))];
    const values = rowsIn.map((r) => '(' + cols.map((c) => { if (r[c] === undefined) return 'default'; params.push(toPg(r[c], c)); return `$${params.length}`; }).join(', ') + ')');
    sql = `insert into public.${table} (${cols.map(ident).join(', ')}) values ${values.join(', ')}`;
    if (/resolution=merge-duplicates/.test(prefer)) {
      const target = (sp.get('on_conflict') || 'id').split(',').map(ident).join(', ');
      const upd = cols.filter((c) => !(sp.get('on_conflict') || 'id').split(',').includes(c));
      sql += ` on conflict (${target}) do ${upd.length ? 'update set ' + upd.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(', ') : 'nothing'}`;
    } else if (/resolution=ignore-duplicates/.test(prefer)) sql += ' on conflict do nothing';
    sql += ret;
    const rows = await asRole(claims, async (c) => (await c.query(sql, params)).rows);
    return finish(res, 201, returnRep ? rows : undefined, wantObject && returnRep);
  }
  if (method === 'PATCH') {
    const cols = Object.keys(body);
    const set = cols.map((c) => { params.push(toPg(body[c], c)); return `${ident(c)} = $${params.length}`; }).join(', ');
    sql = `update public.${table} set ${set}${buildWhere(q, params)}${ret}`;
    const rows = await asRole(claims, async (c) => (await c.query(sql, params)).rows);
    return finish(res, returnRep ? 200 : 204, returnRep ? rows : undefined, wantObject && returnRep);
  }
  if (method === 'DELETE') {
    sql = `delete from public.${table}${buildWhere(q, params)}${ret}`;
    const rows = await asRole(claims, async (c) => (await c.query(sql, params)).rows);
    return finish(res, returnRep ? 200 : 204, returnRep ? rows : undefined, wantObject && returnRep);
  }
  send(res, 405, { message: 'method not allowed' });
}
// Like PostgREST: json/jsonb columns get JSON text; everything else (incl. text[] arrays) is passed as-is.
const jsonCols = new Map();
async function jsonColumns(table) {
  const t = table.replace(/"/g, '');
  if (!jsonCols.has(t)) {
    const r = await pool.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 and data_type in ('json','jsonb')`, [t]);
    jsonCols.set(t, new Set(r.rows.map((x) => x.column_name)));
  }
  return jsonCols.get(t);
}
let currentJson = new Set();
const toPg = (v, col) => (v !== null && typeof v === 'object' && (!Array.isArray(v) || currentJson.has(col)) ? JSON.stringify(v) : v);
function finish(res, status, rows, wantObject, head = false, total = null) {
  const headers = {};
  if (rows && total !== null) headers['Content-Range'] = `${rows.length ? `0-${rows.length - 1}` : '*'}/${total}`;
  else if (total !== null) headers['Content-Range'] = `*/${total}`;
  if (wantObject) {
    if (!rows || rows.length !== 1) return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows ? rows.length : 0} rows`, hint: null });
    return send(res, status, head ? undefined : rows[0], headers);
  }
  send(res, status, head || rows === undefined ? undefined : rows, headers);
}

/* ------------------------------ GoTrue ------------------------------ */
async function db(sql, params) { return (await pool.query(sql, params)).rows; }
function userJson(u) {
  return {
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: u.phone || '',
    email_confirmed_at: u.email_confirmed_at, phone_confirmed_at: u.phone_confirmed_at,
    confirmed_at: u.email_confirmed_at || u.phone_confirmed_at, last_sign_in_at: u.last_sign_in_at,
    app_metadata: u.raw_app_meta_data || { provider: 'email', providers: ['email'] },
    user_metadata: u.raw_user_meta_data || {}, identities: [], created_at: u.created_at, updated_at: u.created_at,
  };
}
async function session(u) {
  await db('update auth.users set last_sign_in_at = now() where id = $1', [u.id]);
  const now = Math.floor(Date.now() / 1000);
  const refresh = crypto.randomBytes(24).toString('hex');
  await db('insert into auth.emu_refresh_tokens (token, user_id) values ($1, $2)', [refresh, u.id]);
  const access = sign({ aud: 'authenticated', exp: now + 3600, iat: now, sub: u.id, email: u.email, phone: u.phone || '', role: 'authenticated', aal: 'aal1', session_id: crypto.randomUUID(), app_metadata: u.raw_app_meta_data || {}, user_metadata: u.raw_user_meta_data || {} });
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: userJson(u) };
}
const authErr = (res, status, code, msg) => send(res, status, { code: status, error_code: code, msg });
async function userById(id) { return (await db('select * from auth.users where id = $1', [id]))[0]; }
async function issueFlow(user, type, body) {
  // Returns a one-time token; PKCE if a code_challenge was supplied.
  const token = crypto.randomBytes(20).toString('hex');
  await db('insert into auth.emu_tokens (token, user_id, type, code_challenge) values ($1,$2,$3,$4)', [token, user.id, type, body.code_challenge || null]);
  return token;
}
function mail(to, subject, link) { mailbox.push({ to, subject, link, at: new Date().toISOString() }); }

async function auth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '');
  const m = req.method;
  const origin = `http://${req.headers.host}`;

  if (path === '/settings' && m === 'GET') return send(res, 200, { external: { email: true, phone: true, google: true }, mailer_autoconfirm: AUTOCONFIRM });
  if (path === '/health') return send(res, 200, { name: 'emu-gotrue' });

  if (path === '/signup' && m === 'POST') {
    const b = await readBody(req);
    if (!b.email || !b.password) return authErr(res, 400, 'validation_failed', 'Signup requires a valid password');
    if (b.password.length < 6) return authErr(res, 422, 'weak_password', 'Password should be at least 6 characters.');
    const existing = (await db('select * from auth.users where lower(email) = lower($1)', [b.email]))[0];
    if (existing) {
      if (existing.email_confirmed_at) return authErr(res, 422, 'user_already_exists', 'User already registered');
      return send(res, 200, userJson(existing)); // GoTrue re-sends confirmation silently
    }
    const u = (await db(`insert into auth.users (email, raw_user_meta_data, encrypted_password, email_confirmed_at, raw_app_meta_data)
      values (lower($1), $2, crypt($3, gen_salt('bf')), ${AUTOCONFIRM ? 'now()' : 'null'}, '{"provider":"email","providers":["email"]}') returning *`,
      [b.email, b.data || {}, b.password]))[0];
    if (AUTOCONFIRM) return send(res, 200, await session(u));
    const tok = await issueFlow(u, 'signup', b);
    const redirect = url.searchParams.get('redirect_to') || '';
    mail(u.email, 'Confirm your signup', `${origin}/auth/v1/verify?token=${tok}&type=signup&redirect_to=${encodeURIComponent(redirect)}`);
    return send(res, 200, userJson(u));
  }

  if (path === '/token' && m === 'POST') {
    const grant = url.searchParams.get('grant_type');
    const b = await readBody(req);
    if (grant === 'password') {
      const u = (await db(`select * from auth.users where lower(email) = lower($1) and encrypted_password = crypt($2, encrypted_password)`, [b.email || '', b.password || '']))[0];
      if (!u) return authErr(res, 400, 'invalid_credentials', 'Invalid login credentials');
      if (!u.email_confirmed_at) return authErr(res, 400, 'email_not_confirmed', 'Email not confirmed');
      return send(res, 200, await session(u));
    }
    if (grant === 'refresh_token') {
      const r = (await db('delete from auth.emu_refresh_tokens where token = $1 returning user_id', [b.refresh_token]))[0];
      if (!r) return authErr(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
      return send(res, 200, await session(await userById(r.user_id)));
    }
    if (grant === 'pkce') {
      const t = (await db(`delete from auth.emu_tokens where token = $1 and kind = 'code' returning *`, [b.auth_code]))[0];
      if (!t) return authErr(res, 404, 'flow_state_not_found', 'invalid flow state, no valid flow state found');
      const challenge = crypto.createHash('sha256').update(b.code_verifier || '').digest('base64url');
      if (t.code_challenge && t.code_challenge !== challenge) return authErr(res, 400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
      return send(res, 200, await session(await userById(t.user_id)));
    }
    return authErr(res, 400, 'unsupported_grant_type', 'unsupported grant type');
  }

  if (path === '/user') {
    const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!c || c.role !== 'authenticated') return authErr(res, 403, 'bad_jwt', 'invalid JWT');
    let u = await userById(c.sub);
    if (!u) return authErr(res, 403, 'user_not_found', 'User from sub claim in JWT does not exist');
    if (m === 'PUT') {
      const b = await readBody(req);
      if (b.password) {
        if (b.password.length < 6) return authErr(res, 422, 'weak_password', 'Password should be at least 6 characters.');
        const same = (await db('select 1 from auth.users where id = $1 and encrypted_password = crypt($2, encrypted_password)', [u.id, b.password]))[0];
        if (same) return authErr(res, 422, 'same_password', 'New password should be different from the old password.');
        await db(`update auth.users set encrypted_password = crypt($2, gen_salt('bf')) where id = $1`, [u.id, b.password]);
      }
      if (b.data) await db('update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, $2::jsonb) || $2::jsonb where id = $1', [u.id, b.data]);
      u = await userById(u.id);
    }
    return send(res, 200, userJson(u));
  }

  if (path === '/logout' && m === 'POST') {
    const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (c?.sub) await db('delete from auth.emu_refresh_tokens where user_id = $1', [c.sub]);
    return send(res, 204);
  }

  if (path === '/recover' && m === 'POST') {
    const b = await readBody(req);
    const u = (await db('select * from auth.users where lower(email) = lower($1)', [b.email || '']))[0];
    if (u) {
      const tok = await issueFlow(u, 'recovery', b);
      mail(u.email, 'Reset your password', `${origin}/auth/v1/verify?token=${tok}&type=recovery&redirect_to=${encodeURIComponent(url.searchParams.get('redirect_to') || '')}`);
    }
    return send(res, 200, {});
  }

  if (path === '/otp' && m === 'POST') {
    const b = await readBody(req);
    if (!b.phone) return authErr(res, 400, 'validation_failed', 'Only phone OTP is emulated');
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    await db('insert into auth.emu_sms (phone, code) values ($1, $2)', [b.phone.replace(/^\+/, ''), code]);
    mail(b.phone, 'SMS', `Your Syllabdosth code is ${code}`);
    return send(res, 200, {});
  }

  if (path === '/verify' && m === 'POST') {
    const b = await readBody(req);
    if (b.type === 'sms') {
      const phone = (b.phone || '').replace(/^\+/, '');
      const ok = (await db(`delete from auth.emu_sms where phone = $1 and code = $2 and created_at > now() - interval '10 minutes' returning *`, [phone, b.token]))[0];
      if (!ok) return authErr(res, 403, 'otp_expired', 'Token has expired or is invalid');
      let u = (await db('select * from auth.users where phone = $1', [phone]))[0];
      if (!u) u = (await db(`insert into auth.users (phone, phone_confirmed_at, raw_app_meta_data) values ($1, now(), '{"provider":"phone","providers":["phone"]}') returning *`, [phone]))[0];
      return send(res, 200, await session(u));
    }
    if (b.token_hash) {
      const t = (await db(`delete from auth.emu_tokens where token = $1 and kind = 'link' returning *`, [b.token_hash]))[0];
      if (!t) return authErr(res, 403, 'otp_expired', 'Email link is invalid or has expired');
      await db('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1', [t.user_id]);
      return send(res, 200, await session(await userById(t.user_id)));
    }
    return authErr(res, 400, 'validation_failed', 'unsupported verify');
  }

  if (path === '/verify' && m === 'GET') {
    // Link from the email: confirm, then hand the browser a PKCE auth code for the site's /auth/callback.
    const t = (await db(`delete from auth.emu_tokens where token = $1 and kind = 'link' returning *`, [url.searchParams.get('token')]))[0];
    const redirect = url.searchParams.get('redirect_to') || 'http://localhost:3000';
    if (!t) return send(res, 303, undefined, { Location: `${redirect}#error=access_denied&error_code=otp_expired` });
    await db('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1', [t.user_id]);
    const code = crypto.randomUUID();
    await db(`insert into auth.emu_tokens (token, user_id, type, code_challenge, kind) values ($1,$2,$3,$4,'code')`, [code, t.user_id, t.type, t.code_challenge]);
    return send(res, 303, undefined, { Location: `${redirect}${redirect.includes('?') ? '&' : '?'}code=${code}` });
  }

  if (path === '/authorize' && m === 'GET') {
    // Simulated Google: signs in a fixed test Google account and redirects back with a PKCE code.
    const email = 'google.tester@gmail.com';
    let u = (await db('select * from auth.users where email = $1', [email]))[0];
    if (!u) u = (await db(`insert into auth.users (email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values ($1, now(), '{"full_name":"Google Tester","name":"Google Tester"}', '{"provider":"google","providers":["google"]}') returning *`, [email]))[0];
    const code = crypto.randomUUID();
    await db(`insert into auth.emu_tokens (token, user_id, type, code_challenge, kind) values ($1,$2,'oauth',$3,'code')`, [code, u.id, url.searchParams.get('code_challenge')]);
    const redirect = url.searchParams.get('redirect_to');
    return send(res, 302, undefined, { Location: `${redirect}${redirect.includes('?') ? '&' : '?'}code=${code}` });
  }
  authErr(res, 404, 'not_found', `emulator: ${m} ${path} not implemented`);
}

/* ------------------------------ Storage (public buckets, in memory) ------------------------------ */
const buckets = new Set();
const objects = new Map(); // "bucket/path" -> { type, data }
async function rawBody(req) { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c); }
function fileFromMultipart(buf, ctype) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/.exec(ctype || '');
  if (!m) return { type: ctype, data: buf };
  const b = Buffer.from(`--${m[1] || m[2]}`);
  let i = buf.indexOf(b);
  while (i !== -1) {
    const next = buf.indexOf(b, i + b.length);
    if (next === -1) break;
    const part = buf.subarray(i + b.length + 2, next - 2);
    const sep = part.indexOf('\r\n\r\n');
    const head = part.subarray(0, sep).toString();
    if (/filename=|content-type:\s*(image|application\/pdf)/i.test(head)) {
      const t = /content-type:\s*([^\r\n]+)/i.exec(head);
      return { type: t ? t[1].trim() : 'application/octet-stream', data: part.subarray(sep + 4) };
    }
    i = next;
  }
  return { type: 'application/octet-stream', data: buf };
}
async function storage(req, res, url) {
  const path = url.pathname.replace('/storage/v1', '');
  const claims = claimsFrom(req);
  const isService = claims?.role === 'service_role';
  const pub = /^\/object\/public\/([^/]+)\/(.+)$/.exec(path);
  if (req.method === 'GET' && pub) {
    const o = objects.get(`${pub[1]}/${decodeURIComponent(pub[2])}`);
    if (!o) return send(res, 404, { message: 'Object not found' });
    res.writeHead(200, { 'Content-Type': o.type, 'Cache-Control': 'public, max-age=60' });
    return res.end(o.data);
  }
  if (!isService) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
  if (req.method === 'POST' && path === '/bucket') {
    const b = JSON.parse((await rawBody(req)).toString() || '{}');
    buckets.add(b.id || b.name);
    return send(res, 200, { name: b.id || b.name });
  }
  const obj = /^\/object\/([^/]+)\/(.+)$/.exec(path);
  if ((req.method === 'POST' || req.method === 'PUT') && obj) {
    if (!buckets.has(obj[1])) return send(res, 404, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
    const key = `${obj[1]}/${decodeURIComponent(obj[2])}`;
    if (req.method === 'POST' && objects.has(key) && req.headers['x-upsert'] !== 'true') return send(res, 409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
    objects.set(key, fileFromMultipart(await rawBody(req), req.headers['content-type']));
    return send(res, 200, { Key: key, Id: crypto.randomUUID() });
  }
  const del = /^\/object\/([^/]+)$/.exec(path);
  if (req.method === 'DELETE' && del) {
    const { prefixes = [] } = JSON.parse((await rawBody(req)).toString() || '{}');
    for (const p of prefixes) objects.delete(`${del[1]}/${p}`);
    return send(res, 200, prefixes.map((name) => ({ name })));
  }
  send(res, 404, { message: `emulator: storage ${req.method} ${path} not implemented` });
}

/* ------------------------------ server ------------------------------ */
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return send(res, 204, undefined, { 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
  try {
    if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url);
    if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url);
    if (url.pathname.startsWith('/storage/v1/')) return await storage(req, res, url);
    if (url.pathname === '/emu/mail') return send(res, 200, mailbox);
    if (url.pathname === '/emu/keys') return send(res, 200, { anon: ANON_KEY, service: SERVICE_KEY });
    send(res, 404, { message: 'not found' });
  } catch (e) {
    if (process.env.DEBUG) console.error(req.method, req.url, e.message);
    const [s, b] = pgError(e);
    send(res, s, b);
  }
}).listen(PORT, () => console.log(`emu supabase on :${PORT}\nANON=${ANON_KEY}\nSERVICE=${SERVICE_KEY}`));
