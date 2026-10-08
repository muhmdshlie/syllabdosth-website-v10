# Local test harness (not part of the website)

Runs the whole site against a real Postgres database with a small **local stand-in for Supabase**
(`server.js`: the parts of Supabase's REST API, Auth and Storage the site uses — email/password with
confirmation links, password reset, phone OTP, a simulated Google login, PKCE callback, Row Level Security
via the anon / authenticated / service-role keys). Emails and SMS are captured at `http://localhost:54321/emu/mail`.

It is for testing only. It is **not** Supabase — always do a final check on the real project.

```bash
npm i --no-save pg playwright && npx playwright install chromium
./test-harness/reset-db.sh                       # needs a local Postgres (user postgres / password postgres)
node test-harness/server.js &                    # prints ANON= and SERVICE= keys
# put them in .env.local with NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321, then:
npm run build && npm start &
node test-harness/e2e.js                         # 96 checks: pages, forms, login methods, all 4 dashboards, RLS
```
`demo.js` checks demo mode (build with no Supabase keys).
