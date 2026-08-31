var editingShootId=null;

function openShootingModal(id){
  editingShootId=id||null;
  var yr=new Date().getFullYear();
  makeDatePicker('shootDateWrap','shootDate',{yearFrom:yr-1,yearTo:yr+3,yearLabel:'年'});
  makeTimePicker('shootTimeWrap','shootTime');

  /* クリエイターselect更新 */
  var sel=document.getElementById('shootCreator');
  if(sel){
    sel.innerHTML='<option value="">（未設定）</option>';
    DB.creators.slice().sort(function(a,b){return(a.crName||'').localeCompare(b.crName||'');}).forEach(function(cr){
      var opt=document.createElement('option');opt.value=cr.id;
      opt.textContent=cr.crName+(cr.crRealName?' ('+cr.crRealName+')':'');
      sel.appendChild(opt);
    });
  }

  if(id){
    /* 編集 */
    var p=DB.posts.find(function(x){return x.id===id;});
    if(p){
      document.getElementById('shootModalTitle') && (document.getElementById('shootingModalTitle').textContent='撮影予定を編集');
      var dw=document.getElementById('shootDateWrap');
      if(dw&&dw._setDate)dw._setDate((p.date||'').split('T')[0]);
      var tw=document.getElementById('shootTimeWrap');
      var existTime=(p.date||'').includes('T')?(p.date.split('T')[1]||'').slice(0,5):'10:00';
      if(tw&&tw._setTime)tw._setTime(existTime);
      if(sel&&p.creatorId)sel.value=p.creatorId;
      document.getElementById('shootMemo').value=p.note||'';
    }
  } else {
    /* 新規：前回と同じクリエイターをデフォルト */
    document.getElementById('shootingModalTitle').textContent='撮影予定を追加';
    document.getElementById('shootMemo').value='';
    var sid=editingStoreId;
    if(sid&&sel){
      var lastShoot=DB.posts.filter(function(p){return p.type==='shooting'&&p.storeId===sid;})
        .sort(function(a,b){return new Date(b.date)-new Date(a.date);})[0];
      if(lastShoot&&lastShoot.creatorId)sel.value=lastShoot.creatorId;
    }
  }
  openModal('shootingModal');
}

function saveShooting(){
  var dateVal=document.getElementById('shootDate').value;
  if(!dateVal){alert('撮影日を入力してください');return;}
  var creatorId=document.getElementById('shootCreator').value;
  var memo=document.getElementById('shootMemo').value;
  var sid=editingStoreId;

  /* クリエイター選択がある場合は確認 */
  if(creatorId&&!editingShootId){
    var cr=DB.creators.find(function(x){return x.id===creatorId;});
    var crName=cr?cr.crName:'クリエイター';
    if(!confirm(crName+'で撮影予定を登録しますか？'))return;
  }

  var p={
    id:editingShootId||uid(),
    storeId:sid,
    type:'shooting',
    date:dateVal+'T'+(document.getElementById('shootTime').value||'10:00'),
    creatorId:creatorId,
    note:memo,
    status:'scheduled'
  };

  if(editingShootId){
    var idx=DB.posts.findIndex(function(x){return x.id===editingShootId;});
    if(idx>=0)DB.posts[idx]=p;
  } else {
    DB.posts.push(p);
  }

  saveItem('posts',p);
  closeModal('shootingModal');
  renderShootingList();
  refreshAll();
}

function deleteShooting(id){
  if(!confirm('この撮影予定を削除しますか？'))return;
  DB.posts=DB.posts.filter(function(p){return p.id!==id;});
  deleteItem('posts',id);
  renderShootingList();
  refreshAll();
}

