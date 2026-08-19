/* 案件進捗ステップ
   「初回/2回目以降」という切り替えは廃止。①新規契約時に1回だけ行う初期セットアップ
   （ヒアリング〜アカウント連携）と、②企画提出・撮影・投稿の繰り返し履歴、の2つに分けて
   常に両方表示する（同じキーをモードによって使い回さない） */
var ACCOUNT_PLATFORMS=['Instagram','Facebook','TikTok'];
var PROGRESS_STEPS=[
  {key:'hearing',  label:'ヒアリング',          hasNa:false},
  {key:'creator',  label:'クリエイター',        hasNa:false},
  {key:'kickoff',  label:'キックオフ',          hasNa:true},
  {key:'accounts', label:'アカウント作成・連携', hasNa:false, accounts:ACCOUNT_PLATFORMS},
  {key:'plan',     label:'企画提出',            hasNa:false},
  {key:'shoot',    label:'撮影',                hasNa:false},
  {key:'post',     label:'投稿',                hasNa:false}
];
function progressStepsFor(s){return PROGRESS_STEPS;}
/* 毎月発生しうるステップ。単発の完了/取り消しではなく履歴を積み上げる */
var RECURRING_STEP_KEYS=['plan','shoot','post'];
function isAccountsDone(p){p=p||{};var ac=p.accountChecks||{};return ACCOUNT_PLATFORMS.every(function(n){return ac[n];});}
function progressPct(s){
  var steps=progressStepsFor(s);var prog=s.progress||{};var done=0;
  steps.forEach(function(st){
    var p=prog[st.key]||{};
    if(st.accounts){if(isAccountsDone(p))done++;}
    else if(p.status==='done'||p.status==='na')done++;
  });
  return steps.length?Math.round(done/steps.length*100):0;
}

/* 原価（楽々販売への原価入力用）
   広告費原価：プランに含む広告費（プラン管理で設定）
   クリエイティブ費用：直近のクリエイター請求（経理管理）の制作費。累計ではなく現案件分のみ */
function currentCreativeCost(storeId){
  var list=(DB.invoices||[]).filter(function(inv){return inv.storeId===storeId&&inv.payeeType==='creator';});
  if(!list.length)return null;
  list.sort(function(a,b){return new Date(b.receivedDate||0)-new Date(a.receivedDate||0);});
  var latest=list[0];
  var cr=(DB.creators||[]).find(function(c){return c.id===latest.creatorId;});
  return{amount:latest.makeFee||0,creatorName:cr?cr.crName:'—',date:latest.receivedDate||''};
}
function storeCostInfo(s){
  var plan=s.planId?DB.plans.find(function(p){return p.id===s.planId;}):null;
  var adBudget=plan&&plan.adBudget?Number(plan.adBudget):0;
  var creative=currentCreativeCost(s.id);
  var creativeAmount=creative?Number(creative.amount)||0:0;
  return{
    adBudget:adBudget,
    creative:creative,
    total:adBudget+creativeAmount
  };
}

function renderProgressTab(){
  var el=document.getElementById('progressSteps');
  if(!el)return;
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:12px">店舗を選択してください</div>';return;}
  var steps=progressStepsFor(s);
  var prog=s.progress||{};
  var bs='font-size:13px;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid;white-space:nowrap;';
  var rows=steps.map(function(step,i){
    var p=prog[step.key]||{status:'pending',date:''};
    /* アカウント作成・連携：媒体サブチェックで完了判定 */
    if(step.accounts){
      var allDone=isAccountsDone(p);
      var ac=p.accountChecks||{};
      var circleStyle=allDone?'background:var(--green);border-color:var(--green);color:#fff':'background:var(--bg3);border-color:var(--border);color:var(--text3)';
      var subBtns=step.accounts.map(function(n){
        var on=ac[n];
        return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;padding:5px 10px;border-radius:var(--r);border:1px solid '+(on?'var(--green-border)':'var(--border)')+';background:'+(on?'var(--green-bg)':'var(--bg3)')+';color:'+(on?'var(--green)':'var(--text2)')+'">'
          +'<input type="checkbox" '+(on?'checked':'')+' onchange="toggleAccountCheck(\''+n+'\')" style="width:auto;margin:0"> '+esc(n)
        +'</label>';
      }).join('');
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">'
        +'<div style="width:30px;height:30px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;'+circleStyle+'">'+(allDone?'✓':String(i+1))+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:14px;font-weight:600;color:'+(allDone?'var(--green)':'var(--text)')+'">'+step.label+(allDone?' <span style="color:var(--green);font-size:12px">✓ 完了</span>':'')+'<span style="font-size:11px;color:var(--text3);font-weight:400;margin-left:6px">各アカウント作成 or 連携完了</span></div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+subBtns+'</div>'
        +'</div>'
      +'</div>';
    }
    /* 繰り返し発生ステップ（企画提出・撮影・投稿）：6ヶ月契約などで毎月発生するため、
       単発の完了/取り消しではなく履歴を積み上げていく */
    if(RECURRING_STEP_KEYS.indexOf(step.key)>=0){
      var history=(p.history&&p.history.length)?p.history.slice():(p.status==='done'&&p.date?[{date:p.date}]:[]);
      var hasHistory=history.length>0;
      var latest=hasHistory?history[history.length-1].date:'';
      var circleStyle2=hasHistory?'background:var(--green);border-color:var(--green);color:#fff':'background:var(--bg3);border-color:var(--border);color:var(--text3)';
      var labelColor2=hasHistory?'var(--green)':'var(--text)';
      var suffix2=hasHistory?' <span style="color:var(--green);font-size:12px">✓ 完了（'+history.length+'回）</span>':'';
      var latestHtml=latest?'<span style="font-size:12px;color:var(--text3);margin-left:8px">直近：'+esc(latest)+'</span>':'';
      var historyRows=history.slice().reverse().map(function(h,hi){
        var realIdx=history.length-1-hi;
        return'<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--text2)">'
          +'<span class="td-mono">'+esc(h.date)+'</span>'
          +'<button style="font-size:11px;padding:2px 6px;border-radius:5px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer" onclick="removeStepOccurrence(\''+step.key+'\','+realIdx+')">削除</button>'
        +'</div>';
      }).join('');
      return'<div style="padding:12px 0;border-bottom:1px solid var(--border)">'
        +'<div style="display:flex;align-items:center;gap:12px">'
          +'<div style="width:30px;height:30px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;'+circleStyle2+'">'+(hasHistory?'✓':String(i+1))+'</div>'
          +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:14px;font-weight:600;color:'+labelColor2+'">'+step.label+suffix2+latestHtml+'</div>'
          +'</div>'
          +'<input type="date" id="pg_'+step.key+'" value="" style="font-size:13px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);width:140px;flex-shrink:0">'
          +'<button style="'+bs+'background:var(--accent);color:#fff;border-color:var(--accent);flex-shrink:0" onclick="addStepOccurrence(\''+step.key+'\',document.getElementById(\'pg_'+step.key+'\').value)">＋ 記録追加</button>'
        +'</div>'
        +(hasHistory?'<div style="margin-left:42px;margin-top:6px">'+historyRows+'</div>':'')
      +'</div>';
    }
    /* 通常ステップ */
    var isDone=p.status==='done';
    var isNa=p.status==='na';
    var circleStyle=isDone?'background:var(--green);border-color:var(--green);color:#fff':'background:var(--bg3);border-color:var(--border);color:var(--text3)';
    var labelColor=isDone?'var(--green)':isNa?'var(--text3)':'var(--text)';
    var suffix=isDone?' <span style="color:var(--green);font-size:12px">✓ 完了</span>':isNa?' <span style="color:var(--text3);font-size:12px">不要</span>':'';
    var dateHtml=p.date?'<span style="font-size:12px;color:var(--text3);margin-left:8px">'+esc(p.date)+'</span>':'';
    var btns='';
    if(!isDone&&!isNa){
      btns='<button style="'+bs+'background:var(--accent);color:#fff;border-color:var(--accent)" onclick="saveStepProgress(\''+step.key+'\',\'done\',document.getElementById(\'pg_'+step.key+'\').value)">完了</button>';
      if(step.hasNa)btns+=' <button style="'+bs+'background:var(--bg3);color:var(--text2);border-color:var(--border)" onclick="saveStepProgress(\''+step.key+'\',\'na\',\'\')">不要</button>';
    }else{
      btns='<button style="'+bs+'background:var(--bg3);color:var(--text3);border-color:var(--border)" onclick="saveStepProgress(\''+step.key+'\',\'pending\',\'\')">取り消す</button>';
    }
    var salesJoinHtml='';
    if(step.key==='kickoff'){
      var sj=p.salesJoin?true:false;
      salesJoinHtml='<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:'+(sj?'var(--accent)':'var(--text3)')+';cursor:pointer;margin-top:4px">'
        +'<input type="checkbox" '+(sj?'checked':'')+' onchange="toggleKickoffSalesJoin(this.checked)" style="cursor:pointer">'
        +'🤝 営業同席希望'+(sj?'（あり）':'')
      +'</label>';
    }
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:30px;height:30px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;'+circleStyle+'">'+(isDone?'✓':isNa?'—':String(i+1))+'</div>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:14px;font-weight:600;color:'+labelColor+'">'+step.label+suffix+dateHtml+'</div>'
        +salesJoinHtml
      +'</div>'
      +'<input type="date" id="pg_'+step.key+'" value="'+(p.date||'')+'" style="font-size:13px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text);width:140px;flex-shrink:0">'
      +'<div style="display:flex;gap:6px;flex-shrink:0">'+btns+'</div>'
    +'</div>';
  }).join('');
  el.innerHTML='<div style="padding-bottom:8px">'+rows+'</div>';
}

