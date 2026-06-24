function toggleSidebar(){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('sidebarOverlay');
  if(!sb)return;
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
function closeSidebar(){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('sidebarOverlay');
  if(sb)sb.classList.remove('open');
  if(ov)ov.classList.remove('open');
}

function toggleTheme(){
  var isDark=document.body.classList.toggle('dark');
  document.getElementById('themeBtn').textContent=isDark?'☀ ライト':'🌙 ダーク';
  try{localStorage.setItem('gc_theme',isDark?'dark':'light');}catch(e){}
}
function initTheme(){
  var saved=localStorage.getItem('gc_theme');
  var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved==='dark'||(saved===null&&prefersDark)){
    document.body.classList.add('dark');
    document.getElementById('themeBtn').textContent='☀ ライト';
  }
}
initTheme();

function navigate(page){
  /* 営業ロールは設定ページにアクセス不可 */
  if(currentRole==='sales'&&page==='settings')return;
  closeSidebar(); /* スマホでナビ後に閉じる */
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  var pageEl=document.getElementById('page-'+page);
  if(pageEl)pageEl.classList.add('active');
  var items=document.querySelectorAll('.nav-item');
  items.forEach(function(item){
    if(item.getAttribute('onclick')==="navigate('"+page+"')")item.classList.add('active');
  });
  currentPage=page;
  var titles={dashboard:'ダッシュボード',sales:'営業入力',stores:'店舗管理',schedule:'投稿スケジュール',check:'事前チェック',plans:'プラン管理',influencers:'インフルエンサー管理',casting:'キャスティング履歴',creators:'クリエイター管理',corporations:'法人管理',settings:'設定',accounting:'経理管理'};
  document.getElementById('page-title').textContent=titles[page]||page;
  var btnLabels={dashboard:'＋ 店舗追加',sales:'＋ 店舗入力',stores:'＋ 店舗追加',schedule:'＋ 追加',check:'＋ 店舗追加',plans:'＋ プラン追加',influencers:'＋ インフルエンサー追加',casting:'＋ キャスティング記録',creators:'＋ クリエイター追加',corporations:'＋ 法人追加',settings:''};
  document.getElementById('addBtn').textContent=btnLabels[page]||'＋ 新規追加';
  document.getElementById('addBtn').style.display=page==='settings'?'none':'';
  if(page==='settings'){
    loadChatworkSettings();renderCwPreview();loadUserList();
    var ghCard=document.getElementById('ghPatCard');
    if(ghCard)ghCard.style.display=(currentUser&&currentUser.email==='ishida@root-and-activation.co.jp')?'':'none';
  }
  if(page==='sales'){updateSalesPlanSelect();updateSalesPersonSelects();}
  if(page==='dashboard')renderDashboard();
  if(page==='stores'){renderStoreTable();updateCorpSelects();}
  if(page==='schedule'){
    renderSchedFilter();renderSchedule();renderCalendar();
    /* 営業ロールは追加ボタン非表示 */
    var addBtn=document.getElementById('addBtn');
    if(addBtn)addBtn.style.display=(currentRole==='sales'?'none':'');
  }
  if(page==='influencers'){
    renderInfluencers();
  }
  if(page==='accounting'){
    renderAccounting();
  }
  if(page==='check')renderCheckPage();
  if(page==='casting')renderCasting();
  if(page==='corporations')renderCorps();
  if(page==='creators')renderCreators();
  if(page==='plans'){renderPlans();renderRevSummary();}
}

function topAddBtn(){
  var m={
    dashboard:openStoreModal,
    sales:function(){document.getElementById('sl-name').focus();},
    stores:openStoreModal,
    schedule:openPostModal,
    check:openStoreModal,
    influencers:openInfluencerModal,
    casting:openCastingModal,
    corporations:openCorpModal,
    creators:openCreatorModal,
    plans:function(){document.getElementById('plName').focus();openModal&&document.getElementById('plName').scrollIntoView();}
  };
  var fn=m[currentPage];
  if(fn)fn();
}

function globalSearchFn(){
  if(currentPage==='stores')renderStoreTable();
  if(currentPage==='schedule')renderSchedule();
  if(currentPage==='influencers')renderInfluencers();
}

function updateSidebarStats(){
  /* サイドバーの数値だけ更新（ページ切り替えなし） */
  var active=DB.stores.filter(function(s){return s.status==='active';});
  var thisMon=DB.posts.filter(function(p){var d=new Date(p.date);return d.getFullYear()===NOW.getFullYear()&&d.getMonth()===NOW.getMonth();});
  var el;
  if(el=document.getElementById('ss-active'))el.textContent=active.length;
  if(el=document.getElementById('ss-posts'))el.textContent=thisMon.length;
  if(el=document.getElementById('nb-stores'))el.textContent=DB.stores.length;
  if(el=document.getElementById('nb-inf'))el.textContent=DB.influencers.length;
  if(el=document.getElementById('nb-creators'))el.textContent=DB.creators?DB.creators.length:0;
  if(el=document.getElementById('nb-plans'))el.textContent=DB.plans.length;
  if(el=document.getElementById('nb-invoices'))el.textContent=DB.invoices?DB.invoices.length:0;
  var alerts=generateAlerts();
  if(el=document.getElementById('nb-alerts'))el.textContent=alerts.length;
  updateSalesNotifBadge();
}
function refreshAll(){
  updateSidebarStats();
  if(currentPage==='dashboard'){renderDashboard();renderSalesNotifs();renderTodoList();}
  if(currentPage==='stores')renderStoreTable();
  if(currentPage==='schedule'){renderSchedFilter();renderSchedule();renderCalendar();}
  if(currentPage==='influencers')renderInfluencers();
  if(currentPage==='check')renderCheckPage();
  if(currentPage==='casting')renderCasting();
  if(currentPage==='corporations')renderCorps();
  if(currentPage==='plans'){renderPlans();renderRevSummary();}
  if(currentPage==='sales'){renderSalesNotifs();}
  if(currentPage==='creators')renderCreators();
}

/* 起動時初期化 */
loadSalesPersons();
updateSalesPersonSelects();
loadGenres();

/* 起動時にセッション確認 */
checkSession();
