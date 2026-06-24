var SUPA_URL='https://vwtcshwzetxnaedjhoej.supabase.co';
/* ============================================================
   認証管理
   ============================================================ */
var currentUser=null;
var currentRole=null; /* 'admin' or 'sales' */

async function doLogin(){
  var email=document.getElementById('loginEmail').value.trim();
  var pw=document.getElementById('loginPassword').value;
  var errEl=document.getElementById('loginError');
  if(!email||!pw){errEl.textContent='メールアドレスとパスワードを入力してください';return;}
  errEl.textContent='ログイン中...';
  try{
    var res=await fetch(SUPA_URL+'/auth/v1/token?grant_type=password',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPA_KEY},
      body:JSON.stringify({email:email,password:pw})
    });
    var data=await res.json();
    if(!res.ok){errEl.textContent='メールアドレスまたはパスワードが正しくありません';return;}
    currentUser=data.user;
    currentRole=(data.user.user_metadata&&data.user.user_metadata.role)||'sales';
    /* セッションを保存 */
    try{localStorage.setItem('gc_session',JSON.stringify({
      access_token:data.access_token,
      refresh_token:data.refresh_token,
      user:data.user,
      role:currentRole
    }));}catch(e){}
    showApp();
  }catch(e){errEl.textContent='ログインに失敗しました';}
}

function doLogout(){
  currentUser=null;currentRole=null;
  try{localStorage.removeItem('gc_session');}catch(e){}
  document.getElementById('mainApp').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginEmail').value='';
  document.getElementById('loginPassword').value='';
  document.getElementById('loginError').textContent='';
}

var _refreshTimer=null;
function showApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('mainApp').style.display='flex';
  applyRoleUI();
  loadDB().then(function(){renderDashboard();updateSidebarStats();updateCorpSelects();});
  if(_refreshTimer)clearInterval(_refreshTimer);
  _refreshTimer=setInterval(function(){refreshToken().catch(function(){});},30*60*1000);
}

function applyRoleUI(){
  var isSales=currentRole==='sales';
  /* 営業ロールは設定ページのみ非表示、それ以外は全部見れる */
  var hiddenForSales=['settings'];
  document.querySelectorAll('.nav-item').forEach(function(item){
    var onclick=item.getAttribute('onclick')||'';
    var match=onclick.match(/navigate\('(\w+)'\)/);
    if(match){
      var page=match[1];
      item.style.display=(isSales&&hiddenForSales.indexOf(page)>=0)?'none':'';
    }
  });
  /* ユーザー名表示 */
  var nameEl=document.getElementById('currentUserName');
  if(nameEl)nameEl.textContent=(currentUser&&currentUser.email||'').split('@')[0];
  /* 役割バッジ */
  var roleEl=document.getElementById('currentUserRole');
  if(roleEl){roleEl.textContent=isSales?'営業':'管理';roleEl.className='badge '+(isSales?'b-blue':'b-green');}
  /* 追加ボタンは全員表示 */
  var addBtn=document.getElementById('addBtn');
  if(addBtn)addBtn.style.display='';
}


/* ============================================================
   ユーザー管理（管理者のみ）
   ============================================================ */


function saveGhPat(){
  var pat=document.getElementById('ghPatInput').value.trim();
  var statusEl=document.getElementById('ghPatStatus');
  if(!pat){statusEl.innerHTML='<span style="color:var(--red)">PATを入力してください</span>';return;}
  try{
    var sess=JSON.parse(localStorage.getItem('gc_session')||'{}');
    sess.ghPat=pat;
    localStorage.setItem('gc_session',JSON.stringify(sess));
    statusEl.innerHTML='<span style="color:var(--green)">✓ 保存しました</span>';
    document.getElementById('ghPatInput').value='';
    setTimeout(function(){statusEl.innerHTML='';},2000);
  }catch(e){statusEl.innerHTML='<span style="color:var(--red)">エラー</span>';}
}