function toggleAccountCheck(name){
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s)return;
  if(!s.progress)s.progress={};
  var p=s.progress.accounts||{status:'pending',date:'',accountChecks:{}};
  if(!p.accountChecks)p.accountChecks={};
  p.accountChecks[name]=!p.accountChecks[name];
  p.status=isAccountsDone(p)?'done':'pending';
  if(p.status==='done'&&!p.date){var d=new Date();p.date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  s.progress.accounts=p;
  saveItem('stores',s);
  renderProgressTab();
  renderTodoList();
}

function saveStepProgress(stepKey,status,date){
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s)return;
  if(!s.progress)s.progress={};
  var prev=s.progress[stepKey]||{};
  s.progress[stepKey]={status:status,date:date||'',salesJoin:prev.salesJoin||false,history:prev.history};
  saveItem('stores',s);
  renderProgressTab();
  renderTodoList();
}
function addStepOccurrence(stepKey,date){
  if(!date){alert('日付を選択してください');return;}
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s)return;
  if(!s.progress)s.progress={};
  var prev=s.progress[stepKey]||{};
  var history=(prev.history&&prev.history.length)?prev.history.slice():(prev.status==='done'&&prev.date?[{date:prev.date}]:[]);
  history.push({date:date});
  history.sort(function(a,b){return a.date.localeCompare(b.date);});
  s.progress[stepKey]={status:'done',date:history[history.length-1].date,history:history,salesJoin:prev.salesJoin||false};
  saveItem('stores',s);
  renderProgressTab();
  renderTodoList();
}
function removeStepOccurrence(stepKey,idx){
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s||!s.progress||!s.progress[stepKey])return;
  var prev=s.progress[stepKey];
  var history=(prev.history&&prev.history.length)?prev.history.slice():(prev.status==='done'&&prev.date?[{date:prev.date}]:[]);
  history.splice(idx,1);
  s.progress[stepKey]={status:history.length?'done':'pending',date:history.length?history[history.length-1].date:'',history:history,salesJoin:prev.salesJoin||false};
  saveItem('stores',s);
  renderProgressTab();
  renderTodoList();
}
function toggleKickoffSalesJoin(checked){
  var s=DB.stores.find(function(x){return x.id===editingStoreId;});
  if(!s)return;
  if(!s.progress)s.progress={};
  var prev=s.progress.kickoff||{status:'pending',date:''};
  prev.salesJoin=checked;
  s.progress.kickoff=prev;
  saveItem('stores',s);
  renderProgressTab();
  renderTodoList();
}


/* ============================================================
   営業時間・定休日 統合管理
   保存形式（sHours hidden field に JSON文字列）:
   シンプル: "17:00–24:00"
   曜日別:   {"common":"17:00–24:00","perDay":true,"days":{"mon":{"closed":true},"sun":{"from":"18:00","to":"23:00"},"hol":{"closed":true}}}
   ============================================================ */
var DAY_KEYS=['mon','tue','wed','thu','fri','sat','sun','hol'];
var DAY_LABELS={'mon':'月','tue':'火','wed':'水','thu':'木','fri':'金','sat':'土','sun':'日','hol':'祝'};
var HOURS_FROM_OPTS=['00:00','6:00','7:00','8:00','9:00','10:00','11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','17:30','18:00','18:30','19:00','20:00'];
var HOURS_TO_OPTS=['21:00','22:00','22:30','23:00','23:30','24:00','25:00','26:00','27:00','28:00','翌3:00','翌5:00'];
var _pdListsRendered=false;

function ensurePerDayDatalist(){
  if(_pdListsRendered)return;
  _pdListsRendered=true;
  var frag=document.createDocumentFragment();
  var dlf=document.createElement('datalist');dlf.id='pdFromList';
  HOURS_FROM_OPTS.forEach(function(o){var opt=document.createElement('option');opt.value=o;dlf.appendChild(opt);});
  var dlt=document.createElement('datalist');dlt.id='pdToList';
  HOURS_TO_OPTS.forEach(function(o){var opt=document.createElement('option');opt.value=o;dlt.appendChild(opt);});
  frag.appendChild(dlf);frag.appendChild(dlt);
  document.body.appendChild(frag);
}

function makeTimeInput(id, val, onchangeFn, listId){
  /* wrapperのdivとhidden inputを返す（DOMに追加後にmakeTimePicker24を呼ぶ） */
  return '<div id="wrap-'+id+'" style="display:inline-flex"></div>'
    +'<input type="hidden" id="'+id+'" value="'+esc(val||'')+'">';
}
/* makeTimeInput後にピッカー初期化するコール */
function initMadeTimePickers(){
  document.querySelectorAll('[id^="wrap-pdf"],[id^="wrap-pdto"]').forEach(function(wrap){
    var hid=document.getElementById(wrap.id.replace("wrap-",""));
    if(hid&&!wrap._pickerInit){
      wrap._pickerInit=true;
      makeTimePicker24(wrap.id, hid.id, function(){updateHoursData();});
      var w=document.getElementById(wrap.id);
      if(w&&w._setTime)w._setTime(hid.value||'');
    }
  });
}

function renderPerDayTable(savedDays){
  var body=document.getElementById('perDayBody');
  if(!body)return;
  body.innerHTML=DAY_KEYS.map(function(key){
    var d=savedDays&&savedDays[key]?savedDays[key]:{};
    var closed=d.closed||false;
    var rowStyle=closed?'background:var(--red-bg)':'';
    return '<tr id="pdr-'+key+'" style="border-bottom:1px solid var(--border);'+rowStyle+'">'
      +'<td style="padding:6px 10px;text-align:center">'
        +'<input type="checkbox" id="pdc-'+key+'" '+(closed?'checked':'')+' onchange="onDayClosedChange(\''+key+'\')" style="width:auto;margin:0">'
      +'</td>'
      +'<td style="padding:6px 8px;font-size:13px;font-weight:500;color:'+(closed?'var(--red)':'var(--text)')+'">'+DAY_LABELS[key]+'</td>'
      +'<td style="padding:4px 8px">'
        +(closed
          ?'<span style="font-size:12px;color:var(--red)">定休日</span>'
          :makeTimeInput('pdfrom-'+key,d.from||'','updateHoursData()','pdFromList')
        )
      +'</td>'
      +'<td style="padding:4px 8px">'
        +(closed
          ?''
          :'<span style="font-size:12px;color:var(--text3);margin-right:4px">〜</span>'
           +makeTimeInput('pdto-'+key,d.to||'','updateHoursData()','pdToList')
        )
      +'</td>'
      +'</tr>';
  }).join('');
  /* ピッカー初期化（DOM追加後） */
  setTimeout(initMadeTimePickers, 0);
}

