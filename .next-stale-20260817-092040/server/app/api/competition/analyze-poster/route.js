"use strict";(()=>{var t={};t.id=2860,t.ids=[2860],t.modules={20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48132:(t,e,n)=>{n.r(e),n.d(e,{originalPathname:()=>y,patchFetch:()=>v,requestAsyncStorage:()=>g,routeModule:()=>m,serverHooks:()=>f,staticGenerationAsyncStorage:()=>x});var r={};n.r(r),n.d(r,{POST:()=>l});var i=n(49303),o=n(88716),a=n(60670),h=n(87070),c=n(85662);let p=`{
  "program_name": "",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "issue_deadline": "YYYY-MM-DD",
  "target_types": ["TVV", "Nh\xf3m", "ADS", "Hợp đồng"],
  "metric_type": "IP | AFYP | PĐT | Số HĐ | TVV hoạt động | Doanh thu nh\xf3m",
  "min_policy_ip": 0,
  "min_policy_afyp": 0,
  "eligible_products": [],
  "excluded_statuses": ["YCBH hết hiệu lực", "Từ chối", "Tr\xec ho\xe3n", "Hết hiệu lực"],
  "included_statuses": [],
  "reward_rules": [{
    "id": "",
    "reward_name": "",
    "reward_type": "reward_per_contract | reward_by_policy_pdt_table | top_n_newly_seen_contracts | top_n_earliest_contracts | reward_per_active_advisor | reward_by_revenue_tier | reward_by_product | reward_by_policy_count | custom_ai_rule",
    "target_type": "TVV | Nh\xf3m | ADS | Hợp đồng | C\xf4ng ty",
    "reward_recipient_type": "Hợp đồng | TVV | Nh\xf3m | ADS | C\xf4ng ty",
    "result_tab": "HĐ đạt | TVV đạt | Nh\xf3m đạt | ADS đạt",
    "condition_text": "",
    "threshold_value": 0,
    "threshold_operator": ">=",
    "calculation_logic": "",
    "thresholds": [],
    "reward_amount": 0,
    "reward_formula": "",
    "payout_scope": "per_contract | per_tvv | per_group | shared_group | custom",
    "payout_target": "contract | tvv | group",
    "split_method": "none | equal_per_active_tvv | equal_per_qualified_tvv | by_metric_ratio",
    "display_columns": ["reward_per_tvv", "group_reward_amount", "reward_note"],
    "note_template": "",
    "max_reward": null,
    "priority": 1
  }],
  "max_reward": null,
  "notes": "",
  "ai_summary": "",
  "confidence": 0,
  "needs_review": true,
  "extracted_text": ""
}

Nếu poster c\xf3 bảng bậc "PĐT/HĐ từ" với hai cột thưởng SPC v\xe0 HĐ c\xf2n lại, bắt buộc tạo DUY NHẤT một reward_rule c\xf3 reward_type = "reward_by_policy_pdt_table", target_type = "Hợp đồng", spc_products = [m\xe3 SPC], v\xe0 pdt_reward_tiers theo dạng [{"min_pdt":50000000,"spc_reward":"8%","other_reward":"6%"}]. min_pdt lu\xf4n l\xe0 số tiền VND; mức thưởng cố định l\xe0 số, c\xf2n tỷ lệ giữ chuỗi c\xf3 dấu %.

Nếu poster c\xf3 c\xe1c cụm như "hợp đồng nộp ph\xed sớm nhất", "hợp đồng nộp ph\xed mới nhất", "hợp đồng đầu ti\xean", "top hợp đồng nộp ph\xed", "hồ sơ nộp ph\xed sớm nhất", "hợp đồng ph\xe1t sinh mới" th\xec d\xf9ng reward_type "top_n_newly_seen_contracts". Đặt top_n theo poster, order_by "first_seen_at_asc" cho sớm nhất/đầu ti\xean v\xe0 "first_seen_at_desc" cho mới nhất. Kh\xf4ng d\xf9ng top_n_earliest_contracts nếu dữ liệu kh\xf4ng c\xf3 giờ thu ph\xed.

Ph\xe2n loại target_type bắt buộc theo từng reward_rule:
- Nếu condition_text c\xf3 "Tổng doanh thu/nh\xf3m", "Doanh thu nh\xf3m", "Tổng IP nh\xf3m", "Tổng AFYP nh\xf3m", "theo nh\xf3m", "mỗi nh\xf3m" th\xec target_type = "Nh\xf3m".
- Nếu condition_text c\xf3 "hợp đồng", "HĐ", "nộp ph\xed sớm nhất", "nộp ph\xed mới nhất" th\xec target_type = "Hợp đồng".
- Nếu điều kiện theo TVV/tư vấn vi\xean/c\xe1 nh\xe2n th\xec target_type = "TVV".
- target_type chỉ l\xe0 đối tượng d\xf9ng để x\xe9t điều kiện, kh\xf4ng phải l\xfac n\xe0o cũng l\xe0 đối tượng nhận thưởng.
- Nếu poster/rule c\xf3 KPI hoặc điều kiện li\xean quan đến Nh\xf3m như "Tổng doanh thu/nh\xf3m", "Doanh thu nh\xf3m", "Tổng IP nh\xf3m", "Tổng AFYP nh\xf3m", "Chỉ ti\xeau nh\xf3m", "KPI nh\xf3m", "Nh\xf3m đạt", "Theo nh\xf3m", "Mỗi nh\xf3m", "Nh\xf3m c\xf3 doanh thu", "Số HĐ/nh\xf3m", "TVV hoạt động trong nh\xf3m" th\xec bắt buộc đặt target_type = "Nh\xf3m", reward_recipient_type = "Nh\xf3m", result_tab = "Nh\xf3m đạt".

Ph\xe2n loại reward_recipient_type bắt buộc theo từng reward_rule:
- Nếu cụm thưởng c\xf3 "/HĐ", "/hợp đồng", "mỗi HĐ", "mỗi hợp đồng" th\xec reward_recipient_type = "Hợp đồng".
- Nếu cụm thưởng c\xf3 "/TVV hoạt động", "/TVV", "mỗi TVV", "tư vấn vi\xean" th\xec reward_recipient_type = "TVV", trừ khi rule l\xe0 KPI/điều kiện theo Nh\xf3m th\xec vẫn đặt reward_recipient_type = "Nh\xf3m" v\xe0 tổng thưởng nh\xf3m = số TVV hoạt động * mức thưởng.
- Nếu cụm thưởng c\xf3 "/Nh\xf3m", "thưởng nh\xf3m", "mỗi nh\xf3m" th\xec reward_recipient_type = "Nh\xf3m".
- Nếu cụm thưởng c\xf3 "/ADS" hoặc "thưởng ADS" th\xec reward_recipient_type = "ADS".
- V\xed dụ "Tổng doanh thu/nh\xf3m >= 100tr, thưởng 500.000đ/TVV hoạt động": target_type = "Nh\xf3m", reward_recipient_type = "Nh\xf3m", result_tab = "Nh\xf3m đạt"; tổng thưởng nh\xf3m = số TVV hoạt động * 500.000đ.
- Với rule KPI nh\xf3m thưởng "xxxđ/TVV hoạt động", kết quả ch\xednh vẫn l\xe0 Nh\xf3m đạt: đặt result_tab = "Nh\xf3m đạt" v\xe0 kh\xf4ng tạo danh s\xe1ch TVV ri\xeang trừ khi poster y\xeau cầu r\xf5 danh s\xe1ch TVV đạt thưởng ri\xeang.
- Kh\xf4ng trộn kết quả của c\xe1c result_tab với nhau; tab kết quả phải theo result_tab/target_type nh\xf3m trước, sau đ\xf3 mới theo reward_recipient_type.`;function u(t){if(t instanceof Error)return t.message;if("string"==typeof t)return t;try{return JSON.stringify(t)}catch{return"Unknown analyze poster error."}}function s(t){return String(t??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase()}function d(t){return["tong doanh thu/nhom","tong doanh thu nhom","doanh thu nhom","tong ip nhom","tong afyp nhom","chi tieu nhom","kpi nhom","nhom dat","theo nhom","moi nhom","nhom co doanh thu","so hd/nhom","so hop dong/nhom","tvv hoat dong trong nhom"].some(e=>t.includes(e))}async function _(t){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("Chưa cấu h\xecnh OpenAI API key.");let n=function(){let t=(process.env.OPENAI_BASE_URL||"https://api.shopaikey.com/v1").replace(/\/+$/,""),e=process.env.OPENAI_COMPETITION_MODEL||"gpt-5.5",n=t.includes("api.openai.com")?"OpenAI ch\xednh thức":t.includes("shopaikey.com")?"ShopAIKey":"OpenAI-compatible endpoint";return{baseUrl:t,model:e,provider:n}}();console.info("[OpenAI] OPENAI_BASE_URL:",n.baseUrl),console.info("[OpenAI] model:",n.model),console.info("[OpenAI] Đang d\xf9ng:",n.provider);let r=["Bạn l\xe0 chuy\xean gia chuyển thể lệ chương tr\xecnh thi đua bảo hiểm từ c\xe2u văn th\xe0nh rule c\xf3 cấu tr\xfac.","H\xe3y đọc kỹ nội dung người d\xf9ng nhập, tr\xedch xuất đầy đủ điều kiện v\xe0 tạo rule JSON hợp lệ.","Kh\xf4ng tự th\xeam điều kiện, mức thưởng hoặc thời gian kh\xf4ng c\xf3 trong nội dung.","Chỉ trả về JSON, kh\xf4ng th\xeam markdown.","Nếu kh\xf4ng chắc phần n\xe0o, đặt needs_review=true, confidence thấp v\xe0 ghi warning trong notes.","Đặt extracted_text bằng nguy\xean văn nội dung người d\xf9ng cung cấp.","Schema bắt buộc:",p,"NỘI DUNG CHƯƠNG TR\xccNH DO NGƯỜI D\xd9NG NHẬP:",t].join("\n\n"),i=await fetch(`${n.baseUrl}/responses`,{method:"POST",headers:{Authorization:`Bearer ${e}`,"Content-Type":"application/json"},body:JSON.stringify({model:n.model,input:[{role:"user",content:[{type:"input_text",text:r}]}]})}),o=await i.json().catch(()=>({}));if(!i.ok)throw Error(o?.error?.message||"AI kh\xf4ng tạo được rule từ nội dung.");let a=o.output_text||o.output?.flatMap(t=>t.content??[]).map(t=>t.text??"").join("\n")||"";if(!a.trim())throw Error("AI kh\xf4ng trả về rule ph\xe2n t\xedch.");return function(t){let e=t.trim(),n=e.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]||e,r=n.indexOf("{"),i=n.lastIndexOf("}");return r>=0&&i>r?JSON.parse(n.slice(r,i+1)):JSON.parse(n)}(a)}async function l(t){let e=null;try{var n;let r=await t.json(),i=String(r.competitionText||r.competition_text||"").trim(),o=String(r.programId||r.program_id||"").trim(),a=String(r.createdBy||"dashboard").trim();if(!i)return h.NextResponse.json({error:"Chưa nhập nội dung chương tr\xecnh thi đua."},{status:400});if(i.length<20)return h.NextResponse.json({error:"Nội dung chương tr\xecnh qu\xe1 ngắn để tạo rule."},{status:400});let p={...n=await _(i),reward_rules:Array.isArray(n?.reward_rules)?n.reward_rules.map(t=>{let e=d(s([t?.target_type,t?.result_tab,t?.condition_text,t?.calculation_logic,t?.reward_formula,t?.reward_name,t?.prize_name,t?.condition?.text,t?.condition?.description,t?.condition?.metric].join(" ")));return{...t,target_type:e?"Nh\xf3m":t.target_type,reward_recipient_type:e?"Nh\xf3m":function(t){let e=String(t?.reward_recipient_type||t?.recipient_type||t?.recipient||t?.condition?.reward_recipient_type||t?.condition?.recipient_type||t?.condition?.recipient||"").trim();if(e)return e;let n=s([t?.reward_name,t?.prize_name,t?.condition_text,t?.calculation_logic,t?.reward_formula,t?.reward_type,t?.condition?.type,t?.condition?.text,t?.condition?.description].join(" "));return d(n)?"Nh\xf3m":n.includes("/tvv")||n.includes("tvv hoat dong")||n.includes("moi tvv")||n.includes("tu van vien")?"TVV":n.includes("/hd")||n.includes("/hop dong")||n.includes("moi hd")||n.includes("moi hop dong")||n.includes("pdt/hd")?"Hợp đồng":n.includes("/nhom")||n.includes("thuong nhom")||n.includes("moi nhom")?"Nh\xf3m":n.includes("/ads")||n.includes("thuong ads")?"ADS":n.includes("active_advisor")?"TVV":n.includes("per_contract")||n.includes("per_policy")||n.includes("policy_pdt")||n.includes("top_n")?"Hợp đồng":t?.target_type||"Hợp đồng"}(t),result_tab:e?"Nh\xf3m đạt":t.result_tab}}):[]};p.extracted_text=i;let l=String(p.program_name||"Chương tr\xecnh thi đua").trim(),m=(0,c.t)(),g={program_name:l,original_file_url:null,original_file_name:null,extracted_text:i,ai_summary:p.ai_summary||"",ai_rule:p,status:"Chờ x\xe1c nhận",start_date:p.start_date||null,end_date:p.end_date||null,issue_deadline:p.issue_deadline||null,target_types:p.target_types||[],confidence:Number(p.confidence??0),needs_review:!!(p.needs_review??!0),created_by:a||null,updated_at:new Date().toISOString()},x=o?m.from("competition_programs").update(g).eq("id",o):m.from("competition_programs").insert(g),{data:f,error:y}=await x.select("*").single();if(y)throw Error(u(y));return e=f.id,await m.from("competition_ai_logs").insert({program_id:f.id,prompt:i,ai_response:p,error:null}),h.NextResponse.json({program:f,aiRule:p})}catch(t){try{e&&await (0,c.t)().from("competition_ai_logs").insert({program_id:e,prompt:"analyze-poster",error:u(t)})}catch{}return h.NextResponse.json({error:u(t)},{status:500})}}let m=new i.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/competition/analyze-poster/route",pathname:"/api/competition/analyze-poster",filename:"route",bundlePath:"app/api/competition/analyze-poster/route"},resolvedPagePath:"C:\\Users\\Admin\\Downloads\\Project\\tvvbvntkh\\app\\api\\competition\\analyze-poster\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:g,staticGenerationAsyncStorage:x,serverHooks:f}=m,y="/api/competition/analyze-poster/route";function v(){return(0,a.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:x})}},85662:(t,e,n)=>{n.d(e,{t:()=>i});var r=n(3370);function i(){let t="https://supabase.bvntkhanhhoa.asia",e=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!t||!e)throw Error("Missing Supabase environment variables.");return(0,r.eI)(t,e,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};var e=require("../../../../webpack-runtime.js");e.C(t);var n=t=>e(e.s=t),r=e.X(0,[9276,5972,3370],()=>n(48132));module.exports=r})();