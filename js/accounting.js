var editingInvoiceId=null;

function onInvoiceEstimateChange(){
  var isEst=!!document.getElementById('invIsEstimate').checked;
  var show=function(id,on){var el=document.getElementById(id);if(el)el.style.display=on?'':'none';};
  show('invTransportField',!isEst);
  show('invFoodField',!isEst);
  show('invCrTransportField',!isEst);
  show('invOtherField',!isEst);
  var setLabel=function(id,txt){var el=document.getElementById(id);if(el)el.textContent=txt;};
  setLabel('invPrFeeLabel',isEst?'見込みPR費（経費抜き）':'PR費');
  setLabel('invMakeFeeLabel',isEst?'見込み制作費（経費抜き）':'制作費');
  setLabel('invAdFeeLabel',isEst?'見込み広告費':'確定広告費');
  if(isEst){
    var zero=function(fid){var el=document.getElementById(fid);if(el)el.value='';};
    zero('invTransport');zero('invFood');zero('invCrTransport');zero('invOther');
    calcInvTotal();
  }
}

function openInvoiceModal(id,opts){
  editingInvoiceId=id||null;
  var titleEl=document.getElementById('invoiceModalTitle');
  if(titleEl)titleEl.textContent=id?'請求書を編集':'請求書を追加';
  /* セレクト初期化 */
  var infSel=document.getElementById('invInfId');
  infSel.innerHTML='<option value="">選択...</option>'+DB.influencers.map(function(i){return'<option value="'+i.id+'">'+esc(i.name)+(i.handle?' ('+i.handle+')':'')+'</option>';}).join('');
  var crSel=document.getElementById('invCreatorId');
  if(crSel)crSel.innerHTML='<option value="">選択...</option>'+(DB.creators||[]).slice().sort(function(a,b){return(a.crName||'').localeCompare(b.crName||'');}).map(function(c){return'<option value="'+c.id+'">'+esc(c.crName)+(c.crRealName?' ('+c.crRealName+')':'')+'</option>';}).join('');
  var storeSel=document.getElementById('invStoreId');
  storeSel.innerHTML='<option value="">選択...</option>'+DB.stores.map(function(s){return'<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');
  /* フォームリセット */
  ['invPrFee','invTransport','invFood','invMakeFee','invCrTransport','invOther','invAdFee','invAdMonth','invBillingName','invNote'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
  if(crSel)crSel.value='';
  var adPlatEl=document.getElementById('invAdPlatform');if(adPlatEl)adPlatEl.value='Meta広告';
  /* 税区分・税率リセット（既定：税別10%） */
  var taxExcl=document.querySelector('input[name="invTaxModeRadio"][value="excl"]');if(taxExcl)taxExcl.checked=true;
  var taxRateEl=document.getElementById('invTaxRate');if(taxRateEl)taxRateEl.value='10';
  document.getElementById('invReceivedDate').value='';
  document.getElementById('invStatus').value='pending';
  document.getElementById('invTotal').textContent='¥0';
  document.getElementById('invCastingId').value='';
  document.getElementById('invIsEstimate').checked=false;
  /* 費用種別をリセット（既定：インフルエンサー） */
  var typeRadio=document.querySelector('input[name="invTypeRadio"][value="influencer"]');
  if(typeRadio)typeRadio.checked=true;
  if(id){
    var inv=DB.invoices.find(function(x){return x.id===id;});
    if(inv){
      var pt=inv.payeeType||'influencer';
      var tr2=document.querySelector('input[name="invTypeRadio"][value="'+pt+'"]');
      if(tr2)tr2.checked=true;
      infSel.value=inv.infId||'';
      if(crSel)crSel.value=inv.creatorId||'';
      storeSel.value=inv.storeId||'';
      document.getElementById('invReceivedDate').value=inv.receivedDate||'';
      document.getElementById('invStatus').value=inv.status||'pending';
      document.getElementById('invPrFee').value=inv.prFee||'';
      document.getElementById('invTransport').value=inv.transport||'';
      document.getElementById('invFood').value=inv.food||'';
      document.getElementById('invMakeFee').value=inv.makeFee||'';
      document.getElementById('invCrTransport').value=inv.crTransport||'';
      document.getElementById('invOther').value=inv.other||'';
      document.getElementById('invAdFee').value=inv.adFee||'';
      document.getElementById('invAdMonth').value=inv.adMonth||'';
      if(adPlatEl)adPlatEl.value=inv.adPlatform||'Meta広告';
      var tm=document.querySelector('input[name="invTaxModeRadio"][value="'+(inv.taxMode||'excl')+'"]');if(tm)tm.checked=true;
      if(taxRateEl)taxRateEl.value=String(inv.taxRate!=null?inv.taxRate:10);
      document.getElementById('invBillingName').value=inv.billingName||'';
      document.getElementById('invNote').value=inv.note||'';
      document.getElementById('invCastingId').value=inv.castingId||'';
      document.getElementById('invIsEstimate').checked=!!inv.isEstimate;
    }
  }
  onInvoiceTypeChange();
  onInvoiceEstimateChange();
  /* ステータス選択肢は種別確定後に再構築されるため、編集時はここで再適用 */
  if(id){
    var _inv=DB.invoices.find(function(x){return x.id===id;});
    var ss=document.getElementById('invStatus');
    if(_inv&&ss&&ss.querySelector('option[value="'+(_inv.status||'pending')+'"]'))ss.value=_inv.status||'pending';
  }
  calcInvTotal();
  /* キャスティングからの呼び出し時にプリフィル */
  if(opts){
    if(opts.infId)infSel.value=opts.infId;
    if(opts.storeId)storeSel.value=opts.storeId;
    if(opts.castingId)document.getElementById('invCastingId').value=opts.castingId;
    if(opts.isEstimate&&!id){document.getElementById('invIsEstimate').checked=true;onInvoiceEstimateChange();}
    /* PR費用をキャスティングの fee から自動入力 */
    if(opts.castingId){
      var casting=DB.castings.find(function(x){return x.id===opts.castingId;});
      if(casting&&casting.fee&&!id){
        document.getElementById('invPrFee').value=casting.fee;
        calcInvTotal();
      }
    }
  }
  /* キャスティングリンク判定: リンクあり→コンテキスト表示＋セレクト非表示 */
  var castingId=document.getElementById('invCastingId').value;
  var ctxBox=document.getElementById('invCastingCtxBox');
  var infStoreRow=document.getElementById('invInfStoreRow');
  if(castingId){
    var lc=DB.castings.find(function(x){return x.id===castingId;});
    if(lc){
      var ctxLabel=document.getElementById('invCastingCtxLabel');
      if(ctxLabel)ctxLabel.textContent=storeName(lc.storeId)+' × '+infName(lc.infId);
      /* PR費用セット（新規のときのみ） */
      if(!id&&lc.fee){document.getElementById('invPrFee').value=lc.fee;calcInvTotal();}
    }
    if(ctxBox)ctxBox.style.display='';
    if(infStoreRow)infStoreRow.style.display='none';
  }else{
    if(ctxBox)ctxBox.style.display='none';
    if(infStoreRow)infStoreRow.style.display='';
  }
  openModal('invoiceModal');
}

function onInvoiceTypeChange(){
  var t=document.querySelector('input[name="invTypeRadio"]:checked');
  var val=t?t.value:'influencer';
  var hid=document.getElementById('invPayeeType');if(hid)hid.value=val;
  var isInf=val==='influencer',isCreator=val==='creator',isAd=val==='ad';
  var show=function(id,on){var el=document.getElementById(id);if(el)el.style.display=on?'':'none';};
  show('invInfField',isInf);
  show('invCreatorField',isCreator);
  show('invInfCosts',isInf);
  show('invCreatorCosts',isCreator);
  show('invAdCosts',isAd);
  show('invReceivedDateField',!isAd);
  show('invAdMonthField',isAd);
  show('invBillingNameField',!isAd);
  /* 広告費は店舗必須 */
  var req=document.getElementById('invStoreReq');if(req)req.style.display=isAd?'':'none';
  /* キャスティング文脈はインフルエンサーのみ */
  if(!isInf){var ctx=document.getElementById('invCastingCtxBox');if(ctx)ctx.style.display='none';}
  /* 進捗ステータスの選択肢を方向（支払い/入金）に応じて切替 */
  var statusSel=document.getElementById('invStatus');
  if(statusSel){
    var flow=isAd?INV_FLOW_RECEIVABLE:INV_FLOW_PAYABLE;
    var cur=statusSel.value;
    statusSel.innerHTML=flow.map(function(s){return'<option value="'+s.key+'">'+s.icon+' '+s.label+'</option>';}).join('');
    if(flow.some(function(s){return s.key===cur;}))statusSel.value=cur;
  }
  calcInvTotal();
}

function calcInvTotal(){
  var t=document.querySelector('input[name="invTypeRadio"]:checked');
  var val=t?t.value:'influencer';
  var g=function(id){return Number(document.getElementById(id).value)||0;};
  /* 課税対象（報酬）と実費経費を分離 */
  var taxable,expense;
  if(val==='creator'){taxable=g('invMakeFee');expense=g('invCrTransport')+g('invOther');}
  else if(val==='ad'){taxable=g('invAdFee');expense=0;}
  else{taxable=g('invPrFee');expense=g('invTransport')+g('invFood');}
  var modeEl=document.querySelector('input[name="invTaxModeRadio"]:checked');
  var mode=modeEl?modeEl.value:'excl';
  var rate=(Number((document.getElementById('invTaxRate')||{}).value)||0)/100;
  var taxExcl=mode==='incl'?Math.round(taxable/(1+rate)):taxable;
  var taxIncl=mode==='incl'?taxable:Math.round(taxable*(1+rate));
  var excl=taxExcl+expense,incl=taxIncl+expense;
  var exclEl=document.getElementById('invTotalExcl');if(exclEl)exclEl.textContent='¥'+excl.toLocaleString();
  document.getElementById('invTotal').textContent='¥'+incl.toLocaleString();
}

function saveInvoice(){
  var payeeType=(document.getElementById('invPayeeType')||{}).value||'influencer';
  var storeId=document.getElementById('invStoreId').value;
  var num=function(id){return Number(document.getElementById(id).value)||0;};
  var isEdit=!!editingInvoiceId;
  var id=isEdit?editingInvoiceId:uid();
  var inv;
  if(payeeType==='ad'){
    if(!storeId){alert('店舗を選択してください');return;}
    inv={
      id:id,payeeType:'ad',
      storeId:storeId,infId:'',creatorId:'',castingId:null,
      adPlatform:document.getElementById('invAdPlatform').value,
      adMonth:document.getElementById('invAdMonth').value,
      receivedDate:'',
      status:document.getElementById('invStatus').value,
      adFee:num('invAdFee'),
      note:document.getElementById('invNote').value
    };
  }else if(payeeType==='creator'){
    var creatorId=document.getElementById('invCreatorId').value;
    if(!creatorId){alert('クリエイターを選択してください');return;}
    inv={
      id:id,payeeType:'creator',
      creatorId:creatorId,infId:'',
      storeId:storeId,castingId:null,
      receivedDate:document.getElementById('invReceivedDate').value,
      status:document.getElementById('invStatus').value,
      makeFee:num('invMakeFee'),
      crTransport:num('invCrTransport'),
      other:num('invOther'),
      note:document.getElementById('invNote').value
    };
  }else{
    var castingId=document.getElementById('invCastingId').value||null;
    var infId=document.getElementById('invInfId').value;
    /* キャスティングリンク時: castingのinfId/storeIdを補完 */
    if(castingId){
      var lc=DB.castings.find(function(x){return x.id===castingId;});
      if(lc){if(!infId)infId=lc.infId;if(!storeId)storeId=lc.storeId;}
    }
    if(!infId){alert('インフルエンサーを選択してください');return;}
    inv={
      id:id,payeeType:'influencer',
      infId:infId,
      storeId:storeId,
      castingId:castingId,
      receivedDate:document.getElementById('invReceivedDate').value,
      status:document.getElementById('invStatus').value,
      prFee:num('invPrFee'),
      transport:num('invTransport'),
      food:num('invFood'),
      note:document.getElementById('invNote').value
    };
  }
  /* 税区分・税率（全種別共通） */
  var tmEl=document.querySelector('input[name="invTaxModeRadio"]:checked');
  inv.taxMode=tmEl?tmEl.value:'excl';
  inv.taxRate=Number((document.getElementById('invTaxRate')||{}).value)||0;
  /* 請求書記載名（広告費以外） */
  inv.billingName=(payeeType==='ad')?'':((document.getElementById('invBillingName')||{}).value||'');
  /* 仮の費用（請求書発行前の見込み・経費抜き） */
  inv.isEstimate=!!document.getElementById('invIsEstimate').checked;
  if(!DB.invoices)DB.invoices=[];
  if(isEdit){
    var idx=DB.invoices.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.invoices[idx]=inv;}else{DB.invoices.push(inv);}
  }else{
    DB.invoices.push(inv);
  }
  closeModal('invoiceModal');
  saveItem('invoices',inv);
  refreshAll();
  renderAccounting();
  if(currentPage==='casting')renderCasting();
}

function deleteInvoice(id){
  if(!confirm('この請求書記録を削除しますか？'))return;
  DB.invoices=DB.invoices.filter(function(x){return x.id!==id;});
  deleteItem('invoices',id);
  refreshAll();
  renderAccounting();
  if(currentPage==='casting')renderCasting();
}

function invMonthOf(inv){return inv.payeeType==='ad'?(inv.adMonth||''):(inv.receivedDate||'').slice(0,7);}
function invSalesOf(inv){var s=DB.stores.find(function(x){return x.id===inv.storeId;});return s?(s.ourManager||''):'';}

var accShowSettled=false;
function toggleAccShowSettled(){
  accShowSettled=!accShowSettled;
  var btn=document.getElementById('accShowSettledBtn');
  if(btn){
    btn.textContent=accShowSettled?'未決済のみ表示':'すべて表示';
    btn.style.background=accShowSettled?'var(--accent-bg)':'';
    btn.style.color=accShowSettled?'var(--accent)':'';
    btn.style.borderColor=accShowSettled?'var(--accent-border)':'';
  }
  renderAccounting();
}

function renderAccounting(){
  if(!DB.invoices)DB.invoices=[];
  var getV=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var filterStatus=getV('accFilterStatus');
  var filterMonth=getV('accFilterMonth');
  var filterStore=getV('accFilterStore');
  var filterSales=getV('accFilterSales');
  var filterType=getV('accFilterType');

  /* 店舗フィルタのオプション更新 */
  var storeSel=document.getElementById('accFilterStore');
  if(storeSel){
    storeSel.innerHTML='<option value="">全店舗</option>'+DB.stores.slice().sort(function(a,b){return(a.name||'').localeCompare(b.name||'');}).map(function(s){return'<option value="'+s.id+'"'+(s.id===filterStore?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
  }
  /* 担当営業フィルタのオプション更新（店舗の弊社担当から抽出） */
  var salesSel=document.getElementById('accFilterSales');
  if(salesSel){
    var salesNames=[...new Set(DB.stores.map(function(s){return s.ourManager;}).filter(Boolean))].sort();
    salesSel.innerHTML='<option value="">担当営業：全員</option>'+salesNames.map(function(n){return'<option value="'+esc(n)+'"'+(n===filterSales?' selected':'')+'>'+esc(n)+'</option>';}).join('');
  }
  /* 月フィルタのオプションを更新 */
  var monthSel=document.getElementById('accFilterMonth');
  if(monthSel){
    var months=[...new Set(DB.invoices.map(invMonthOf).filter(Boolean))].sort().reverse();
    var curMonth=monthSel.value;
    monthSel.innerHTML='<option value="">全期間</option>'+months.map(function(m){return'<option value="'+m+'"'+(m===curMonth?' selected':'')+'>'+m+'</option>';}).join('');
  }

  var baseFilter=function(inv){
    if(filterStatus&&inv.status!==filterStatus)return false;
    if(filterMonth&&invMonthOf(inv)!==filterMonth)return false;
    if(filterStore&&inv.storeId!==filterStore)return false;
    if(filterSales&&invSalesOf(inv)!==filterSales)return false;
    if(filterType&&(inv.payeeType||'influencer')!==filterType)return false;
    return true;
  };
  /* サマリーは「すべて表示」トグルの影響を受けず、選択中の条件全体の金額を表示する */
  var summaryList=DB.invoices.slice().filter(baseFilter);
  var list=summaryList.filter(function(inv){
    if(!accShowSettled&&invSettled(inv))return false;
    return true;
  }).sort(function(a,b){
    /* 受領日未登録を最上部に、それ以外は受領日が新しい順（古いものが下）に並べる */
    var ar=a.receivedDate||'',br=b.receivedDate||'';
    if(!ar&&br)return-1;
    if(ar&&!br)return 1;
    if(!ar&&!br)return 0;
    return br.localeCompare(ar);
  });

  /* サマリー集計（すべて表示トグル無視・税込ベース） */
  var totalAll=0,totalInf=0,totalCr=0,totalAd=0;
  summaryList.forEach(function(inv){var t=invInclTotal(inv);totalAll+=t;if(inv.payeeType==='creator')totalCr+=t;else if(inv.payeeType==='ad')totalAd+=t;else totalInf+=t;});
  var setVal=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setVal('acc-count',list.length);
  setVal('acc-total','¥'+totalAll.toLocaleString());
  setVal('acc-inf','¥'+totalInf.toLocaleString());
  setVal('acc-creator','¥'+totalCr.toLocaleString());
  setVal('acc-ad','¥'+totalAd.toLocaleString());

  var tb=document.getElementById('accBody');
  if(!tb)return;
  if(!list.length){
    tb.innerHTML='<tr><td colspan="9" class="empty-state">'+(accShowSettled?'費用記録がありません':'未決済の費用記録はありません（「すべて表示」で過去分も見られます）')+'</td></tr>';
    return;
  }
  tb.innerHTML=list.map(function(inv){
    var settled=invSettled(inv);
    var rowStyle=settled?'opacity:0.55;background:var(--bg3)':(inv.isEstimate?'border-left:3px solid var(--amber)':'');
    var type=inv.payeeType||'influencer';
    var isCreator=type==='creator',isAd=type==='ad';
    var payeeName=isAd?esc(inv.adPlatform||'広告')
      :isCreator?(function(){var c=(DB.creators||[]).find(function(x){return x.id===inv.creatorId;});return c?esc(c.crName):'—';})()
      :(function(){var i=DB.influencers.find(function(x){return x.id===inv.infId;});return i?esc(i.name):'—';})();
    var storeName2=inv.storeId?(function(){var s=DB.stores.find(function(x){return x.id===inv.storeId;});return s?esc(s.name):'—';})():'—';
    var incl=invInclTotal(inv),excl=invExclTotal(inv);
    var typeBadge=(isAd?'<span class="badge b-amber">📢 広告費</span>':isCreator?'<span class="badge b-pink">🎬 クリエイター</span>':'<span class="badge b-purple">👤 INF</span>')
      +(inv.isEstimate?' <span class="badge" style="background:var(--amber-bg);color:var(--amber);border-color:var(--amber-border)">🔖 仮</span>':'');
    var dateCell=isAd?(inv.adMonth?inv.adMonth+'<span style="color:var(--text3);font-size:11px"> 対象月</span>':'—'):(inv.receivedDate||'—');
    var breakdown=isAd?[['確定広告費',inv.adFee]]
      :isCreator?[['制作費',inv.makeFee],['交通費',inv.crTransport],['その他',inv.other]]
      :[['PR費',inv.prFee],['交通費',inv.transport],['飲食代',inv.food]];
    var breakdownHtml=breakdown.filter(function(b){return b[1];}).map(function(b){return'<span style="white-space:nowrap;color:var(--text3)">'+b[0]+' ¥'+Number(b[1]).toLocaleString()+'</span>';}).join('<span style="color:var(--text3)"> / </span>')||'<span style="color:var(--text3)">—</span>';
    return'<tr style="'+rowStyle+'">'
      +'<td class="td-mono" style="white-space:nowrap">'+dateCell+'</td>'
      +'<td>'+typeBadge+'</td>'
      +'<td style="font-weight:500">'+payeeName+(inv.billingName?'<div style="font-size:11px;color:var(--text3);font-weight:400">請求名義：'+esc(inv.billingName)+'</div>':'')+'</td>'
      +'<td style="color:var(--text2)">'+storeName2+'</td>'
      +'<td style="font-size:12px">'+breakdownHtml+'</td>'
      +'<td class="td-mono" style="text-align:right;white-space:nowrap"><div style="font-weight:500;color:var(--accent)">¥'+incl.toLocaleString()+'<span style="font-size:10px;color:var(--text3);font-weight:400"> 税込</span></div><div style="font-size:11px;color:var(--text3)">¥'+excl.toLocaleString()+' 税別</div></td>'
      +'<td onclick="event.stopPropagation()" style="min-width:220px">'
        +renderInvFlow(inv)
      +'</td>'
      +'<td style="color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(inv.note||'—')+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'
        +'<button class="btn btn-sm" onclick="openInvoiceModal(\''+inv.id+'\')" style="margin-right:4px">編集</button>'
        +'<button class="btn-ghost-danger" onclick="deleteInvoice(\''+inv.id+'\')">削除</button>'
      +'</td>'
    +'</tr>';
  }).join('');
}

/* 課税対象（報酬・サービス対価）のみ消費税を計算。
   交通費・飲食代・その他は実費精算（立替経費）のため税対象外。 */
function invTaxableOf(inv){
  return inv.payeeType==='ad'?(inv.adFee||0)
    :inv.payeeType==='creator'?(inv.makeFee||0)
    :(inv.prFee||0);
}
function invExpenseOf(inv){
  return inv.payeeType==='ad'?0
    :inv.payeeType==='creator'?(inv.crTransport||0)+(inv.other||0)
    :(inv.transport||0)+(inv.food||0);
}
function invTaxRate(inv){return inv.taxRate!=null?inv.taxRate:10;}
function invExclTotal(inv){var tax=invTaxableOf(inv),r=invTaxRate(inv)/100;var taxExcl=inv.taxMode==='incl'?Math.round(tax/(1+r)):tax;return taxExcl+invExpenseOf(inv);}
function invInclTotal(inv){var tax=invTaxableOf(inv),r=invTaxRate(inv)/100;var taxIncl=inv.taxMode==='incl'?tax:Math.round(tax*(1+r));return taxIncl+invExpenseOf(inv);}
