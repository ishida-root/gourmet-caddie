function loadGenres(){
  try{var g=localStorage.getItem('gc_genres');if(g)GENRES=JSON.parse(g);}catch(e){}
}
function saveGenres(){
  try{localStorage.setItem('gc_genres',JSON.stringify(GENRES));}catch(e){}
}
function updateGenreDatalist(){
  var dl=document.getElementById('genreList');
  if(!dl)return;
  dl.innerHTML=GENRES.map(function(g){return'<option value="'+esc(g)+'">';}).join('');
}
function openGenreModal(){
  renderGenreTags();
  openModal('genreModal');
}
function renderGenreTags(){
  var el=document.getElementById('genreTagList');
  if(!el)return;
  el.innerHTML=GENRES.map(function(g,i){
    return'<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:20px;font-size:13px">'+esc(g)+'<button onclick="deleteGenre('+i+')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px;padding:0;line-height:1" title="削除">×</button></span>';
  }).join('');
}
function addGenre(){
  var val=document.getElementById('genreInput').value.trim();
  if(!val)return;
  if(GENRES.indexOf(val)>=0){alert('すでに登録されています');return;}
  GENRES.push(val);
  saveGenres();
  document.getElementById('genreInput').value='';
  renderGenreTags();
  updateGenreDatalist();
}
function deleteGenre(idx){
  GENRES.splice(idx,1);
  saveGenres();
  renderGenreTags();
  updateGenreDatalist();
}
/* ============================================================
   Chatwork 連携
   ============================================================ */
/* GitHub PATはlocalStorageで管理（設定画面から入力不要・ただし石田さんPCで一度保存必要） */
var GH_PAT_KEY='gc_gh_pat';
function loadChatworkSettings(){
  try{
    var d=localStorage.getItem('gc_cw_settings');
    if(d){
      var s=JSON.parse(d);
      var set=function(id,v){var el=document.getElementById(id);if(el)el.value=v||'';};
      set('cwSnsRoomId',s.snsRoomId);
      set('cwCsRoomId',s.csRoomId);
    }
  }catch(e){}
}
function saveChatworkSettings(){
  var get=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  var s={snsRoomId:get('cwSnsRoomId'),csRoomId:get('cwCsRoomId')};
  try{localStorage.setItem('gc_cw_settings',JSON.stringify(s));}catch(e){}
  var statusEl=document.getElementById('cwStatus');
  if(statusEl)statusEl.innerHTML='<span style="color:var(--green)">✓ 保存しました</span>';
  setTimeout(function(){var el=document.getElementById('cwStatus');if(el)el.innerHTML='';},2000);
  renderCwPreview();
}
function getCwSettings(){
  try{
    var d=localStorage.getItem('gc_cw_settings');
    var s=d?JSON.parse(d):{};
    /* GH PATはセッションから取得 */
    var sess=localStorage.getItem('gc_session');
    if(sess){
      var sessData=JSON.parse(sess);
      s.ghPat=sessData.ghPat||s.ghPat||'';
    }
    return s;
  }catch(e){return{};}
}

/* ---- GitHub Actions 経由でChatworkに送信 ---- */
var GH_OWNER='ishida-root';
var GH_REPO='gourmet-caddie';
var GH_WORKFLOW='notify.yml';
/* ルームIDを直接埋め込み（設定不要） */
var CW_SNS_ROOM='429357836';
var CW_CS_ROOM='380251579';
/* Netlify Function URL */
var NETLIFY_CW_URL='https://chatwork-notify.ishida-f2a.workers.dev';

async function ghDispatch(roomId,message,type,toIds){
  if(!roomId)return false;
  try{
    var res=await fetch(NETLIFY_CW_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        room_id:String(roomId),
        message:message,
        type:type||'message',
        to_ids:toIds||''
      })
    });
    return res.ok;
  }catch(e){return false;}
}

