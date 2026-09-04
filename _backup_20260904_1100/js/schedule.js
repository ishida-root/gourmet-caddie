var editingPostId=null;
function openPostModal(id){
  editingPostId=id||null;
  updatePostStoreSelect();
  /* クリエイターselectを構築 */
  var crSel=document.getElementById('pCreatorId');
  if(crSel){
    crSel.innerHTML='<option value="">（なし）</option>';
    (DB.creators||[]).slice().sort(function(a,b){return(a.crName||'').localeCompare(b.crName||'');}).forEach(function(cr){
      var opt=document.createElement('option');opt.value=cr.id;
      opt.textContent=cr.crName+(cr.crRealName?' ('+cr.crRealName+')':'');
      crSel.appendChild(opt);
    });
  }
  var infSel=document.getElementById('pInfId');
  if(infSel){
    infSel.innerHTML='<option value="">選択...</option>'+DB.influencers.map(function(i){return'<option value="'+i.id+'">'+esc(i.name)+(i.handle?' '+esc(i.handle):'')+'</option>';}).join('');
  }
  if(id){
    /* 編集：既存データをフォームに復元 */
    var p=DB.posts.find(function(x){return x.id===id;});
    if(p){
      /* 案件種別（大分類）を種別から判定して先にセット */
      var cat=(p.type==='inf_visit'||p.type==='inf_post')?'influencer':'creator';
      var catRadio=document.querySelector('input[name="pCategoryRadio"][value="'+cat+'"]');
      if(catRadio)catRadio.checked=true;
      onPostCategoryChange();
      /* 種別ラジオ */
      var radio=document.querySelector('input[name="pTypeRadio"][value="'+p.type+'"]');
      if(radio){radio.checked=true;}else{
        var first=document.querySelector('input[name="pTypeRadio"][value="video"]');
        if(first)first.checked=true;
      }
      document.getElementById('pType').value=p.type||'video';
      onPostTypeChange();
      /* 各フィールド */
      var set=function(fid,v){var el=document.getElementById(fid);if(el&&v!==undefined)el.value=v||'';};
      set('pStore',p.storeId);set('pPlatform',p.platform);
      /* 日時ピッカー初期化・復元 */
      initPostDatePicker(p.date);
      set('pNote',p.note);
      var statusSel=document.getElementById('pStatus');
      if(statusSel&&statusSel.querySelector('option[value="'+p.status+'"]'))statusSel.value=p.status;
      var isInf=p.type==='inf_visit'||p.type==='inf_post';
      if(isInf){
        /* infId復元：selectのoptionsが構築済みであることを確認してからセット */
        var infSelEl=document.getElementById('pInfId');
        if(infSelEl&&p.infId){
          /* optionが存在しない場合（DBに削除済みINFなど）は一時的に追加 */
          if(!infSelEl.querySelector('option[value="'+p.infId+'"]')){
            var tmpOpt=document.createElement('option');
            tmpOpt.value=p.infId;
            var tmpInf=DB.influencers.find(function(x){return x.id===p.infId;});
            tmpOpt.textContent=tmpInf?tmpInf.name:'（削除済み）';
            infSelEl.appendChild(tmpOpt);
          }
          infSelEl.value=p.infId;
        }
        set('pInfFee',p.infFee);
      }else{
        set('pCreative',p.creative);
        set('pAd',p.ad);set('pBudget',p.budget);
        var crSelEl=document.getElementById('pCreatorId');if(crSelEl)crSelEl.value=p.creatorId||'';
      }
      var titleEl=document.getElementById('postModalTitle');
      if(titleEl)titleEl.textContent='スケジュールを編集';
    }
  }else{
    /* 新規：リセット（案件種別はクリエイターを既定に） */
    var catRadio=document.querySelector('input[name="pCategoryRadio"][value="creator"]');
    if(catRadio)catRadio.checked=true;
    var first=document.querySelector('input[name="pTypeRadio"][value="video"]');
    if(first){first.checked=true;document.getElementById('pType').value='video';}
    ['pCreative','pBudget','pNote','pInfFee','pCreatorId'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
    onPostCategoryChange();
    initPostDatePicker('');
  }
  openModal('postModal');
}
function initPostDatePicker(dateStr){
  var yr=new Date().getFullYear();
  /* ピッカーを毎回再構築してから値をセット */
  var dateVal='',timeVal='12:00';
  if(dateStr){
    var parts=dateStr.split('T');
    dateVal=parts[0]||'';
    timeVal=parts[1]?parts[1].slice(0,5):'12:00';
  }
  /* hidden inputに値をセット（wrapの外にあるので消えない） */
  var pdEl=document.getElementById('pDateOnly');
  if(pdEl)pdEl.value=dateVal;
  var ptEl=document.getElementById('pTimeOnly');
  if(ptEl)ptEl.value=timeVal;
  /* ピッカー構築（hiddenIdの値を初期値として読み取る） */
  makeDatePicker('pDateWrap','pDateOnly',{yearFrom:yr-1,yearTo:yr+3,yearLabel:'年'});
  makeTimePicker('pTimeWrap','pTimeOnly');
  /* ピッカー構築後に_setDateで確実に反映 */
  var dw2=document.getElementById('pDateWrap');if(dw2&&dw2._setDate)dw2._setDate(dateVal);
  var tw2=document.getElementById('pTimeWrap');if(tw2&&tw2._setTime)tw2._setTime(timeVal);
}
function onPostCategoryChange(){
  var cat=document.querySelector('input[name="pCategoryRadio"]:checked');
  var val=cat?cat.value:'creator';
  var creatorGrp=document.getElementById('pTypeGroupCreator');
  var infGrp=document.getElementById('pTypeGroupInf');
  if(val==='influencer'){
    if(creatorGrp)creatorGrp.style.display='none';
    if(infGrp)infGrp.style.display='flex';
    /* 選択中の種別がクリエイター系なら来店予定に切り替え */
    var cur=document.querySelector('input[name="pTypeRadio"]:checked');
    if(!cur||['video','image','reel','story'].indexOf(cur.value)>=0){
      var r=document.querySelector('input[name="pTypeRadio"][value="inf_visit"]');
      if(r)r.checked=true;
    }
  }else{
    if(creatorGrp)creatorGrp.style.display='flex';
    if(infGrp)infGrp.style.display='none';
    /* 選択中の種別がインフルエンサー系なら動画に切り替え */
    var cur=document.querySelector('input[name="pTypeRadio"]:checked');
    if(!cur||['inf_visit','inf_post'].indexOf(cur.value)>=0){
      var r=document.querySelector('input[name="pTypeRadio"][value="video"]');
      if(r)r.checked=true;
    }
  }
  onPostTypeChange();
}
function onPostTypeChange(){
  var sel=document.querySelector('input[name="pTypeRadio"]:checked');
  var val=sel?sel.value:'video';
  document.getElementById('pType').value=val;
  var isInf=val==='inf_visit'||val==='inf_post'||val==='inf_draft';
  document.getElementById('pInfRow').style.display=isInf?'':'none';
  document.getElementById('pPostFields').style.display=isInf?'none':'';
  var titleEl=document.getElementById('postModalTitle');
  if(titleEl){
    if(val==='inf_visit')titleEl.textContent='来店予定を追加';
    else if(val==='inf_post')titleEl.textContent='インフルエンサー投稿予定を追加';
    else titleEl.textContent='投稿を追加';
  }
  /* ステータス選択肢を種別に合わせて切り替え */
  var statusSel=document.getElementById('pStatus');
  if(!statusSel)return;
  var cur=statusSel.value;
  if(val==='inf_visit'){
    statusSel.innerHTML=
      '<option value="unbooked">予約未</option>'
      +'<option value="booked">予約済み</option>'
      +'<option value="visited">来店済み</option>'
      +'<option value="date_tbd">🔁 リスケ中（日程未定）</option>'
      +'<option value="cancelled">キャンセル</option>';
  }else if(val==='inf_draft'){
    statusSel.innerHTML=
      '<option value="draft">未送付</option>'
      +'<option value="pending_review">確認待ち</option>'
      +'<option value="approved">承認済み</option>'
      +'<option value="cancelled">キャンセル</option>';
  }else{
    /* クリエイター案件：制作〜投稿の一貫フロー */
    statusSel.innerHTML=
      '<option value="shoot_set">撮影日確定</option>'
      +'<option value="editing">編集中</option>'
      +'<option value="delivered">納品済み</option>'
      +'<option value="scheduled">投稿予約済み</option>'
      +'<option value="done">投稿済み</option>';
  }
  /* 可能なら以前の値を復元 */
  if(statusSel.querySelector('option[value="'+cur+'"]'))statusSel.value=cur;
}
function savePost(){
  var sid=document.getElementById('pStore').value;
  var _pdOnly=document.getElementById('pDateOnly');
  var _ptOnly=document.getElementById('pTimeOnly');
  /* pDateOnly/pTimeOnlyから取得。空の場合はwrapの_getDateも試みる */
  var _dateVal=_pdOnly?_pdOnly.value:'';
  var _timeVal=(_ptOnly&&_ptOnly.value)?_ptOnly.value:'12:00';
  if(!_dateVal){var _dw=document.getElementById('pDateWrap');if(_dw&&_dw._getDate)_dateVal=_dw._getDate();}
  var dt=_dateVal?(_dateVal+'T'+_timeVal):document.getElementById('pDate').value;
  var type=document.getElementById('pType').value;
  var isInf=type==='inf_visit'||type==='inf_post';
  if(!sid||!dt){alert('店舗と日時は必須です');return;}
  if(isInf&&!document.getElementById('pInfId').value){alert('インフルエンサーを選択してください');return;}
  var isEdit=!!editingPostId;
  var id=isEdit?editingPostId:uid();
  var p={
    id:id,storeId:sid,date:dt,type:type,
    platform:document.getElementById('pPlatform').value,
    status:document.getElementById('pStatus').value,
    note:document.getElementById('pNote').value
  };
  if(isInf){
    p.infId=document.getElementById('pInfId').value;
    p.infFee=document.getElementById('pInfFee').value;
  }else{
    p.creative=document.getElementById('pCreative').value;
    p.ad=document.getElementById('pAd').value;
    p.budget=document.getElementById('pBudget').value;
    var _crSel=document.getElementById('pCreatorId');p.creatorId=_crSel?_crSel.value:'';
  }
  if(isEdit){
    var idx=DB.posts.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.posts[idx]=p;}else{DB.posts.push(p);}
  }else{
    DB.posts.push(p);
  }
  closeModal('postModal');
  refreshAll();saveItem('posts',p);
}
function deletePost(id){DB.posts=DB.posts.filter(function(p){return p.id!==id;});refreshAll();deleteItem('posts',id);}
function inlineDateEdit(e,id){
  e.stopPropagation();
  var td=e.currentTarget;
  var p=DB.posts.find(function(x){return x.id===id;});
  if(!p)return;
  /* datetime-local の値形式に変換 */
  var cur=p.date?p.date.slice(0,16):'';
  td.innerHTML='<input type="datetime-local" value="'+esc(cur)+'" style="font-size:12px;padding:2px 4px;width:160px;border:1px solid var(--accent);border-radius:4px;background:var(--bg2);color:var(--text)" id="inlineDtInput_'+id+'">';
  var inp=td.querySelector('input');
  if(inp){
    inp.focus();
    inp.onblur=function(){commitInlineDate(id,inp.value);};
    inp.onkeydown=function(ev){
      if(ev.key==='Enter'){inp.blur();}
      if(ev.key==='Escape'){renderSchedule();}
    };
  }
}
function commitInlineDate(id,val){
  if(!val){renderSchedule();return;}
  var idx=DB.posts.findIndex(function(x){return x.id===id;});
  if(idx<0){renderSchedule();return;}
  DB.posts[idx].date=val;
  saveItem('posts',DB.posts[idx]);
  refreshAll();
}

