import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({headless:true});
try {
const page = await browser.newPage({viewport:{width:1440,height:1000}});
let settings = {banner:'/api/archive/file?path=uploads%2Finvitations%2Fbanner.png',visible:false};
let reportRows = [];
let resetCalls = 0;
let reportTotals = {users:125,consultations:12345,contracts:678};
const image = await readFile('public/invitations/Banner 1611.png');
await page.route('**/api/**', async route => {
 const path = new URL(route.request().url()).pathname;
 if (path === '/api/admin/auth') return route.fulfill({json:{authenticated:true}});
 if (path === '/api/admin/ban-dinh-settings') {
  if (route.request().method() === 'PUT') {settings=route.request().postDataJSON(); return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:settings});
 }
 if(path === '/api/admin/ban-dinh-reports') return route.fulfill({json:{rows:reportRows,totals:reportTotals,session:{running:resetCalls===0,startedAt:'2026-11-21T12:00:00Z',endedAt:null}}});
 if(path === '/api/admin/ban-dinh-reset') {
  resetCalls++; reportRows=[]; reportTotals={users:0,consultations:0,contracts:0};
  return route.fulfill({json:{rows:[],totals:reportTotals,session:{running:false,startedAt:null,endedAt:new Date().toISOString(),reportPrefix:'rounds/test'}}});
 }
 if(path === '/api/admin/invitation-settings' && route.request().method()==='POST') return route.fulfill({json:{url:'/api/archive/file?path=uploads%2Finvitations%2Fshow-test.png'}});
 if(path === '/api/archive/file') return route.fulfill({body:image,contentType:'image/png'});
 return route.fulfill({json:{events:[],rows:[],sections:[],programs:[]}});
});
await page.goto('http://localhost:3000/admin-data');
await page.getByRole('button',{name:'Tạo thư',exact:true}).first().click();
await page.getByRole('button',{name:'Bán đỉnh 3.0',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Show',exact:true}).isDisabled(),true);
assert.equal(await page.locator('.ban-dinh-show-preview .ban-dinh-show-total').count(),0);
await page.locator('input[type=file][aria-label="Ảnh Show"]').setInputFiles('public/invitations/Banner 1611.png');
await page.getByText('Đã tải ảnh Show.',{exact:false}).waitFor();
await page.getByText('Đã tải ảnh Show. Đã tự động lưu.',{exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'Lưu thay đổi'}).last().isDisabled(),true);
assert.ok(settings.showImage);
await page.getByRole('group',{name:'Banner Bán đỉnh 3.0',exact:true}).click();
assert.equal(await page.locator('.ban-dinh-show-preview img').getAttribute('src'),settings.banner);
assert.equal(await page.locator('.ban-dinh-show-preview .ban-dinh-show-total').count(),0);
await page.getByRole('group',{name:'Ảnh Show',exact:true}).click();
assert.equal(await page.locator('.ban-dinh-show-preview img').getAttribute('src'),settings.showImage);
await page.locator('.ban-dinh-show-preview').getByText('12.345',{exact:true}).waitFor();
await mkdir('outputs/ban-dinh-ui',{recursive:true});
for(const width of [1440,375]) {
 await page.setViewportSize({width,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`outputs/ban-dinh-ui/show-settings-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Show',exact:true}).click();
 const dialog=page.getByRole('dialog'); await dialog.waitFor();
 await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('ban-dinh-fullscreen-root'));
 await page.waitForFunction(()=>document.querySelector('dialog img')?.naturalWidth>0);
 assert.equal(await dialog.getByLabel('Số TVV đã tham gia').innerText(),'125');
 assert.equal(await dialog.getByLabel('Tổng số cuộc tư vấn cá nhân',{exact:true}).innerText(),'12.345');
 assert.equal(await dialog.getByLabel('Tổng số hợp đồng khai thác mới',{exact:true}).innerText(),'678');
 const box=await dialog.boundingBox(); assert.ok(box.width>=width); assert.ok(box.height>=1000);
 await page.screenshot({path:`outputs/ban-dinh-ui/show-fullscreen-${width}.png`});
 if (width === 1440) {
  assert.equal(await dialog.locator('.ban-dinh-arrival').count(),0);
  reportRows = [{advisorCode:'ARRIVAL_TEST',advisorName:'Cao Thị Thanh Mai',groupName:'Tâm An',consultations:5,contracts:2,updatedAt:new Date().toISOString()}];
  const arrival = dialog.locator('.ban-dinh-arrival');
  await arrival.waitFor();
  assert.equal(await arrival.innerText(),'Cao Thị Thanh Mai - Tâm An - 5 cuộc tư vấn - 2 hợp đồng KTM');
  const before = await arrival.boundingBox();
  await page.waitForTimeout(2200);
  const after = await arrival.boundingBox();
  assert.ok(after.y < before.y,'registration text must move upwards');
  assert.equal(await arrival.count(),1,'polling must not duplicate existing registration');
  await page.screenshot({path:'outputs/ban-dinh-ui/show-arrival.png'});
 }
 await page.getByRole('button',{name:'Đóng ảnh Show'}).click();
 await dialog.waitFor({state:'hidden'});
 await page.locator('.ban-dinh-arrival').waitFor({state:'detached'});
 await page.waitForFunction(()=>!document.fullscreenElement);
}
await page.getByRole('button',{name:'Show',exact:true}).click();
await page.keyboard.press('Escape');
await page.getByRole('dialog').waitFor({state:'hidden'});
await page.reload();
await page.getByRole('button',{name:'Tạo thư',exact:true}).first().click();
await page.getByRole('button',{name:'Bán đỉnh 3.0',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Show',exact:true}).isEnabled(),true);
const originalImages = {...settings};
await page.getByRole('button',{name:'Reset',exact:true}).click();
const resetDialog = page.getByRole('dialog',{name:'Reset số liệu Bán đỉnh 3.0?'});
await resetDialog.getByRole('button',{name:'Hủy',exact:true}).click();
assert.equal(resetCalls,0,'Cancel must not submit reset');
await page.getByRole('button',{name:'Reset',exact:true}).click();
await resetDialog.getByRole('button',{name:'Xác nhận reset',exact:true}).click();
await resetDialog.waitFor({state:'hidden'});
assert.equal(resetCalls,1);
assert.deepEqual(settings,originalImages,'Reset must preserve both image settings');
assert.deepEqual(await page.locator('.ban-dinh-report-totals strong').allTextContents(),['0','0']);
await page.getByRole('group',{name:'Ảnh Show',exact:true}).click();
assert.equal(await page.locator('.ban-dinh-show-preview').getByLabel('Số TVV đã tham gia').innerText(),'0');
await page.screenshot({path:'outputs/ban-dinh-ui/after-reset.png',fullPage:true});
console.log('PASS: upload, save/reload, Show, fullscreen, close, Escape, desktop/mobile layouts. API writes mocked.');
} finally {await browser.close();}