async function changePassword(){
  var pw=document.getElementById('newPassword').value;
  var pw2=document.getElementById('newPasswordConfirm').value;
  var statusEl=document.getElementById('pwChangeStatus');
  if(!pw){statusEl.innerHTML='<span style="color:var(--red)">パスワードを入力してください</span>';return;}
  if(pw.length<6){statusEl.innerHTML='<span style="color:var(--red)">6文字以上で入力してください</span>';return;}
  if(pw!==pw2){statusEl.innerHTML='<span style="color:var(--red)">パスワードが一致しません</span>';return;}
  statusEl.innerHTML='<span style="color:var(--amber)">変更中...</span>';
  try{
    var sess=JSON.parse(localStorage.getItem('gc_session')||'{}');
    var token=sess.access_token;
    if(!token){statusEl.innerHTML='<span style="color:var(--red)">ログインし直してください</span>';return;}
    var res=await fetch(SUPA_URL+'/auth/v1/user',{
      method:'PUT',
      headers:{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+token},
      body:JSON.stringify({password:pw})
    });
    if(res.ok){
      statusEl.innerHTML='<span style="color:var(--green)">✓ パスワードを変更しました</span>';
      document.getElementById('newPassword').value='';
      document.getElementById('newPasswordConfirm').value='';
    }else{
      var d=await res.json();
      statusEl.innerHTML='<span style="color:var(--red)">変更失敗: '+(d.msg||d.error||'エラー')+'</span>';
    }
  }catch(e){statusEl.innerHTML='<span style="color:var(--red)">エラー: '+e.message+'</span>';}
}

async function inviteUser(){
  var email=document.getElementById('inviteEmail').value.trim();
  var role=document.getElementById('inviteRole').value;
  var pw=document.getElementById('invitePassword').value.trim();
  var statusEl=document.getElementById('inviteStatus');
  if(!email){statusEl.innerHTML='<span style="color:var(--red)">メールアドレスを入力してください</span>';return;}
  if(!pw||pw.length<6){statusEl.innerHTML='<span style="color:var(--red)">パスワードを6文字以上で入力してください</span>';return;}
  statusEl.innerHTML='<span style="color:var(--amber)">作成中（GitHub Actions経由）...</span>';
  try{
    var s=getCwSettings();
    if(!s.ghPat){statusEl.innerHTML='<span style="color:var(--red)">GitHub PATが設定されていません</span>';return;}
    var res=await fetch(
      'https://api.github.com/repos/ishida-root/gourmet-caddie/actions/workflows/notify.yml/dispatches',
      {
        method:'POST',
        headers:{'Authorization':'Bearer '+s.ghPat,'Accept':'application/vnd.github+json','Content-Type':'application/json'},
        body:JSON.stringify({
          ref:'main',
          inputs:{action:'create_user',email:email,role:role,password:pw}
        })
      }
    );
    if(res.status===204){
      statusEl.innerHTML='<span style="color:var(--green)">✓ 作成リクエストを送信しました！<br>GitHub Actions → Actions タブで結果を確認してください。<br>完了後、そのメアドでログインできます。</span>';
      document.getElementById('inviteEmail').value='';
      document.getElementById('invitePassword').value='';
    }else{
      statusEl.innerHTML='<span style="color:var(--red)">送信失敗（GitHub PATを確認してください）</span>';
    }
  }catch(e){
    statusEl.innerHTML='<span style="color:var(--red)">エラー: '+e.message+'</span>';
  }
}

async function loadUserList(){
  var el=document.getElementById('userList');
  if(!el)return;
  /* anon keyでは全ユーザー一覧は取れないため、案内テキストを表示 */
  el.innerHTML='<div style="font-size:13px;color:var(--text3)">ユーザー一覧はSupabaseダッシュボード → Authentication → Users で確認できます。<br><a href="https://supabase.com/dashboard/project/vwtcshwzetxnaedjhoej/auth/users" target="_blank" style="color:var(--accent)">Supabaseを開く ↗</a></div>';
}

