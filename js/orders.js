/* ============================================================
   発注書（動画制作）自動作成
   - assets/発注書_template.docx の {プレースホルダ} を案件データで埋めて
     .docx をダウンロードする。
   - ライブラリはローカル同梱（js/vendor/pizzip.min.js, docxtemplater.min.js）。
     実行時に外部通信は行わない。
   ============================================================ */
var ORDER_TEMPLATE_URL='assets/発注書_template.docx?v=4';

/* YYYY-MM-DD → YYYY年M月D日（未入力は空） */
function orderFmtDate(iso){
  if(!iso)return'';
  var p=String(iso).split('-');
  if(p.length!==3)return'';
  return (+p[0])+'年'+(+p[1])+'月'+(+p[2])+'日';
}

/* 業務報酬入力欄：数字のみ抽出してカンマ区切りに整形（カーソルは末尾維持） */
function formatOrderFeeInput(){
  var el=document.getElementById('orderFee');
  if(!el)return;
  var digits=el.value.replace(/[^\d]/g,'');
  el.value=digits?Number(digits).toLocaleString():'';
}

/* 交通費入力欄：数字のみ抽出してカンマ区切りに整形（カーソルは末尾維持） */
function formatOrderTransportFeeInput(){
  var el=document.getElementById('orderTransportFee');
  if(!el)return;
  var digits=el.value.replace(/[^\d]/g,'');
  el.value=digits?Number(digits).toLocaleString():'';
}
/* 交通費区分の切替：別途精算のときだけ見込み額欄を表示 */
function onOrderTransportChange(){
  var wrap=document.getElementById('orderTransportFeeWrap');
  var sel=document.getElementById('orderTransport');
  if(wrap)wrap.style.display=(sel&&sel.value==='別途')?'':'none';
}
/* 発注書モーダルの店舗セレクトを変更したら件名を自動入力 */
function onOrderStoreChange(){
  var sel=document.getElementById('orderStore');
  var subjectEl=document.getElementById('orderSubject');
  if(!sel||!subjectEl)return;
  if(sel.value)subjectEl.value=storeName(sel.value)+'　PR動画作成';
}

/* 発注番号「GC-年-連番」から、指定年の連番部分を取り出す（形式が違う・別の年なら0） */
function orderSeqOf(num,year){
  var m=String(num||'').match(/^GC-(\d{4})-(\d+)\s*$/);
  return(m&&parseInt(m[1],10)===year)?parseInt(m[2],10):0;
}
/* 発注番号の次候補。連番は全端末共通の発注記録（DB.orders）の最大値から決める
   （以前は端末ごとのlocalStorageだけだったため、別端末や連続作成で同じ番号が重複した）。
   同じ端末で記録を削除しても番号が戻らないよう、localStorageの値も下限として併用する。手動上書き可。 */
function orderNextNumber(){
  var year=(new Date()).getFullYear();
  var seq=0;
  (DB.orders||[]).forEach(function(o){seq=Math.max(seq,orderSeqOf(o.number,year));});
  try{seq=Math.max(seq,parseInt(localStorage.getItem('gc_order_seq_'+year)||'0',10)||0);}catch(e){}
  return 'GC-'+year+'-'+String(seq+1).padStart(4,'0');
}
/* 生成成功時に連番をコミット（手動上書き値も反映して単調増加を維持） */
function orderCommitNumber(num){
  try{
    var year=(new Date()).getFullYear();
    var n=orderSeqOf(num,year);
    if(!n)return;
    var key='gc_order_seq_'+year;
    var cur=parseInt(localStorage.getItem(key)||'0',10)||0;
    if(n>cur)localStorage.setItem(key,String(n));
  }catch(e){}
}

var _orderDatePickerIds=[
  ['orderDateWrap','orderDate'],
  ['orderContractWrap','orderContract'],
  ['orderPlanWrap','orderPlan'],
  ['orderDeliveryWrap','orderDelivery']
];

/* 発注書モーダルを開いた際の文脈（店舗/クリエイター）。generateOrderでの記録保存に使う */
var _orderCtx={storeId:null,creatorId:null};