function renderShootingList(){
  var el=document.getElementById('shootingList');
  if(!el)return;
  var sid=editingStoreId;
  var list=DB.posts.filter(function(p){return p.type==='shooting'&&p.storeId===sid;})
    .sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  if(!list.length){
    el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:8px">撮影予定はありません</div>';
    return;
  }
  el.innerHTML=list.map(function(p){
    var cr=DB.creators.find(function(x){return x.id===p.creatorId;});
    var crName=cr?cr.crName:'—';
    return'<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--border)">'
      +'<span style="font-size:14px;font-weight:500;color:var(--accent)">📷 '+fmtD((p.date||'').split('T')[0])+'</span>'
      +'<span style="font-size:13px;color:var(--purple);flex:1">'+esc(crName)+'</span>'
      +(p.note?'<span style="font-size:12px;color:var(--text3)">'+esc(p.note)+'</span>':'')
      +'<button class="btn btn-sm" style="margin-right:4px" onclick="openShootingModal(\''+p.id+'\')" >編集</button>'
      +'<button class="btn-ghost-danger" onclick="deleteShooting(\''+p.id+'\')" >削除</button>'
      +'</div>';
  }).join('');
}

function runChecks(){}/* 旧runChecksは廃止 */

function toggleWeekDone(){
  var wrap=document.getElementById('chk-week-done-wrap');
  var btn=document.getElementById('chk-week-done-btn');
  if(!wrap||!btn)return;
  var isOpen=wrap.style.display!=='none';
  wrap.style.display=isOpen?'none':'block';
  var count=wrap.children.length;
  btn.textContent=isOpen?'▼ 完了済みを表示（'+count+'件）':'▲ 完了済みを非表示';
}

function toggleMonthDone(){
  var wrap=document.getElementById('chk-month-done-wrap');
  var btn=document.getElementById('chk-month-done-btn');
  if(!wrap||!btn)return;
  var isOpen=wrap.style.display!=='none';
  wrap.style.display=isOpen?'none':'block';
  var count=wrap.children.length;
  btn.textContent=isOpen?'▼ 完了済みを表示（'+count+'件）':'▲ 完了済みを非表示';
}