function buildSnsMessage(storeName,plan,salesBy,contactName,tel,email){
  return '[To:11138491][To:2904189]\n[info][title]📢 新規契約店舗 登録通知[/title]'
    +'\n店舗名：'+storeName
    +'\nプラン：'+plan
    +'\n担当者：'+contactName
    +(tel?'\nTEL：'+tel:'')
    +(email?'\nメール：'+email:'')
    +'\n営業担当：'+salesBy
    +'\n\n初期設定の準備をお願いします！[/info]';
}
function buildCsTaskBody(corpName,storeName,planName,salesBy){
  return '◆'+(salesBy||'')
    +'\n楽々販売登録承認をお願い致します。'
    +'\n・法人名(個人名)：'+corpName
    +'\n・店舗名：'+storeName
    +'\n・プラン名：'+planName;
}

async function notifyChatwork(storeName,plan,salesBy,contactName,tel,email,corpName){
  var s=getCwSettings();
  var snsRoom=CW_SNS_ROOM||(s.snsRoomId||'');
  var csRoom=CW_CS_ROOM||(s.csRoomId||'');
  var results=[];
  if(snsRoom){
    var snsMsg=buildSnsMessage(storeName,plan,salesBy,contactName,tel,email);
    var ok1=await ghDispatch(snsRoom,snsMsg,'message','');
    results.push({to:'SNS局',ok:ok1});
  }
  if(csRoom){
    var taskBody=buildCsTaskBody(corpName||contactName||storeName,storeName,plan,salesBy);
    var ok2=await ghDispatch(csRoom,taskBody,'task','8306474');
    results.push({to:'CSタスク',ok:ok2});
  }
  return results;
}

async function testChatwork(){
  var statusEl=document.getElementById('cwStatus');
  if(!statusEl)return;
  statusEl.innerHTML='<span style="color:var(--amber)">送信中...</span>';
  saveChatworkSettings();
  var s=getCwSettings();
  if(!s.ghPat){statusEl.innerHTML='<span style="color:var(--red)">✗ GitHub Personal Access Tokenを入力してください</span>';return;}
  if(!s.snsRoomId&&!s.csRoomId){statusEl.innerHTML='<span style="color:var(--red)">✗ ルームIDを少なくとも1つ入力してください</span>';return;}
  var results=await notifyChatwork('テスト店舗','パタープラン','テスト営業','テスト担当者','090-0000-0000','test@example.com','テスト法人');
  var allOk=results.every(function(r){return r.ok;});
  var detail=results.map(function(r){return r.to+':'+(r.ok?'✓':'✗');}).join(' / ');
  statusEl.innerHTML=allOk
    ?'<span style="color:var(--green)">✓ 送信キュー登録成功！('+detail+') Chatworkに数秒で届きます</span>'
    :'<span style="color:var(--red)">✗ 失敗 ('+detail+') — GitHub PATまたはルームIDを確認してください</span>';
}

function renderCwPreview(){
  var el=document.getElementById('cwPreview');
  if(!el)return;
  var snsMsg=buildSnsMessage('◯◯焼肉 渋谷店','アイアンプラン','山田 花子','店長 鈴木','090-XXXX-XXXX','suzuki@example.com');
  var taskBody=buildCsTaskBody('株式会社竹山','◯◯焼肉 渋谷店','アイアンプラン','山田 花子');
  el.textContent='【SNS局 → メッセージ】\n'+snsMsg+'\n\n【CS → タスク作成】\n'+taskBody;
}

/* ============================================================
   社員マスタ（STAFF_MEMBERS）
   role: 'sales'=営業, 'sns'=SNS, 'office'=事務, 'president'=社長
   ============================================================ */