async function checkSession(){
  try{
    var s=localStorage.getItem('gc_session');
    if(s){
      var sess=JSON.parse(s);
      if(sess&&sess.user&&sess.access_token){
        /* トークンリフレッシュを試みる */
        if(sess.refresh_token){
          try{
            var res=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
              method:'POST',
              headers:{'Content-Type':'application/json','apikey':SUPA_KEY},
              body:JSON.stringify({refresh_token:sess.refresh_token})
            });
            if(res.ok){
              var data=await res.json();
              sess.access_token=data.access_token;
              sess.refresh_token=data.refresh_token||sess.refresh_token;
              localStorage.setItem('gc_session',JSON.stringify(sess));
            }
          }catch(e){}
        }
        currentUser=sess.user;
        currentRole=sess.role||'sales';
        showApp();
        return;
      }
    }
  }catch(e){}
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('mainApp').style.display='none';
}
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dGNzaHd6ZXR4bmFlZGpob2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzM3MTgsImV4cCI6MjA5NDIwOTcxOH0.S10RHDE7wvKUMa2SxeoNvkgg6TtiMInw7ax6J5ZuMZk';
var TABLES=['stores','posts','influencers','castings','plans','salesnotifs','creators','corporations','invoices'];

/* ============================================================
   APIレイヤー（ここを将来書き換えると別サーバーに移行できる）
   ============================================================ */
function apiUrl(table){return SUPA_URL+'/rest/v1/'+table;}
function apiHeaders(){
  var token=SUPA_KEY;
  try{var sess=JSON.parse(localStorage.getItem('gc_session')||'{}');if(sess.access_token)token=sess.access_token;}catch(e){}
  return{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+token,'Prefer':'return=minimal'};
}

async function refreshToken(){
  try{
    var sess=JSON.parse(localStorage.getItem('gc_session')||'{}');
    if(!sess.refresh_token)return false;
    var res=await fetch(SUPA_URL+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPA_KEY},
      body:JSON.stringify({refresh_token:sess.refresh_token})
    });
    if(res.ok){
      var data=await res.json();
      sess.access_token=data.access_token;
      sess.refresh_token=data.refresh_token||sess.refresh_token;
      localStorage.setItem('gc_session',JSON.stringify(sess));
      return true;
    }
  }catch(e){}
  return false;
}

