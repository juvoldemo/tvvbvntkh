import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const admin = await context.newPage();
const errors=[];
admin.on('pageerror',e=>errors.push(e.message));
let config = await fetch('http://localhost:3000/api/invitation-settings').then(r=>r.json());
assert.equal(typeof config.visible,'boolean');
const imageBytes = await readFile('public/invitations/Thu moi 1611.jpg');
await context.route('**/api/**',async route=>{
 const req=route.request(); const url=new URL(req.url());
 if(url.pathname==='/api/admin/invitation-settings') {
  if(req.method()==='PUT') { config=req.postDataJSON(); return route.fulfill({json:{ok:true}}); }
  if(req.method()==='POST') return route.fulfill({json:{url:'/api/archive/file?path=uploads%2Finvitations%2Ftest.jpg'}});
  return route.fulfill({json:config});
 }
 if(url.pathname==='/api/invitation-settings') return route.fulfill({json:config});
 if(url.pathname==='/api/archive/file') return route.fulfill({body:imageBytes,contentType:'image/jpeg'});
 if(url.pathname==='/api/admin/auth') return route.fulfill({json:{authenticated:true}});
 if(url.pathname==='/api/user/auth') return route.fulfill({json:{authenticated:true,advisorCode:'TEST',profile:{advisor_code:'TEST',full_name:'Test',dashboard_role:'advisor'}}});
 if(url.pathname==='/api/user/profile') return route.fulfill({json:{profile:{advisor_code:'TEST',full_name:'Test',dashboard_role:'advisor'}}});
 if(url.pathname==='/api/dashboard') return route.fulfill({status:503,json:{error:'Fixture'}});
 return route.fulfill({json:{events:[],programs:[],sections:[],rows:[]}});
});
await admin.goto('http://localhost:3000/admin-data');
await admin.getByRole('button',{name:'Tạo thư',exact:true}).first().click();
await admin.getByRole('heading',{name:'Tạo thư',exact:true}).waitFor();
await admin.waitForFunction(()=>{ const c=document.querySelector('.invitation-position-preview canvas'); return c?.width===1277 && c.getContext('2d').getImageData(20,20,1,1).data[3]===255; });
// Paste an image into each destination and verify both independent uploads.
for (let index = 0; index < 2; index++) {
  const posted = admin.waitForRequest(r => r.url().endsWith('/api/admin/invitation-settings') && r.method() === 'POST');
  await admin.locator('.invitation-upload-box').nth(index).evaluate((node, bytes) => {
    node.focus();
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], 'pasted.jpg', { type: 'image/jpeg' }));
    node.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, [...imageBytes]);
  await posted;
  await admin.waitForFunction(() => !document.querySelector('fieldset').disabled);
  assert.ok(await admin.locator('.invitation-upload-box').nth(index).getByTitle('pasted.jpg').count());
}
const preview=admin.locator('.invitation-position-preview');
await preview.click({position:{x:120,y:180}});
await admin.locator('input[type=file]').nth(0).setInputFiles('public/invitations/Thu moi 1611.jpg');
await admin.getByText('Đã tải ảnh lên.',{exact:false}).waitFor();
await admin.locator('input[type=file]').nth(1).setInputFiles('public/invitations/Thu moi 1611.jpg');
await admin.getByText('Đã tải ảnh lên.',{exact:false}).waitFor();
await admin.getByRole('button',{name:'Lưu thay đổi'}).click();
await admin.getByText('Đã lưu.',{exact:false}).waitFor();
assert.ok(config.image.includes('test.jpg'));
const download=admin.waitForEvent('download');
await admin.getByRole('button',{name:'Tải thử PNG'}).click();
assert.equal((await download).suggestedFilename(),'thu-moi-xem-truoc.png');
await mkdir('outputs/invitation-ui',{recursive:true});
for(const width of [1440,768,375]) {
 await admin.setViewportSize({width,height:1000});
 await admin.screenshot({path:`outputs/invitation-ui/admin-${width}.png`,fullPage:true});
 assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
}
const user=await context.newPage();
user.on('pageerror',e=>errors.push(e.message));
await user.goto('http://localhost:3000');
const card=user.locator('.hnkh-home-card').first();
await card.waitFor({timeout:20000});
await card.click();
await user.getByLabel('Họ và tên khách hàng',{exact:false}).fill('Nguyễn Văn An');
await user.waitForFunction(()=>{ const c=document.querySelector('.hnkh-canvas-wrap canvas'); return c?.width===1277 && c.getContext('2d').getImageData(20,20,1,1).data[3]===255; });
const userDownload=user.waitForEvent('download');
await user.locator('.hnkh-download').click();
assert.ok((await userDownload).suggestedFilename().endsWith('.png'));
await admin.getByLabel('Hiện trên giao diện user').uncheck();
await admin.getByRole('button',{name:'Lưu thay đổi'}).click();
await admin.getByText('Đã lưu.',{exact:false}).waitFor();
await Promise.all([user.waitForResponse(r=>r.url().includes('/api/invitation-settings')),user.reload()]);
assert.equal(await user.locator('.hnkh-home-card').count(),0);
console.log(JSON.stringify({passed:true,checks:['admin image upload preview','text placement','save','PNG admin/user export','375/768/1440 overflow','user visibility'],errors},null,2));
await browser.close();
assert.equal(errors.length,0);
