const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
 const page = await browser.newPage({viewport:{width:1920,height:1080}});
 async function login() {
  const rope=page.getByRole('button',{name:'拖拽拉绳切换台灯'}); const box=await rope.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2+80,{steps:12}); await page.mouse.up();
  await page.getByRole('button',{name:'tech',exact:true}).click();
  await page.getByRole('button',{name:'进入工作空间'}).click();
 }
 try {
  await page.goto('http://127.0.0.1:3011/app/wb_okr_perf');
  assert.deepEqual(await page.evaluate(()=>({width:innerWidth,height:innerHeight})),{width:1920,height:1080});
  await page.waitForURL('**/login');
  await login(); await page.waitForURL('**/app/wb_okr_perf');
  await page.getByRole('tab',{name:'目标 OKR',exact:true}).waitFor();
  await page.evaluate(()=>sessionStorage.removeItem('shichuang.session.token'));
  await page.reload(); await page.waitForURL('**/login');
  await login(); await page.getByRole('tab',{name:'目标 OKR',exact:true}).waitFor();
  await page.evaluate(()=>{
   const s=JSON.parse(sessionStorage.getItem('shichuang.session'));
   s.token='invalid-acceptance-token';
   sessionStorage.setItem('shichuang.session',JSON.stringify(s));
   sessionStorage.setItem('shichuang.session.token',s.token);
  });
  await page.reload(); await page.waitForURL('**/login');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('shichuang.session')),null);
  await login(); await page.waitForURL('**/app/wb_okr_perf');
  await page.getByRole('tab',{name:'目标 OKR',exact:true}).waitFor();
  await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('shichuang.session'));s.expiresAt=Date.now()-1;sessionStorage.setItem('shichuang.session',JSON.stringify(s));});
  await page.reload(); await page.waitForURL('**/login');
  await page.route('**/api/auth/dev-login',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'UNAVAILABLE',message:'登录服务暂不可用'})}));
  await login(); await page.getByText('登录服务暂不可用',{exact:true}).waitFor();
  assert.ok(page.url().endsWith('/login'));
  await page.unroute('**/api/auth/dev-login');
  await page.getByRole('button',{name:'进入工作空间'}).click();
  await page.waitForURL('**/app/wb_okr_perf');
  await page.getByRole('tab',{name:'目标 OKR',exact:true}).waitFor();
  await page.screenshot({path:'.enterprise-app-factory/runtime/okr-auth-recovered.png'});
  console.log('PASS: anonymous guard, missing token, backend 401, expired session, failed login, recovery to OKR; viewport 1920x1080');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