async function apiFetch(table){
  var r=await fetch(apiUrl(table)+'?select=*&order=updated_at.asc',{headers:apiHeaders()});
  if(r.status===401){
    var ok=await refreshToken();
    if(ok){r=await fetch(apiUrl(table)+'?select=*&order=updated_at.asc',{headers:apiHeaders()});}
    else{doLogout();throw new Error('session expired');}
  }
  if(!r.ok)throw new Error('fetch '+table+' failed: '+r.status);
  var rows=await r.json();
  if(!Array.isArray(rows))return[];
  return rows.map(function(row){return row.data;}).filter(function(d){return d&&d.id;});
}
async function apiUpsert(table,item){
  var r=await fetch(apiUrl(table),{method:'POST',headers:Object.assign({},apiHeaders(),{'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({id:item.id,data:item})});
  if(r.status===401){
    var ok=await refreshToken();
    if(ok){r=await fetch(apiUrl(table),{method:'POST',headers:Object.assign({},apiHeaders(),{'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({id:item.id,data:item})});}
    else{doLogout();throw new Error('session expired');}
  }
  if(!r.ok){
    var errText=await r.text().catch(function(){return r.status;});
    console.error('[apiUpsert] '+table+' '+r.status+':',errText);
    throw new Error('upsert '+table+' failed: '+r.status+' '+errText);
  }
}
async function apiDelete(table,id){
  var r=await fetch(apiUrl(table)+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:apiHeaders()});
  if(!r.ok)throw new Error('delete '+table+' failed');
}

/* ============================================================
   同期ステータス表示
   ============================================================ */
function setSyncStatus(state,msg){
  var el=document.getElementById('syncStatus');
  if(!el)return;
  var styles={ok:'color:var(--green)',saving:'color:var(--amber)',error:'color:var(--red)'};
  var icons={ok:'✓',saving:'↑',error:'✗'};
  el.style.cssText='font-size:12px;font-family:"Noto Sans JP",sans-serif;padding:2px 8px;border-radius:4px;transition:all .3s;'+styles[state];
  el.textContent=(icons[state]||'')+(msg?' '+msg:'');
}

/* ============================================================
   DB読み込み・保存（Supabase経由、ローカルはキャッシュとして残す）
   ============================================================ */
/* 初期設定チェックリストの項目削減に伴う既存データ移行（冪等）
   旧10項目[FB,Meta,広告,IG,SNS,楽々,クリエイター,ヒアリング,キックオフ,初回撮影]
   → 新7項目[FB,Meta,広告,IG,SNS,楽々,初回撮影]（中間3項目は案件進捗タブへ移管） */
function migrateSetupChecks(){
  if(!DB.stores)return;
  DB.stores.forEach(function(s){
    if(s.setupChecks&&s.setupChecks.length===10){
      var c=s.setupChecks;
      s.setupChecks=[c[0],c[1],c[2],c[3],c[4],c[5],c[9]];
    }
  });
}

async function loadDB(){
  setSyncStatus('saving','読み込み中...');
  try{
    var results=await Promise.all(TABLES.map(function(t){return apiFetch(t);}));
    TABLES.forEach(function(t,i){
      var key=t==='salesnotifs'?'salesNotifs':t;
      DB[key]=results[i]||[];
    });
    if(!DB.plans)DB.plans=[];
    if(!DB.salesNotifs)DB.salesNotifs=[];
    migrateSetupChecks();
    try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e){}
    setSyncStatus('ok','同期済み');
  }catch(e){
    setSyncStatus('error','読込失敗 — 再試行中...');
    try{
      await new Promise(function(r){setTimeout(r,2000);});
      var results2=await Promise.all(TABLES.map(function(t){return apiFetch(t);}));
      TABLES.forEach(function(t,i){
        var key=t==='salesnotifs'?'salesNotifs':t;
        DB[key]=results2[i]||[];
      });
      if(!DB.plans)DB.plans=[];
      if(!DB.salesNotifs)DB.salesNotifs=[];
      migrateSetupChecks();
      try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e2){}
      setSyncStatus('ok','同期済み');
    }catch(e2){
      var cached=localStorage.getItem('adcore3');
      if(cached){try{var d=JSON.parse(cached);Object.assign(DB,d);if(!DB.plans)DB.plans=[];if(!DB.salesNotifs)DB.salesNotifs=[];}catch(e3){}}
      migrateSetupChecks();
      setSyncStatus('error','オフライン（キャッシュ表示中）');
    }
  }
}

async function saveItem(table,item){
  setSyncStatus('saving','保存中...');
  try{
    await apiUpsert(table,item);
    try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e){}
    setSyncStatus('ok','保存しました');
  }catch(e){
    console.error('[saveItem] '+table+' failed:',e);
    try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e2){}
    setSyncStatus('error','保存失敗: '+e.message);
  }
}

function monthKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function isMonthlyDone(s,key){return!!(s[key]&&s[key][monthKey()]);}
function toggleMonthlyDone(storeId,key){
  var s=DB.stores.find(function(x){return x.id===storeId;});
  if(!s)return;
  if(!s[key])s[key]={};
  s[key][monthKey()]=!s[key][monthKey()];
  saveItem('stores',s);
  renderStoreTable();
}

async function deleteItem(table,id){
  setSyncStatus('saving','削除中...');
  try{
    await apiDelete(table,id);
    try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e){}
    setSyncStatus('ok','削除しました');
  }catch(e){
    try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e2){}
    setSyncStatus('error','削除失敗');
  }
}
