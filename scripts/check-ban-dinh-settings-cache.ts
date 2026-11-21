import {config} from 'dotenv'; config({path:'.env.local',quiet:true});
import {getSupabaseAdmin} from '../lib/supabase';
async function main(){const storage=getSupabaseAdmin().storage.from('archive');for(const fresh of [false,true]){const {data,error}=await storage.download('data/ban-dinh-settings.json',fresh?{cacheNonce:crypto.randomUUID()}:undefined,{cache:'no-store'});if(error)throw error;const s=JSON.parse(await data!.text());console.log(JSON.stringify({fresh,banner:s.banner,showImage:s.showImage,visible:s.visible}));}}main();