/* 発注書モーダルを開く（creatorId / storeId は任意でプリフィル） */
function openOrderModal(opts){
  opts=opts||{};
  _orderCtx={storeId:opts.storeId||null,creatorId:opts.creatorId||null};
  var today=new Date();
  var todayIso=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');

  /* 受託者セレクト（クリエイターリスト）を構築 */
  var creatorSel=document.getElementById('orderCreator');
  if(creatorSel){
    var opt='<option value="">— 選択 —</option>';
    var creators=DB.creators||[];
    if(creators.length){
      creators.forEach(function(cr){
        var label=cr.crRealName||cr.crName||'?';
        opt+='<option value="'+esc(label)+'">'+esc(label)+'</option>';
      });
      opt+='<option value="">——— その他（手入力）</option>';
    }else{
      opt+='<option value="">クリエイターがまだ登録されていません</option>';
    }
    creatorSel.innerHTML=opt;
    /* creatorId が指定されていればプリセット */
    if(opts.creatorId){
      var cr=(DB.creators||[]).find(function(x){return x.id===opts.creatorId;});
      if(cr){creatorSel.value=cr.crRealName||cr.crName||'';}
    }
  }

  /* 店舗セレクトを構築（店舗名の五十音順） */
  var storeSel=document.getElementById('orderStore');
  if(storeSel){
    var stores=(DB.stores||[]).slice().sort(function(a,b){return(a.name||'').localeCompare(b.name||'','ja');});
    storeSel.innerHTML='<option value="">— 選択（任意） —</option>'
      +stores.map(function(s){return'<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');
    storeSel.value=opts.storeId||'';
  }

  /* 担当者セレクトを最新のスタッフで再構築（退職者は除外） */
  var staffSel=document.getElementById('orderStaff');
  if(staffSel){
    var opt='<option value="">— 選択 —</option>';
    (STAFF_MEMBERS||[]).filter(function(p){return!p.retired;}).forEach(function(p){
      opt+='<option value="'+esc(p.name)+'">'+esc(p.name)+'</option>';
    });
    staffSel.innerHTML=opt;
  }

  /* テキスト系の初期値 */
  var subject=opts.storeId?(storeName(opts.storeId)+'　PR動画作成'):'';

  var setVal=function(id,v){var el=document.getElementById(id);if(el)el.value=v;};
  setVal('orderNumber',orderNextNumber());
  setVal('orderSubject',subject);
  setVal('orderDeliveryMethod','ギガファイル便または指定のGoogleドライブフォルダ');
  setVal('orderInspectDays','5');
  setVal('orderVideoCount','1');
  setVal('orderPhotoCount','0');
  var taxSel=document.getElementById('orderTax');if(taxSel)taxSel.value='税込';
  var subSel=document.getElementById('orderSubcontract');if(subSel)subSel.value='不可';
  setVal('orderFee','');
  var transSel=document.getElementById('orderTransport');if(transSel)transSel.value='込み';
  setVal('orderTransportFee','');
  onOrderTransportChange();
  var statusEl=document.getElementById('orderStatus');if(statusEl)statusEl.textContent='';

  openModal('orderModal');

  /* 日付ピッカー初期化（モーダル表示後に生成） */
  _orderDatePickerIds.forEach(function(pair){
    makeDatePicker(pair[0],pair[1],{yearFrom:2024,yearTo:today.getFullYear()+2,yearLabel:'年'});
  });
  var odWrap=document.getElementById('orderDateWrap');
  if(odWrap&&odWrap._setDate)odWrap._setDate(todayIso);
}

/* テンプレートデータ(data)から.docxを生成してダウンロードする（新規作成・再ダウンロード共通） */
async function buildAndDownloadOrderDocx(data,creator,number){
  var resp=await fetch(ORDER_TEMPLATE_URL);
  if(!resp.ok)throw new Error('テンプレート取得失敗 ('+resp.status+')');
  var buf=await resp.arrayBuffer();
  var zip=new window.PizZip(buf);
  var doc=new window.docxtemplater(zip,{
    delimiters:{start:'{',end:'}'},
    paragraphLoop:true,
    linebreaks:true
  });
  doc.render(data);
  var out=doc.getZip().generate({
    type:'blob',
    mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  var safe=function(s){return String(s||'').replace(/[\\\/:*?"<>|]/g,'_');};
  var fname='発注書_'+safe(creator)+'様_'+safe(number)+'.docx';
  var url=URL.createObjectURL(out);
  var a=document.createElement('a');
  a.href=url;a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  return fname;
}

/* フォーム値を集めて .docx を生成・ダウンロードし、発注記録をDBに保存する */
async function generateOrder(){
  var statusEl=document.getElementById('orderStatus');
  var setStatus=function(msg,color){if(statusEl){statusEl.textContent=msg;statusEl.style.color=color||'var(--text2)';}};

  if(typeof window.PizZip==='undefined'||typeof window.docxtemplater==='undefined'){
    setStatus('ライブラリの読み込みに失敗しました（再読み込みしてください）','var(--red)');
    return;
  }
  var val=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};

  var creator=val('orderCreator');
  if(!creator){setStatus('受託者名を入力してください','var(--red)');return;}

  var number=val('orderNumber');
  /* 手動で入力した番号などが既存の発注記録と重複している場合は、作成前に確認する */
  var dup=number&&(DB.orders||[]).find(function(o){return o.number===number;});
  if(dup&&!confirm('発注番号「'+number+'」は既に使われています（'+(dup.subject||dup.creatorName||'')+'）。\nこのまま作成すると番号が重複します。作成しますか？')){
    setStatus('発注番号を確認してください','var(--amber)');
    return;
  }

  /* 業務報酬：税別入力なら税込金額（10%）に換算してWordには常に「税込」で記載 */
  var feeDigits=val('orderFee').replace(/[^\d]/g,'');
  var feeAmount=feeDigits?Number(feeDigits):0;
  var taxInput=val('orderTax');
  if(taxInput==='税別')feeAmount=Math.round(feeAmount*1.1);
  var feeDisplay=feeDigits?feeAmount.toLocaleString():'';

  /* 制作内容：動画●本、静止画●枚（0/空欄の種別は表記しない） */
  var videoCount=Number(val('orderVideoCount'))||0;
  var photoCount=Number(val('orderPhotoCount'))||0;
  var workParts=[];
  if(videoCount>0)workParts.push('動画'+videoCount+'本');
  if(photoCount>0)workParts.push('静止画'+photoCount+'枚');
  var workContent=workParts.length?workParts.join('、'):'動画・静止画';

  /* 交通費：報酬に含む／別途精算（見込み額があれば併記） */
  var transportKind=val('orderTransport')||'込み';
  var transportFeeDigits=val('orderTransportFee').replace(/[^\d]/g,'');
  var transportText=transportKind==='別途'
    ?('別途精算'+(transportFeeDigits?'（見込み ￥'+Number(transportFeeDigits).toLocaleString()+'）':'（実費精算）'))
    :'報酬に含む';

  /* 店舗セレクトの選択を発注記録の紐づけ先に反映 */
  var storeSel=document.getElementById('orderStore');
  if(storeSel)_orderCtx.storeId=storeSel.value||'';

  var data={
    発注番号:number,
    発注日:orderFmtDate(val('orderDate')),
    受託者名:creator,
    契約日:orderFmtDate(val('orderContract')),
    担当者:val('orderStaff'),
    件名:val('orderSubject'),
    制作内容:workContent,
    企画書提出期限:orderFmtDate(val('orderPlan')),
    納期:orderFmtDate(val('orderDelivery')),
    納品方法:val('orderDeliveryMethod'),
    検収営業日:val('orderInspectDays'),
    報酬金額:feeDisplay,
    税区分:'税込',
    交通費:transportText,
    再委託:val('orderSubcontract')
  };

  setStatus('作成中...','var(--amber)');
  try{
    var fname=await buildAndDownloadOrderDocx(data,creator,number);
    orderCommitNumber(number);

    /* 発注記録を保存（店舗/クリエイター詳細から履歴として参照・再ダウンロード可能） */
    if(!DB.orders)DB.orders=[];
    var rec={
      id:uid(),
      storeId:_orderCtx.storeId||'',
      creatorId:_orderCtx.creatorId||'',
      number:number,
      creatorName:creator,
      subject:val('orderSubject'),
      feeAmount:feeAmount,
      templateData:data,
      createdAt:new Date().toISOString()
    };
    DB.orders.push(rec);
    saveItem('orders',rec);

    /* 続けて作成しても同じ番号にならないよう、番号欄を次の番号に更新しておく */
    var numEl=document.getElementById('orderNumber');
    if(numEl)numEl.value=orderNextNumber();
    setStatus('✓ ダウンロードしました：'+fname,'var(--green)');
  }catch(e){
    console.error('[generateOrder]',e);
    var msg=(e&&e.properties&&e.properties.errors)?'テンプレートのプレースホルダにエラーがあります':(e.message||'生成に失敗しました');
    setStatus('エラー: '+msg,'var(--red)');
  }
}

/* 既存の発注記録で重複している発注番号だけを直す（ishida本人のみ実行可）。
   同じ番号が複数ある場合、先に作成された1件はそのまま残し、後から作られた分を
   その年の空いている次の連番に振り直す。発行済みWordの番号と変わる分は一覧で確認でき、
   実行前に変更内容をJSONでバックアップする。再DLするWordにも新しい番号が入る。 */
async function fixDuplicateOrderNumbers(){
  var statusEl=document.getElementById('fixOrderNumStatus');
  var setStatus=function(msg,color){if(statusEl){statusEl.textContent=msg;statusEl.style.color=color||'var(--text2)';}};
  if(!(currentUser&&currentUser.email==='ishida@root-and-activation.co.jp'))return;
  var orders=DB.orders||[];
  var parse=function(num){return String(num||'').match(/^GC-(\d{4})-(\d+)\s*$/);};
  var maxSeq={};
  var byNum={};
  orders.forEach(function(o){
    var m=parse(o.number);
    if(!m)return;
    maxSeq[m[1]]=Math.max(maxSeq[m[1]]||0,parseInt(m[2],10));
    (byNum[o.number]=byNum[o.number]||[]).push(o);
  });
  var changes=[];
  Object.keys(byNum).forEach(function(num){
    var list=byNum[num];
    if(list.length<2)return;
    var year=parse(num)[1];
    list.sort(function(a,b){return new Date(a.createdAt)-new Date(b.createdAt);});
    list.slice(1).forEach(function(o){
      maxSeq[year]+=1;
      changes.push({rec:o,from:o.number,to:'GC-'+year+'-'+String(maxSeq[year]).padStart(4,'0')});
    });
  });
  if(!changes.length){setStatus('重複している発注番号はありませんでした。','var(--green)');return;}
  var list=changes.map(function(c){return c.from+' → '+c.to+'（'+(c.rec.subject||c.rec.creatorName||'')+'）';}).join('\n');
  if(!confirm('次の'+changes.length+'件の発注番号を振り直します。\n\n'+list+'\n\n先に変更前の内容をバックアップファイルとして保存します。実行しますか？'))return;
  var backup=changes.map(function(c){return{id:c.rec.id,subject:c.rec.subject||'',creatorName:c.rec.creatorName||'',oldNumber:c.from,newNumber:c.to};});
  var blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='order_number_fix_backup_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  for(var i=0;i<changes.length;i++){
    var c=changes[i];
    c.rec.number=c.to;
    if(c.rec.templateData)c.rec.templateData.発注番号=c.to;
    setStatus('更新中… '+(i+1)+' / '+changes.length);
    await saveItem('orders',c.rec);
  }
  setStatus('✓ '+changes.length+'件の発注番号を連番に振り直しました。','var(--green)');
}

/* 保存済みの発注記録から.docxを再ダウンロード */
async function redownloadOrder(orderId){
  var rec=(DB.orders||[]).find(function(x){return x.id===orderId;});
  if(!rec)return;
  try{
    await buildAndDownloadOrderDocx(rec.templateData,rec.creatorName,rec.number);
  }catch(e){
    console.error('[redownloadOrder]',e);
    alert('再ダウンロードに失敗しました: '+(e.message||''));
  }
}

/* 依頼がキャンセルになった発注書：記録は削除せず「キャンセル」扱いにする。
   記録が残るので、その発注番号は使用済みのまま（次の番号の計算にも含まれ、再利用されない）。 */
function toggleOrderCancelled(orderId){
  var rec=(DB.orders||[]).find(function(x){return x.id===orderId;});
  if(!rec)return;
  var msg=rec.cancelled
    ?'「'+rec.number+'」のキャンセルを解除しますか？'
    :'「'+rec.number+'」をキャンセル扱いにしますか？\n（記録は残り、この発注番号は使用済みのままになります）';
  if(!confirm(msg))return;
  rec.cancelled=!rec.cancelled;
  saveItem('orders',rec);
  if(rec.storeId&&document.getElementById('detailModal')&&document.getElementById('detailModal').classList.contains('open')){
    showDetail(rec.storeId);
  }else if(rec.creatorId&&document.getElementById('creatorDetailModal')&&document.getElementById('creatorDetailModal').classList.contains('open')){
    openCreatorDetail(rec.creatorId);
  }
}

function deleteOrder(orderId){
  if(!confirm('この発注記録を削除しますか？（ダウンロード済みのWordファイルには影響しません）'))return;
  var rec=(DB.orders||[]).find(function(x){return x.id===orderId;});
  DB.orders=(DB.orders||[]).filter(function(x){return x.id!==orderId;});
  deleteItem('orders',orderId);
  /* 開いている詳細モーダルがあれば履歴表示を再構築 */
  if(rec&&rec.storeId&&document.getElementById('detailModal')&&document.getElementById('detailModal').classList.contains('open')){
    showDetail(rec.storeId);
  }else if(rec&&rec.creatorId&&document.getElementById('creatorDetailModal')&&document.getElementById('creatorDetailModal').classList.contains('open')){
    openCreatorDetail(rec.creatorId);
  }
}

/* 発注履歴の一覧HTML（店舗詳細・クリエイター詳細で共用） */
function renderOrderHistoryHtml(list){
  if(!list||!list.length)return'';
  var sorted=list.slice().sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
  return'<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">'
    +'<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">📄 発注書履歴 ('+sorted.length+'件)</div>'
    +sorted.map(function(o){
      return'<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border-radius:var(--r);margin-bottom:4px'+(o.cancelled?';opacity:.55':'')+'">'
        +'<span style="font-size:12px;color:var(--text3);white-space:nowrap">'+esc(o.number||'')+'</span>'
        +(o.cancelled?'<span class="badge b-red" style="white-space:nowrap">🚫 キャンセル</span>':'')
        +'<span style="font-size:13px;color:var(--text2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(o.subject||(o.creatorName?o.creatorName+'様':''))+'</span>'
        +(o.feeAmount?'<span style="font-size:12px;color:var(--accent);white-space:nowrap">¥'+Number(o.feeAmount).toLocaleString()+'</span>':'')
        +'<span style="font-size:11px;color:var(--text3);white-space:nowrap">'+fmtD((o.createdAt||'').split('T')[0])+'</span>'
        +'<button class="btn btn-sm" style="white-space:nowrap" onclick="event.stopPropagation();redownloadOrder(\''+o.id+'\')">再DL</button>'
        +'<button class="btn btn-sm" style="white-space:nowrap" onclick="event.stopPropagation();toggleOrderCancelled(\''+o.id+'\')">'+(o.cancelled?'キャンセル解除':'キャンセル')+'</button>'
        +'<button class="btn-ghost-danger" style="white-space:nowrap" onclick="event.stopPropagation();deleteOrder(\''+o.id+'\')">削除</button>'
      +'</div>';
    }).join('')
  +'</div>';
}
