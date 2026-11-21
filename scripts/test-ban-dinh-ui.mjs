import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
let settings={banner:'',visible:false}; let entry=null;
let session={running:false,startedAt:null,endedAt:null}; let reportRequests=0;
const image=await readFile('public/invitations/Banner 1611.png');
const invitation=await fetch('http://localhost:3000/api/invitation-settings').then(r=>r.json());
await context.route('**/api/**',async route=>{
 const req=route.request(), path=new URL(req.url()).pathname;
 if(path==='/api/admin/ban-dinh-export') return route.continue();
 if(path==='/api/admin/ban-dinh-settings') {
  if(req.method()==='PUT') { settings=req.postDataJSON(); return route.fulfill({json:{ok:true}}); }
  return route.fulfill({json:settings});
 }
 if(path==='/api/admin/ban-dinh-session') { const action=req.postDataJSON().action; session={running:action==='start',startedAt:action==='start'?new Date().toISOString():session.startedAt,endedAt:action==='end'?new Date().toISOString():null}; return route.fulfill({json:{session}}); }
 if(path==='/api/ban-dinh-session') return route.fulfill({json:{session}});
 if(path==='/api/admin/ban-dinh-reports') { reportRequests++; return route.fulfill({json:{session,rows:entry?[{...entry,advisorCode:'TEST',advisorName:'Test'}]:[],totals:{users:entry?1:0,consultations:entry?.consultations||0,contracts:entry?.contracts||0}}}); }
 if(path==='/api/ban-dinh-settings') return route.fulfill({json:settings});
 if(path==='/api/ban-dinh') {
  if(req.method()==='PUT') { if(!session.running) return route.fulfill({status:409,json:{session,error:'Closed'}}); entry={...req.postDataJSON(),updatedAt:new Date().toISOString()}; }
  return route.fulfill({json:{entry,session}});
 }
 if(path==='/api/admin/invitation-settings' && req.method()==='POST') return route.fulfill({json:{url:'/api/archive/file?path=uploads%2Finvitations%2Ftest.png'}});
 if(path==='/api/admin/invitation-settings'||path==='/api/invitation-settings') return route.fulfill({json:invitation});
 if(path==='/api/archive/file') return route.fulfill({body:image,contentType:'image/png'});
 if(path==='/api/admin/auth') return route.fulfill({json:{authenticated:true}});
 if(path==='/api/user/auth') return route.fulfill({json:{authenticated:true,advisorCode:'TEST',profile:{advisor_code:'TEST',full_name:'Test',dashboard_role:'advisor'}}});
 if(path==='/api/dashboard') return route.fulfill({status:503,json:{error:'Fixture'}});
 return route.fulfill({json:{events:[],programs:[],sections:[],rows:[]}});
});
const admin=await context.newPage(); const errors=[]; admin.on('pageerror',e=>errors.push(e.message));
await admin.goto('http://localhost:3000/admin-data');
await admin.getByRole('button',{name:'Tạo thư',exact:true}).first().click();
await admin.getByRole('button',{name:'Bán đỉnh 3.0',exact:true}).click();
await admin.getByRole('heading',{name:'Bán đỉnh 3.0'}).waitFor();
await admin.locator('div:not([hidden]) > article').getByLabel('Hiện trên giao diện user').check();
await admin.locator('input[type=file][aria-label="Banner Bán đỉnh 3.0"]').setInputFiles('public/invitations/Banner 1611.png');
await admin.getByText('Đã tải banner.',{exact:false}).waitFor();
await admin.getByRole('button',{name:'Lưu thay đổi'}).last().click();
await admin.getByText('Đã lưu thay đổi.',{exact:true}).waitFor();
await context.request.post('http://localhost:3000/api/admin/auth',{data:{password:'0000'}});
const downloaded=admin.waitForEvent('download');
await admin.getByRole('button',{name:'Thống kê',exact:true}).click();
const reportDownload=await downloaded;
assert.ok(reportDownload.suggestedFilename().endsWith('.xlsx'));
const exported=new ExcelJS.Workbook(); await exported.xlsx.readFile(await reportDownload.path());
assert.deepEqual(exported.worksheets.map(sheet=>sheet.name),['TVV','Nhóm']);
assert.equal(settings.visible,true);
await mkdir('outputs/ban-dinh-ui',{recursive:true});
for(const width of [1440,768,375]) {
 await admin.setViewportSize({width,height:1000});
 await admin.screenshot({path:`outputs/ban-dinh-ui/admin-${width}.png`,fullPage:true});
 assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
const user=await context.newPage(); user.on('pageerror',e=>errors.push(e.message));
await user.goto('http://localhost:3000');
await user.getByRole('link',{name:'Bán đỉnh 3.0',exact:true}).click();
await user.waitForFunction(()=>document.querySelector('#ban-dinh-consultations')?.matches(':disabled'));
await admin.getByRole('button',{name:'Bắt đầu',exact:true}).click();
await user.waitForFunction(()=>!document.querySelector('#ban-dinh-consultations')?.matches(':disabled'));
const pollingStart=reportRequests;
await admin.waitForTimeout(4300);
assert.ok(reportRequests>=pollingStart+2,'admin must refresh every two seconds');
await user.getByLabel('Số cuộc tư vấn cá nhân',{exact:true}).fill('10');
await user.getByLabel('Số hợp đồng khai thác mới',{exact:true}).fill('2');
await user.getByRole('button',{name:'Lưu số liệu'}).click();
await user.getByText('Đã lưu số liệu.',{exact:true}).waitFor();
await user.reload();
assert.equal(await user.getByLabel('Số cuộc tư vấn cá nhân',{exact:true}).inputValue(),'10');
await user.getByLabel('Số cuộc tư vấn cá nhân',{exact:true}).fill('12');
await user.getByRole('button',{name:'Lưu số liệu'}).click();
await user.getByText('Đã lưu số liệu.',{exact:true}).waitFor();
assert.equal(entry.consultations,12); assert.equal(entry.contracts,2);
await admin.getByRole('button',{name:'Làm mới số liệu',exact:true}).click();
await admin.getByRole('cell',{name:'12',exact:true}).waitFor();
await admin.getByRole('cell',{name:'2',exact:true}).waitFor();
assert.equal(await admin.locator('.ban-dinh-report-totals strong').nth(0).textContent(),'12');
assert.equal(await admin.locator('.ban-dinh-report-totals strong').nth(1).textContent(),'2');
admin.once('dialog',dialog=>dialog.dismiss());
await admin.getByRole('button',{name:'Kết thúc',exact:true}).click();
assert.equal(session.running,true,'cancelling must leave the session running');
admin.once('dialog',dialog=>dialog.accept());
await admin.getByRole('button',{name:'Kết thúc',exact:true}).click();
await admin.getByText('Đã kết thúc · TVV không thể nhập số liệu',{exact:true}).waitFor();
await user.waitForFunction(()=>document.querySelector('#ban-dinh-consultations')?.matches(':disabled'));
await admin.waitForTimeout(500);
const stoppedRequests=reportRequests;
await admin.waitForTimeout(4300);
assert.equal(reportRequests,stoppedRequests,'admin polling must stop after end');
for(const width of [1440,768,375]) {
 await user.setViewportSize({width,height:1000});
 await user.screenshot({path:`outputs/ban-dinh-ui/user-${width}.png`,fullPage:true});
 assert.equal(await user.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
assert.deepEqual(errors,[]);
await browser.close();
console.log('Bán đỉnh UI passed: tabs, banner upload, visibility, banner navigation, save/reload/update, 375/768/1440 layouts. API writes mocked.');