function renderSchedFilter(){
  document.getElementById('schedFilter').innerHTML=DB.stores.map(function(s){
    return'<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;border:1px solid var(--border);font-size:12px;cursor:pointer;color:var(--text2);background:var(--bg2);transition:all .1s" data-sid="'+s.id+'" onclick="toggleSchedFilter(this)"><span style="width:6px;height:6px;border-radius:50%;background:'+s.color+';display:inline-block"></span>'+esc(s.name)+'</span>';
  }).join('');
}
function toggleSchedFilter(el){
  var active=el.getAttribute('data-active')==='1';
  el.setAttribute('data-active',active?'0':'1');
  var color=storeColor(el.getAttribute('data-sid'));
  if(!active){el.style.background=color+'18';el.style.borderColor=color+'60';el.style.color=color;}
  else{el.style.background='';el.style.borderColor='';el.style.color='';}
  renderSchedule();
}
var schedView='cal';
function setSchedView(v){
  schedView=v;
  var listBtn=document.getElementById('viewTabList');
  var calBtn=document.getElementById('viewTabCal');
  var listView=document.getElementById('schedListView');
  var calView=document.getElementById('schedCalView');
  if(listBtn){listBtn.style.background=v==='list'?'var(--accent)':'var(--bg3)';listBtn.style.color=v==='list'?'#fff':'var(--text2)';}
  if(calBtn){calBtn.style.background=v==='cal'?'var(--accent)':'var(--bg3)';calBtn.style.color=v==='cal'?'#fff':'var(--text2)';}
  if(listView)listView.style.display=v==='list'?'':'none';
  if(calView)calView.style.display=v==='cal'?'':'none';
  if(v==='cal')renderCalendar();
}
/* 投稿種別の設定 */
var TYPE_ICON={video:'▶',image:'◼',reel:'◈',story:'◷',inf_visit:'🏃',inf_draft:'📝',inf_post:'✦',shooting:'📷'};
var TYPE_LABEL={video:'動画',image:'画像',reel:'リール',story:'ストーリー',inf_visit:'来店予定',inf_draft:'初稿確認',inf_post:'INF投稿',shooting:'撮影'};
var TYPE_BADGE={video:'b-gray',image:'b-gray',reel:'b-blue',story:'b-gray',inf_visit:'b-amber',inf_draft:'b-green',inf_post:'b-purple',shooting:'b-pink'};