var STAFF_MEMBERS=[
  {id:'sp1',name:'結城 康大',role:'sales',retired:false},
  {id:'sp2',name:'中 千明',role:'sales',retired:false},
  {id:'sp3',name:'町頭 剛志',role:'sales',retired:false},
  {id:'sp4',name:'寺薗 克浩',role:'sales',retired:false},
  {id:'sp5',name:'小豆澤 由莉',role:'sales',retired:false},
  {id:'sp6',name:'村田 晃大',role:'sales',retired:false},
  {id:'sp7',name:'田中 拓也',role:'sales',retired:false},
  {id:'sp8',name:'石田 温子',role:'sns',retired:false},
  {id:'sp9',name:'塚井 亜衣',role:'office',retired:false},
  {id:'sp10',name:'松本 繁樹',role:'office',retired:false},
  {id:'sp11',name:'岩佐 彩加',role:'office',retired:false},
  {id:'sp12',name:'松本 英',role:'office',retired:false},
  {id:'sp13',name:'今富 信至',role:'president',retired:false}
];
var SALES_PERSONS=STAFF_MEMBERS;
function loadSalesPersons(){
  try{
    var d=localStorage.getItem('gc_staff_members');
    if(d){STAFF_MEMBERS=JSON.parse(d);SALES_PERSONS=STAFF_MEMBERS;return;}
    var old=localStorage.getItem('gc_sales_persons');
    if(old){var arr=JSON.parse(old);arr.forEach(function(p){if(!p.role)p.role='sales';});STAFF_MEMBERS=arr;SALES_PERSONS=STAFF_MEMBERS;}
  }catch(e){}
}
function saveSalesPersons(){
  try{localStorage.setItem('gc_staff_members',JSON.stringify(STAFF_MEMBERS));}catch(e){}
}
var ROLE_LABELS={sales:'営業',sns:'SNS',office:'事務',president:'社長'};
var ROLE_BADGE={sales:'b-blue',sns:'b-purple',office:'b-green',president:'b-amber'};
function getActiveStaff(roleFilter){
  return STAFF_MEMBERS.filter(function(p){
    if(p.retired)return false;
    if(roleFilter)return p.role===roleFilter;
    return true;
  });
}
/* 担当営業の全候補名 = ローカルの在籍営業マスタ ∪ 同期済みデータ内の担当名
   （担当営業マスタはlocalStorageのみで端末間共有されないため、
     同期済みの store.ourManager / store.salesBy も候補に含めて表示ズレを防ぐ） */
