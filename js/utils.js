function uid(){return '_'+Math.random().toString(36).slice(2,9);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtDT(d){if(!d)return'—';var dt=new Date(d);return(dt.getMonth()+1)+'/'+(dt.getDate())+' '+pad(dt.getHours())+':'+pad(dt.getMinutes());}
function fmtD(d){if(!d)return'—';var dt=new Date(d);return dt.getFullYear()+'/'+(dt.getMonth()+1)+'/'+dt.getDate();}
function pad(n){return String(n).padStart(2,'0');}
function fmtMoney(v){if(v===''||v===null||v===undefined)return'—';return Number(v).toLocaleString()+'円';}
function storeName(id){var s=DB.stores.find(function(x){return x.id===id;});return s?s.name:'不明';}
/* 契約終了（status='ended'）の店舗かどうか。ダッシュボード/事前チェックのアラートから除外するために使用 */
function isStoreEnded(id){var s=DB.stores.find(function(x){return x.id===id;});return!!(s&&s.status==='ended');}
function storeColor(id){var s=DB.stores.find(function(x){return x.id===id;});return s?s.color:'#888';}
function infName(id){var i=DB.influencers.find(function(x){return x.id===id;});return i?(i.name+' '+(i.handle||'')):'不明';}
/* インフルエンサーのアカウントURL（登録URL優先、無ければ媒体+ハンドルから生成） */
function infAccountUrlById(id){
  var i=DB.influencers.find(function(x){return x.id===id;});
  if(!i)return'';
  if(i.url)return i.url;
  if(!i.handle)return'';
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  return(platUrl[i.platform]||'')+i.handle.replace(/^@/,'');
}
/* Instagramハンドル（@handle）または既存URLからプロフィールURLを生成 */
function igProfileUrl(h){
  h=String(h||'').trim();
  if(!h)return'';
  if(/^https?:\/\//i.test(h))return h;
  return'https://www.instagram.com/'+h.replace(/^@/,'');
}
/* 都道府県+市区町村番地から「市区町村」までを抽出（丁目・番地以降は省略） */
function addressCity(pref,area){
  var a=String(area||'');
  var m=a.match(/^(.*?(?:市.*?区|市|区|町|村))/);
  var city=m?m[1]:a.replace(/[\d０-９].*$/,'')||a;
  return(pref?pref+' ':'')+city;
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function openModal(id){document.getElementById(id).classList.add('open');}
function switchStoreTab(idx){
  document.querySelectorAll('#storeTabBtns .tab-btn').forEach(function(b,i){b.classList.toggle('active',i===idx);});
  [0,1,2,3,4,5].forEach(function(i){var el=document.getElementById('stab'+i);if(el)el.classList.toggle('active',i===idx);});
  if(idx===4)renderShootingList();
  if(idx===5)renderProgressTab();
}
function toggleCheck(el){el.classList.toggle('done');el.querySelector('.check-box').textContent=el.classList.contains('done')?'✓':'';}
function makeTimePicker24(wrapperId, hiddenId, onChange){
  var wrap=document.getElementById(wrapperId);
  if(!wrap)return;
  var hid=document.getElementById(hiddenId);

  /* 0:00〜翌5:00まで30分刻み */
  var times=[];
  var labels=[];
  for(var h=0;h<30;h++){
    ['00','30'].forEach(function(m){
      var display=h>=24?'翌'+(h-24)+':'+m:(h<10?'0':'')+h+':'+m;
      var val=h+':'+m;
      times.push(val);
      labels.push(display);
    });
  }

  var curIdx=times.indexOf('17:00');
  if(hid&&hid.value){
    /* 翌表記を数値に変換して検索 */
    var sv=hid.value;
    var found=times.indexOf(sv);
    if(found>=0)curIdx=found;
  }

  var ITEM_H=18,VISIBLE=5,CENTER=2;

  function syncHid(){
    if(hid)hid.value=times[curIdx]||'';
    if(onChange)onChange();
  }

  var el=document.createElement('div');
  el.style.cssText='position:relative;width:58px;height:'+(ITEM_H*VISIBLE)+'px;overflow:hidden;cursor:ns-resize;user-select:none;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2)';

  var overlay=document.createElement('div');
  overlay.style.cssText='position:absolute;inset:0;background:linear-gradient(to bottom,var(--bg2) 0%,transparent 28%,transparent 72%,var(--bg2) 100%);pointer-events:none;z-index:1';
  var line=document.createElement('div');
  line.style.cssText='position:absolute;left:3px;right:3px;top:50%;height:1px;margin-top:-0.5px;background:var(--accent);opacity:0.5;pointer-events:none;z-index:2';

  var list=document.createElement('div');
  list.style.cssText='position:absolute;top:0;left:0;right:0;padding-top:'+(ITEM_H*CENTER)+'px;padding-bottom:'+(ITEM_H*CENTER)+'px';

  function renderList(){
    list.innerHTML='';
    for(var i=-CENTER;i<=CENTER;i++){
      var idx=curIdx+i;
      var div=document.createElement('div');
      div.textContent=(idx>=0&&idx<labels.length)?labels[idx]:'';
      var dist=Math.abs(i);
      div.style.cssText='height:'+ITEM_H+'px;line-height:'+ITEM_H+'px;text-align:center;font-size:'+(dist===0?'12px':'10px')+';font-weight:'+(dist===0?'600':'400')+';color:var(--text);opacity:'+(dist===0?'1':dist===1?'0.55':'0.25');
      list.appendChild(div);
    }
    syncHid();
  }
  renderList();

  el.addEventListener('wheel',function(e){
    e.preventDefault();
    curIdx=Math.max(0,Math.min(times.length-1,curIdx+(e.deltaY>0?1:-1)));
    renderList();
  },{passive:false});

  var sy=null,si=0;
  el.addEventListener('mousedown',function(e){sy=e.clientY;si=curIdx;});
  document.addEventListener('mousemove',function(e){
    if(sy===null)return;
    var d=Math.round((sy-e.clientY)/ITEM_H);
    if(d!==0){curIdx=Math.max(0,Math.min(times.length-1,si+d));renderList();}
  });
  document.addEventListener('mouseup',function(){sy=null;});
  el.addEventListener('touchstart',function(e){sy=e.touches[0].clientY;si=curIdx;},{passive:true});
  el.addEventListener('touchmove',function(e){
    var d=Math.round((sy-e.touches[0].clientY)/ITEM_H);
    curIdx=Math.max(0,Math.min(times.length-1,si+d));renderList();
  },{passive:true});

  el.appendChild(list);el.appendChild(overlay);el.appendChild(line);
  wrap.innerHTML='';
  wrap.appendChild(el);
  syncHid();

  wrap._setTime=function(val){
    var idx=times.indexOf(val);
    if(idx>=0){curIdx=idx;}else{curIdx=times.indexOf('17:00');}
    renderList();
  };
}

/* ============================================================
   カレンダーピッカー共通コンポーネント
   makeDatePicker(wrapperId, hiddenId, opts)
   - 年プルダウン + 月←→ボタン + カレンダーグリッドで日クリック
   ============================================================ */

/* ============================================================
   スクロール時間選択ウィジェット（時・分別）
   makeTimePicker(wrapperId, hiddenId)
   ============================================================ */
function makeTimePicker(wrapperId, hiddenId){
  var wrap=document.getElementById(wrapperId);
  if(!wrap)return;
  var hid=document.getElementById(hiddenId);

  var hours=[];for(var h=0;h<24;h++)hours.push((h<10?'0':'')+h);
  var mins=['00','10','20','30','40','50'];

  var curH=12,curM=0;
  if(hid&&hid.value&&hid.value!=='未定'&&hid.value.includes(':')){
    var parts=hid.value.split(':');
    curH=parseInt(parts[0])||12;
    curM=Math.round(parseInt(parts[1]||'0')/10)%6;
  }

  function syncHid(){if(hid)hid.value=(hours[curH]||'12')+':'+(mins[curM]||'00');}

  function makeScroll(items,getIdx,setIdx){
    /* 選択中を上段・次候補を下段の2行表示 */
    var ITEM_H=20,VISIBLE=2,CENTER=0;
    var el=document.createElement('div');
    el.style.cssText='position:relative;width:32px;height:'+(ITEM_H*VISIBLE)+'px;overflow:hidden;cursor:ns-resize;user-select:none;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2)';



    var list=document.createElement('div');
    list.style.cssText='position:absolute;top:0;left:0;right:0';

    function renderList(){
      list.innerHTML='';
      var ci=getIdx();
      /* i=0:前の候補(上・薄)、i=1:選択中(下・線の上・太) */
      for(var i=0;i<VISIBLE;i++){
        var idx=(ci+i+items.length)%items.length;
        var div=document.createElement('div');
        div.textContent=items[idx];
        var isCur=i===0;
        div.style.cssText='height:'+ITEM_H+'px;line-height:'+ITEM_H+'px;text-align:center;font-size:'+(isCur?'13px':'10px')+';font-weight:'+(isCur?'700':'400')+';color:'+(isCur?'var(--accent)':'var(--text3)')+';transition:all .08s';
        list.appendChild(div);
      }
      syncHid();
    }
    renderList();

    el.addEventListener('wheel',function(e){
      e.preventDefault();
      setIdx(e.deltaY>0?1:-1);
      renderList();
    },{passive:false});

    var sy=null,si=null;
    el.addEventListener('mousedown',function(e){sy=e.clientY;si=getIdx();});
    document.addEventListener('mousemove',function(e){
      if(sy===null)return;
      var d=Math.round((sy-e.clientY)/ITEM_H);
      if(d!==0){setIdx(d-(getIdx()-si));si=getIdx();sy=e.clientY;renderList();}
    });
    document.addEventListener('mouseup',function(){sy=null;});
    el.addEventListener('touchstart',function(e){sy=e.touches[0].clientY;si=getIdx();},{passive:true});
    el.addEventListener('touchmove',function(e){
      var d=Math.round((sy-e.touches[0].clientY)/ITEM_H);
      if(d!==0){setIdx(d-(getIdx()-si));si=getIdx();sy=e.touches[0].clientY;renderList();}
    },{passive:true});

    el.appendChild(list);
    el._renderList=renderList;
    return el;
  }

  var hEl=makeScroll(hours,function(){return curH;},function(d){curH=(curH+d+24)%24;});
  var mEl=makeScroll(mins,function(){return curM;},function(d){curM=(curM+d+mins.length)%mins.length;});

  wrap.innerHTML='';
  var row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:3px';
  var sep=document.createElement('span');
  sep.textContent=':';
  sep.style.cssText='font-size:14px;font-weight:500;color:var(--text2)';
  row.appendChild(hEl);row.appendChild(sep);row.appendChild(mEl);
  wrap.appendChild(row);
  syncHid();

  wrap._setTime=function(val){
    if(!val||val==='未定'){curH=12;curM=0;}
    else if(val.includes(':')){
      var p=val.split(':');
      curH=parseInt(p[0])||12;
      curM=Math.round(parseInt(p[1]||'0')/10)%mins.length;
    }
    if(hEl._renderList)hEl._renderList();
    if(mEl._renderList)mEl._renderList();
    syncHid();
  };
}


function makeDatePicker(wrapperId,hiddenId,opts){
  var wrap=document.getElementById(wrapperId);
  if(!wrap)return;
  opts=opts||{};
  var yearFrom=opts.yearFrom||1950;
  var yearTo=opts.yearTo||(new Date().getFullYear()+2);
  var hid=document.getElementById(hiddenId);
  var today=new Date();

  /* 状態 */
  var state={y:today.getFullYear(),m:today.getMonth()+1,d:0};
  /* hiddenに既存値があれば復元 */
  if(hid&&hid.value){
    var parts=hid.value.split('-');
    if(parts.length===3){state.y=+parts[0];state.m=+parts[1];state.d=+parts[2];}
  }

  function syncHidden(){
    if(hid)hid.value=state.d?(state.y+'-'+(state.m<10?'0':'')+state.m+'-'+(state.d<10?'0':'')+state.d):'';
  }

  function render(){
    wrap.innerHTML='';

    /* --- 表示ラベル（クリックでカレンダー開閉） --- */
    var label=document.createElement('div');
    label.style.cssText='display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:4px 10px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:13px;min-width:110px;user-select:none';
    label.innerHTML=(state.d?state.y+'/'+(state.m<10?'0':'')+state.m+'/'+(state.d<10?'0':'')+state.d:'<span style="color:var(--text3)">日付を選択</span>')
      +'<span style="margin-left:auto;color:var(--text3);font-size:11px">▼</span>';

    /* --- ポップアップ --- */
    var popup=document.createElement('div');
    popup.style.cssText='display:none;position:absolute;z-index:1000;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.15);padding:10px;width:220px;margin-top:2px';

    var isOpen=false;
    label.onclick=function(e){
      e.stopPropagation();
      isOpen=!isOpen;
      popup.style.display=isOpen?'block':'none';
      if(isOpen)renderGrid();
    };
    document.addEventListener('click',function close(e){
      if(!wrap.contains(e.target)){popup.style.display='none';isOpen=false;}
    });

    function renderGrid(){
      popup.innerHTML='';
      /* 年プルダウン + 月ナビ */
      var nav=document.createElement('div');
      nav.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:8px';

      var ySel=document.createElement('select');
      ySel.style.cssText='font-size:13px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg2);color:var(--text);flex:1';
      for(var y=yearTo;y>=yearFrom;y--){
        ySel.innerHTML+='<option value="'+y+'"'+(y===state.y?' selected':'')+'>'+y+'年</option>';
      }
      ySel.onchange=function(){state.y=+this.value;renderGrid();};

      var prevBtn=document.createElement('button');
      prevBtn.textContent='‹';
      prevBtn.style.cssText='width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:var(--bg3);cursor:pointer;font-size:15px;color:var(--text2)';
      prevBtn.onclick=function(e){e.stopPropagation();state.m--;if(state.m<1){state.m=12;state.y--;}renderGrid();};

      var mLabel=document.createElement('span');
      mLabel.style.cssText='font-size:13px;font-weight:500;min-width:30px;text-align:center';
      mLabel.textContent=state.m+'月';

      var nextBtn=document.createElement('button');
      nextBtn.textContent='›';
      nextBtn.style.cssText=prevBtn.style.cssText;
      nextBtn.onclick=function(e){e.stopPropagation();state.m++;if(state.m>12){state.m=1;state.y++;}renderGrid();};

      var clearBtn=document.createElement('button');
      clearBtn.textContent='✕';
      clearBtn.title='クリア';
      clearBtn.style.cssText='width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:var(--bg3);cursor:pointer;font-size:12px;color:var(--text3)';
      clearBtn.onclick=function(e){e.stopPropagation();state.d=0;syncHidden();render();popup.style.display='none';isOpen=false;};

      nav.appendChild(ySel);nav.appendChild(prevBtn);nav.appendChild(mLabel);nav.appendChild(nextBtn);nav.appendChild(clearBtn);
      popup.appendChild(nav);

      /* 曜日ヘッダ */
      var dayNames=['日','月','火','水','木','金','土'];
      var grid=document.createElement('div');
      grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px';
      dayNames.forEach(function(d,i){
        var cell=document.createElement('div');
        cell.textContent=d;
        cell.style.cssText='text-align:center;font-size:11px;color:'+(i===0?'var(--red)':i===6?'var(--accent)':'var(--text3)')+';padding:2px 0';
        grid.appendChild(cell);
      });

      /* 日付グリッド */
      var firstDay=new Date(state.y,state.m-1,1).getDay();
      var lastDate=new Date(state.y,state.m,0).getDate();
      for(var blank=0;blank<firstDay;blank++){
        var empty=document.createElement('div');grid.appendChild(empty);
      }
      for(var d2=1;d2<=lastDate;d2++){
        (function(day){
          var cell=document.createElement('div');
          cell.textContent=day;
          var isSelected=state.d===day;
          var isToday=today.getFullYear()===state.y&&today.getMonth()+1===state.m&&today.getDate()===day;
          cell.style.cssText='text-align:center;font-size:13px;padding:4px 2px;border-radius:4px;cursor:pointer;'
            +(isSelected?'background:var(--accent);color:#fff;font-weight:500;'
              :isToday?'background:var(--accent-bg);color:var(--accent);font-weight:500;'
              :'color:var(--text);');
          cell.onmouseover=function(){if(!isSelected)this.style.background='var(--bg3)';};
          cell.onmouseout=function(){if(!isSelected)this.style.background=isToday?'var(--accent-bg)':'';};
          cell.onclick=function(e){
            e.stopPropagation();
            state.d=day;
            syncHidden();
            render();
            popup.style.display='none';isOpen=false;
          };
          grid.appendChild(cell);
        })(d2);
      }
      popup.appendChild(grid);
    }

    var container=document.createElement('div');
    container.style.cssText='position:relative;display:inline-block';
    container.appendChild(label);
    container.appendChild(popup);
    wrap.appendChild(container);

    /* _setDate ユーティリティ */
    wrap._setDate=function(val){
      if(hid)hid.value=val||'';
      if(val){
        var p=val.split('-');
        if(p.length===3){state.y=+p[0];state.m=+p[1];state.d=+p[2];}
      }else{state.d=0;}
      render();
    };
    wrap._getDate=function(){return hid?hid.value:'';};
  }
  render();
}

/* 各日付ピッカーを初期化 */