function onDayClosedChange(key){
  updateHoursData();
  /* 行の背景・テキストを即時更新するために再描画 */
  var days=getPerDayData();
  renderPerDayTable(days);
  /* チェック状態をDOMから再取得して再セット（再描画後にチェックが消えないよう） */
  var el=document.getElementById('pdc-'+key);
  if(el)el.checked=days[key]&&days[key].closed;
}

function getPerDayData(){
  var days={};
  DAY_KEYS.forEach(function(key){
    var closedEl=document.getElementById('pdc-'+key);
    if(!closedEl)return;
    var closed=closedEl.checked;
    if(closed){days[key]={closed:true};}
    else{
      var fromEl=document.getElementById('pdfrom-'+key);
      var toEl=document.getElementById('pdto-'+key);
      var from=fromEl?fromEl.value:'';
      var to=toEl?toEl.value:'';
      if(from||to)days[key]={from:from,to:to};
    }
  });
  return days;
}

function togglePerDay(){
  ensurePerDayDatalist();
  var on=document.getElementById('sPerDay').checked;
  document.getElementById('perDayTable').style.display=on?'':'none';
  if(on){
    var cur=parseHoursData(document.getElementById('sHours').value);
    /* 共通時間を引き継いで各曜日の初期値にセット */
    var commonFrom=document.getElementById('sHoursFrom').value;
    var commonTo=document.getElementById('sHoursTo').value;
    var existingDays=cur.days||{};
    /* 既存daysデータがない曜日に共通時間をセット */
    if(commonFrom||commonTo){
      DAY_KEYS.forEach(function(key){
        if(!existingDays[key]){
          existingDays[key]={from:commonFrom,to:commonTo};
        }
      });
    }
    renderPerDayTable(existingDays);
  }
  updateHoursData();
}

function updateHoursData(){
  var from=document.getElementById('sHoursFrom').value;
  var to=document.getElementById('sHoursTo').value;
  var perDay=document.getElementById('sPerDay').checked;
  var hoursEl=document.getElementById('sHours');
  var holidayEl=document.getElementById('sHoliday');
  if(!perDay){
    hoursEl.value=(from&&to)?from+'–'+to:(from||to||'');
    holidayEl.value='';
  }else{
    var days=getPerDayData();
    var obj={common:(from&&to)?from+'–'+to:'',perDay:true,days:days};
    hoursEl.value=JSON.stringify(obj);
    /* holiday フィールドを定休日曜日テキストで更新 */
    var closedDays=DAY_KEYS.filter(function(k){return days[k]&&days[k].closed;})
      .map(function(k){return DAY_LABELS[k]+'曜';});
    if(closedDays.length){
      holidayEl.value=closedDays.map(function(d){return d.replace('祝曜','祝日');}).join('・');
    }else{
      holidayEl.value='';
    }
  }
}

function parseHoursData(val){
  if(!val)return{common:'',perDay:false,days:{}};
  if(val.charAt(0)==='{'){
    try{return JSON.parse(val);}catch(e){}
  }
  return{common:val,perDay:false,days:{}};
}

/* ---- clearStoreForm / openStoreModal 用の復元 ---- */
function restoreHoursUI(hoursVal){
  var data=parseHoursData(hoursVal);
  var perDayEl=document.getElementById('sPerDay');
  var tableEl=document.getElementById('perDayTable');
  if(data.perDay){
    perDayEl.checked=true;
    tableEl.style.display='';
    var parts=(data.common||'').split('–');
    var _sfwrap=document.getElementById('sHoursFromWrap');
    var _stwrap=document.getElementById('sHoursToWrap');
    if(_sfwrap&&_sfwrap._setTime)_sfwrap._setTime(parts[0]||'');else{var _sf=document.getElementById('sHoursFrom');if(_sf)_sf.value=parts[0]||'';}
    if(_stwrap&&_stwrap._setTime)_stwrap._setTime(parts[1]||'');else{var _st=document.getElementById('sHoursTo');if(_st)_st.value=parts[1]||'';}
    renderPerDayTable(data.days||{});
  }else{
    perDayEl.checked=false;
    tableEl.style.display='none';
    var parts2=(data.common||'').split('–');
    var _sfwrap2=document.getElementById('sHoursFromWrap');
    var _stwrap2=document.getElementById('sHoursToWrap');
    if(_sfwrap2&&_sfwrap2._setTime)_sfwrap2._setTime(parts2[0]||'');else{var _sf2=document.getElementById('sHoursFrom');if(_sf2)_sf2.value=parts2[0]||'';}
    if(_stwrap2&&_stwrap2._setTime)_stwrap2._setTime(parts2[1]||'');else{var _st2=document.getElementById('sHoursTo');if(_st2)_st2.value=parts2[1]||'';}
  }
  document.getElementById('sHours').value=hoursVal||'';
}

/* ---- 人間が読める営業時間サマリー（表示用） ---- */
function formatHoursSummary(hoursVal){
  var data=parseHoursData(hoursVal);
  if(!data.perDay)return data.common||'—';
  var common=data.common||'';
  var lines=[];
  DAY_KEYS.forEach(function(key){
    var d=data.days&&data.days[key];
    if(!d)return;
    var label=DAY_LABELS[key];
    if(d.closed){lines.push(label+': 定休');}
    else if(d.from||d.to){lines.push(label+': '+(d.from||'?')+'–'+(d.to||'?'));}
  });
  if(!lines.length)return common||'—';
  return (common?common+'\n':'')+lines.join(' / ');
}

