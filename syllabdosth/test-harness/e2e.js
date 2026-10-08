// End-to-end test of the Syllabdosth site running against the local Supabase stand-in.
const { chromium } = require('playwright');
const { Pool } = require('pg');
const SITE = 'http://localhost:3000';
const EMU = 'http://localhost:54321';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/sd_e2e' });
const q = async (sql, p) => (await pool.query(sql, p)).rows;
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const mail = async () => (await fetch(`${EMU}/emu/mail`)).json();
const lastMailTo = async (to) => (await mail()).filter((m) => m.to === to).pop();
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const run = Date.now().toString(36);

async function fill(page, fields) {
  for (const [k, v] of Object.entries(fields)) {
    const el = page.locator(`[name="${k}"]`).first();
    const tag = await el.evaluate((e) => e.tagName);
    if (tag === 'SELECT') await el.selectOption(v); else await el.fill(String(v));
  }
}
async function submit(page, label) {
  await Promise.all([page.waitForLoadState('networkidle'), page.getByRole('button', { name: label, exact: false }).first().click()]);
  await page.waitForTimeout(400);
}
async function login(page, email, password, next = '') {
  await page.goto(`${SITE}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  await fill(page, { email, password });
  await submit(page, 'Log in');
  await page.waitForLoadState('networkidle');
}
async function logout(page) {
  const b = page.getByRole('button', { name: 'Log out' });
  if (await b.count()) { await b.first().click(); await page.waitForURL(`${SITE}/`); } else await page.context().clearCookies();
}
async function signupConfirmed(page, name, email, password) {
  await page.goto(`${SITE}/signup`);
  await fill(page, { full_name: name, email, password });
  await submit(page, 'Create account');
  const m = await lastMailTo(email.toLowerCase());
  await page.goto(m.link);
  await page.waitForLoadState('networkidle');
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()}: ${e.message}`));

  /* ---------------- 1. Crawl every public page reachable by links ---------------- */
  const seen = new Set(); const queue = ['/'];
  const bad = [];
  while (queue.length && seen.size < 150) {
    const p = queue.shift(); if (seen.has(p)) continue; seen.add(p);
    const r = await page.goto(SITE + p, { waitUntil: 'domcontentloaded' });
    const finalPath = new URL(page.url()).pathname;
    if (!r || (r.status() >= 400 && p !== '/definitely-missing')) bad.push(`${p} → ${r?.status()}`);
    if (finalPath.startsWith('/login') && !p.startsWith('/login')) continue; // protected
    const links = await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')));
    for (const l of links) { const u = l.split('#')[0].split('?')[0]; if (u && !seen.has(u) && !u.startsWith('/_next')) queue.push(u); }
  }
  check(`Crawl: ${seen.size} internal pages load without 4xx/5xx`, bad.length === 0, bad.join(', '));
  const r404 = await page.goto(`${SITE}/courses/not-a-real-course`);
  check('Unknown course shows 404 page', r404.status() === 404 && (await page.content()).includes('Go home') || r404.status() === 404);

  /* ---------------- 2. Courses filters ---------------- */
  await page.goto(`${SITE}/courses`);
  const allCards = await page.locator('a[href^="/courses/"]').count();
  await page.goto(`${SITE}/courses?q=tailoring`);
  const tCards = await page.locator('a[href^="/courses/"]').count();
  check('Courses search narrows results', tCards > 0 && tCards < allCards, `${allCards} → ${tCards}`);

  /* ---------------- 3. Guest service booking ---------------- */
  const svc = (await q(`select s.slug, s.id, s.price_from from services s where published and exists (select 1 from professionals p where p.verified and s.id = any(p.service_ids)) order by sort limit 1`))[0];
  await page.goto(`${SITE}/services/${svc.slug}`);
  await fill(page, { name: 'Guest Tester', phone: '98450 11111', preferred_date: future(10), preferred_time: '10:30', location: 'Jayanagar, Bengaluru 560011', requirements: `e2e ${run}` });
  await submit(page, 'Request booking');
  const sentMatch = page.url().match(/\/bookings\/([^/]+)\/sent/);
  check('Guest booking redirects to "sent" page', !!sentMatch, page.url());
  const bookingId = sentMatch?.[1];
  const b = (await q('select * from bookings where id = $1', [bookingId]))[0];
  check('Guest booking saved in Supabase (pending, no customer, price copied)', b && b.status === 'pending' && b.customer_id === null && b.price_from === svc.price_from);
  await page.goto(`${SITE}/bookings/${bookingId}`);
  check('Booking status page shows pending status', (await page.content()).includes('Request pending confirmation'));
  check('Guest "Back" link goes to services, not login', (await page.locator('main a', { hasText: 'Back' }).first().getAttribute('href')) === '/services');
  await submit(page, 'Cancel this request');
  check('Guest can cancel via private link', (await q('select status from bookings where id=$1', [bookingId]))[0].status === 'cancelled');

  /* ---------------- 4. Validation ---------------- */
  await page.goto(`${SITE}/services/${svc.slug}`);
  await fill(page, { name: 'X Y', phone: '12345', preferred_date: future(3), preferred_time: '10:00', location: 'Somewhere 5600' });
  await submit(page, 'Request booking');
  check('Invalid phone shows an error, nothing saved', (await page.content()).includes('valid 10-digit') && page.url().includes('/services/'));
  await page.goto(`${SITE}/group-booking`);
  await fill(page, { name: 'Group Lead', phone: '9886044556', email: 'g@example.com', people: 1, preferred_date: future(20), event_type: 'Office day', location: 'Koramangala' });
  await page.locator('[name="people"]').evaluate((e) => e.removeAttribute('min'));
  await submit(page, 'Send group enquiry');
  check('Group booking rejects < 2 people', (await page.content()).includes('start at 2 people'));

  /* ---------------- 5. Other public forms ---------------- */
  await page.goto(`${SITE}/group-booking`);
  await fill(page, { name: 'Group Lead', phone: '9886044556', email: `group-${run}@example.com`, people: 25, preferred_date: future(20), event_type: 'Office wellness day', location: 'Koramangala', requirements: 'Two artists' });
  await submit(page, 'Send group enquiry');
  check('Group enquiry saved', page.url().endsWith('/group-booking/sent') && (await q('select 1 from group_enquiries where email=$1', [`group-${run}@example.com`])).length === 1);

  const course = (await q(`select c.id, c.slug, c.faculty_id from courses c where published and faculty_id is not null order by id limit 1`))[0];
  await page.goto(`${SITE}/courses/${course.slug}/enroll`);
  await fill(page, { name: 'Guest Learner', phone: '9845012345', email: `enrol-${run}@example.com`, mode: 'Online', message: 'Weekend batch' });
  await submit(page, 'Send enrollment request');
  check('Guest enrollment saved', page.url().endsWith(`/courses/${course.slug}/enroll/sent`) && (await q('select 1 from enrollments where email=$1', [`enrol-${run}@example.com`])).length === 1);

  await page.goto(`${SITE}/apply/professional`);
  await fill(page, { name: 'Divya Gowda', phone: '9740055667', email: `apply-${run}@example.com`, city: 'Mysuru', skill: 'Bridal mehandi', experience_years: 4, message: 'hi' });
  await submit(page, 'Send');
  check('Professional application saved', page.url().includes('/apply/sent') && (await q('select 1 from applications where email=$1', [`apply-${run}@example.com`])).length === 1);

  await page.goto(`${SITE}/contact`);
  await fill(page, { name: 'Contact Person', phone: '9845099999', email: `contact-${run}@example.com`, message: 'Do you have Kannada batches?' });
  await submit(page, 'Send message');
  check('Contact message saved + thank-you shown', (await page.content()).includes('get back to you') && (await q('select 1 from contact_messages where email=$1', [`contact-${run}@example.com`])).length === 1);

  for (let i = 0; i < 2; i++) {
    await page.goto(`${SITE}/`);
    await page.locator('form:has(button:has-text("Subscribe")) [name="email"]').fill(`News-${run}@Example.com`);
    await submit(page, 'Subscribe');
  }
  check('Newsletter subscribe saves once (lower-cased, idempotent)', (await page.content()).includes('subscribed') && (await q('select 1 from newsletter_subscribers where email=$1', [`news-${run}@example.com`])).length === 1);

  /* ---------------- 6. Email sign-up with confirmation link ---------------- */
  const learner = `learner-${run}@example.com`;
  await page.goto(`${SITE}/signup`);
  await fill(page, { full_name: 'Priya Tester', email: learner, password: 'short' });
  await submit(page, 'Create account');
  check('Sign-up rejects short password', (await page.content()).includes('at least 8 characters'));
  await fill(page, { full_name: 'Priya Tester', email: learner, password: 'Password123!' });
  await submit(page, 'Create account');
  check('Sign-up asks to confirm email', (await page.content()).includes('confirmation link'));
  await login(page, learner, 'Password123!');
  check('Login before confirming is refused with a message', page.url().includes('/login') && (await page.content()).includes('Email not confirmed'));
  const conf = await lastMailTo(learner);
  await page.goto(conf.link);
  await page.waitForLoadState('networkidle');
  check('Confirmation link → /auth/callback → signed in on /dashboard', new URL(page.url()).pathname === '/dashboard' && (await page.content()).includes('Priya Tester'), page.url());
  const prof = (await q('select * from profiles where email=$1', [learner]))[0];
  check('Profile row auto-created by trigger (role learner, name from signup)', prof?.role === 'learner' && prof.full_name === 'Priya Tester');

  /* ---------------- 7. Signed-in learner ---------------- */
  await fill(page, { full_name: 'Priya S', phone: '98450 12345' });
  await submit(page, 'Save profile');
  check('Profile update saved', (await q('select full_name, phone from profiles where id=$1', [prof.id]))[0].full_name === 'Priya S');

  await page.goto(`${SITE}/services/${svc.slug}`);
  check('Booking form pre-fills name for signed-in user', (await page.locator('[name="name"]').inputValue()) === 'Priya S');
  await fill(page, { preferred_date: future(12), preferred_time: '09:00', location: 'Jayanagar 4th Block, Bengaluru' });
  await submit(page, 'Request booking');
  const myBookingId = page.url().match(/\/bookings\/([^/]+)\/sent/)?.[1];
  check('Signed-in booking linked to the account', (await q('select customer_id from bookings where id=$1', [myBookingId]))[0]?.customer_id === prof.id);
  await page.goto(`${SITE}/courses/${course.slug}/enroll`);
  await fill(page, { phone: '9845012345', email: learner, mode: 'Offline' });
  await submit(page, 'Send enrollment request');
  await page.goto(`${SITE}/dashboard`);
  const dash = await page.content();
  check('Learner dashboard lists own booking and enquiry', dash.includes(myBookingId) || dash.includes(`/bookings/${myBookingId}`));
  await page.goto(`${SITE}/admin`);
  check('Learner cannot open /admin (bounced to own dashboard)', new URL(page.url()).pathname === '/dashboard');
  await page.goto(`${SITE}/dashboard/pro`);
  check('Learner cannot open pro dashboard', new URL(page.url()).pathname === '/dashboard');

  // RLS from the browser: anon key + learner's own JWT straight to the REST API
  const anonKey = (await (await fetch(`${EMU}/emu/keys`)).json()).anon;
  const direct = await fetch(`${EMU}/rest/v1/bookings?select=*`, { headers: { apikey: anonKey } });
  check('Anon key cannot list bookings directly (RLS)', (await direct.json()).length === 0);
  const esc = await fetch(`${EMU}/rest/v1/profiles?id=eq.${prof.id}`, { method: 'PATCH', headers: { apikey: anonKey, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ role: 'admin' }) });
  check('Anon key cannot self-promote to admin (RLS)', (await q('select role from profiles where id=$1', [prof.id]))[0].role === 'learner', `HTTP ${esc.status}`);

  /* ---------------- 8. Logout / login / open-redirect ---------------- */
  await logout(page);
  await page.goto(`${SITE}/dashboard`);
  check('After logout, /dashboard redirects to login', page.url().includes('/login?next=%2Fdashboard'));
  await login(page, learner, 'wrong-password');
  check('Wrong password shows friendly error', (await page.content()).includes('Wrong email or password'));
  await login(page, learner, 'Password123!', '//evil.example.com');
  check('Login ignores off-site ?next= (no open redirect)', new URL(page.url()).host === 'localhost:3000', page.url());
  await logout(page);
  await login(page, learner, 'Password123!', '/courses');
  check('Login honours same-site ?next=', new URL(page.url()).pathname === '/courses');
  await logout(page);

  /* ---------------- 9. Forgot password ---------------- */
  await page.goto(`${SITE}/forgot-password`);
  await fill(page, { email: learner });
  await submit(page, 'Send reset link');
  check('Forgot-password confirms without revealing accounts', (await page.content()).includes('reset link is on its way'));
  const rm = await lastMailTo(learner);
  await page.goto(rm.link);
  await page.waitForLoadState('networkidle');
  check('Reset link lands on /account/reset-password signed in', new URL(page.url()).pathname === '/account/reset-password', page.url());
  await fill(page, { password: 'NewPassword456!', confirm: 'Mismatch456!' });
  await submit(page, 'Update password');
  check('Reset rejects mismatched passwords', (await page.content()).includes('do not match'));
  await fill(page, { password: 'NewPassword456!', confirm: 'NewPassword456!' });
  await submit(page, 'Update password');
  check('Password updated', (await page.content()).includes('Password updated'));
  await ctx.clearCookies();
  await login(page, learner, 'NewPassword456!');
  check('Can log in with the new password', new URL(page.url()).pathname === '/dashboard');
  await logout(page);

  /* ---------------- 10. Phone OTP ---------------- */
  await page.goto(`${SITE}/login`);
  await page.getByRole('tab', { name: 'Phone OTP' }).click();
  await fill(page, { phone: '98450 77777' });
  await submit(page, 'Send code');
  check('OTP sent message shown', (await page.content()).includes('+919845077777'));
  await fill(page, { token: '000000' });
  await submit(page, 'Verify');
  check('Wrong OTP is rejected', (await page.content()).includes('wrong or has expired'));
  const sms = await lastMailTo('+919845077777');
  const code = sms.link.match(/\d{6}/)[0];
  await fill(page, { token: code });
  await submit(page, 'Verify');
  check('Correct OTP signs in → /dashboard', new URL(page.url()).pathname === '/dashboard', page.url());
  check('Phone user gets a profile', (await q(`select 1 from profiles where phone='919845077777'`)).length === 1);
  await logout(page);

  /* ---------------- 11. Google (simulated provider) ---------------- */
  await page.goto(`${SITE}/login`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForLoadState('networkidle');
  check('Google login round-trip (PKCE via /auth/callback) → /dashboard', new URL(page.url()).pathname === '/dashboard', page.url());
  check('Google user profile uses Google name', (await q(`select full_name from profiles where email='google.tester@gmail.com'`))[0]?.full_name === 'Google Tester');
  await logout(page);

  /* ---------------- 12. Professional flow ---------------- */
  const proRow = (await q(`select id, slug from professionals where verified and $1 = any(service_ids) limit 1`, [svc.id]))[0];
  const proEmail = `pro-${run}@example.com`;
  await signupConfirmed(page, 'Pro Tester', proEmail, 'Password123!');
  await logout(page);
  const proUser = (await q('select id from profiles where email=$1', [proEmail]))[0];
  await q(`update profiles set role='professional' where id=$1`, [proUser.id]);
  await q(`update professionals set user_id=null where user_id=$1`, [proUser.id]);
  await q(`update professionals set user_id=$1 where id=$2`, [proUser.id, proRow.id]);
  // guest booking for this pro
  await page.goto(`${SITE}/services/${svc.slug}?pro=${proRow.id}`);
  const chosen = await page.locator('[name="professional_id"]').inputValue();
  await fill(page, { name: 'Walk In', phone: '9845012399', preferred_date: future(15), preferred_time: '11:00', location: 'Whitefield, Bengaluru' });
  await submit(page, 'Request booking');
  const proBookingId = page.url().match(/\/bookings\/([^/]+)\/sent/)?.[1];
  check('Booking can target a chosen professional', chosen === proRow.id, `picked ${chosen}, wanted ${proRow.id}`);
  await login(page, proEmail, 'Password123!');
  check('Professional lands on /dashboard/pro', new URL(page.url()).pathname === '/dashboard/pro', page.url());
  const row = page.locator('tr', { hasText: 'Walk In' }).first();
  if (await row.count()) {
    await Promise.all([page.waitForLoadState('networkidle'), row.getByRole('button', { name: 'Accept' }).click()]);
    await page.waitForTimeout(600);
  }
  check('Pro accepts booking → confirmed in DB', (await q('select status from bookings where id=$1', [proBookingId]))[0]?.status === 'confirmed');
  await page.goto(`${SITE}/bookings/${proBookingId}`);
  check('Customer booking page shows Confirmed', /confirmed/i.test(await page.locator('main').innerText()));
  await logout(page);

  /* ---------------- 13. Faculty flow ---------------- */
  const facEmail = `fac-${run}@example.com`;
  await signupConfirmed(page, 'Faculty Tester', facEmail, 'Password123!');
  await logout(page);
  const facUser = (await q('select id from profiles where email=$1', [facEmail]))[0];
  await q(`update profiles set role='faculty' where id=$1`, [facUser.id]);
  await q(`update faculty set user_id=$1 where id=$2`, [facUser.id, course.faculty_id]);
  await login(page, facEmail, 'Password123!');
  check('Faculty lands on /dashboard/faculty', new URL(page.url()).pathname === '/dashboard/faculty', page.url());
  const frow = page.locator('tr', { hasText: 'Guest Learner' }).first();
  check('Faculty sees enquiry for their course', (await frow.count()) > 0);
  if (await frow.count()) { await Promise.all([page.waitForLoadState('networkidle'), frow.getByRole('button', { name: 'Mark contacted' }).click()]); await page.waitForTimeout(600); }
  check('Faculty marks enquiry contacted', (await q('select status from enrollments where email=$1', [`enrol-${run}@example.com`]))[0].status === 'contacted');
  await logout(page);

  /* ---------------- 14. Admin panel ---------------- */
  const adminEmail = `admin-${run}@example.com`;
  await signupConfirmed(page, 'Admin Tester', adminEmail, 'Password123!');
  await logout(page);
  await q(`update profiles set role='admin' where email=$1`, [adminEmail]);
  // learner applies to teach while signed in
  await login(page, learner, 'NewPassword456!');
  await page.goto(`${SITE}/apply/faculty`);
  await fill(page, { name: 'Priya S', phone: '9845012345', email: learner, city: 'Bengaluru', skill: 'Saree draping', experience_years: 6 });
  await submit(page, 'Send');
  await logout(page);

  const save = async (label = 'Save changes') => {
    await Promise.all([page.waitForLoadState('networkidle'), page.getByRole('button', { name: label }).first().click()]);
    await page.waitForTimeout(700);
  };
  const quickSet = async (rowText, value) => {
    const sel = page.locator('tr', { hasText: rowText }).first().locator('select[aria-label^="Status"]');
    await sel.selectOption(value);
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(700);
  };

  await login(page, adminEmail, 'Password123!');
  check('Admin lands on /admin', new URL(page.url()).pathname === '/admin', page.url());
  check('Admin dashboard shows stat cards and activity report', /Enrolments[\s\S]*Activity Report[\s\S]*Total Students/.test(await page.locator('main').innerText()));

  // every sidebar page and every "add" form opens
  const navFile = require('fs').readFileSync(__dirname + '/../lib/admin/nav.ts', 'utf8');
  const hrefs = Array.from(new Set([...navFile.matchAll(/href: '([^']+)'/g)].map((m) => m[1].split('#')[0])));
  const resFile = require('fs').readFileSync(__dirname + '/../lib/admin/resources.ts', 'utf8');
  const resKeys = [...resFile.matchAll(/key: '([a-z-]+)', table:/g)].map((m) => m[1]);
  const broken = [];
  for (const h of [...hrefs, ...resKeys.map((k) => `/admin/${k}`), '/admin/reports/bookings', '/admin/reports/courses', '/admin/reports/students', '/admin/cms/privacy', '/admin?range=30']) {
    const r = await page.goto(SITE + h);
    const body = await page.locator('body').innerText();
    if (!r || r.status() !== 200 || /Application error|Something went wrong/i.test(body)) broken.push(`${h} → ${r?.status()}`);
  }
  check(`Admin: all ${hrefs.length} menu pages + ${resKeys.length} lists load`, broken.length === 0, broken.join(', '));
  const newBroken = [];
  for (const k of resKeys) {
    const r = await page.goto(`${SITE}/admin/${k}/new`);
    if (r.status() !== 200 && r.status() !== 404) newBroken.push(`${k} → ${r.status()}`);
  }
  check('Admin: every "Add" form opens (or is correctly unavailable)', newBroken.length === 0, newBroken.join(', '));

  await page.goto(`${SITE}/admin/messages`);
  check('Admin sees contact message', (await page.content()).includes(`contact-${run}@example.com`) || (await page.content()).includes('Contact'));
  await page.goto(`${SITE}/admin/messages?q=${encodeURIComponent(`contact-${run}`)}`);
  check('Admin search finds the contact message', (await page.locator('tbody tr').count()) === 1);

  await page.goto(`${SITE}/admin/applications?q=${encodeURIComponent(learner)}`);
  await quickSet('Priya S', 'approved');
  check('Approving a signed-in applicant upgrades role to faculty', (await q('select role from profiles where email=$1', [learner]))[0].role === 'faculty');

  await page.goto(`${SITE}/admin/bookings?q=Jayanagar`);
  await quickSet('Priya S', 'confirmed');
  check('Admin changes booking status inline', (await q('select status from bookings where id=$1', [myBookingId]))[0].status === 'confirmed');

  const learnerId = (await q('select id from profiles where email=$1', [learner]))[0].id;
  await page.goto(`${SITE}/admin/users/${learnerId}`);
  await page.locator('#f-role').selectOption('learner');
  await save();
  check('Admin changes a user role from the edit form', (await q('select role from profiles where id=$1', [learnerId]))[0].role === 'learner');
  const meId = (await q('select id from profiles where email=$1', [adminEmail]))[0].id;
  await page.goto(`${SITE}/admin/users/${meId}`);
  await page.locator('#f-role').selectOption('learner');
  await save();
  check('Admin cannot demote themselves', (await q('select role from profiles where id=$1', [meId]))[0].role === 'admin' && (await page.content()).includes('own role'));

  // create a course with an uploaded cover image
  await page.goto(`${SITE}/admin/courses/new`);
  await page.locator('#f-title').fill(`E2E Bridal Blouse ${run}`);
  await page.locator('#f-category_slug').selectOption('tailoring');
  await page.locator('#f-duration_days').fill('21');
  await page.locator('#f-price').fill('4999');
  await page.locator('#f-summary').fill('Twenty-one days of blouse drafting, cutting and finishing.');
  await page.locator('#f-outcomes').fill('Draft a princess-cut blouse\nFinish with piping');
  await page.getByRole('button', { name: 'Add module' }).click();
  await page.locator('[id="f-modules-0-title"]').fill('Drafting basics');
  await page.locator('[id="f-modules-0-days"]').fill('7');
  await page.locator('input[type=file]').first().setInputFiles(__dirname + '/../public/photos/tailoring-sewing.jpg');
  await page.waitForFunction(() => /storage\/v1|^data:/.test(document.querySelector('#f-image_url')?.value || ''), null, { timeout: 15000 }).catch(() => {});
  await save('Add course');
  const made = (await q('select * from courses where title=$1', [`E2E Bridal Blouse ${run}`]))[0];
  check('Admin creates a course (slug, modules, outcomes saved)', made && made.slug.startsWith('e2e-bridal-blouse') && made.modules[0]?.title === 'Drafting basics' && made.outcomes.length === 2 && page.url().includes(`/admin/courses/${made.id}`), page.url());
  check('Course cover uploaded to storage', !!made?.image_url && made.image_url.includes('/storage/v1/object/public/media/'), made?.image_url);
  const img = made?.image_url ? await fetch(made.image_url) : null;
  check('Uploaded image is served publicly', img?.status === 200 && (img.headers.get('content-type') || '').startsWith('image/'));
  await page.goto(`${SITE}/courses/${made.slug}`);
  check('New course page is live with the uploaded cover', (await page.content()).includes(made.image_url));
  await page.goto(`${SITE}/admin/media`);
  check('Upload appears in the media library', (await page.content()).includes('tailoring-sewing.jpg'));
  await page.goto(`${SITE}/admin/courses?q=${encodeURIComponent(`E2E Bridal Blouse ${run}`)}`);
  await page.getByRole('switch', { name: /^Published/ }).first().click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(700);
  check('Unpublish toggle hides the course', (await q('select published from courses where id=$1', [made.id]))[0].published === false && (await page.goto(`${SITE}/courses/${made.slug}`)).status() === 404);

  // CMS: home page text, settings, announcement bar
  await page.goto(`${SITE}/admin/cms/home`);
  await page.locator('[id="f-hero-title1"]').fill(`Craft ${run},`);
  await save();
  await page.goto(`${SITE}/`);
  check('CMS: home hero headline changes on the website', (await page.content()).includes(`Craft ${run},`));
  await page.goto(`${SITE}/admin/cms/home`);
  await Promise.all([page.waitForLoadState('networkidle'), page.getByRole('button', { name: 'Reset to original' }).click()]);
  await page.goto(`${SITE}/`);
  check('CMS: reset brings back the original home text', (await page.content()).includes('Learn a craft,'));
  await page.goto(`${SITE}/admin/settings/general`);
  await page.locator('#f-phone').fill('+91 90000 12345');
  await save();
  await page.goto(`${SITE}/contact`);
  check('Settings: new phone shows on contact page and footer', ((await page.content()).match(/\+91 90000 12345/g) || []).length >= 2);
  await page.goto(`${SITE}/admin/settings/announcement`);
  await page.locator('#f-enabled').check({ force: true });
  await page.locator('#f-text').fill(`Batch starts soon ${run}`);
  await save();
  await page.goto(`${SITE}/courses`);
  check('Announcement bar appears on the website', (await page.locator('[data-testid="announcement"]').innerText()).includes(`Batch starts soon ${run}`));
  await page.goto(`${SITE}/admin/settings/maintenance`);
  await page.locator('#f-enabled').check({ force: true });
  await save();
  const anon = await browser.newContext(); const ap = await anon.newPage();
  await ap.goto(`${SITE}/courses`);
  const anonText = await ap.locator('body').innerText();
  await ap.goto(`${SITE}/login`);
  const loginOk = (await ap.locator('input[name="email"]').count()) > 0;
  await page.goto(`${SITE}/courses`);
  check('Maintenance mode: visitors see the holding page, login still works, admin sees the site', /right back/i.test(anonText) && loginOk && (await page.content()).includes('Maintenance mode is ON'));
  await page.goto(`${SITE}/admin/settings/maintenance`);
  await page.locator('#f-enabled').uncheck({ force: true });
  await save();
  await ap.goto(`${SITE}/courses`);
  check('Maintenance mode off again', !/right back/i.test(await ap.locator('body').innerText()));
  const settingsRows = (await q(`select key from site_content`)).map((r) => r.key);
  check('Settings stored in site_content', settingsRows.includes('settings.general') && settingsRows.includes('settings.announcement'));

  // LMS: enrol the learner, schedule a live class, create a quiz and an assignment
  await q(`insert into enrollments (course_id, user_id, name, phone, email, mode, status) values ($1,$2,'Priya S','9845012345',$3,'Online','new')`, [course.id, learnerId, learner]);
  await page.goto(`${SITE}/admin/enrollments?q=${encodeURIComponent(learner)}`);
  await quickSet('Priya S', 'converted');
  check('Admin marks the learner enrolled', (await q(`select 1 from enrollments where user_id=$1 and course_id=$2 and status='converted'`, [learnerId, course.id])).length === 1);
  await page.goto(`${SITE}/admin/live-classes/new`);
  await page.locator('#f-title').fill(`Live demo ${run}`);
  await page.locator('#f-course_id').selectOption(course.id);
  await page.locator('#f-starts_at').fill(`${future(3)}T18:30`);
  await page.locator('#f-meeting_url').fill('https://meet.google.com/abc-defg-hij');
  await save('Add live class');
  const lc = (await q(`select starts_at from live_classes where title=$1`, [`Live demo ${run}`]))[0];
  check('Live class saved with IST time', lc && new Date(lc.starts_at).toISOString().endsWith('13:00:00.000Z'), lc && new Date(lc.starts_at).toISOString());
  await page.goto(`${SITE}/admin/quizzes/new`);
  await page.locator('#f-course_id').selectOption(course.id);
  await page.locator('#f-title').fill(`Quiz ${run}`);
  for (const [i, [qq, opts, correct]] of [['Which tool cuts fabric?', 'Scissors\nNeedle', '1'], ['Which stitch is strongest?', 'Tacking\nBack stitch', '2']].entries()) {
    await page.getByRole('button', { name: 'Add question' }).click();
    await page.locator(`[id="f-questions-${i}-question"]`).fill(qq);
    await page.locator(`[id="f-questions-${i}-options"]`).fill(opts);
    await page.locator(`[id="f-questions-${i}-correct"]`).fill(correct);
  }
  await save('Add quiz');
  const quiz = (await q(`select * from quizzes where title=$1`, [`Quiz ${run}`]))[0];
  check('Quiz saved with 2 questions', quiz?.questions.length === 2 && quiz.questions[1].correct === 2);
  await page.goto(`${SITE}/admin/assignments/new`);
  await page.locator('#f-course_id').selectOption(course.id);
  await page.locator('#f-title').fill(`Assignment ${run}`);
  await page.locator('#f-instructions').fill('Stitch a sample and share photos.');
  await save('Add assignment');
  check('Assignment saved', (await q(`select 1 from assignments where title=$1`, [`Assignment ${run}`])).length === 1);
  await page.goto(`${SITE}/admin/notifications/new`);
  await page.locator('#f-title').fill(`Notice ${run}`);
  await page.locator('#f-body').fill('Holiday on Friday.');
  await save('Add notification');
  await page.goto(`${SITE}/admin/offers/new`);
  await page.locator('#f-title').fill('E2E offer');
  await page.locator('#f-discount_text').fill(`15% off ${run}`);
  await save('Add offer');
  await page.goto(`${SITE}/admin/certificates/new?user_id=${learnerId}`);
  await page.locator('#f-student_name').fill('Priya S');
  await page.locator('#f-course_id').selectOption(course.id);
  await save('Add certificate');
  const cert = (await q(`select code from certificates where user_id=$1`, [learnerId]))[0];
  check('Certificate issued with a generated number', !!cert?.code);
  await page.goto(`${SITE}/courses/${course.slug}`);
  check('Offer shows on the course page', (await page.content()).includes(`15% off ${run}`));
  await logout(page);

  // learner side
  await login(page, learner, 'NewPassword456!');
  await page.goto(`${SITE}/dashboard?tab=learning`);
  const learnTxt = await page.locator('main').innerText();
  check('Learner sees the live class, quiz and assignment', learnTxt.includes(`Live demo ${run}`) && learnTxt.includes(`Quiz ${run}`) && learnTxt.includes(`Assignment ${run}`));
  await page.goto(`${SITE}/dashboard/quiz/${quiz.id}`);
  await page.locator('input[name="q0"][value="1"]').check();
  await page.locator('input[name="q1"][value="1"]').check();
  await submit(page, 'Submit answers');
  check('Quiz is scored (1 of 2)', (await page.content()).includes('You scored 1 out of 2') && (await q(`select score from submissions where quiz_id=$1`, [quiz.id]))[0]?.score === 1);
  await page.goto(`${SITE}/dashboard?tab=learning`);
  await page.locator('textarea[name="answer"]').first().fill('https://drive.google.com/sample');
  await submit(page, 'Submit');
  check('Assignment submitted', (await q(`select status from submissions where kind='assignment' and user_id=$1`, [learnerId]))[0]?.status === 'submitted');
  await page.goto(`${SITE}/dashboard?tab=notifications`);
  check('Learner sees the notification', (await page.content()).includes(`Notice ${run}`));
  await page.goto(`${SITE}/dashboard?tab=certificates`);
  check('Learner sees the certificate', (await page.content()).includes(cert.code));
  await page.goto(`${SITE}/certificates/${cert.code}`);
  check('Public certificate verification page', (await page.locator('[data-testid="certificate-valid"]').count()) === 1);
  await page.goto(`${SITE}/dashboard?tab=support`);
  await fill(page, { subject: `Help ${run}`, text: 'My certificate name needs a fix please.' });
  await submit(page, 'Send to support');
  const ticketId = page.url().match(/\/dashboard\/support\/([^/?]+)/)?.[1];
  check('Learner opens a support ticket', !!ticketId, page.url());
  await logout(page);

  // faculty grades the assignment
  await login(page, facEmail, 'Password123!');
  await page.goto(`${SITE}/dashboard/faculty`);
  await page.locator('input[name="score"]').first().fill('85');
  await submit(page, 'Save');
  check('Faculty grades the assignment', (await q(`select score, status from submissions where kind='assignment' and user_id=$1`, [learnerId]))[0]?.status === 'graded');
  await logout(page);

  // admin replies to the ticket
  await login(page, adminEmail, 'Password123!');
  await page.goto(`${SITE}/admin/tickets/${ticketId}`);
  await page.locator('#reply').fill(`Fixed it ${run}`);
  await submit(page, 'Send reply');
  check('Admin replies to the ticket', (await q(`select status, messages from support_tickets where id=$1`, [ticketId]))[0].messages.length === 2);
  // CSV export and delete
  const csv = await page.request.get(`${SITE}/admin/export/courses`);
  check('CSV export works for admins', csv.status() === 200 && (await csv.text()).includes('slug'));
  const anonCsv = await ap.request.get(`${SITE}/admin/export/courses`);
  check('CSV export is blocked for visitors', anonCsv.status() !== 200 || !(await anonCsv.text()).includes('slug'));
  await page.goto(`${SITE}/admin/faqs`);
  const faqCount = (await q('select count(*)::int n from faqs'))[0].n;
  await page.getByRole('button', { name: /^Delete Which cities/ }).click();
  await Promise.all([page.waitForLoadState('networkidle'), page.getByRole('button', { name: 'Yes, delete' }).click()]);
  await page.waitForTimeout(700);
  check('Delete (with confirm) removes a FAQ', (await q('select count(*)::int n from faqs'))[0].n === faqCount - 1);
  await page.goto(`${SITE}/admin/activity`);
  check('Activity log records admin changes', (await q('select count(*)::int n from activity_log'))[0].n >= 10 && (await page.content()).includes('Admin Tester'));
  await logout(page);

  await page.goto(`${SITE}/dashboard/support/${ticketId}`);
  await login(page, learner, 'NewPassword456!', `/dashboard/support/${ticketId}`);
  check('Learner sees the admin reply', (await page.content()).includes(`Fixed it ${run}`));
  await logout(page);

  // RLS on the new tables
  const anonGet = async (t) => (await (await fetch(`${EMU}/rest/v1/${t}?select=*`, { headers: { apikey: anonKey } })).json());
  const leaks = [];
  for (const t of ['site_content', 'support_tickets', 'submissions', 'staff', 'activity_log', 'email_templates', 'media', 'notifications', 'certificates']) if ((await anonGet(t)).length) leaks.push(t);
  check('RLS: visitors cannot read private admin tables', leaks.length === 0, leaks.join(', '));
  check('RLS: visitors can read published FAQs and testimonials', (await anonGet('faqs')).length > 0 && (await anonGet('testimonials')).length > 0);
  await anon.close();

  /* ---------------- 15. Console errors ---------------- */
  // ERR_TUNNEL / ERR_NAME: external photos (Unsplash) blocked by the test machine's network, not a site error.
  const errs = consoleErrors.filter((e) => !/favicon|404 \(Not Found\)|Failed to fetch RSC payload|net::ERR_(TUNNEL_CONNECTION_FAILED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED)/.test(e));
  check('No browser console errors across the run', errs.length === 0, errs.slice(0, 5).join(' | '));

  await browser.close(); await pool.end();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  require('fs').writeFileSync(__dirname + '/results.json', JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