var schedTypeFilter='';
var schedShowPast=false;

/* 日付見出し用ラベル（今日／明日／昨日は特別表記、それ以外は月/日(曜)） */
function schedDateLabel(dateStr){
  var d=new Date(dateStr+'T00:00:00');
  var today=new Date();today.setHours(0,0,0,0);
  var diffDays=Math.round((d-today)/86400000);
  var days=['日','月','火','水','木','金','土'];
  var base=(d.getMonth()+1)+'/'+d.getDate()+'('+days[d.getDay()]+')';
  if(diffDays===0)return'今日 '+base;
  if(diffDays===1)return'明日 '+base;
  if(diffDays===-1)return'昨日 '+base;
  return base;
}

function toggleSchedPast(){
  schedShowPast=!schedShowPast;
  var btn=document.getElementById('schedPastBtn');
  if(btn){
    btn.textContent=schedShowPast?'過去を非表示':'過去を表示';
    btn.style.background=schedShowPast?'var(--accent-bg)':'var(--bg3)';
    btn.style.color=schedShowPast?'var(--accent)':'var(--text2)';
    btn.style.borderColor=schedShowPast?'var(--accent-border)':'var(--border)';
  }
  renderSchedule();
}

function setSchedTypeFilter(el,type){
  schedTypeFilter=type;
  document.querySelectorAll('.sched-type-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  renderSchedule();
  renderCalendar();
}

function renderSchedule(){
  var activeFilters=Array.from(document.querySelectorAll('#schedFilter [data-active="1"]')).map(function(el){return el.getAttribute('data-sid');});
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  var list=DB.posts.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  if(activeFilters.length)list=list.filter(function(p){return activeFilters.includes(p.storeId);});
  /* 過去非表示フィルター（デフォルト：今月1日以降のみ） */
  if(!schedShowPast){
    var monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
    list=list.filter(function(p){return new Date(p.date)>=monthStart;});
  }
  /* 種別フィルター */
  if(schedTypeFilter==='influencer'){
    list=list.filter(function(p){return p.type==='inf_visit'||p.type==='inf_post'||p.type==='inf_draft';});
  }else if(schedTypeFilter==='creator'){
    list=list.filter(function(p){return p.type==='shooting'||(p.creatorId&&(p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story'));});
  }else if(schedTypeFilter==='normal'){
    list=list.filter(function(p){return p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story';});
  }
  if(search)list=list.filter(function(p){
    return storeName(p.storeId).toLowerCase().includes(search)
      ||(p.caption||'').toLowerCase().includes(search)
      ||(p.infId?infName(p.infId).toLowerCase().includes(search):false);
  });
  var tb=document.getElementById('schedBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="6" class="empty-state">スケジュールがありません</td></tr>';return;}
  var lastDateKey=null;
  tb.innerHTML=list.map(function(p){
    /* 日付が変わるたびに見出し行を挿入して、全店舗混在でも日単位で追いやすくする */
    var dateKey=(p.date||'').slice(0,10);
    var headerHtml='';
    if(dateKey&&dateKey!==lastDateKey){
      lastDateKey=dateKey;
      headerHtml='<tr><td colspan="6" style="background:var(--bg3);font-weight:500;font-size:12px;color:var(--text2);padding:6px 10px">📅 '+schedDateLabel(dateKey)+'</td></tr>';
    }
    return headerHtml+schedRowHtml(p);
  }).join('');
}
function schedRowHtml(p){
    var isInf=p.type==='inf_visit'||p.type==='inf_post'||p.type==='inf_draft';
    var infCell;
    if(isInf&&p.infId){
      infCell='<span style="color:var(--purple)">'+esc(infName(p.infId).split(' ')[0])+'</span>';
    }else if(p.creatorId){
      var _crInf=DB.creators?DB.creators.find(function(x){return x.id===p.creatorId;}):null;
      infCell='<span style="color:#db2777">📷 '+esc((_crInf&&_crInf.crName)||'クリエイター')+'</span>';
    }else{
      infCell='<span style="color:var(--text3)">—</span>';
    }
    /* 行色：期限超過だけを強調する（他の色は情報過多になるため付けない） */
    var now2=new Date();
    var postDate=new Date(p.date);
    var isDone=p.status==='done'||p.status==='visited'||p.status==='approved';
    var isOverdue=postDate<now2&&!isDone;
    var rowBg=isOverdue?'background:var(--red-bg)':'';
    var adBadge=p.ad==='yes'?'<span class="badge b-blue" style="font-size:11px;margin-left:5px">📢広告</span>':'';
    return'<tr style="'+rowBg+';cursor:pointer" onclick="openPostModal(\''+p.id+'\')">'
      +'<td><span class="badge '+TYPE_BADGE[p.type]+'">'+(TYPE_ICON[p.type]||'')+' '+(TYPE_LABEL[p.type]||p.type)+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:5px"><span style="width:5px;height:5px;border-radius:50%;background:'+storeColor(p.storeId)+';display:inline-block;flex-shrink:0"></span>'+esc(storeName(p.storeId))+'</div></td>'
      +'<td class="td-mono" style="white-space:nowrap" onclick="inlineDateEdit(event,\''+p.id+'\')" title="クリックで日時変更">'+fmtDT(p.date)+(isOverdue?' <span style="color:var(--red);font-size:11px">超過</span>':'')+'</td>'
      +'<td>'+infCell+'</td>'
      +'<td>'+postStatusBadge(p.status)+adBadge+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'
        +'<button class="btn-ghost-danger" onclick="deletePost(\''+p.id+'\')">削除</button>'
      +'</td>'
      +'</tr>';
}

function renderCalendar(){
  var titleEl=document.getElementById('calTitle');
  if(!titleEl)return;
  titleEl.textContent=calYear+'年'+(calMonth+1)+'月';
  var headsEl=document.getElementById('calHeads');
  var cellsEl=document.getElementById('calCells');
  if(!headsEl||!cellsEl)return;
  var days=['日','月','火','水','木','金','土'];
  headsEl.innerHTML=days.map(function(d,i){
    return'<div class="cal-head" style="'+(i===0?'color:var(--red)':i===6?'color:var(--accent)':'')+'">'+d+'</div>';
  }).join('');
  var first=new Date(calYear,calMonth,1).getDay(),last=new Date(calYear,calMonth+1,0).getDate();
  var cells='';
  for(var i=0;i<first;i++)cells+='<div class="cal-cell empty"></div>';
  for(var d=1;d<=last;d++){
    var dd=d; /* closure */
    var isToday=dd===NOW.getDate()&&calMonth===NOW.getMonth()&&calYear===NOW.getFullYear();
    var dayItems=DB.posts.filter(function(p){
      var dt=new Date(p.date);
      if(!(dt.getDate()===dd&&dt.getMonth()===calMonth&&dt.getFullYear()===calYear&&!calActiveStores[p.storeId]))return false;
      if(schedTypeFilter==='influencer')return p.type==='inf_visit'||p.type==='inf_post'||p.type==='inf_draft';
      if(schedTypeFilter==='creator')return p.type==='shooting'||(p.creatorId&&(p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story'));
      if(schedTypeFilter==='normal')return p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story';
      return true;
    });
    /* 種別ごとに色分け（固定カラー） */
    /* INF系=紫、クリエイター=ピンク、通常=青 */
    var CAL_COLOR={
      inf_visit: {bg:'#ede9fe',col:'#6d28d9'},
      inf_draft: {bg:'#ddd6fe',col:'#4c1d95'},
      inf_post:  {bg:'#c4b5fd',col:'#3b0764'},
      shooting:  {bg:'#fce7f3',col:'#9d174d'},
      video:     {bg:'#dbeafe',col:'#1e40af'},
      image:     {bg:'#dbeafe',col:'#1e40af'},
      reel:      {bg:'#dbeafe',col:'#1e40af'},
      story:     {bg:'#dbeafe',col:'#1e40af'}
    };
    var chips=dayItems.slice(0,4).map(function(p){
      var cc=CAL_COLOR[p.type]||{bg:'#f3f4f6',col:'#374151'};
      /* クリエイター動画はピンク（撮影と同色） */
      if(p.creatorId&&(p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story')){
        cc={bg:'#fce7f3',col:'#9d174d'};
      }
      /* ラベル生成 */
      var shortName='';
      var typeTag='';
      if(p.type==='inf_visit'||p.type==='inf_draft'||p.type==='inf_post'){
        var iObj=DB.influencers.find(function(x){return x.id===p.infId;})||{};
        shortName=esc((iObj.name||'').split(/[\s　]/)[0].slice(0,6));
        typeTag=p.type==='inf_visit'?'来店':p.type==='inf_draft'?'初稿':'投稿';
        var label=shortName?shortName+'：'+typeTag:'INF '+typeTag;
      }else if(p.type==='shooting'){
        var label='📷 '+esc(storeName(p.storeId).slice(0,6));
      }else{
        var icon2=TYPE_ICON[p.type]||'';
        var _crCal=p.creatorId&&DB.creators?DB.creators.find(function(x){return x.id===p.creatorId;}):null;
        var label=_crCal?(icon2+' '+esc(_crCal.crName.slice(0,6))):(icon2+' '+esc(storeName(p.storeId).slice(0,6)));
      }
      /* 遅延チェック */
      var isDone2=p.status==='done'||p.status==='visited'||p.status==='approved';
      var isLate=new Date(p.date)<new Date()&&!isDone2;
      var chipBg=isLate?'#fee2e2':isDone2?'#f0fdf4':cc.bg;
      var chipCol=isLate?'#991b1b':isDone2?'#166534':cc.col;
      return'<div class="cal-chip" draggable="true" '
        +'ondragstart="calChipDragStart(event,\''+p.id+'\','+dd+')" '
        +'onclick="event.stopPropagation();openPostModal(\''+p.id+'\')" '
        +'style="background:'+chipBg+';color:'+chipCol+';cursor:grab;user-select:none;font-weight:500" '
        +'title="ドラッグで日程移動・クリックで編集">'+label+'</div>';
    }).join('');
    var more=dayItems.length>4?'<div style="font-size:10px;color:var(--accent);cursor:pointer;text-decoration:underline" onclick="event.stopPropagation();openDayDetail('+calYear+','+calMonth+','+dd+')">+'+(dayItems.length-4)+'件</div>':'';
    cells+='<div class="cal-cell'+(isToday?' today':'')+'" '
      +'data-day="'+dd+'" '
      +'ondragover="calCellDragOver(event)" '
      +'ondragleave="calCellDragLeave(event)" '
      +'ondrop="calCellDrop(event,'+dd+')" '
      +'onclick="calDayClick('+dd+')" '
      +'style="cursor:pointer">'
      +'<div class="cal-num">'+dd+'</div>'+chips+more+'</div>';
  }
  cellsEl.innerHTML=cells;
}
function calDayClick(d){
  /* 日付クリックで投稿追加モーダルをその日付でプリフィル */
  openPostModal();
  var pad=function(n){return String(n).padStart(2,'0');};
  var dateStr=calYear+'-'+pad(calMonth+1)+'-'+pad(d)+'T19:00';
  var el=document.getElementById('pDate');
  if(el)el.value=dateStr;
}

/* カレンダーの「+N件」から、その日の全予定を一覧表示 */
function openDayDetail(y,m,d){
  var items=DB.posts.filter(function(p){
    var dt=new Date(p.date);
    if(!(dt.getDate()===d&&dt.getMonth()===m&&dt.getFullYear()===y&&!calActiveStores[p.storeId]))return false;
    if(schedTypeFilter==='influencer')return p.type==='inf_visit'||p.type==='inf_post'||p.type==='inf_draft';
    if(schedTypeFilter==='creator')return p.type==='shooting'||(p.creatorId&&(p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story'));
    if(schedTypeFilter==='normal')return p.type==='video'||p.type==='image'||p.type==='reel'||p.type==='story';
    return true;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var pad=function(n){return String(n).padStart(2,'0');};
  var dateStr=y+'-'+pad(m+1)+'-'+pad(d);
  var titleEl=document.getElementById('dayDetailTitle');
  if(titleEl)titleEl.textContent=schedDateLabel(dateStr)+'の予定（'+items.length+'件）';
  var bodyEl=document.getElementById('dayDetailBody');
  if(bodyEl){
    bodyEl.innerHTML=items.length?items.map(function(p){
      var isInf=p.type==='inf_visit'||p.type==='inf_post'||p.type==='inf_draft';
      var who=isInf&&p.infId?infName(p.infId).split(' ')[0]
        :(p.creatorId&&DB.creators?((DB.creators.find(function(x){return x.id===p.creatorId;})||{}).crName||'クリエイター'):'—');
      return'<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal(\'dayDetailModal\');openPostModal(\''+p.id+'\')">'
        +'<span class="badge '+TYPE_BADGE[p.type]+'" style="white-space:nowrap">'+(TYPE_ICON[p.type]||'')+' '+(TYPE_LABEL[p.type]||p.type)+'</span>'
        +'<span style="font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(storeName(p.storeId))+' — '+esc(who)+'</span>'
        +postStatusBadge(p.status)
      +'</div>';
    }).join(''):'<div class="empty-state">予定はありません</div>';
  }
  openModal('dayDetailModal');
}

function toggleCalStore(id){calActiveStores[id]=!calActiveStores[id];renderCalendar();}
function calMove(d){calMonth+=d;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}

/* ---- カレンダー ドラッグ&ドロップ ---- */
var _calDragPostId=null;
function calChipDragStart(e,postId,fromDay){
  _calDragPostId=postId;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',postId);
  /* ドラッグ中は薄くする */
  e.target.style.opacity='0.4';
}
function calCellDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  e.currentTarget.style.background='var(--accent-bg)';
  e.currentTarget.style.borderColor='var(--accent)';
}
function calCellDragLeave(e){
  e.currentTarget.style.background='';
  e.currentTarget.style.borderColor='';
}
function calCellDrop(e,toDay){
  e.preventDefault();
  e.currentTarget.style.background='';
  e.currentTarget.style.borderColor='';
  var postId=_calDragPostId||e.dataTransfer.getData('text/plain');
  if(!postId)return;
  var idx=DB.posts.findIndex(function(x){return x.id===postId;});
  if(idx<0)return;
  var p=DB.posts[idx];
  var oldDate=new Date(p.date);
  var newDate=new Date(calYear,calMonth,toDay,oldDate.getHours(),oldDate.getMinutes());
  var pad=function(n){return String(n).padStart(2,'0');};
  p.date=newDate.getFullYear()+'-'+pad(newDate.getMonth()+1)+'-'+pad(newDate.getDate())
    +'T'+pad(newDate.getHours())+':'+pad(newDate.getMinutes());
  saveItem('posts',p);
  renderCalendar();
  if(currentPage==='schedule')renderSchedule();
  _calDragPostId=null;
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