function clearStoreForm(){
  ['sName','sPref','sArea','sSeats','sTabelog','sHp','sMemo','sCaution','sIg','sIgFollowers','sFb','sTw','sTt','sYt','sMetaId','sCreator','sContractStart','sMonthlyFee','sDiscountPercent','sDiscountNote','sContactName','sContactRole','sContactTel','sContactEmail','sContactLine','sSetupMemo','sNextAction','sNegotiatingMemo'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('sGenre').value='';
  var scorp=document.getElementById('sCorpId');if(scorp)scorp.value='';
  document.getElementById('sHours').value='';
  document.getElementById('sHoliday').value='';
  document.getElementById('sHoursFrom').value='';
  document.getElementById('sHoursTo').value='';
  document.getElementById('sPerDay').checked=false;
  document.getElementById('perDayTable').style.display='none';
  document.getElementById('sMetaExp').value='none';
  document.getElementById('sContractTerm').value='3';
  document.getElementById('sStatus').value='pending';
  document.getElementById('sReviewCycle').value='monthly';
  document.getElementById('sAdDelivery').value='yes';
  document.getElementById('sVideos').value='2';
  document.getElementById('sPlanId').value='';
  document.getElementById('sPlanPreview').textContent='';
  ['hIssue','hTargetWant','hTargetNow','hTiming','hIdealCustomer','hStrength','hArea','hIgPurpose','hMenu','hKpi','hTargetAge','hTargetGender','hTargetRegion','hTargetInterest','hRefAccount','hNg','hPastAd','hAccMgr','hLoginShare','hFbPage','hInPost','hDmMgr','hPostContent','hPostFlow','hApprovalDays','hPhotoAsset','hVideoAsset','hNewShoot','hLogo','hPastAsset','hTonmana','hAdIg','hAdStart','hAdBudget','hLpUrl','hInfStart','hInfEnd','hInfCount','hInfGenre','hInfFollowers','hInfMust','hHashtag','hOpStart','hShootDate','hPostStart','hAdStart2','hInfPostDate','hOther'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';}); 
}

function openStoreModal(id){
  editingStoreId=id||null;
  clearStoreForm();
  updateGenreDatalist();
  updatePlanSelect();
  updateSalesPersonSelects();
  /* クリエイターselectを最新のDB.creatorsで更新 */
  var crSel=document.getElementById('sCreator');
  if(crSel){
    crSel.innerHTML='<option value="">（未設定）</option>';
    DB.creators.slice().sort(function(a,b){return(a.crName||'').localeCompare(b.crName||'');}).forEach(function(cr){
      var opt=document.createElement('option');
      opt.value=cr.id;
      opt.textContent=cr.crName+(cr.crRealName?' ('+cr.crRealName+')':'');
      crSel.appendChild(opt);
    });
  }
  document.getElementById('storeModalTitle').textContent=id?'店舗を編集':'店舗を追加';
  if(id){
    var s=DB.stores.find(function(x){return x.id===id;});
    if(s){
      var map={sName:'name',sCorpId:'corpId',sGenre:'genre',sPref:'pref',sArea:'area',sZip:'zip',sSeats:'seats',sTabelog:'tabelog',sHp:'hp',sMemo:'memo',sCaution:'caution',sIg:'ig',sIgFollowers:'igFollowers',sFb:'fb',sTw:'tw',sTt:'tt',sYt:'yt',sMetaId:'metaId',sMetaExp:'metaExp',sCreator:'creator',sContractStart:'contractStart',sContractTerm:'contractTerm',sMonthlyFee:'monthlyFee',sDiscountPercent:'discountPercent',sDiscountNote:'discountNote',sStatus:'status',sContactName:'contactName',sContactRole:'contactRole',sContactTel:'contactTel',sContactEmail:'contactEmail',sContactLine:'contactLine',sOurManager:'ourManager',sReviewCycle:'reviewCycle',sVideos:'videos',sAdDelivery:'adDelivery',sSetupMemo:'setupMemo',sPlanId:'planId'};
      Object.keys(map).forEach(function(elId){var el=document.getElementById(elId);if(el&&s[map[elId]]!==undefined)el.value=s[map[elId]];});
      if(document.getElementById('sOurManager')&&!document.getElementById('sOurManager').value&&s.salesBy){
        document.getElementById('sOurManager').value=s.salesBy;
      }
      /* 退職済み担当者の表示 */
      refreshManagerDisplay(s);
      /* 営業時間・定休日を復元 */
      restoreHoursUI(s.hours||'');
      showPlanPreview();
      if(s.hearing){Object.keys(s.hearing).forEach(function(k){var el=document.getElementById(k);if(el)el.value=s.hearing[k]||'';});}
      var naEl=document.getElementById('sNextAction');if(naEl)naEl.value=s.nextAction||'';
      var nmEl=document.getElementById('sNegotiatingMemo');if(nmEl)nmEl.value=s.negotiatingMemo||'';
      onStoreStatusChange();
    }
  }
  /* インフルエンサー施策セクション：入力済みなら開く、空なら折りたたむ */
  var hInfDet=document.getElementById('hInfDetails');
  if(hInfDet){
    var hasInf=['hInfStart','hInfEnd','hInfCount','hInfGenre','hInfFollowers','hInfMust','hHashtag'].some(function(fid){
      var el=document.getElementById(fid);return el&&el.value;
    });
    hInfDet.open=hasInf;
  }
  switchStoreTab(0);
  /* 契約開始日ピッカー初期化 */
  makeDatePicker('sContractStartWrap','sContractStart',{yearFrom:2020,yearTo:new Date().getFullYear()+3,yearLabel:'年'});
  makeTimePicker24('sHoursFromWrap','sHoursFrom',function(){updateHoursData();});
  makeTimePicker24('sHoursToWrap','sHoursTo',function(){updateHoursData();});
  if(id){
    var _scs=DB.stores.find(function(x){return x.id===id;});
    if(_scs){
      var _scwrap=document.getElementById('sContractStartWrap');if(_scwrap&&_scwrap._setDate)_scwrap._setDate(_scs.contractStart||'');
    }
  }
  openModal('storeModal');
}

function saveStore(){
  var name=document.getElementById('sName').value.trim();
  if(!name){alert('店舗名を入力してください');return;}
  var isEdit=!!editingStoreId;
  var id=isEdit?editingStoreId:uid();
  var existing=isEdit?DB.stores.find(function(x){return x.id===id;}):null;
  /* 担当者変更履歴を記録 */
  var newManager=document.getElementById('sOurManager').value;
  var managerLog=existing?existing.managerLog||[]:[];
  if(isEdit&&existing&&existing.ourManager&&existing.ourManager!==newManager&&newManager){
    managerLog.push({from:existing.ourManager,to:newManager,at:new Date().toISOString()});
  }
  /* プラン変更履歴を記録（いつ・どのプランからどのプランに変わったか） */
  var newPlanId=document.getElementById('sPlanId').value;
  var planLog=existing?existing.planLog||[]:[];
  if(isEdit&&existing&&existing.planId!==newPlanId){
    var findPlanName=function(pid){if(!pid)return'未設定';var p=DB.plans.find(function(x){return x.id===pid;});return p?p.name:'未設定';};
    planLog.push({from:findPlanName(existing.planId),to:findPlanName(newPlanId),fromFee:existing.monthlyFee||'',toFee:document.getElementById('sMonthlyFee').value,at:new Date().toISOString()});
  }
  var colorIdx=isEdit?(DB.stores.findIndex(function(x){return x.id===id;})):(DB.stores.length);
  if(colorIdx<0)colorIdx=DB.stores.length;
  var color=existing?existing.color:COLORS[colorIdx%COLORS.length];
  var s={
    id:id,color:color,
    name:name,
    corpId:document.getElementById('sCorpId')?document.getElementById('sCorpId').value:'',
    genre:document.getElementById('sGenre').value,
    zip:document.getElementById('sZip')?document.getElementById('sZip').value:'',
    pref:document.getElementById('sPref').value,
    area:document.getElementById('sArea').value,
    hours:document.getElementById('sHours').value,
    holiday:document.getElementById('sHoliday').value,
    seats:document.getElementById('sSeats').value,
    tabelog:document.getElementById('sTabelog').value,
    hp:document.getElementById('sHp').value,
    memo:document.getElementById('sMemo').value,
    caution:document.getElementById('sCaution').value,
    ig:document.getElementById('sIg').value,
    igFollowers:document.getElementById('sIgFollowers').value,
    fb:document.getElementById('sFb').value,
    tw:document.getElementById('sTw').value,
    tt:document.getElementById('sTt').value,
    yt:document.getElementById('sYt').value,
    metaId:document.getElementById('sMetaId').value,
    metaExp:document.getElementById('sMetaExp').value,
    creator:document.getElementById('sCreator').value,
    contractStart:document.getElementById('sContractStart').value,
    contractTerm:document.getElementById('sContractTerm').value,
    monthlyFee:document.getElementById('sMonthlyFee').value,
    discountPercent:document.getElementById('sDiscountPercent').value,
    discountNote:document.getElementById('sDiscountNote').value,
    status:document.getElementById('sStatus').value,
    contactName:document.getElementById('sContactName').value,
    contactRole:document.getElementById('sContactRole').value,
    contactTel:document.getElementById('sContactTel').value,
    contactEmail:document.getElementById('sContactEmail').value,
    contactLine:document.getElementById('sContactLine').value,
    ourManager:document.getElementById('sOurManager').value,
    reviewCycle:document.getElementById('sReviewCycle').value,
    videos:document.getElementById('sVideos').value,
    adDelivery:document.getElementById('sAdDelivery').value,
    setupMemo:document.getElementById('sSetupMemo').value,
    planId:document.getElementById('sPlanId').value,
    rakurakuRegistered:existing?existing.rakurakuRegistered:false,
    infContract:existing?existing.infContract:false,
    hearing:{hIssue:(function(){var e=document.getElementById('hIssue');return e?e.value:'';})(),hTargetWant:(function(){var e=document.getElementById('hTargetWant');return e?e.value:'';})(),hTargetNow:(function(){var e=document.getElementById('hTargetNow');return e?e.value:'';})(),hTiming:(function(){var e=document.getElementById('hTiming');return e?e.value:'';})(),hIdealCustomer:(function(){var e=document.getElementById('hIdealCustomer');return e?e.value:'';})(),hStrength:(function(){var e=document.getElementById('hStrength');return e?e.value:'';})(),hArea:(function(){var e=document.getElementById('hArea');return e?e.value:'';})(),hIgPurpose:(function(){var e=document.getElementById('hIgPurpose');return e?e.value:'';})(),hMenu:(function(){var e=document.getElementById('hMenu');return e?e.value:'';})(),hKpi:(function(){var e=document.getElementById('hKpi');return e?e.value:'';})(),hTargetAge:(function(){var e=document.getElementById('hTargetAge');return e?e.value:'';})(),hTargetGender:(function(){var e=document.getElementById('hTargetGender');return e?e.value:'';})(),hTargetRegion:(function(){var e=document.getElementById('hTargetRegion');return e?e.value:'';})(),hTargetInterest:(function(){var e=document.getElementById('hTargetInterest');return e?e.value:'';})(),hRefAccount:(function(){var e=document.getElementById('hRefAccount');return e?e.value:'';})(),hNg:(function(){var e=document.getElementById('hNg');return e?e.value:'';})(),hPastAd:(function(){var e=document.getElementById('hPastAd');return e?e.value:'';})(),hAccMgr:(function(){var e=document.getElementById('hAccMgr');return e?e.value:'';})(),hLoginShare:(function(){var e=document.getElementById('hLoginShare');return e?e.value:'';})(),hFbPage:(function(){var e=document.getElementById('hFbPage');return e?e.value:'';})(),hInPost:(function(){var e=document.getElementById('hInPost');return e?e.value:'';})(),hDmMgr:(function(){var e=document.getElementById('hDmMgr');return e?e.value:'';})(),hPostContent:(function(){var e=document.getElementById('hPostContent');return e?e.value:'';})(),hPostFlow:(function(){var e=document.getElementById('hPostFlow');return e?e.value:'';})(),hApprovalDays:(function(){var e=document.getElementById('hApprovalDays');return e?e.value:'';})(),hPhotoAsset:(function(){var e=document.getElementById('hPhotoAsset');return e?e.value:'';})(),hVideoAsset:(function(){var e=document.getElementById('hVideoAsset');return e?e.value:'';})(),hNewShoot:(function(){var e=document.getElementById('hNewShoot');return e?e.value:'';})(),hLogo:(function(){var e=document.getElementById('hLogo');return e?e.value:'';})(),hPastAsset:(function(){var e=document.getElementById('hPastAsset');return e?e.value:'';})(),hTonmana:(function(){var e=document.getElementById('hTonmana');return e?e.value:'';})(),hAdIg:(function(){var e=document.getElementById('hAdIg');return e?e.value:'';})(),hAdStart:(function(){var e=document.getElementById('hAdStart');return e?e.value:'';})(),hAdBudget:(function(){var e=document.getElementById('hAdBudget');return e?e.value:'';})(),hLpUrl:(function(){var e=document.getElementById('hLpUrl');return e?e.value:'';})(),hInfStart:(function(){var e=document.getElementById('hInfStart');return e?e.value:'';})(),hInfEnd:(function(){var e=document.getElementById('hInfEnd');return e?e.value:'';})(),hInfCount:(function(){var e=document.getElementById('hInfCount');return e?e.value:'';})(),hInfGenre:(function(){var e=document.getElementById('hInfGenre');return e?e.value:'';})(),hInfFollowers:(function(){var e=document.getElementById('hInfFollowers');return e?e.value:'';})(),hInfMust:(function(){var e=document.getElementById('hInfMust');return e?e.value:'';})(),hHashtag:(function(){var e=document.getElementById('hHashtag');return e?e.value:'';})(),hOpStart:(function(){var e=document.getElementById('hOpStart');return e?e.value:'';})(),hShootDate:(function(){var e=document.getElementById('hShootDate');return e?e.value:'';})(),hPostStart:(function(){var e=document.getElementById('hPostStart');return e?e.value:'';})(),hAdStart2:(function(){var e=document.getElementById('hAdStart2');return e?e.value:'';})(),hInfPostDate:(function(){var e=document.getElementById('hInfPostDate');return e?e.value:'';})(),hOther:(function(){var e=document.getElementById('hOther');return e?e.value:'';})()},
    managerLog:managerLog,
    planLog:planLog,
    prevManagers:existing?existing.prevManagers||[]:[],
    progress:existing?existing.progress||{}:{},
    nextAction:document.getElementById('sNextAction').value,
    negotiatingMemo:document.getElementById('sNegotiatingMemo').value,
    adBilling:existing?existing.adBilling||{}:{},
    monthlyReview:existing?existing.monthlyReview||{}:{}
  };
  if(isEdit){
    var idx=DB.stores.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.stores[idx]=s;}else{DB.stores.push(s);}
  }else{
    DB.stores.push(s);
  }
  closeModal('storeModal');
  refreshAll();
  saveItem('stores',s);
  /* 新規登録時はChatwork通知 */
  if(!isEdit){
    var plan=DB.plans.find(function(p){return p.id===s.planId;});
    var planName=plan?plan.name:'未設定';
    notifyChatwork(
      s.name,planName,s.ourManager||'',
      s.contactName||'',s.contactTel||'',s.contactEmail||'',
      s.corp||''
    ).then(function(results){
      if(results.length){
        var allOk=results.every(function(r){return r.ok;});
        if(allOk){
          setSyncStatus('ok','✓ Chatwork通知送信完了');
          setTimeout(function(){setSyncStatus('ok','同期済み');},3000);
        }else{
          setSyncStatus('error','Chatwork通知失敗');
        }
      }
    });
  }
}
function deleteStore(id){
  if(!confirm('この店舗を削除しますか？\n関連する投稿・営業通知も全て削除されます。'))return;
  /* 関連する営業通知も削除 */
  var relatedNotifs=DB.salesNotifs?DB.salesNotifs.filter(function(n){return n.storeId===id;}):[];
  relatedNotifs.forEach(function(n){deleteItem('salesnotifs',n.id);});
  if(DB.salesNotifs)DB.salesNotifs=DB.salesNotifs.filter(function(n){return n.storeId!==id;});
  /* 関連する投稿・キャスティングも削除 */
  var relatedPosts=DB.posts.filter(function(p){return p.storeId===id;});
  relatedPosts.forEach(function(p){deleteItem('posts',p.id);});
  DB.posts=DB.posts.filter(function(p){return p.storeId!==id;});
  /* 店舗本体を削除 */
  DB.stores=DB.stores.filter(function(s){return s.id!==id;});
  refreshAll();
  deleteItem('stores',id);
}
function renderStoreTable(){
  var filter=document.getElementById('filterStatus').value;
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  /* 担当営業フィルタ（弊社担当 ourManager で絞り込み） */
  var salesSel=document.getElementById('filterSales');
  var filterSales=salesSel?salesSel.value:'';
  if(salesSel){
    var mgrs=[];var seen={};
    DB.stores.forEach(function(s){if(s.ourManager&&!seen[s.ourManager]){seen[s.ourManager]=1;mgrs.push(s.ourManager);}});
    mgrs.sort();
    salesSel.innerHTML='<option value="">担当営業：全員</option>'+mgrs.map(function(n){return'<option value="'+esc(n)+'"'+(n===filterSales?' selected':'')+'>'+esc(n)+'</option>';}).join('');
  }
  var matchSales=function(s){return!filterSales||s.ourManager===filterSales;};
  /* 法人（チェーン）フィルタ：傘下店舗をまとめて見られるように */
  var corpSel=document.getElementById('filterCorp');
  var filterCorp=corpSel?corpSel.value:'';
  if(corpSel){
    var prevCorp=corpSel.value;
    corpSel.innerHTML='<option value="">法人：全て</option>'+(DB.corporations||[]).slice().sort(function(a,b){return(a.name||'').localeCompare(b.name||'');}).map(function(c){return'<option value="'+c.id+'"'+(c.id===prevCorp?' selected':'')+'>'+esc(c.name)+'</option>';}).join('');
    if(prevCorp)corpSel.value=prevCorp;
  }
  var matchCorp=function(s){return!filterCorp||s.corpId===filterCorp;};
  /* 商談中セクション */
  var negBox=document.getElementById('negotiatingBox');
  var negList=DB.stores.filter(function(s){return s.status==='negotiating'&&matchSales(s)&&matchCorp(s)&&(!search||(s.name||'').toLowerCase().includes(search));});
  if(negBox){
    if(negList.length&&(!filter||filter==='negotiating')){
      var bs2='font-size:12px;padding:3px 9px;border-radius:6px;cursor:pointer;border:1px solid;white-space:nowrap;';
      negBox.style.display='';
      negBox.innerHTML='<div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:8px;letter-spacing:.5px">💬 商談中 '+negList.length+'件</div>'
        +negList.map(function(s){
          var today=new Date();today.setHours(0,0,0,0);
          var na=s.nextAction?new Date(s.nextAction):null;
          var naStr=na?((na.getMonth()+1)+'/'+(na.getDate())):'';
          var naColor=na&&na<today?'var(--red)':na&&(na-today)/86400000<=3?'var(--amber)':'var(--text3)';
          return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg3);border-radius:var(--r);margin-bottom:6px;border:1px solid var(--border)">'
            +'<div style="width:6px;height:6px;border-radius:50%;background:'+s.color+';flex-shrink:0"></div>'
            +'<div style="flex:1;min-width:0">'
              +'<span style="font-size:14px;font-weight:500;cursor:pointer;color:var(--accent)" onclick="openStoreModal(\''+s.id+'\')">'+esc(s.name)+'</span>'
              +(s.negotiatingMemo?'<span style="font-size:12px;color:var(--text2);margin-left:8px">'+esc(s.negotiatingMemo)+'</span>':'')
            +'</div>'
            +(naStr?'<span style="font-size:12px;color:'+naColor+';white-space:nowrap">📅 '+naStr+'</span>':'')
            +'<span style="font-size:12px;color:var(--text3)">'+esc(s.ourManager||'')+'</span>'
            +'<button style="'+bs2+'background:var(--bg2);color:var(--text2);border-color:var(--border)" onclick="openStoreModal(\''+s.id+'\')">編集</button>'
          +'</div>';
        }).join('');
    }else{
      negBox.style.display='none';
    }
  }
  var list=DB.stores.filter(function(s){if(s.status==='negotiating')return false;if(filter&&s.status!==filter)return false;if(!matchSales(s))return false;if(!matchCorp(s))return false;if(search&&!(s.name||'').toLowerCase().includes(search)&&!(s.genre||'').toLowerCase().includes(search))return false;return true;});
  var tb=document.getElementById('storeTableBody');
  if(!list.length&&!negList.length){tb.innerHTML='<tr><td colspan="13" class="empty-state">店舗がありません</td></tr>';return;}
  if(!list.length){tb.innerHTML='';return;}
  var metaLabels={none:'—',basic:'<span class="badge b-amber">基礎あり</span>',advanced:'<span class="badge b-green">豊富</span>'};
  tb.innerHTML=list.map(function(s){
    var pct=progressPct(s);
    var plan=s.planId?DB.plans.find(function(x){return x.id===s.planId;}):null;
    var planCell=plan?'<div style="font-size:13px;font-weight:400">'+esc(plan.name)+'</div><div style="font-size:12px;color:var(--text3)">'+fmtMoney(plan.price)+'</div>':'<span style="color:var(--text3)">—</span>';
    var costInfo=storeCostInfo(s);
    var costCell=(costInfo.adBudget||costInfo.creative)
      ?'<div style="font-size:13px;font-weight:500;color:var(--text)">'+fmtMoney(costInfo.total)+'</div>'
        +'<div style="font-size:11px;color:var(--text3)">広告'+fmtMoney(costInfo.adBudget)+(costInfo.creative?' ・ 制作'+fmtMoney(costInfo.creative.amount):'')+'</div>'
      :'<span style="color:var(--text3)">—</span>';
    var mgr=s.ourManager||'';
    var mgrRetired=mgr&&isRetiredStaff(mgr);
    var mgrCell=mgr
      ?(mgrRetired
        ?'<span style="color:var(--text3);font-size:12px">担当なし</span><button class="btn btn-sm" onclick="event.stopPropagation();assignManagerFromRetired(\''+s.id+'\');" style="font-size:11px;margin-left:4px;padding:2px 6px">追加</button>'
        :'<span style="font-size:13px">'+esc(mgr)+'</span>'
      )
      :'<span style="color:var(--text3);font-size:12px">—</span>';
    return'<tr>'
      +'<td><div style="display:flex;align-items:center;gap:7px"><div style="width:6px;height:6px;border-radius:50%;background:'+s.color+';flex-shrink:0"></div><span style="cursor:pointer;color:var(--accent);font-weight:400" onclick="showDetail(\''+s.id+'\')">'+esc(s.name)+'</span></div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+esc(addressCity(s.pref,s.area))+'</div></td>'
      +'<td>'+esc(s.genre||'—')+'</td>'
      +'<td>'+planCell+'</td>'
      +'<td>'+costCell+'</td>'
      +'<td class="td-mono">'+(s.contractStart||'—')+'<div style="font-size:11px;color:var(--text3)">'+(s.contractTerm?s.contractTerm+'ヶ月':'')+'</div></td>'
      +'<td>'+esc(s.contactName||'—')+'</td>'
      +'<td>'+mgrCell+'</td>'
      +'<td><button class="btn btn-sm" style="font-size:11px;padding:2px 8px;'+(s.infContract?'background:var(--purple-bg);color:var(--purple);border-color:var(--purple-border)':'background:var(--bg3);color:var(--text2)')+'" onclick="event.stopPropagation();toggleInfContract(\''+s.id+'\')">'+(s.infContract?'👤 あり':'なし')+'</button></td>'
      +(function(){var done=isMonthlyDone(s,'adBilling');return'<td><button class="btn btn-sm" style="font-size:11px;padding:2px 8px;'+(done?'background:var(--green-bg);color:var(--green);border-color:var(--green-border)':'background:var(--bg3);color:var(--text2)')+'" onclick="event.stopPropagation();toggleMonthlyDone(\''+s.id+'\',\'adBilling\')">'+(done?'✓ 済':'未')+'</button></td>';})()
      +(function(){var done=isMonthlyDone(s,'monthlyReview');return'<td><button class="btn btn-sm" style="font-size:11px;padding:2px 8px;'+(done?'background:var(--green-bg);color:var(--green);border-color:var(--green-border)':'background:var(--bg3);color:var(--text2)')+'" onclick="event.stopPropagation();toggleMonthlyDone(\''+s.id+'\',\'monthlyReview\')">'+(done?'✓ 済':'未')+'</button></td>';})()
      +'<td><div style="display:flex;align-items:center;gap:6px"><div class="pbar-wrap" style="width:52px"><div class="pbar" style="background:'+(pct===100?'var(--green)':'var(--accent)')+';width:'+pct+'%"></div></div><span style="font-size:11px;color:var(--text3)">'+pct+'%</span></div></td>'
      +'<td>'+statusBadge(s.status)+'</td>'
      +'<td style="white-space:nowrap"><button class="btn btn-sm" onclick="openStoreModal(\''+s.id+'\')" style="margin-right:4px">編集</button><button class="btn-ghost-danger" onclick="deleteStore(\''+s.id+'\')">削除</button></td>'
      +'</tr>';
  }).join('');
}

