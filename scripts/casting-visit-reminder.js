/* インフルエンサー来店予定の前日リマインダー
   GitHub Actionsの定期実行（毎日09:00 JST）からNode 20+で実行される。
   Supabaseからキャスティング・店舗・インフルエンサー・スケジュール投稿を取得し、
   翌日が来店予定日のキャスティングがあればChatworkのSNS局ルームに[toall]で通知する。 */

var SUPA_URL='https://vwtcshwzetxnaedjhoej.supabase.co';
var SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
var CW_TOKEN=process.env.CHATWORK_TOKEN;
var CW_SNS_ROOM='429357836';

function pad(n){return String(n).padStart(2,'0');}

function tomorrowJstDateStr(){
  /* ランナーはUTCで動く。cronは00:00 UTC = 09:00 JST に起動する前提のため、
     「UTC日付+1日」がJSTでの明日の日付になる。 */
  var now=new Date();
  var t=new Date(now.getTime()+24*60*60*1000);
  return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate());
}

async function fetchTable(table){
  var res=await fetch(SUPA_URL+'/rest/v1/'+table+'?select=*',{
    headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY}
  });
  if(!res.ok)throw new Error('fetch '+table+' failed: '+res.status);
  var rows=await res.json();
  return rows.map(function(r){return r.data;}).filter(function(d){return d&&d.id;});
}

function infAccountUrl(inf){
  if(!inf)return'';
  if(inf.url)return inf.url;
  if(!inf.handle)return'';
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  return(platUrl[inf.platform]||'')+inf.handle.replace(/^@/,'');
}

function buildMessage(storeName,infName,platform,dateStr,timeStr,infUrl){
  return '[toall]\n[info][title]📸 明日インフルエンサー来店予定です[/title]'
    +'\n店舗名：'+storeName
    +'\nインフルエンサー：'+infName+'さん'
    +(infUrl?'\nアカウント：'+infUrl:'')
    +(platform?'\n媒体：'+platform:'')
    +'\n来店予定日：'+dateStr.replace(/-/g,'/')+' '+(timeStr||'')
    +'\n\n明日、上記日程でインフルエンサーが来店予定です。'
    +'\n石田が不在の際など、お店の方から連絡が入った場合は一次対応をお願いする場合があります。[/info]';
}

async function sendChatwork(roomId,message){
  var res=await fetch('https://api.chatwork.com/v2/rooms/'+roomId+'/messages',{
    method:'POST',
    headers:{'X-ChatWorkToken':CW_TOKEN,'Content-Type':'application/x-www-form-urlencoded'},
    body:'body='+encodeURIComponent(message)
  });
  if(!res.ok){
    var text=await res.text().catch(function(){return String(res.status);});
    throw new Error('chatwork send failed: '+res.status+' '+text);
  }
}

async function main(){
  if(!SERVICE_KEY||!CW_TOKEN){
    console.error('SUPABASE_SERVICE_ROLE_KEY または CHATWORK_TOKEN が設定されていません');
    process.exit(1);
  }
  var target=tomorrowJstDateStr();
  var results=await Promise.all(['castings','stores','influencers','posts'].map(fetchTable));
  var castings=results[0],stores=results[1],influencers=results[2],posts=results[3];
  var matches=castings.filter(function(c){return c.visitDate===target;});
  console.log('target date: '+target+', matches: '+matches.length);
  for(var i=0;i<matches.length;i++){
    var c=matches[i];
    var store=stores.find(function(s){return s.id===c.storeId;});
    var inf=influencers.find(function(x){return x.id===c.infId;});
    var visitPost=posts.find(function(p){return p.castingId===c.id&&p.type==='inf_visit';});
    var timeStr=visitPost&&visitPost.date&&visitPost.date.indexOf('T')>=0?visitPost.date.split('T')[1].slice(0,5):'';
    var platform=(c.platforms&&c.platforms[0])||c.platform||'';
    var message=buildMessage(
      store?store.name:'不明',
      inf?inf.name:'不明',
      platform,
      target,
      timeStr,
      infAccountUrl(inf)
    );
    await sendChatwork(CW_SNS_ROOM,message);
    console.log('sent reminder for casting '+c.id);
  }
}

main().catch(function(err){console.error(err);process.exit(1);});
