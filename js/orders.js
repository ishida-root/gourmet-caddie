/* ============================================================
   発注書（動画制作）自動作成
   - assets/発注書_template.docx の {プレースホルダ} を案件データで埋めて
     .docx をダウンロードする。
   - ライブラリはローカル同梱（js/vendor/pizzip.min.js, docxtemplater.min.js）。
     実行時に外部通信は行わない。
   ============================================================ */
var ORDER_TEMPLATE_URL='assets/発注書_template.docx?v=1';

/* YYYY-MM-DD → YYYY年M月D日（未入力は空） */
function orderFmtDate(iso){
  if(!iso)return'';
  var p=String(iso).split('-');
  if(p.length!==3)return'';
  return (+p[0])+'年'+(+p[1])+'月'+(+p[2])+'日';
}

/* 発注番号の次候補（localStorageの連番。手動上書き可） */
function orderNextNumber(){
  var seq=0;
  try{seq=parseInt(localStorage.getItem('gc_order_seq')||'0',10)||0;}catch(e){}
  var year=(new Date()).getFullYear();
  return 'GC-'+year+'-'+String(seq+1).padStart(4,'0');
}
/* 生成成功時に連番をコミット（手動上書き値も反映して単調増加を維持） */
function orderCommitNumber(num){
  try{
    var m=String(num||'').match(/(\d+)\s*$/);
    if(!m)return;
    var n=parseInt(m[1],10);
    var cur=parseInt(localStorage.getItem('gc_order_seq')||'0',10)||0;
    if(n>cur)localStorage.setItem('gc_order_seq',String(n));
  }catch(e){}
}

var _orderDatePickerIds=[
  ['orderDateWrap','orderDate'],
  ['orderContractWrap','orderContract'],
  ['orderPlanWrap','orderPlan'],
  ['orderDeliveryWrap','orderDelivery']
];

/* 発注書モーダルを開く（creatorId / storeId は任意でプリフィル） */
function openOrderModal(opts){
  opts=opts||{};
  var today=new Date();
  var todayIso=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');

  /* 受託者セレクト（クリエイターリスト）を構築 */
  var creatorSel=document.getElementById('orderCreator');
  if(creatorSel){
    var opt='<option value="">— 選択 —</option>';
    (DB.creators||[]).forEach(function(cr){
      var label=cr.crRealName||cr.crName||'?';
      opt+='<option value="'+esc(label)+'">'+esc(label)+'</option>';
    });
    opt+='<option value="">——— その他（手入力）</option>';
    creatorSel.innerHTML=opt;
    /* creatorId が指定されていればプリセット */
    if(opts.creatorId){
      var cr=(DB.creators||[]).find(function(x){return x.id===opts.creatorId;});
      if(cr){creatorSel.value=cr.crRealName||cr.crName||'';}
    }
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
  var subject=opts.storeId?storeName(opts.storeId):'';

  var setVal=function(id,v){var el=document.getElementById(id);if(el)el.value=v;};
  setVal('orderNumber',orderNextNumber());
  setVal('orderSubject',subject);
  setVal('orderDeliveryMethod','ギガファイル便');
  setVal('orderInspectDays','5');
  var taxSel=document.getElementById('orderTax');if(taxSel)taxSel.value='税込';
  var subSel=document.getElementById('orderSubcontract');if(subSel)subSel.value='不可';
  setVal('orderFee','');
  var statusEl=document.getElementById('orderStatus');if(statusEl)statusEl.textContent='';

  openModal('orderModal');

  /* 日付ピッカー初期化（モーダル表示後に生成） */
  _orderDatePickerIds.forEach(function(pair){
    makeDatePicker(pair[0],pair[1],{yearFrom:2024,yearTo:today.getFullYear()+2,yearLabel:'年'});
  });
  var odWrap=document.getElementById('orderDateWrap');
  if(odWrap&&odWrap._setDate)odWrap._setDate(todayIso);
}

/* フォーム値を集めて .docx を生成・ダウンロード */
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
  var data={
    発注番号:number,
    発注日:orderFmtDate(val('orderDate')),
    受託者名:creator,
    契約日:orderFmtDate(val('orderContract')),
    担当者:val('orderStaff'),
    件名:val('orderSubject'),
    企画書提出期限:orderFmtDate(val('orderPlan')),
    納期:orderFmtDate(val('orderDelivery')),
    納品方法:val('orderDeliveryMethod'),
    検収営業日:val('orderInspectDays'),
    報酬金額:val('orderFee'),
    税区分:val('orderTax'),
    再委託:val('orderSubcontract')
  };

  setStatus('作成中...','var(--amber)');
  try{
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
    var fname='発注書_'+safe(creator)+'_'+safe(number)+'.docx';
    var url=URL.createObjectURL(out);
    var a=document.createElement('a');
    a.href=url;a.download=fname;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);

    orderCommitNumber(number);
    setStatus('✓ ダウンロードしました：'+fname,'var(--green)');
  }catch(e){
    console.error('[generateOrder]',e);
    var msg=(e&&e.properties&&e.properties.errors)?'テンプレートのプレースホルダにエラーがあります':(e.message||'生成に失敗しました');
    setStatus('エラー: '+msg,'var(--red)');
  }
}
