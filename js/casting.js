var INF_PLATFORM_LIST=[
  {id:'ig_feed',       label:'Instagram フィード'},
  {id:'ig_reel',       label:'Instagram リール'},
  {id:'ig_story',      label:'Instagram ストーリーズ'},
  {id:'ig_pin',        label:'Instagram ピン留め'},
  {id:'ig_collab',     label:'Instagram コラボ投稿'},
  {id:'tiktok',        label:'TikTok'},
  {id:'lemon8',        label:'Lemon8'},
  {id:'google_review', label:'Googleマップ クチコミ'},
  {id:'tabelog',       label:'食べログ'},
  {id:'yt_shorts',     label:'YouTube Shorts'},
];

function renderPlatformDetails(saved){
  var el=document.getElementById('iPlatformDetails');
  if(!el)return;
  el.innerHTML=INF_PLATFORM_LIST.map(function(pl,i){
    var d=saved&&saved[pl.id]?saved[pl.id]:{};
    var checked=!!d.enabled;
    var fee=d.fee||'';
    var taxIncl=d.taxIncl!==undefined?d.taxIncl:false;
    var transIncl=d.transIncl!==undefined?d.transIncl:false;
    var rowBg=i%2===1?'background:var(--bg3)':'background:var(--bg2)';
    return'<div style="'+rowBg+';border-bottom:1px solid var(--border);padding:8px 12px" id="plrow_'+pl.id+'">'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<input type="checkbox" id="plchk_'+pl.id+'" '+(checked?'checked':'')+' onchange="onPlatformCheck(\''+pl.id+'\')" style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent);flex-shrink:0">'
        +'<label for="plchk_'+pl.id+'" style="font-size:14px;font-weight:'+(checked?'500':'400')+';cursor:pointer;flex:1">'+pl.label+'</label>'
      +'</div>'
      +'<div id="pldetail_'+pl.id+'" style="display:'+(checked?'block':'none')+';margin-top:8px;padding-left:25px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
          +'<div style="display:flex;align-items:center;gap:6px">'
            +'<span style="font-size:13px;color:var(--text2)">PR費用</span>'
            +'<input type="number" id="plfee_'+pl.id+'" value="'+fee+'" placeholder="例: 50000" style="width:110px;font-size:13px;padding:4px 8px">'
            +'<span style="font-size:13px;color:var(--text3)">円</span>'
          +'</div>'
          +'<div style="display:flex;gap:4px">'
            +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(taxIncl?'var(--accent)':'var(--bg3)')+';color:'+(taxIncl?'#fff':'var(--text2)')+'" onclick="setPlatformTax(\''+pl.id+'\',true)">'
              +'<input type="radio" name="pltax_'+pl.id+'" value="1" '+(taxIncl?'checked':'')+' style="display:none"> 税込</label>'
            +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(!taxIncl?'var(--accent)':'var(--bg3)')+';color:'+(!taxIncl?'#fff':'var(--text2)')+'" onclick="setPlatformTax(\''+pl.id+'\',false)">'
              +'<input type="radio" name="pltax_'+pl.id+'" value="0" '+(!taxIncl?'checked':'')+' style="display:none"> 税別</label>'
          +'</div>'
          +'<div style="display:flex;gap:4px">'
            +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(transIncl?'var(--green)':'var(--bg3)')+';color:'+(transIncl?'#fff':'var(--text2)')+'" onclick="setPlatformTrans(\''+pl.id+'\',true)">'
              +'<input type="radio" name="pltrans_'+pl.id+'" value="1" '+(transIncl?'checked':'')+' style="display:none"> 交通費込</label>'
            +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(!transIncl?'var(--green)':'var(--bg3)')+';color:'+(!transIncl?'#fff':'var(--text2)')+'" onclick="setPlatformTrans(\''+pl.id+'\',false)">'
              +'<input type="radio" name="pltrans_'+pl.id+'" value="0" '+(!transIncl?'checked':'')+' style="display:none"> 交通費別</label>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}

function onPlatformCheck(pid){
  var chk=document.getElementById('plchk_'+pid);
  var detail=document.getElementById('pldetail_'+pid);
  var lbl=chk?chk.nextElementSibling:null;
  if(detail)detail.style.display=chk&&chk.checked?'block':'none';
  if(lbl)lbl.style.fontWeight=chk&&chk.checked?'500':'400';
}

function setPlatformTax(pid,val){
  renderPlatformDetails(getPlatformData());
  var chk=document.getElementById('plchk_'+pid);
  if(chk&&!chk.checked){chk.checked=true;onPlatformCheck(pid);}
  /* 再描画後に値を反映 */
  var d=getPlatformData();
  if(!d[pid])d[pid]={};
  d[pid].enabled=true;d[pid].taxIncl=val;
  renderPlatformDetails(d);
}

function setPlatformTrans(pid,val){
  var d=getPlatformData();
  if(!d[pid])d[pid]={};
  d[pid].enabled=true;d[pid].transIncl=val;
  renderPlatformDetails(d);
}

function getPlatformData(){
  var result={};
  INF_PLATFORM_LIST.forEach(function(pl){
    var chk=document.getElementById('plchk_'+pl.id);
    if(!chk)return;
    var enabled=chk.checked;
    var feeEl=document.getElementById('plfee_'+pl.id);
    var taxEl=document.querySelector('input[name="pltax_'+pl.id+'"]:checked');
    var transEl=document.querySelector('input[name="pltrans_'+pl.id+'"]:checked');
    result[pl.id]={
      enabled:enabled,
      fee:feeEl?Number(feeEl.value)||0:0,
      taxIncl:taxEl?taxEl.value==='1':false,
      transIncl:transEl?transEl.value==='1':false
    };
  });
  return result;
}

var editingInfId=null;

function openInfluencerModal(id){
  editingInfId=id||null;
  var titleEl=document.getElementById('infModalTitle');
  if(titleEl)titleEl.textContent=id?'インフルエンサーを編集':'インフルエンサーを追加';
  ['iName','iHandle','iUrl','iGenre','iContact','iAgency','iMemo','iFeeLow','iFeeHigh'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
  document.getElementById('iPlatform').value='Instagram';
  document.getElementById('iFollowers').value='';
  document.getElementById('iRating').value='';
  if(id){
    var inf=DB.influencers.find(function(x){return x.id===id;});
    if(inf){
      var map={iName:'name',iHandle:'handle',iUrl:'url',iPlatform:'platform',iFollowers:'followers',iGenre:'genre',iContact:'contact',iAgency:'agency',iMemo:'memo',iRating:'rating'};
      Object.keys(map).forEach(function(fid){var el=document.getElementById(fid);if(el&&inf[map[fid]]!==undefined)el.value=inf[map[fid]]||'';});
      /* fee range */
      if(inf.feeLow!==undefined){document.getElementById('iFeeLow').value=inf.feeLow||'';}
      else if(inf.fee){document.getElementById('iFeeLow').value=inf.fee;}
      document.getElementById('iFeeHigh').value=inf.feeHigh||'';
      renderPlatformDetails(inf.platformDetails||{});
    }else{
      renderPlatformDetails({});
    }
  }
  openModal('infModal');
}

function saveInfluencer(){
  var name=document.getElementById('iName').value.trim();
  if(!name){alert('名前を入力してください');return;}
  var isEdit=!!editingInfId;
  var id=isEdit?editingInfId:uid();
  var feeLow=document.getElementById('iFeeLow').value;
  var feeHigh=document.getElementById('iFeeHigh').value;
  var inf={
    id:id,
    name:name,
    handle:document.getElementById('iHandle').value,
    url:document.getElementById('iUrl').value,
    platform:document.getElementById('iPlatform').value,
    followers:document.getElementById('iFollowers').value,
    genre:document.getElementById('iGenre').value,
    feeLow:feeLow,
    feeHigh:feeHigh,
    fee:feeLow, /* 後方互換 */
    contact:document.getElementById('iContact').value,
    agency:document.getElementById('iAgency').value,
    rating:document.getElementById('iRating').value,
    memo:document.getElementById('iMemo').value,
    platformDetails:getPlatformData()
  };
  if(isEdit){
    var idx=DB.influencers.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.influencers[idx]=inf;}else{DB.influencers.push(inf);}
  }else{
    DB.influencers.push(inf);
  }
  closeModal('infModal');
  closeModal('infDetailModal');
  refreshAll();
  saveItem('influencers',inf);
}

function updatePostStatus(id,newStatus){
  var p=DB.posts.find(function(x){return x.id===id;});
  if(!p)return;
  p.status=newStatus;
  saveItem('posts',p);
  refreshAll();
}

function reschedulePost(id){
  closeModal('postModal');
  openPostModal(id);
}

var INV_FLOW=[
  {key:'pending',           label:'未受領',      icon:'📄', color:'var(--text3)',    bg:'var(--bg3)',        border:'var(--border)'},
  {key:'sns_received',      label:'SNS受領',     icon:'✅', color:'var(--accent)',   bg:'var(--accent-bg)', border:'var(--accent-border)'},
  {key:'accounting_submitted',label:'経理申請',  icon:'📊', color:'var(--amber)',    bg:'var(--amber-bg)',  border:'var(--amber-border)'},
  {key:'done',              label:'経理処理済み', icon:'🎉', color:'var(--green)',    bg:'var(--green-bg)',  border:'var(--green-border)'}
];

function renderInvFlow(inv){
  var cur=inv.status||'pending';
  var curIdx=INV_FLOW.findIndex(function(s){return s.key===cur;});
  return'<div style="display:flex;align-items:center;gap:3px">'
    +INV_FLOW.map(function(step,i){
      var done=i<=curIdx;
      var isNext=i===curIdx+1;
      var style='font-size:12px;padding:3px 7px;border-radius:5px;border:1px solid;white-space:nowrap;'
        +'background:'+(done?step.bg:'var(--bg3)')
        +';color:'+(done?step.color:'var(--text3)')
        +';border-color:'+(done?step.border:'var(--border)')
        +(isNext?';cursor:pointer;opacity:0.7':'');
      var click=isNext?'onclick="advanceInvFlow(\''+inv.id+'\',\''+step.key+'\')"':'';
      return'<span style="'+style+'" '+click+' title="'+(isNext?'クリックで次へ':'')+'">'+step.icon+' '+step.label+'</span>'
        +(i<INV_FLOW.length-1?'<span style="color:var(--text3);font-size:11px">›</span>':'');
    }).join('')
  +'</div>';
}

function renderTodoList(){
  var el=document.getElementById('dash-todo');
  if(!el)return;
  var today=new Date(); today.setHours(0,0,0,0);
  var items=[];
  /* ボタンスタイル */
  var bsBase='font-size:13px;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid;white-space:nowrap;flex-shrink:0;font-weight:500;';
  var bsAction=bsBase+'background:var(--accent);color:#fff;border-color:var(--accent);'; /* 青：完了アクション */
  var bsNav=bsBase+'background:var(--bg3);color:var(--text2);border-color:var(--border);'; /* グレー：画面遷移 */
  var bsAmber=bsBase+'background:var(--amber-bg);color:var(--amber);border-color:var(--amber-border);';
  var bsRed=bsBase+'background:var(--red-bg);color:var(--red);border-color:var(--red-border);';

  /* アクションバッジ生成ヘルパー */
  function actionBadge(text,color){
    var bg=color==='red'?'var(--red-bg)':color==='amber'?'var(--amber-bg)':color==='purple'?'var(--purple-bg)':'var(--accent-bg)';
    var fg=color==='red'?'var(--red)':color==='amber'?'var(--amber)':color==='purple'?'var(--purple)':'var(--accent)';
    var bd=color==='red'?'var(--red-border)':color==='amber'?'var(--amber-border)':color==='purple'?'var(--purple-border)':'var(--accent-border)';
    return'<span style="font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;border:1px solid '+bd+';background:'+bg+';color:'+fg+';margin-right:5px;vertical-align:middle">'+text+'</span>';
  }

  /* 対象店舗に未完了の予定投稿があるか（③と重複する撮影/投稿ステップの抑制用） */
  var hasActivePost=function(sid,types){
    return DB.posts.some(function(p){
      return p.storeId===sid&&types.indexOf(p.type)>=0
        &&p.status!=='done'&&p.status!=='visited'&&p.status!=='cancelled'&&p.status!=='approved';
    });
  };
  /* ① 案件進捗：次の未完了ステップ（フローに応じて1件提示） */
  DB.stores.filter(function(s){return s.status==='active';}).forEach(function(s){
    var prog=s.progress||{};
    var steps=progressStepsFor(s);
    var btn='<button style="'+bsNav+'" onclick="openStoreFromNotif(\''+s.id+'\',5)">進捗を開く →</button>';
    for(var i=0;i<steps.length;i++){
      var step=steps[i];
      var p=prog[step.key]||{};
      var done=step.accounts?isAccountsDone(p):(p.status==='done'||p.status==='na');
      if(done)continue;
      /* 撮影/投稿ステップは実際の予定投稿（③）と重複するため、制作系の予定があれば進捗行は省略
         （クリエイター動画は投稿自体が撮影→編集→納品→投稿の状態を持つため二重表示になる） */
      if((step.key==='shoot'||step.key==='post')&&hasActivePost(s.id,['shooting','video','image','reel','story']))break;
      if(step.key==='kickoff'&&p.salesJoin){
        items.push({priority:1,date:today,main:esc(s.name),sub:actionBadge('要対応','red')+'キックオフ 営業同席希望あり（未実施）',btns:btn});
      }else if(step.accounts){
        var missing=step.accounts.filter(function(n){return!(p.accountChecks||{})[n];});
        items.push({priority:2,date:today,main:esc(s.name),sub:actionBadge('要対応','amber')+'アカウント未連携：'+missing.join('・'),btns:btn});
      }else{
        items.push({priority:2,date:today,main:esc(s.name),sub:actionBadge('要対応','amber')+step.label+' 未完了',btns:btn});
      }
      break;
    }
  });

  /* ② 楽々販売未登録の店舗 */
  DB.stores.filter(function(s){return s.status==='active'&&!s.rakurakuRegistered;}).forEach(function(s){
    items.push({
      priority:1,date:today,
      main:esc(s.name),
      sub:actionBadge('要登録','red')+'楽々販売 未登録',
      btns:'<button style="'+bsAction+'" onclick="markRakurakuDone(\''+s.id+'\')">✓ 登録済みにする</button>'
           +'<button style="'+bsNav+'margin-left:4px" onclick="openStoreFromNotif(\''+s.id+'\')">詳細</button>'
    });
  });

  /* ③ 投稿スケジュール関連 */
  DB.posts.filter(function(p){
    return p.status!=='done'&&p.status!=='visited'&&p.status!=='cancelled'&&p.status!=='approved';
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);}).forEach(function(p){
    var dt=new Date(p.date);
    var daysLeft=Math.ceil((dt-today)/86400000);
    var isOverdue=dt<today;
    var priority=isOverdue?0:daysLeft<=3?1:daysLeft<=7?2:3;
    var dateStr=(dt.getMonth()+1)+'/'+dt.getDate()+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
    var inf=p.infId?DB.influencers.find(function(x){return x.id===p.infId;}):null;
    var cr=p.creatorId?DB.creators.find(function(x){return x.id===p.creatorId;}):null;
    var btnHtml='';

    if(p.type==='inf_visit'){
      var mainName=inf?esc(inf.name.split(/[\s　]/)[0]):'インフルエンサー';
      if(p.status==='unbooked'){
        var sub=actionBadge('要予約','red')+dateStr+' 来店（'+esc(storeName(p.storeId))+'）';
        btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\'booked\')">✓ 予約済みにする</button>';
        items.push({priority:priority,date:dt,main:mainName,sub:sub,btns:btnHtml});
      }else{
        var sub=actionBadge('来店予定','blue')+dateStr+' 来店（'+esc(storeName(p.storeId))+'）';
        btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\'visited\')">✓ 来店済みにする</button>'
               +'<button style="'+bsAmber+'margin-left:4px" onclick="reschedulePost(\''+p.id+'\')">リスケ</button>'
               +'<button style="'+bsRed+'margin-left:4px" onclick="updatePostStatus(\''+p.id+'\',\'cancelled\')">キャンセル</button>';
        items.push({priority:priority,date:dt,main:mainName,sub:sub,btns:btnHtml});
      }

    }else if(p.type==='inf_draft'){
      var mainName=inf?esc(inf.name.split(/[\s　]/)[0]):'インフルエンサー';
      var sub=actionBadge('要確認','blue')+dateStr+' 初稿確認（'+esc(storeName(p.storeId))+'）';
      btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\'approved\')">✓ 確認済みにする</button>';
      items.push({priority:priority,date:dt,main:mainName,sub:sub,btns:btnHtml});

    }else if(p.type==='inf_post'){
      var mainName=inf?esc(inf.name.split(/[\s　]/)[0]):'インフルエンサー';
      var sub=actionBadge(isOverdue?'投稿期限超過':'要投稿',isOverdue?'red':'blue')+dateStr+' 投稿（'+esc(storeName(p.storeId))+'）';
      btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\'done\')">✓ 投稿済みにする</button>';
      items.push({priority:priority,date:dt,main:mainName,sub:sub,btns:btnHtml});

    }else if(p.type==='shooting'){
      var crName=cr?esc(cr.crName):'クリエイター';
      var sub=actionBadge(isOverdue?'撮影期限超過':'撮影予定',isOverdue?'red':'blue')+dateStr+' 撮影（'+crName+'）';
      btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\'done\')">✓ 撮影済みにする</button>';
      items.push({priority:priority,date:dt,main:esc(storeName(p.storeId)),sub:sub,btns:btnHtml});

    }else if(p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story'){
      var typeL=TYPE_LABEL[p.type]||p.type;
      var st=p.status;
      var bdgLabel,bdgColor,nextStatus,nextLabel;
      if(st==='shoot_set'){
        bdgLabel=isOverdue?'撮影日超過':'撮影予定';bdgColor=isOverdue?'red':'blue';nextStatus='editing';nextLabel='✓ 撮影完了 → 編集中へ';
      }else if(st==='editing'){
        bdgLabel='編集中';bdgColor='amber';nextStatus='delivered';nextLabel='✓ 納品済みにする';
      }else if(st==='delivered'){
        bdgLabel='納品済み・投稿待ち';bdgColor='purple';nextStatus='scheduled';nextLabel='✓ 投稿予約済みにする';
      }else{
        /* scheduled（投稿予約済み）／旧draft */
        bdgLabel=isOverdue?'投稿期限超過':'要投稿';bdgColor=isOverdue?'red':'blue';nextStatus='done';nextLabel='✓ 投稿済みにする';
      }
      var sub=actionBadge(bdgLabel,bdgColor)+dateStr+' '+typeL;
      btnHtml='<button style="'+bsAction+'" onclick="updatePostStatus(\''+p.id+'\',\''+nextStatus+'\')">'+nextLabel+'</button>';
      items.push({priority:priority,date:dt,main:esc(storeName(p.storeId)),sub:sub,btns:btnHtml});
    }
  });

  /* 優先度→日付でソート */
  items.sort(function(a,b){return a.priority-b.priority||(a.date-b.date);});

  if(!items.length){
    el.innerHTML='<div class="empty-state" style="padding:20px">✓ 今のところやることはありません</div>';
    return;
  }
  el.innerHTML=items.map(function(item){
    var barColor=item.priority===0?'var(--red)':item.priority===1?'var(--amber)':'var(--border2)';
    var rowBg=item.priority===0?'background:var(--red-bg);':item.priority===1?'background:var(--amber-bg);':'';
    return'<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);border-left:3px solid '+barColor+';'+rowBg+'">'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:14px;font-weight:500;color:var(--text)">'+item.main+'</div>'
        +'<div style="font-size:12px;color:var(--text3);margin-top:3px">'+item.sub+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">'+item.btns+'</div>'
    +'</div>';
  }).join('');
}


function openGoalEdit(){
  var current=localStorage.getItem('gc_sales_goal')||'100000000';
  var val=prompt('年間売上目標を入力してください（円）\n例：100000000 → 1億円',current);
  if(val===null)return;
  var num=Number(val.replace(/[,，円]/g,''));
  if(!num||num<1){alert('正しい金額を入力してください');return;}
  localStorage.setItem('gc_sales_goal',String(num));
  if(typeof saveAppSetting==='function')saveAppSetting('sales_goal',num);
  refreshAll();
}

function markInvDone(invId){
  if(!DB.invoices)return;
  var inv=DB.invoices.find(function(x){return x.id===invId;});
  if(!inv)return;
  inv.status='done';
  saveItem('invoices',inv);
  refreshAll();
  if(currentPage==='accounting')renderAccounting();
}

function advanceInvFlow(invId,newStatus){
  if(!DB.invoices)return;
  var inv=DB.invoices.find(function(x){return x.id===invId;});
  if(!inv)return;
  inv.status=newStatus;
  saveItem('invoices',inv);
  renderAccounting();
}

function deleteInfluencer(id){
  if(!confirm('このインフルエンサーを削除しますか？'))return;
  DB.influencers=DB.influencers.filter(function(i){return i.id!==id;});
  closeModal('infDetailModal');
  refreshAll();
  deleteItem('influencers',id);
}

function fmtFeeRange(inf){
  var low=inf.feeLow!==undefined?inf.feeLow:inf.fee;
  var high=inf.feeHigh;
  if(!low&&!high)return'—';
  if(low&&high&&String(low)!==String(high))return Number(low).toLocaleString()+'〜'+Number(high).toLocaleString()+'円';
  return Number(low||high).toLocaleString()+'円';
}

function ratingStars(r){
  if(!r)return'';
  var n=parseInt(r);
  var stars='★'.repeat(n)+'☆'.repeat(5-n);
  var colors={5:'var(--green)',4:'var(--green)',3:'var(--amber)',2:'var(--amber)',1:'var(--red)'};
  return '<span style="color:'+colors[n]+';font-size:13px">'+stars+'</span>';
}

function openInfluencerDetail(id){
  var inf=DB.influencers.find(function(x){return x.id===id;});
  if(!inf)return;
  var platColor={Instagram:'#e1306c',TikTok:'#010101',YouTube:'#ff0000',X:'#1da1f2'};
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  /* アカウントURL決定 */
  var accountUrl=inf.url||(inf.handle?(platUrl[inf.platform]||'')+(inf.handle.replace('@','')):'');
  var castings=DB.castings.filter(function(c){return c.infId===id;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var totalFee=castings.reduce(function(s,c){return s+(Number(c.fee)||0);},0);
  var totalReach=castings.reduce(function(s,c){return s+(Number(c.reach)||0);},0);
  document.getElementById('infDetailTitle').textContent=inf.name+(inf.handle?' ('+inf.handle+')':'');
  var editBtn=document.getElementById('infDetailEditBtn');
  if(editBtn)editBtn.onclick=function(){closeModal('infDetailModal');openInfluencerModal(id);};
  document.getElementById('infDetailBody').innerHTML=
    /* プロフィールヘッダ */
    '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:18px">'
      +'<div style="width:48px;height:48px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>'
      +'<div style="flex:1">'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          +(accountUrl
            ?'<a href="'+esc(accountUrl)+'" target="_blank" rel="noopener" style="font-size:16px;font-weight:500;color:var(--accent);text-decoration:none">'+esc(inf.name)+'&nbsp;↗</a>'
            :'<span style="font-size:16px;font-weight:500">'+esc(inf.name)+'</span>'
          )
          +(inf.handle?'<span style="font-size:13px;color:'+(platColor[inf.platform]||'var(--text3)')+'">'+esc(inf.handle)+'</span>':'')
          +ratingStars(inf.rating)
        +'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">'
          +(inf.platform?'<span class="badge b-blue">'+esc(inf.platform)+'</span>':'')
          +(inf.genre?'<span class="badge b-gray">'+esc(inf.genre)+'</span>':'')
          +(inf.agency&&inf.agency!=='なし'?'<span class="badge b-gray">'+esc(inf.agency)+'</span>':'')
        +'</div>'
      +'</div>'
    +'</div>'
    /* 数値サマリー */
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px">'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:18px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--text)">'+(inf.followers?Number(inf.followers).toLocaleString():'—')+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">フォロワー</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:15px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--accent)">'+fmtFeeRange(inf)+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">PR 費用</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:18px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--green)">'+castings.length+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">起用回数</div></div>'
    +'</div>'
    /* 連絡先 */
    +(inf.contact?'<div style="margin-bottom:12px;padding:10px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px"><span style="color:var(--text3)">連絡先：</span><span style="color:var(--accent)">'+esc(inf.contact)+'</span></div>':'')
    /* メモ */
    +(inf.memo?'<div style="margin-bottom:16px;padding:10px 12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--r);font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap">'+esc(inf.memo)+'</div>':'')
    /* キャスティング履歴 */
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">キャスティング履歴</div>'
    +(castings.length===0
      ?'<div class="empty-state" style="padding:16px">まだ起用履歴がありません</div>'
      :('<div style="margin-bottom:12px;font-size:13px;color:var(--text3)">累計費用 <strong style="color:var(--text)">'+totalFee.toLocaleString()+'円</strong> ／ 累計リーチ <strong style="color:var(--text)">'+totalReach.toLocaleString()+'</strong></div>'
        +'<div class="table-wrap"><table><thead><tr><th>店舗</th><th>投稿日</th><th>媒体</th><th>費用</th><th>リーチ</th><th>成果メモ</th></tr></thead><tbody>'
        +castings.map(function(c){
          var pp=c.platforms&&c.platforms.length?c.platforms:(c.platform?[c.platform]:[]);
          var platCell=pp.length?pp.map(function(p){return'<span style="font-size:11px;padding:1px 5px;background:var(--accent-bg);color:var(--accent);border-radius:3px;margin:1px;display:inline-block">'+esc(p)+'</span>';}).join(''):'—';
          return '<tr><td>'+esc(storeName(c.storeId))+'</td><td class="td-mono">'+fmtD(c.date)+'</td><td>'+platCell+'</td><td class="td-mono">'+fmtMoney(c.fee)+'</td><td class="td-mono">'+(c.reach?Number(c.reach).toLocaleString():'—')+'</td><td style="color:var(--text3);max-width:160px">'+esc((c.result||'').slice(0,60))+'</td></tr>';
        }).join('')
        +'</tbody></table></div>'
      )
    )
    +'<div class="form-actions" style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">'
      +(function(){
        var pd=inf.platformDetails||{};
        var enabled=INF_PLATFORM_LIST.filter(function(pl){return pd[pl.id]&&pd[pl.id].enabled;});
        if(!enabled.length)return'';
        return'<div style="margin-bottom:14px">'
          +'<div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:8px">📱 対応媒体・費用</div>'
          +'<div style="display:flex;flex-wrap:wrap;gap:6px">'
          +enabled.map(function(pl){
            var d=pd[pl.id];
            var feeStr=d.fee?'¥'+Number(d.fee).toLocaleString()+(d.taxIncl?' 税込':' 税別'):'料金未設定';
            var transStr=d.transIncl?'交通費込':'交通費別';
            return'<div style="padding:6px 10px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--r);font-size:12px">'
              +'<div style="font-weight:500;color:var(--accent)">'+pl.label+'</div>'
              +'<div style="color:var(--text2);margin-top:2px">'+feeStr+' ・ '+transStr+'</div>'
            +'</div>';
          }).join('')
          +'</div></div>';
      })()
      +'<button class="btn-ghost-danger" onclick="deleteInfluencer(\''+id+'\')">削除</button>'
      +'<button class="btn" onclick="closeModal(\'infDetailModal\')">閉じる</button>'
      +'<button class="btn" onclick="closeModal(\'infDetailModal\');openCastingModal({infId:\''+id+'\'})">キャスティング登録</button>'
      +'<button class="btn btn-primary" onclick="closeModal(\'infDetailModal\');openInfluencerModal(\''+id+'\')">編集</button>'
    +'</div>';
  openModal('infDetailModal');
}

var editingCastId=null;
function openCastingModal(opts){
  updateCastSelects();
  editingCastId=null;
  ['cFee','cReach','cResult','cVisitDate','cDraftDate','cDate'].forEach(function(fid){
    var el=document.getElementById(fid);if(el)el.value='';
  });
  var ccb=document.getElementById('cContractSent');if(ccb)ccb.checked=false;
  /* 媒体選択は updateCastPlatformSelect() で初期化するためここでは不要 */
  var titleEl=document.getElementById('castModalTitle');
  if(titleEl)titleEl.textContent='キャスティング記録';
  if(opts){
    /* 編集モード */
    if(opts.editId){
      editingCastId=opts.editId;
      var ec=DB.castings.find(function(x){return x.id===opts.editId;});
      if(ec){
        if(titleEl)titleEl.textContent='キャスティングを編集';
        var set=function(fid,v){var el=document.getElementById(fid);if(el&&v)el.value=v;};
        set('cStore',ec.storeId);set('cInf',ec.infId);
        set('cFee',ec.fee);
        /* 媒体は INF選択後に更新してから復元 */
        setTimeout(function(){
          updateCastPlatformBoxes();
          /* 保存済み platforms（配列）またはlegacy platform（文字列）を復元 */
          var savedPlats=ec.platforms&&ec.platforms.length?ec.platforms:(ec.platform?[ec.platform]:[]);
          document.querySelectorAll('.cast-plat-chk').forEach(function(cb){
            var pl=INF_PLATFORM_LIST.find(function(p){return p.id===cb.value;});
            var label=pl?pl.label:cb.value;
            if(savedPlats.indexOf(label)>=0||savedPlats.indexOf(cb.value)>=0){
              cb.checked=true;
            }
          });
          onCastPlatformChange();
        },50);
        set('cReach',ec.reach);set('cResult',ec.result);
        set('cVisitDate',ec.visitDate);set('cDraftDate',ec.draftDate);set('cDate',ec.date);
        var ccbEdit=document.getElementById('cContractSent');if(ccbEdit)ccbEdit.checked=!!ec.contractSent;
      }
    }
    /* プリセット */
    if(opts.storeId){var s=document.getElementById('cStore');if(s)s.value=opts.storeId;}
    if(opts.infId){var i=document.getElementById('cInf');if(i)i.value=opts.infId;}
  }
  /* 日付ピッカー初期化 */
  var yr=new Date().getFullYear();
  makeDatePicker('cVisitDateWrap','cVisitDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeDatePicker('cDraftDateWrap','cDraftDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeDatePicker('cDateWrap','cDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeTimePicker('cVisitTimeWrap','cVisitTime');
  /* 編集時: 日付を復元 */
  if(opts&&opts.editId){
    var ec2=DB.castings.find(function(x){return x.id===opts.editId;});
    if(ec2){
      var setDp=function(wrapId,hidId,val){
        var wrap=document.getElementById(wrapId);if(wrap&&wrap._setDate)wrap._setDate(val||'');
      };
      setDp('cVisitDateWrap','cVisitDate',ec2.visitDate);
      /* 来店時間復元 */
      if(ec2.visitDate&&ec2.visitDate.includes('T')){
        var vt=ec2.visitDate.split('T')[1].slice(0,5);
        var vtWrap=document.getElementById('cVisitTimeWrap');
        if(vtWrap&&vtWrap._setTime)vtWrap._setTime(vt);
      }
      setDp('cDraftDateWrap','cDraftDate',ec2.draftDate);
      setDp('cDateWrap','cDate',ec2.date);
    }
  }
  /* INF選択時に媒体を更新 */
  var cInfEl=document.getElementById('cInf');
  if(cInfEl)cInfEl.onchange=function(){updateCastPlatformBoxes();};
  updateCastPlatformBoxes();
  openModal('castModal');
}

function updateCastPlatformBoxes(){
  var infId=(document.getElementById('cInf')||{}).value||'';
  var inf=DB.influencers.find(function(x){return x.id===infId;});
  var pd=inf&&inf.platformDetails?inf.platformDetails:{};
  var enabled=INF_PLATFORM_LIST.filter(function(pl){return pd[pl.id]&&pd[pl.id].enabled;});
  var showList=enabled.length?enabled:INF_PLATFORM_LIST;
  var box=document.getElementById('cPlatformBoxes');
  if(!box)return;
  box.innerHTML=showList.map(function(pl){
    var d=pd[pl.id];
    var feeStr=d&&d.fee?' <span style="font-size:12px;color:var(--accent)">¥'+Number(d.fee).toLocaleString()+'</span>':'';
    return'<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:20px;cursor:pointer;font-size:13px;white-space:nowrap;transition:background .1s,border-color .1s">'
      +'<input type="checkbox" value="'+pl.id+'" class="cast-plat-chk" onchange="onCastPlatformChange()" style="width:13px;height:13px;accent-color:var(--accent)">'
      +esc(pl.label)+feeStr
      +'</label>';
  }).join('');
  document.getElementById('cFee').value='';
  document.getElementById('cFeeTaxLabel').textContent='';
  document.getElementById('cFeeTransLabel').textContent='';
}
/* 後方互換: 旧コードからの呼び出しがあればBoxesにリダイレクト */
function updateCastPlatformSelect(){updateCastPlatformBoxes();}

function onCastPlatformChange(){
  var infId=(document.getElementById('cInf')||{}).value||'';
  var inf=DB.influencers.find(function(x){return x.id===infId;});
  var pd=inf&&inf.platformDetails?inf.platformDetails:{};
  /* チェック済みラベルのビジュアル更新 */
  document.querySelectorAll('.cast-plat-chk').forEach(function(cb){
    var lbl=cb.closest('label');
    if(!lbl)return;
    lbl.style.background=cb.checked?'var(--accent-bg)':'var(--bg2)';
    lbl.style.borderColor=cb.checked?'var(--accent)':'var(--border)';
    lbl.style.fontWeight=cb.checked?'500':'400';
  });
  /* 費用自動計算（INF媒体設定がある場合） */
  var checked=Array.from(document.querySelectorAll('.cast-plat-chk:checked'));
  if(!checked.length){
    document.getElementById('cFee').value='';
    document.getElementById('cFeeTaxLabel').textContent='';
    document.getElementById('cFeeTransLabel').textContent='';
    return;
  }
  var totalFee=0;var taxSet={};var transSet={};
  checked.forEach(function(cb){
    var d=pd[cb.value];
    if(d&&d.fee){totalFee+=Number(d.fee);taxSet[d.taxIncl?'税込':'税別']=1;transSet[d.transIncl?'交通費込':'交通費別途']=1;}
  });
  if(totalFee>0){
    document.getElementById('cFee').value=totalFee;
    document.getElementById('cFeeTaxLabel').textContent=Object.keys(taxSet).join('・');
    document.getElementById('cFeeTransLabel').textContent=Object.keys(transSet).join('・');
  }
}

function saveCasting(){
  var sid=document.getElementById('cStore').value;
  var iid=document.getElementById('cInf').value;
  var dt=document.getElementById('cDate').value;
  if(!sid||!iid){alert('店舗とインフルエンサーは必須です');return;}
  var isEdit=!!editingCastId;
  var visitDate=document.getElementById('cVisitDate').value;
  var draftDate=document.getElementById('cDraftDate').value;
  /* 複数選択された媒体を収集 */
  var platChks=Array.from(document.querySelectorAll('.cast-plat-chk:checked'));
  var platforms=platChks.map(function(cb){
    var pl=INF_PLATFORM_LIST.find(function(p){return p.id===cb.value;});
    return pl?pl.label:cb.value;
  });
  var platform=platforms[0]||''; /* 後方互換: 最初の媒体を単一フィールドにも保存 */
  var fee=document.getElementById('cFee').value;
  /* 編集時は既存IDを使う、新規時のみuid()生成 */
  var castId=isEdit?editingCastId:uid();
  /* 新規の場合：同じINFが既にあれば上書き扱いにする */
  if(!isEdit){
    var existing=DB.castings.find(function(x){return x.infId===iid;});
    if(existing){castId=existing.id;isEdit=true;}
  }
  var oldCastId=isEdit?castId:null;
  var c={
    id:castId,storeId:sid,infId:iid,date:dt,
    visitDate:visitDate,draftDate:draftDate,
    platform:platform,platforms:platforms,fee:fee,
    reach:document.getElementById('cReach').value,
    result:document.getElementById('cResult').value,
    contractSent:!!(document.getElementById('cContractSent')&&document.getElementById('cContractSent').checked)
  };
  /* 常に既存posts（同castingId）をSupabase＆メモリから先に削除してから再生成 */
  if(oldCastId){
    var toDelete=DB.posts.filter(function(p){return p.castingId===oldCastId;});
    toDelete.forEach(function(p){deleteItem('posts',p.id);});
    DB.posts=DB.posts.filter(function(p){return p.castingId!==oldCastId;});
  }
  if(isEdit){
    var eidx=DB.castings.findIndex(function(x){return x.id===c.id;});
    if(eidx>=0){DB.castings[eidx]=c;}else{DB.castings.push(c);}
  }else{
    DB.castings.push(c);
  }

  /* 投稿スケジュールに3ステップを自動登録 */
  var newPosts=[];
  if(visitDate){
    var visitTime=document.getElementById('cVisitTime')?document.getElementById('cVisitTime').value:'12:00';
    var vp={id:uid(),storeId:sid,infId:iid,type:'inf_visit',
      date:visitDate+'T'+visitTime,platform:platform,infFee:fee,
      status:'unbooked',note:'キャスティングID:'+c.id,castingId:c.id};
    DB.posts.push(vp);newPosts.push(vp);
  }
  if(draftDate){
    var dp={id:uid(),storeId:sid,infId:iid,type:'inf_draft',
      date:draftDate+'T12:00',platform:platform,
      status:'draft',note:'初稿確認 キャスティングID:'+c.id,castingId:c.id};
    DB.posts.push(dp);newPosts.push(dp);
  }
  if(dt){
    var pp={id:uid(),storeId:sid,infId:iid,type:'inf_post',
      date:dt+'T12:00',platform:platform,infFee:fee,
      status:'scheduled',note:'投稿予定 キャスティングID:'+c.id,castingId:c.id};
    DB.posts.push(pp);newPosts.push(pp);
  }

  closeModal('castModal');
  ['cFee','cReach','cResult','cVisitDate','cDraftDate','cDate'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  saveItem('castings',c);
  newPosts.forEach(function(p){saveItem('posts',p);});
  refreshAll();
}
function toggleCastContractSent(id){
  var c=DB.castings.find(function(x){return x.id===id;});
  if(!c)return;
  c.contractSent=!c.contractSent;
  saveItem('castings',c);
  renderCasting();
}

function openInvoiceFromCasting(castingId){
  var c=DB.castings.find(function(x){return x.id===castingId;});
  if(!c)return;
  openInvoiceModal(null,{castingId:castingId,infId:c.infId,storeId:c.storeId});
}

function deleteCasting(id){
  /* 紐づくpostsもSupabase＆メモリから削除 */
  var toDelete=DB.posts.filter(function(p){return p.castingId===id;});
  toDelete.forEach(function(p){deleteItem('posts',p.id);});
  DB.posts=DB.posts.filter(function(p){return p.castingId!==id;});
  DB.castings=DB.castings.filter(function(c){return c.id!==id;});
  refreshAll();
  deleteItem('castings',id);
}

/* ============================================================
   撮影予定管理
   ============================================================ */

function renderInfluencers(){
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  var list=DB.influencers.filter(function(i){return!search||(i.name||'').toLowerCase().includes(search)||(i.handle||'').toLowerCase().includes(search)||(i.genre||'').toLowerCase().includes(search);});
  var tb=document.getElementById('infBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="8" class="empty-state">インフルエンサーが登録されていません</td></tr>';return;}
  var platColor={Instagram:'#e1306c',TikTok:'#010101',YouTube:'#ff0000',X:'#1da1f2'};
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  tb.innerHTML=list.map(function(i){
    var last=DB.castings.filter(function(c){return c.infId===i.id;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);})[0];
    var accountUrl=i.url||(i.handle?(platUrl[i.platform]||'')+(i.handle.replace('@','')):'');
    var handleHtml=i.handle
      ?(accountUrl
        ?'<a href="'+esc(accountUrl)+'" target="_blank" rel="noopener" style="font-size:11px;color:'+(platColor[i.platform]||'var(--accent)')+';text-decoration:none">'+esc(i.handle)+'&nbsp;↗</a>'
        :'<span style="font-size:11px;color:'+(platColor[i.platform]||'var(--text3)')+'">'+esc(i.handle)+'</span>'
      ):'';
    return'<tr style="cursor:pointer" onclick="openInfluencerDetail(\''+i.id+'\')">'
      +'<td><div style="font-weight:500;color:var(--accent)">'+esc(i.name)+'</div>'+handleHtml+'</td>'
      +'<td>'+esc(i.platform||'')+'</td>'
      +'<td class="td-mono">'+(i.followers?Number(i.followers).toLocaleString():'—')+'</td>'
      +'<td class="td-mono" style="white-space:nowrap">'+fmtFeeRange(i)+'</td>'
      +'<td>'+esc(i.genre||'—')+'</td>'
      +'<td style="color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(i.contact||'—')+'</td>'
      +'<td style="color:var(--text3)">'+(last?fmtD(last.date):'—')+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="btn btn-sm" onclick="openInfluencerModal(\''+i.id+'\')">編集</button></td>'
      +'</tr>';
  }).join('');
}

function renderCasting(){
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  var list=DB.castings.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  if(search)list=list.filter(function(c){
    return storeName(c.storeId).toLowerCase().includes(search)
      ||infName(c.infId).toLowerCase().includes(search);
  });
  var tb=document.getElementById('castBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="12" class="empty-state">キャスティング履歴がありません</td></tr>';return;}
  var INV_STATUS_LABEL={pending:'📄 未受領',sns_received:'✅ 受領済み',accounting_submitted:'📊 経理申請済み',done:'🎉 処理済み'};
  tb.innerHTML=list.map(function(c){
    var inv=(DB.invoices||[]).find(function(x){return x.castingId===c.id;});
    var invCell;
    if(inv){
      invCell='<span style="font-size:12px;padding:2px 7px;border-radius:4px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border)">'+(INV_STATUS_LABEL[inv.status]||inv.status)+'</span>'
        +' <button class="btn btn-sm" onclick="openInvoiceModal(\''+inv.id+'\')">編集</button>';
    }else{
      invCell='<button class="btn btn-sm" onclick="openInvoiceFromCasting(\''+c.id+'\')">＋ 請求書</button>';
    }
    return'<tr>'
      +'<td>'+esc(storeName(c.storeId))+'</td>'
      +'<td style="color:var(--purple);font-weight:500">'+esc(infName(c.infId))+'</td>'
      +'<td class="td-mono" style="color:var(--amber)">'+(c.visitDate?fmtD(c.visitDate):'—')+'</td>'
      +'<td class="td-mono" style="color:var(--green)">'+(c.draftDate?fmtD(c.draftDate):'—')+'</td>'
      +'<td class="td-mono">'+fmtD(c.date)+'</td>'
      +'<td>'+(function(){var pp=c.platforms&&c.platforms.length?c.platforms:(c.platform?[c.platform]:[]);return pp.length?pp.map(function(p){return'<span style="display:inline-block;font-size:11px;padding:1px 6px;background:var(--accent-bg);color:var(--accent);border-radius:3px;margin:1px;white-space:nowrap">'+esc(p)+'</span>';}).join(''):'—';})()+'</td>'
      +'<td class="td-mono">'+fmtMoney(c.fee)+'</td>'
      +'<td class="td-mono">'+(c.reach?Number(c.reach).toLocaleString():'—')+'</td>'
      +'<td style="color:var(--text3);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc((c.result||'').slice(0,30))+'</td>'
      +'<td onclick="event.stopPropagation()">'
        +'<button onclick="toggleCastContractSent(\''+c.id+'\')" style="font-size:12px;padding:3px 8px;border-radius:5px;cursor:pointer;border:1px solid;white-space:nowrap;background:'+(c.contractSent?'var(--green-bg)':'var(--bg3)')+';color:'+(c.contractSent?'var(--green)':'var(--text3)')+';border-color:'+(c.contractSent?'var(--green-border)':'var(--border)')+';">'
          +(c.contractSent?'✓ 送付済み':'未送付')
        +'</button>'
      +'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'+invCell+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap"><button class="btn btn-sm" style="margin-right:4px" onclick="openCastingModal({editId:\''+c.id+'\'})">編集</button><button class="btn-ghost-danger" onclick="deleteCasting(\''+c.id+'\')">削除</button></td>'
    +'</tr>';
  }).join('');
}