function renderCheckPage(){
  var today=new Date();
  today.setHours(0,0,0,0);

  /* 今週の範囲（月〜日） */
  var weekStart=new Date(today);
  weekStart.setDate(today.getDate()-today.getDay()+1);
  var weekEnd=new Date(weekStart);
  weekEnd.setDate(weekStart.getDate()+6);
  weekEnd.setHours(23,59,59,999);

  /* 今月の範囲 */
  var monthStart=new Date(today.getFullYear(),today.getMonth(),1);
  var monthEnd=new Date(today.getFullYear(),today.getMonth()+1,0,23,59,59,999);

  function postRow(p){
    var isInf=p.type==='inf_visit'||p.type==='inf_post';
    var typeLabel=TYPE_LABEL[p.type]||p.type;
    var infLabel=isInf&&p.infId?(' / '+esc(infName(p.infId))):'';
    var cap=(!isInf&&p.caption)?esc(p.caption.slice(0,40))+(p.caption.length>40?'…':''):'';
    return'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px">'
      +'<span style="width:5px;height:5px;border-radius:50%;background:'+storeColor(p.storeId)+';display:inline-block;flex-shrink:0"></span>'
      +'<span class="td-mono" style="color:var(--text3);white-space:nowrap;width:110px">'+fmtDT(p.date)+'</span>'
      +'<span style="font-weight:500;min-width:80px">'+esc(storeName(p.storeId))+'</span>'
      +'<span class="badge '+(TYPE_BADGE[p.type]||'b-gray')+'">'+typeLabel+'</span>'
      +infLabel
      +(cap?'<span style="color:var(--text2);flex:1">'+cap+'</span>':'')
      +postStatusBadge(p.status)
      +'<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')">編集</button>'
    +'</div>';
  }

  function setSection(id,countId,items,emptyMsg){
    var el=document.getElementById(id);
    var cnt=document.getElementById(countId);
    if(!el)return;
    if(cnt)cnt.textContent=items.length+'件';
    if(!items.length){
      el.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--text3)">'+emptyMsg+'</div>';
    }else{
      el.innerHTML='<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'+items.map(postRow).join('')+'</div>';
    }
  }

  var DONE_ST=['done','visited','approved','cancelled'];

  /* ① 今週の投稿（未完了／完了で分ける・契約終了店舗は除外） */
  var weekAll=DB.posts.filter(function(p){
    if(isStoreEnded(p.storeId))return false;
    var d=new Date(p.date);return d>=weekStart&&d<=weekEnd;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var weekActive=weekAll.filter(function(p){return DONE_ST.indexOf(p.status)<0;});
  var weekDone=weekAll.filter(function(p){return DONE_ST.indexOf(p.status)>=0;});
  var weekEl=document.getElementById('chk-week');
  var weekCntEl=document.getElementById('chk-week-count');
  if(weekCntEl)weekCntEl.textContent=weekAll.length+'件（完了'+weekDone.length+'件）';
  if(weekEl){
    if(!weekAll.length){
      weekEl.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--text3)">今週の投稿予定はありません</div>';
    }else{
      var weekActiveHtml=weekActive.length
        ?weekActive.map(postRow).join('')
        :'<div style="padding:12px 14px;font-size:13px;color:var(--text3)">未完了の投稿はありません ✓</div>';
      var weekDoneHtml=weekDone.length
        ?'<div id="chk-week-done-wrap" style="display:none">'
          +weekDone.map(function(p){
            return'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px;opacity:0.45;background:var(--bg3)">'
              +'<span style="width:5px;height:5px;border-radius:50%;background:'+storeColor(p.storeId)+';display:inline-block;flex-shrink:0"></span>'
              +'<span class="td-mono" style="color:var(--text3);white-space:nowrap;width:110px;text-decoration:line-through">'+fmtDT(p.date)+'</span>'
              +'<span style="font-weight:500;min-width:80px;text-decoration:line-through">'+esc(storeName(p.storeId))+'</span>'
              +'<span class="badge b-gray">'+(TYPE_LABEL[p.type]||p.type)+'</span>'
              +postStatusBadge(p.status)
              +'<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')">編集</button>'
            +'</div>';
          }).join('')
        +'</div>'
        +'<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border)">'
          +'<button onclick="toggleWeekDone()" id="chk-week-done-btn" style="font-size:12px;color:var(--text3);background:none;border:none;cursor:pointer">▼ 完了済みを表示（'+weekDone.length+'件）</button>'
        +'</div>'
        :''
      weekEl.innerHTML='<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'+weekActiveHtml+weekDoneHtml+'</div>';
    }
  }

  /* ② 今月の投稿（未完了／完了で分ける・契約終了店舗は除外） */
  var monthAll=DB.posts.filter(function(p){
    if(isStoreEnded(p.storeId))return false;
    var d=new Date(p.date);return d>=monthStart&&d<=monthEnd;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var monthActive=monthAll.filter(function(p){return DONE_ST.indexOf(p.status)<0;});
  var monthDone=monthAll.filter(function(p){return DONE_ST.indexOf(p.status)>=0;});
  var monthEl=document.getElementById('chk-month');
  var monthCntEl=document.getElementById('chk-month-count');
  if(monthCntEl)monthCntEl.textContent=monthAll.length+'件（完了'+monthDone.length+'件）';
  if(monthEl){
    if(!monthAll.length){
      monthEl.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--text3)">今月の投稿予定はありません</div>';
    }else{
      var activeHtml=monthActive.length
        ?monthActive.map(postRow).join('')
        :'<div style="padding:12px 14px;font-size:13px;color:var(--text3)">未完了の投稿はありません ✓</div>';
      var doneHtml=monthDone.length
        ?'<div id="chk-month-done-wrap" style="display:none">'
          +monthDone.map(function(p){
            return'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px;opacity:0.45;background:var(--bg3)">'
              +'<span style="width:5px;height:5px;border-radius:50%;background:'+storeColor(p.storeId)+';display:inline-block;flex-shrink:0"></span>'
              +'<span class="td-mono" style="color:var(--text3);white-space:nowrap;width:110px;text-decoration:line-through">'+fmtDT(p.date)+'</span>'
              +'<span style="font-weight:500;min-width:80px;text-decoration:line-through">'+esc(storeName(p.storeId))+'</span>'
              +'<span class="badge b-gray">'+(TYPE_LABEL[p.type]||p.type)+'</span>'
              +postStatusBadge(p.status)
              +'<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')">編集</button>'
            +'</div>';
          }).join('')
        +'</div>'
        +'<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border)">'
          +'<button onclick="toggleMonthDone()" id="chk-month-done-btn" style="font-size:12px;color:var(--text3);background:none;border:none;cursor:pointer">▼ 完了済みを表示（'+monthDone.length+'件）</button>'
        +'</div>'
        :''
      monthEl.innerHTML='<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'+activeHtml+doneHtml+'</div>';
    }
  }

  /* ③ クリエイティブ未設定（動画・画像・リール・ストーリー系のみ。INF系・契約終了店舗は除外） */
  var noCreative=DB.posts.filter(function(p){
    if(isStoreEnded(p.storeId))return false;
    var isCreative=p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story'||p.type==='shooting';
    return isCreative&&!p.creative&&p.status!=='done';
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  setSection('chk-creative','chk-creative-count',noCreative,'クリエイティブ未設定の投稿はありません ✓');

  /* ④ 案件進捗 未完了 */
  var setupEl=document.getElementById('chk-setup');
  var setupCntEl=document.getElementById('chk-setup-count');
  var incomplete=DB.stores.filter(function(s){
    return s.status==='active'&&progressPct(s)<100;
  });
  if(setupCntEl)setupCntEl.textContent=incomplete.length+'店舗';
  if(setupEl){
    if(!incomplete.length){
      setupEl.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--text3)">全店舗の案件進捗が完了しています ✓</div>';
    }else{
      setupEl.innerHTML='<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'
        +incomplete.map(function(s){
          var pct=progressPct(s);
          var steps=progressStepsFor(s);var prog=s.progress||{};
          var missing=steps.filter(function(step){var p=prog[step.key]||{};return step.accounts?!isAccountsDone(p):!(p.status==='done'||p.status==='na');});
          return'<div style="padding:10px 14px;border-bottom:1px solid var(--border)">'
            +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
              +'<span style="width:5px;height:5px;border-radius:50%;background:'+storeColor(s.id)+';display:inline-block"></span>'
              +'<span style="font-size:13px;font-weight:500;cursor:pointer;color:var(--accent)" onclick="navigate(\'stores\');setTimeout(function(){showDetail(\''+s.id+'\');},100)">'+esc(s.name)+'</span>'
              +'<div class="pbar-wrap" style="width:80px"><div class="pbar" style="width:'+pct+'%;background:'+(pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)')+'"></div></div>'
              +'<span style="font-size:12px;color:var(--text3)">'+pct+'%</span>'
              +'<button class="btn btn-sm" onclick="openStoreModal(\''+s.id+'\')">進捗</button>'
            +'</div>'
            +(missing.length?'<div style="display:flex;gap:4px;flex-wrap:wrap">'
              +missing.map(function(step){return'<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--red-bg);color:var(--red)">'+esc(step.label)+'</span>';}).join('')
            +'</div>':'')
          +'</div>';
        }).join('')
      +'</div>';
    }
  }

  /* ⑤ インフルエンサー進捗チェック */
  var in14=new Date(today.getTime()+14*86400000);
  var in7=new Date(today.getTime()+7*86400000);
  var infEl=document.getElementById('chk-inf');
  var infCntEl=document.getElementById('chk-inf-count');

  /* ── アラート行を生成するヘルパー ── */
  function infAlertRow(level,icon,title,detail,actionHtml){
    var bg=level==='red'?'var(--red-bg)':level==='amber'?'var(--amber-bg)':'var(--accent-bg)';
    var col=level==='red'?'var(--red)':level==='amber'?'var(--amber)':'var(--accent)';
    var border=level==='red'?'var(--red-border)':level==='amber'?'var(--amber-border)':'var(--accent-border)';
    return'<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);background:'+bg+';border-left:3px solid '+col+'">'
      +'<span style="font-size:16px;flex-shrink:0">'+icon+'</span>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:13px;font-weight:500;color:'+col+'">'+title+'</div>'
        +'<div style="font-size:12px;color:var(--text2);margin-top:1px">'+detail+'</div>'
      +'</div>'
      +(actionHtml||'')
    +'</div>';
  }

  var rows=[];

  /* ① 契約書未送付（castingが登録されているのに contractSent=false の案件・契約終了店舗・キャンセル済みは除外） */
  DB.castings.filter(function(c){return !c.contractSent&&c.status!=='cancelled'&&!isStoreEnded(c.storeId);}).forEach(function(c){
    var inf=DB.influencers.find(function(x){return x.id===c.infId;});
    if(!inf)return;
    rows.push(infAlertRow('red','📄',
      '契約書が未送付：'+esc(inf.name)+' × '+esc(storeName(c.storeId)),
      'キャスティングが登録されていますが、契約書の送付が完了していません。',
      '<button class="btn btn-sm" onclick="navigate(\'casting\')" style="white-space:nowrap;flex-shrink:0">キャスティング履歴へ</button>'
    ));
  });

  /* ② 予約が取れていない来店予定（unbooked・契約終了店舗は除外） */
  DB.posts.filter(function(p){
    return p.type==='inf_visit'&&p.status==='unbooked'&&new Date(p.date)>=today&&!isStoreEnded(p.storeId);
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);}).forEach(function(p){
    var inf=DB.influencers.find(function(x){return x.id===p.infId;})||{};
    var daysLeft=Math.ceil((new Date(p.date)-today)/86400000);
    rows.push(infAlertRow('amber','📅',
      '予約が取れていません：'+esc(inf.name||'—')+'（'+esc(storeName(p.storeId))+'）',
      '来店予定日：'+fmtDT(p.date)+'（あと'+daysLeft+'日）　予約ステータス：未',
      '<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')" style="white-space:nowrap;flex-shrink:0">予約登録</button>'
    ));
  });

  /* ③ 来店日が近い（14日以内・booked・契約終了店舗は除外） */
  DB.posts.filter(function(p){
    if(p.type!=='inf_visit'||p.status!=='booked'||isStoreEnded(p.storeId))return false;
    var d=new Date(p.date);return d>=today&&d<=in14;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);}).forEach(function(p){
    var inf=DB.influencers.find(function(x){return x.id===p.infId;})||{};
    var daysLeft=Math.ceil((new Date(p.date)-today)/86400000);
    var urgent=daysLeft<=3;
    rows.push(infAlertRow(urgent?'red':'amber','🏃',
      '来店日が近づいています：'+esc(inf.name||'—')+'（'+esc(storeName(p.storeId))+'）',
      '来店日：'+fmtDT(p.date)+'　あと'+daysLeft+'日',
      '<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')" style="white-space:nowrap;flex-shrink:0">確認</button>'
    ));
  });

  /* ④ 投稿日が近い（14日以内の inf_post・契約終了店舗は除外） */
  DB.posts.filter(function(p){
    if(p.type!=='inf_post'||p.status==='done'||isStoreEnded(p.storeId))return false;
    var d=new Date(p.date);return d>=today&&d<=in14;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);}).forEach(function(p){
    var inf=DB.influencers.find(function(x){return x.id===p.infId;})||{};
    var daysLeft=Math.ceil((new Date(p.date)-today)/86400000);
    var urgent=daysLeft<=3;
    rows.push(infAlertRow(urgent?'red':'blue','✦',
      '投稿日が近づいています：'+esc(inf.name||'—')+'（'+esc(storeName(p.storeId))+'）',
      '投稿予定日：'+fmtDT(p.date)+'　あと'+daysLeft+'日',
      '<button class="btn btn-sm" onclick="openPostModal(\''+p.id+'\')" style="white-space:nowrap;flex-shrink:0">確認</button>'
    ));
  });

  /* ⑤ 重複キャスティングの疑い（同じ店舗×同じインフルエンサーで複数登録されている場合。
     過去の不具合で、同じ組み合わせのキャスティングが別レコードとして重複登録され、
     投稿スケジュールにも重複した予定が残ってしまうことがあったため検出する） */
  var castGroups={};
  DB.castings.forEach(function(c){
    if(isStoreEnded(c.storeId)||c.status==='cancelled')return;
    var key=c.storeId+'_'+c.infId;
    if(!castGroups[key])castGroups[key]=[];
    castGroups[key].push(c);
  });
  Object.keys(castGroups).forEach(function(key){
    var group=castGroups[key];
    if(group.length<2)return;
    var inf=DB.influencers.find(function(x){return x.id===group[0].infId;});
    var detail=group.map(function(c){
      return(c.visitDate?fmtD(c.visitDate):'来店日未設定')+'／PR費用 '+(c.fee?Number(c.fee).toLocaleString()+'円':'未設定')
        +' <button class="btn-ghost-danger" style="font-size:11px;padding:2px 6px;margin-left:4px" onclick="event.stopPropagation();deleteCasting(\''+c.id+'\')">この記録を削除</button>';
    }).join('　|　');
    rows.push(infAlertRow('red','⚠️',
      '重複キャスティングの疑い：'+esc(inf?inf.name:'不明')+'（'+esc(storeName(group[0].storeId))+'）を'+group.length+'件登録',
      detail,
      '<button class="btn btn-sm" onclick="navigate(\'casting\')" style="white-space:nowrap;flex-shrink:0">履歴で確認</button>'
    ));
  });

  /* ⑥ 重複請求書の疑い（同じキャスティングに複数の請求書が登録されている場合。
     「🔖仮登録」で先に見込み額を登録した後、経理管理の「＋費用追加」から
     castingIdと紐づけずに実額の請求書を別途新規登録してしまうと重複が発生するため検出する） */
  var invGroups={};
  (DB.invoices||[]).forEach(function(inv){
    if(!inv.castingId)return;
    if(!invGroups[inv.castingId])invGroups[inv.castingId]=[];
    invGroups[inv.castingId].push(inv);
  });
  Object.keys(invGroups).forEach(function(castingId){
    var group=invGroups[castingId];
    if(group.length<2)return;
    var casting=DB.castings.find(function(c){return c.id===castingId;});
    var inf=casting?DB.influencers.find(function(x){return x.id===casting.infId;}):null;
    var storeNm=casting?storeName(casting.storeId):'—';
    var detail=group.map(function(inv){
      return(inv.isEstimate?'🔖仮　':'')+fmtMoney(invExclTotal(inv))+'（税抜）'
        +' <button class="btn-ghost-danger" style="font-size:11px;padding:2px 6px;margin-left:4px" onclick="event.stopPropagation();deleteInvoice(\''+inv.id+'\')">この請求書を削除</button>';
    }).join('　|　');
    rows.push(infAlertRow('red','⚠️',
      '重複請求書の疑い：'+esc(inf?inf.name:'不明')+'（'+esc(storeNm)+'）に'+group.length+'件登録',
      detail,
      '<button class="btn btn-sm" onclick="navigate(\'accounting\')" style="white-space:nowrap;flex-shrink:0">経理管理で確認</button>'
    ));
  });

  if(infCntEl)infCntEl.textContent=rows.length+'件';
  if(infEl){
    infEl.innerHTML=rows.length
      ?'<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'+rows.join('')+'</div>'
      :'<div style="padding:12px 14px;font-size:13px;color:var(--text3)">✓ インフルエンサー関連の要対応項目はありません</div>';
  }
}