function allSalesNames(){
  var seen={},names=[];
  getActiveStaff('sales').forEach(function(p){if(!seen[p.name]){seen[p.name]=1;names.push(p.name);}});
  (DB.stores||[]).forEach(function(s){
    [s.ourManager,s.salesBy].forEach(function(n){if(n&&!seen[n]){seen[n]=1;names.push(n);}});
  });
  return names;
}
function updateSalesPersonSelects(){
  var salesOnly=getActiveStaff('sales');
  var salesOpts='<option value="">選択...</option>'+salesOnly.map(function(p){return'<option value="'+esc(p.name)+'">'+esc(p.name)+'</option>';}).join('');
  var sl=document.getElementById('sl-sales');
  if(sl){var pv=sl.value;sl.innerHTML=salesOpts;if(pv)sl.value=pv;}
  /* 弊社担当は同期データの担当名も候補に含める（端末間の反映ズレ対策） */
  var salesOpts2='<option value="">選択...</option>'+allSalesNames().map(function(n){return'<option value="'+esc(n)+'">'+esc(n)+'</option>';}).join('');
  var om=document.getElementById('sOurManager');
  if(om){var pv2=om.value;om.innerHTML=salesOpts2;if(pv2)om.value=pv2;}
  /* 退職済み担当者の表示更新 */
  refreshManagerDisplay();
  /* 面談担当者チェックボックスを更新 */
  renderInterviewerChecks();
}
function openSalesPersonModal(){renderStaffList();openModal('salesPersonModal');}
function renderSalesPersonList(){renderStaffList();}
function renderStaffList(){
  var active=STAFF_MEMBERS.filter(function(p){return!p.retired;});
  var retired=STAFF_MEMBERS.filter(function(p){return p.retired;});
  var ae=document.getElementById('spActiveList');
  var re=document.getElementById('spRetiredList');
  ae.innerHTML=active.length?active.map(function(p){
    return'<div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:var(--bg3);border-radius:var(--r);margin-bottom:5px">'
      +'<span style="flex:1;font-size:14px">'+esc(p.name)+'</span>'
      +'<span class="badge '+(ROLE_BADGE[p.role]||'b-gray')+'" style="font-size:11px">'+(ROLE_LABELS[p.role]||'—')+'</span>'
      +'<button class="btn btn-sm" onclick="openStaffEditModal(\''+p.id+'\')" style="font-size:12px">編集</button>'
      +'<button class="btn btn-sm" onclick="retireSalesPerson(\''+p.id+'\')" style="font-size:12px;color:var(--text3)">退職</button>'
      +'</div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3)">在籍中のメンバーなし</div>';
  re.innerHTML=retired.length?retired.map(function(p){
    var sc=DB.stores.filter(function(s){return s.ourManager===p.name;}).length;
    return'<div style="display:flex;align-items:center;gap:6px;padding:7px 10px;background:var(--bg3);border-radius:var(--r);margin-bottom:5px;opacity:0.6">'
      +'<span style="flex:1;font-size:14px">'+esc(p.name)+'<span style="font-size:11px;color:var(--text3);margin-left:6px">'+(ROLE_LABELS[p.role]||'')+(sc?' 担当'+sc+'店':'')+'</span></span>'
      +'<button class="btn btn-sm" onclick="reinstateSalesPerson(\''+p.id+'\')" style="font-size:12px">復帰</button>'
      +'<input type="text" placeholder="後任者名" id="successor_'+p.id+'" style="width:100px;font-size:12px;padding:4px 6px">'
      +'<button class="btn btn-sm btn-primary" onclick="assignSuccessor(\''+p.id+'\')" style="font-size:12px">後任</button>'
      +'</div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3)">退職済みなし</div>';
}

/* ============================================================
   担当者管理ヘルパー
   ============================================================ */
function isRetiredStaff(name){
  if(!name)return false;
  var p=STAFF_MEMBERS.find(function(x){return x.name===name;});
  return p?p.retired:false;
}
function refreshManagerDisplay(storeData){
  var sel=document.getElementById('sOurManager');
  var retiredSpan=document.getElementById('sOurManagerRetired');
  var histEl=document.getElementById('sManagerHistory');
  if(!sel||!retiredSpan)return;
  var curVal=storeData?storeData.ourManager:sel.value;
  /* 退職済みチェック */
  if(curVal&&isRetiredStaff(curVal)){
    sel.style.display='none';
    retiredSpan.style.display='';
    retiredSpan.textContent='担当なし（'+curVal+' 退職済み）';
    if(!sel.querySelector('option[value="'+curVal+'"]')){
      /* 退職済み選択肢を一時追加 */
      var opt=document.createElement('option');
      opt.value=curVal;opt.textContent=curVal;
      sel.appendChild(opt);
    }
    sel.value=curVal;
  }else{
    sel.style.display='';
    retiredSpan.style.display='none';
  }
  /* 履歴表示 */
  if(histEl){
    var log=(storeData&&storeData.managerLog)||[];
    if(log.length){
      histEl.innerHTML='履歴: '+log.map(function(l){return esc(l.from)+'→'+esc(l.to)+'('+fmtD(l.at)+')';}).join(' / ');
    }else{histEl.textContent='';}
  }
}
function assignManagerFromRetired(storeId){
  var s=DB.stores.find(function(x){return x.id===storeId;});
  if(!s)return;
  /* 営業ロールの在籍メンバーをpromptで選ばせる */
  var active=getActiveStaff('sales');
  if(!active.length){alert('在籍中の営業担当者がいません');return;}
  var names=active.map(function(p,i){return (i+1)+'. '+p.name;}).join('\n');
  var input=prompt('担当者を選んでください（番号を入力）:\n'+names);
  var idx=parseInt(input)-1;
  if(isNaN(idx)||idx<0||idx>=active.length)return;
  var newMgr=active[idx].name;
  var oldMgr=s.ourManager;
  s.managerLog=s.managerLog||[];
  if(oldMgr&&oldMgr!==newMgr){
    s.managerLog.push({from:oldMgr,to:newMgr,at:new Date().toISOString()});
  }
  s.ourManager=newMgr;
  saveItem('stores',s);
  refreshAll();
}

function renderInterviewerChecks(currentVal){
  var el=document.getElementById('crInterviewerChecks');
  if(!el)return;
  var selected=(currentVal||'').split(',').filter(Boolean);
  el.innerHTML=getActiveStaff().map(function(p){
    var chk=selected.indexOf(p.name)>=0;
    var roleColor=ROLE_BADGE[p.role]||'b-gray';
    return'<label style="display:flex;align-items:center;gap:3px;font-size:12px;cursor:pointer;padding:2px 7px;border-radius:20px;'
      +(chk?'background:var(--accent);color:#fff;border:1px solid var(--accent)':'background:var(--bg2);color:var(--text2);border:1px solid var(--border)')
      +'">'
      +'<input type="checkbox" value="'+esc(p.name)+'"'+(chk?' checked':'')+' onchange="refreshInterviewerStyle(this)" style="display:none"> '
      +esc(p.name)
      +'</label>';
  }).join('');
}
function refreshInterviewerStyle(cb){
  var label=cb.parentElement;
  if(cb.checked){
    label.style.background='var(--accent)';label.style.color='#fff';label.style.borderColor='var(--accent)';
  }else{
    label.style.background='var(--bg2)';label.style.color='var(--text2)';label.style.borderColor='var(--border)';
  }
}

function changeStaffRole(id,role){
  var p=STAFF_MEMBERS.find(function(x){return x.id===id;});
  if(p){p.role=role;saveSalesPersons();renderStaffList();updateSalesPersonSelects();}
}
function addSalesPerson(){
  var name=document.getElementById('spNameInput').value.trim();
  var roleEl=document.getElementById('spRoleSelect');
  var role=roleEl?roleEl.value:'sales';
  if(!name)return;
  if(STAFF_MEMBERS.find(function(p){return p.name===name;})){alert('すでに登録されています');return;}
  STAFF_MEMBERS.push({id:'sp'+Date.now(),name:name,role:role,retired:false});
  saveSalesPersons();
  document.getElementById('spNameInput').value='';
  renderStaffList();updateSalesPersonSelects();
}
function retireSalesPerson(id){
  if(!confirm('退職済みにしますか？担当店舗の履歴は残ります。'))return;
  var p=STAFF_MEMBERS.find(function(x){return x.id===id;});
  if(p){p.retired=true;p.retiredAt=new Date().toISOString();}
  saveSalesPersons();renderStaffList();updateSalesPersonSelects();
}
function reinstateSalesPerson(id){
  var p=STAFF_MEMBERS.find(function(x){return x.id===id;});
  if(p){p.retired=false;delete p.retiredAt;}
  saveSalesPersons();renderStaffList();updateSalesPersonSelects();
}
function assignSuccessor(retiredId){
  var rp=STAFF_MEMBERS.find(function(x){return x.id===retiredId;});
  var sn=document.getElementById('successor_'+retiredId).value.trim();
  if(!sn){alert('後任者名を入力してください');return;}
  if(!STAFF_MEMBERS.find(function(p){return p.name===sn&&!p.retired;})){
    if(!confirm(sn+'を新規メンバーとして追加しますか？'))return;
    STAFF_MEMBERS.push({id:'sp'+Date.now(),name:sn,role:rp.role||'sales',retired:false});
  }
  var count=0;
  DB.stores.forEach(function(s){
    if(s.ourManager===rp.name){
      s.ourManager=sn;s.prevManagers=s.prevManagers||[];
      s.prevManagers.push({name:rp.name,assignedAt:rp.retiredAt});
      saveItem('stores',s);count++;
    }
  });
  saveSalesPersons();renderStaffList();updateSalesPersonSelects();
  alert(count+'店舗の担当を'+sn+'に引き継ぎました');
}
function deleteSalesPerson(id){
  if(!confirm('削除しますか？'))return;
  STAFF_MEMBERS=STAFF_MEMBERS.filter(function(p){return p.id!==id;});
  SALES_PERSONS=STAFF_MEMBERS;
  saveSalesPersons();renderStaffList();updateSalesPersonSelects();
  closeModal('staffEditModal');
}
function openStaffEditModal(id){
  var p=STAFF_MEMBERS.find(function(x){return x.id===id;});
  if(!p)return;
  document.getElementById('seId').value=p.id;
  document.getElementById('seName').value=p.name;
  document.getElementById('seRole').value=p.role||'sales';
  openModal('staffEditModal');
}
function saveStaffEdit(){
  var id=document.getElementById('seId').value;
  var name=document.getElementById('seName').value.trim();
  var role=document.getElementById('seRole').value;
  if(!name){alert('名前を入力してください');return;}
  var p=STAFF_MEMBERS.find(function(x){return x.id===id;});
  if(!p)return;
  p.name=name;p.role=role;
  saveSalesPersons();renderStaffList();updateSalesPersonSelects();
  closeModal('staffEditModal');
}