/* 追加費用（初期設定の追加契約など、後から発生する一時金）
   経理管理への反映は未定のため、店舗詳細の履歴＋やること一覧への表示のみ行う */
function openAddFeeModal(storeId){
  document.getElementById('afStoreId').value=storeId;
  document.getElementById('afDesc').value='';
  document.getElementById('afAmount').value='';
  openModal('addFeeModal');
}
function saveAdditionalFee(){
  var storeId=document.getElementById('afStoreId').value;
  var desc=document.getElementById('afDesc').value.trim();
  var amount=document.getElementById('afAmount').value;
  if(!desc){alert('内容を入力してください');return;}
  if(!amount||Number(amount)<=0){alert('金額を入力してください');return;}
  var s=DB.stores.find(function(x){return x.id===storeId;});
  if(!s)return;
  if(!s.additionalFees)s.additionalFees=[];
  s.additionalFees.push({
    id:uid(),
    description:desc,
    amount:Number(amount),
    status:'pending',
    createdAt:new Date().toISOString(),
    doneAt:null
  });
  saveItem('stores',s);
  closeModal('addFeeModal');
  refreshAll();
  if(document.getElementById('detailModal').classList.contains('open'))showDetail(storeId);
}
function markFeeDone(storeId,feeId){
  var s=DB.stores.find(function(x){return x.id===storeId;});
  if(!s||!s.additionalFees)return;
  var f=s.additionalFees.find(function(x){return x.id===feeId;});
  if(!f)return;
  f.status='done';
  f.doneAt=new Date().toISOString();
  saveItem('stores',s);
  refreshAll();
  if(document.getElementById('detailModal').classList.contains('open'))showDetail(storeId);
}

