const { chromium } = require('playwright');
const S='http://localhost:3000'; let fails=0; const ck=(n,o,d='')=>{console.log(`${o?'PASS':'FAIL'}  ${n} ${d}`); if(!o) fails++;};
(async()=>{
 const b=await chromium.launch({executablePath: process.env.CHROME_PATH || undefined}); const p=await b.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(S+'/'); ck('Demo banner visible', /demo/i.test(await p.locator('body').innerText()));
 for (const role of ['learner','professional','faculty','admin']) {
   await p.context().clearCookies(); await p.goto(S+'/login');
   const btn=p.locator(`form:has(input[name="role"][value="${role}"]) button`).first();
   await Promise.all([p.waitForLoadState('networkidle'), btn.click()]); await p.waitForTimeout(300);
   const want={learner:'/dashboard',professional:'/dashboard/pro',faculty:'/dashboard/faculty',admin:'/admin'}[role];
   ck(`Demo ${role} login → ${want}`, new URL(p.url()).pathname===want, p.url());
 }
 await p.goto(S+'/services/bridal-makeup');
 const d=new Date(Date.now()+5*864e5).toISOString().slice(0,10);
 for (const [k,v] of Object.entries({name:'Demo User',phone:'9845011111',preferred_date:d,preferred_time:'10:00',location:'Jayanagar Bengaluru'})) await p.fill(`[name="${k}"]`,v);
 await Promise.all([p.waitForURL(/\/sent/), p.getByRole('button',{name:'Request booking'}).click()]);
 ck('Demo booking works', /\/bookings\/.+\/sent/.test(p.url()));
 ck('No page errors', errs.length===0, errs.join('|'));
 await b.close(); process.exit(fails?1:0);
})();
