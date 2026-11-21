import { config } from 'dotenv'; config({path:'.env.local',quiet:true});
import {getSupabaseAdmin} from '../lib/supabase';
async function main(){const bucket=getSupabaseAdmin().storage.from('archive');for(const fresh of [false,true]){const {data,error}=await bucket.download('data/ban-dinh-session.json',fresh?{cacheNonce:crypto.randomUUID()}:undefined,{cache:'no-store'});console.log(JSON.stringify({fresh,error:error?.message,session:data?JSON.parse(await data.text()):null}));}}void main();