function showDetail(id){
  var s=DB.stores.find(function(x){return x.id===id;});
  if(!s)return;
  var myPosts=DB.posts.filter(function(p){return p.storeId===id;}).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var myCast=DB.castings.filter(function(c){return c.storeId===id;});
  var pct=progressPct(s);
  var plan=DB.plans.find(function(p){return p.id===s.planId;});
  var corp=DB.corporations&&s.corpId?DB.corporations.find(function(c){return c.id===s.corpId;}):null;

  /* 営業時間の表示 */
  var hoursDisplay=formatHoursSummary(s.hours||s.hours||'');
  if(!hoursDisplay||hoursDisplay==='—')hoursDisplay=s.hours||'—';

  function row(label,val,link){
    if(!val&&val!==0)return'';
    var valHtml=link?'<a href="'+esc(val)+'" target="_blank" style="color:var(--accent)">'+esc(val)+'</a>':esc(String(val));
    return'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">'
      +'<span style="color:var(--text3);min-width:90px;flex-shrink:0">'+label+'</span>'
      +'<span style="flex:1;word-break:break-all">'+valHtml+'</span></div>';
  }

  document.getElementById('detailTitle').textContent=s.name;
  document.getElementById('detailBody').innerHTML=

    /* 原価（楽々販売への原価入力用） */
    (function(){
      var ci=storeCostInfo(s);
      if(!ci.adBudget&&!ci.creative)return'';
      return'<div style="margin-bottom:14px;padding:10px 12px;background:var(--bg3);border-radius:var(--r)">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
          +'<span style="font-size:12px;font-weight:500;color:var(--text2)">💴 原価（楽々販売入力用）</span>'
          +'<span style="font-size:15px;font-weight:500;color:var(--accent)">'+fmtMoney(ci.total)+'</span>'
        +'</div>'
        +'<div style="font-size:13px;color:var(--text2);padding:3px 0">広告費原価　<span style="color:var(--text3)">'+(plan?esc(plan.name)+'　':'')+'</span>'+fmtMoney(ci.adBudget)+'</div>'
        +(ci.creative
          ?'<div style="font-size:13px;color:var(--text2);padding:3px 0">クリエイティブ費用　<span style="color:var(--text3)">'+esc(ci.creative.creatorName)+(ci.creative.date?'　'+fmtD(ci.creative.date):'')+'</span>　'+fmtMoney(ci.creative.amount)+'</div>'
          :'<div style="font-size:12px;color:var(--text3);padding:3px 0">クリエイティブ費用　案件なし</div>')
      +'</div>';
    })()

    /* KPIカード */
    +'<div class="grid3" style="margin-bottom:16px">'
      +'<div class="card-sm"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">ステータス</div>'+statusBadge(s.status)+'</div>'
      +'<div class="card-sm"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">プラン</div><div style="font-size:13px;font-weight:500">'+(plan?esc(plan.name):'—')+'</div></div>'
      +'<div class="card-sm"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">月額</div><div style="font-size:14px;font-weight:500;color:var(--accent)">'+fmtMoney(s.monthlyFee)+'</div>'
        +(s.discountPercent?'<div style="font-size:10px;color:var(--green);margin-top:2px">'+esc(s.discountPercent)+'%引き'+(s.discountNote?'：'+esc(s.discountNote):'')+'</div>':'')
      +'</div>'
    +'</div>'

    /* 店舗基本情報 */
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">店舗情報</div>'
    +'<div style="margin-bottom:14px">'
      +row('業種',s.genre)
      +row('エリア',(s.pref||'')+(s.area?' '+s.area:''))
      +row('営業時間',hoursDisplay)
      +row('定休日',s.holiday)
      +row('席数',s.seats?s.seats+'席':null)
      +row('食べログ',s.tabelog,true)
      +row('公式HP',s.hp,true)
      +(s.memo?'<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border);display:flex;gap:8px"><span style="color:var(--text3);min-width:90px;flex-shrink:0">備考</span><span style="flex:1;white-space:pre-wrap">'+esc(s.memo)+'</span></div>':'')
      +(s.caution?'<div style="font-size:13px;padding:8px 10px;margin-top:6px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--r);display:flex;gap:8px"><span style="color:var(--amber);min-width:90px;flex-shrink:0;font-weight:500">⚠️ 注意点</span><span style="flex:1;white-space:pre-wrap;color:var(--text)">'+esc(s.caution)+'</span></div>':'')
    +'</div>'

    /* 法人・連絡先 */
    +(corp||s.contactName?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">連絡先</div><div style="margin-bottom:14px">'
      +(corp?row('法人',corp.name):'')
      +row('担当者',(s.contactName||'')+(s.contactRole?' ('+s.contactRole+')':''))
      +row('電話',s.contactTel)
      +row('メール',s.contactEmail)
      +row('LINE',s.contactLine)
    +'</div>':'')

    /* 弊社情報 */
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">弊社情報</div>'
    +'<div style="margin-bottom:14px">'
      +row('営業担当',s.ourManager||s.salesBy)
      +row('クリエイター',(function(){var cr=DB.creators.find(function(x){return x.id===s.creator;});return cr?cr.crName:(s.creator||'—');})())
      +row('契約開始',s.contractStart)
      +row('契約期間',s.contractTerm?s.contractTerm+'ヶ月':null)
      +row('Meta広告ID',s.metaId)
      +row('Meta経験',s.metaExp==='none'?null:s.metaExp)
    +'</div>'

    /* プラン変更履歴（いつ・どのプランからどのプランに変わったか） */
    +(s.planLog&&s.planLog.length
      ?'<details style="margin-bottom:14px"><summary style="font-size:12px;font-weight:500;color:var(--text2);cursor:pointer">📈 プラン変更履歴（'+s.planLog.length+'件）</summary>'
        +'<div style="margin-top:8px">'
        +s.planLog.slice().reverse().map(function(l){
          var feeChange=(l.fromFee||l.toFee)?'<span style="color:var(--text3);font-size:12px"> ('+fmtMoney(l.fromFee)+' → '+fmtMoney(l.toFee)+')</span>':'';
          return'<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border)">'
            +'<span style="color:var(--text3)">'+fmtD(l.at)+'</span> '
            +esc(l.from)+' → <strong>'+esc(l.to)+'</strong>'+feeChange
          +'</div>';
        }).join('')
        +'</div></details>'
      :'')

    /* 追加費用（初期設定の追加契約など、後から発生する一時金） */
    +'<div style="margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<span style="font-size:12px;font-weight:500;color:var(--text2)">💰 追加費用</span>'
        +'<button class="btn btn-sm" onclick="openAddFeeModal(\''+s.id+'\')">＋ 追加費用を登録</button>'
      +'</div>'
      +(s.additionalFees&&s.additionalFees.length
        ?s.additionalFees.slice().reverse().map(function(f){
            var isDone=f.status==='done';
            var badge=isDone?'<span class="badge b-green">対応済み</span>':'<span class="badge b-amber">未対応</span>';
            var btn=isDone?'':'<button class="btn btn-sm" style="margin-left:8px" onclick="markFeeDone(\''+s.id+'\',\''+f.id+'\')">対応済みにする</button>';
            return'<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)">'
              +'<span style="color:var(--text3);white-space:nowrap">'+fmtD(f.createdAt)+'</span>'
              +'<span style="flex:1">'+esc(f.description)+'</span>'
              +'<span style="color:var(--accent);font-weight:500">'+fmtMoney(f.amount)+'</span>'
              +badge+btn
            +'</div>';
          }).join('')
        :'<div style="font-size:13px;color:var(--text3)">追加費用の登録はありません</div>')
    +'</div>'

    /* SNS */
    +(s.ig||s.fb||s.tw||s.tt||s.yt
      ?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">SNS</div><div style="margin-bottom:14px">'
        +(s.ig?'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text3);min-width:90px;flex-shrink:0">Instagram</span><span style="flex:1;word-break:break-all"><a href="'+esc(igProfileUrl(s.ig))+'" target="_blank" rel="noopener" style="color:var(--accent)">'+esc(s.ig)+'</a></span></div>':'')
        +row('Facebook',s.fb)
        +row('X',s.tw)
        +row('TikTok',s.tt)
        +row('YouTube',s.yt)
        +row('フォロワー',s.igFollowers?Number(s.igFollowers).toLocaleString()+'人':null)
      +'</div>'
      :'')

    /* 要望 */
    +(s.request?'<div style="margin-bottom:14px;padding:10px 12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--r);font-size:13px;white-space:pre-wrap">'+esc(s.request)+'</div>':'')

    /* 案件進捗 */
    +(function(){
      var steps=progressStepsFor(s);var prog=s.progress||{};
      return'<div style="margin-bottom:14px">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
          +'<span style="font-size:12px;font-weight:500;color:var(--text2)">案件進捗</span>'
          +'<div class="pbar-wrap" style="flex:1"><div class="pbar" style="background:'+(pct===100?'var(--green)':'var(--accent)')+';width:'+pct+'%"></div></div>'
          +'<span style="font-size:12px;color:var(--text3)">'+pct+'%</span>'
        +'</div>'
        +'<div style="display:flex;gap:4px;flex-wrap:wrap">'
          +steps.map(function(step){
            var p=prog[step.key]||{};
            var done=step.accounts?isAccountsDone(p):(p.status==='done'||p.status==='na');
            var isRecurring=RECURRING_STEP_KEYS.indexOf(step.key)>=0;
            var histCount=isRecurring?((p.history&&p.history.length)?p.history.length:(p.status==='done'&&p.date?1:0)):0;
            var countBadge=(isRecurring&&histCount>0)?'<span style="font-size:10px;color:'+(done?'var(--green)':'var(--text3)')+';margin-left:2px">（'+histCount+'回）</span>':'';
            return'<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:var(--r);background:'+(done?'var(--green-bg)':'var(--bg3)')+';border:1px solid '+(done?'var(--green-border)':'var(--border)')+'">'
              +'<span style="font-size:11px;color:'+(done?'var(--green)':'var(--text3)')+'">'+(done?'✓':'○')+'</span>'
              +'<span style="font-size:11px;color:'+(done?'var(--text)':'var(--text3)')+'">'+esc(step.label)+'</span>'
              +countBadge
            +'</div>';
          }).join('')
        +'</div>'
      +'</div>';
    })()

    /* 投稿履歴 */
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">投稿履歴 ('+myPosts.length+'件)</div>'
    +(myPosts.length
      ?'<div style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">'
        +myPosts.map(function(p,i){
          var isInf=p.type==='inf_visit'||p.type==='inf_draft'||p.type==='inf_post';
          var typeLabel=(typeof TYPE_LABEL!=='undefined'&&TYPE_LABEL[p.type])||p.type;
          var typeIcon=(typeof TYPE_ICON!=='undefined'&&TYPE_ICON[p.type])||'';
          var label=isInf
            ?typeIcon+' '+typeLabel+'：'+esc(infName(p.infId))
            :typeIcon+' '+typeLabel+(p.caption?'：'+esc((p.caption||'').slice(0,30)):'');
          var adBadge=(p.ad==='yes')?'<span class="badge b-blue" style="font-size:11px;margin-left:6px">📢 広告配信あり</span>':'';
          var urlLink=p.postUrl?'<a href="'+esc(p.postUrl)+'" target="_blank" rel="noopener" style="margin-left:6px;color:var(--accent);font-size:12px">🔗</a>':'';
          return'<div style="display:flex;gap:10px;padding:7px 12px;border-bottom:'+(i<myPosts.length-1?'1px solid var(--border)':'none')+'">'
            +'<span class="td-mono" style="color:var(--text3);white-space:nowrap">'+fmtDT(p.date)+'</span>'
            +'<span style="font-size:13px;flex:1">'+label+adBadge+urlLink+'</span>'
            +postStatusBadge(p.status)
          +'</div>';
        }).join('')
      +'</div>'
      :'<div style="font-size:13px;color:var(--text3);margin-bottom:14px">投稿なし</div>'
    )

    /* キャスティング（インフルエンサー案件） */
    +(myCast.length
      ?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">キャスティング ('+myCast.length+'件)</div>'
        +'<div style="border:1px solid var(--border);border-radius:var(--r)">'+myCast.map(function(c,i){
          return'<div style="font-size:13px;padding:7px 12px;border-bottom:'+(i<myCast.length-1?'1px solid var(--border)':'none')+';display:flex;gap:10px">'
            +'<span class="td-mono" style="color:var(--text3)">'+fmtD(c.date)+'</span>'
            +'<span>'+esc(infName(c.infId))+'</span>'
            +'<span style="margin-left:auto;color:var(--text3)">'+fmtMoney(c.fee)+'</span>'
          +'</div>';
        }).join('')+'</div>'
      :'<details style="margin-bottom:4px"><summary style="font-size:12px;font-weight:500;color:var(--text3);cursor:pointer">▸ キャスティング（インフルエンサー案件なし）</summary>'
        +'<div style="font-size:13px;color:var(--text3);padding:8px 0 0 12px">この店舗にはインフルエンサー案件がありません</div></details>'
    )

    /* 発注書履歴 */
    +renderOrderHistoryHtml((DB.orders||[]).filter(function(o){return o.storeId===id;}))

    /* 編集ボタン */
    +'<div class="form-actions" style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">'
      +'<button class="btn" onclick="closeModal(\'detailModal\')">閉じる</button>'
      +'<button class="btn" onclick="closeModal(\'detailModal\');openOrderModal({storeId:\''+s.id+'\'})">📄 発注書</button>'
      +'<button class="btn btn-primary" onclick="closeModal(\'detailModal\');openStoreModal(\''+s.id+'\')">編集</button>'
    +'</div>';

  openModal('detailModal');
}


