import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { getSupabaseAdmin } from '../lib/supabase';
import { createUserToken, USER_COOKIE } from '../lib/user-auth';
import { ADMIN_COOKIE, adminSessionToken } from '../lib/admin-auth';
const base='http://localhost:3000';
async function admin(path:string,body?:unknown) {
 const r=await fetch(base+'/api/admin/'+path,{method:body?'PUT':'GET',headers:{cookie:`${ADMIN_COOKIE}=${adminSessionToken()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const result=await r.json(); if(!r.ok) throw new Error(JSON.stringify(result)); return result;
}
async function main(){
 const before=await admin('ban-dinh-reports');
 const settings=await admin('ban-dinh-settings');
 assert.equal(settings.visible,true,'Ban dinh must be visible');
 const existing=new Set(before.rows.map((r:any)=>r.advisorCode));
 const {data,error}=await getSupabaseAdmin().from('authorized_users').select('advisor_code,full_name').eq('is_active',true).limit(1000);
 if(error) throw error;
 const candidates=(data||[]).filter(u=>!existing.has(u.advisor_code)).sort(()=>Math.random()-.5).slice(0,10);
 assert.equal(candidates.length,10);
 const runId=new Date().toISOString().replace(/[:.]/g,'-');
 const manifest={runId,before:before.totals,originalSession:before.session,entries:[] as any[]};
 await mkdir('outputs/ban-dinh-test',{recursive:true});
 const path=`outputs/ban-dinh-test/${runId}.json`;
 await writeFile(path,JSON.stringify(manifest,null,2));
 let started=false;
 try {
  if(!before.session.running){await admin('ban-dinh-session',{action:'start'});started=true;}
  let previousStart = 0;
  for(const [i,user] of candidates.entries()){
   const remaining = 1000 - (Date.now() - previousStart);
   if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
   previousStart = Date.now();
   const counts={consultations:(i+1)*5,contracts:i+1};
   const r=await fetch(base+'/api/ban-dinh',{method:'PUT',headers:{cookie:`${USER_COOKIE}=${createUserToken(user.advisor_code)}`,'Content-Type':'application/json'},body:JSON.stringify(counts)});
   const result=await r.json(); if(!r.ok) throw new Error(JSON.stringify(result));
   manifest.entries.push({...result.entry,advisorName:user.full_name});
   await writeFile(path,JSON.stringify(manifest,null,2));
  }
 }finally{if(started) await admin('ban-dinh-session',{action:'end'});}
 const after=await admin('ban-dinh-reports');
 assert.equal(after.totals.users,before.totals.users+10);
 assert.equal(after.totals.consultations,before.totals.consultations+275);
 assert.equal(after.totals.contracts,before.totals.contracts+55);
 assert.equal(after.session.running,before.session.running);
 await writeFile(path,JSON.stringify({...manifest,after:after.totals},null,2));
 console.log(JSON.stringify({passed:true,intervalMs:1000,added:10,addedConsultations:275,addedContracts:55,before:before.totals,after:after.totals,sessionRunning:after.session.running,manifest:path}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
