var editingInvoiceId=null;

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
  ['invPrFee','invTransport','invFood','invMakeFee','invCrTransport','invOther','invNote'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
  if(crSel)crSel.value='';
  document.getElementById('invReceivedDate').value='';
  document.getElementById('invStatus').value='pending';
  document.getElementById('invTotal').textContent='¥0';
  document.getElementById('invCastingId').value='';
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
      document.getElementById('invNote').value=inv.note||'';
      document.getElementById('invCastingId').value=inv.castingId||'';
    }
  }
  onInvoiceTypeChange();
  calcInvTotal();
  /* キャスティングからの呼び出し時にプリフィル */
  if(opts){
    if(opts.infId)infSel.value=opts.infId;
    if(opts.storeId)storeSel.value=opts.storeId;
    if(opts.castingId)document.getElementById('invCastingId').value=opts.castingId;
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
  var isCreator=val==='creator';
  var infField=document.getElementById('invInfField');
  var crField=document.getElementById('invCreatorField');
  var infCosts=document.getElementById('invInfCosts');
  var crCosts=document.getElementById('invCreatorCosts');
  if(infField)infField.style.display=isCreator?'none':'';
  if(crField)crField.style.display=isCreator?'':'none';
  if(infCosts)infCosts.style.display=isCreator?'none':'';
  if(crCosts)crCosts.style.display=isCreator?'':'none';
  /* クリエイター費用はキャスティング文脈なし */
  if(isCreator){var ctx=document.getElementById('invCastingCtxBox');if(ctx)ctx.style.display='none';}
  calcInvTotal();
}

function calcInvTotal(){
  var t=document.querySelector('input[name="invTypeRadio"]:checked');
  var g=function(id){return Number(document.getElementById(id).value)||0;};
  var sum=(t&&t.value==='creator')
    ?g('invMakeFee')+g('invCrTransport')+g('invOther')
    :g('invPrFee')+g('invTransport')+g('invFood');
  document.getElementById('invTotal').textContent='¥'+sum.toLocaleString();
}

function saveInvoice(){
  var payeeType=(document.getElementById('invPayeeType')||{}).value||'influencer';
  var storeId=document.getElementById('invStoreId').value;
  var num=function(id){return Number(document.getElementById(id).value)||0;};
  var isEdit=!!editingInvoiceId;
  var id=isEdit?editingInvoiceId:uid();
  var inv;
  if(payeeType==='creator'){
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

function renderAccounting(){
  if(!DB.invoices)DB.invoices=[];
  var filterStatus=document.getElementById('accFilterStatus')?document.getElementById('accFilterStatus').value:'';
  var filterMonth=document.getElementById('accFilterMonth')?document.getElementById('accFilterMonth').value:'';

  /* 月フィルタのオプションを更新 */
  var monthSel=document.getElementById('accFilterMonth');
  if(monthSel){
    var months=[...new Set(DB.invoices.filter(function(x){return x.receivedDate;}).map(function(x){return x.receivedDate.slice(0,7);}))].sort().reverse();
    var curMonth=monthSel.value;
    monthSel.innerHTML='<option value="">全期間</option>'+months.map(function(m){return'<option value="'+m+'"'+(m===curMonth?' selected':'')+'>'+m+'</option>';}).join('');
  }

  var list=DB.invoices.slice().filter(function(inv){
    if(filterStatus&&inv.status!==filterStatus)return false;
    if(filterMonth&&(inv.receivedDate||'').slice(0,7)!==filterMonth)return false;
    return true;
  }).sort(function(a,b){return (b.receivedDate||'').localeCompare(a.receivedDate||'');});

  /* サマリー集計（フィルタ後） */
  var totalAll=0,totalInf=0,totalCr=0;
  list.forEach(function(inv){var t=invTotalOf(inv);totalAll+=t;if(inv.payeeType==='creator')totalCr+=t;else totalInf+=t;});
  var setVal=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setVal('acc-count',list.length);
  setVal('acc-total','¥'+totalAll.toLocaleString());
  setVal('acc-inf','¥'+totalInf.toLocaleString());
  setVal('acc-creator','¥'+totalCr.toLocaleString());

  var tb=document.getElementById('accBody');
  if(!tb)return;
  if(!list.length){tb.innerHTML='<tr><td colspan="9" class="empty-state">費用記録がありません</td></tr>';return;}
  tb.innerHTML=list.map(function(inv){
    var isCreator=inv.payeeType==='creator';
    var payeeName=isCreator
      ?(function(){var c=(DB.creators||[]).find(function(x){return x.id===inv.creatorId;});return c?esc(c.crName):'—';})()
      :(function(){var i=DB.influencers.find(function(x){return x.id===inv.infId;});return i?esc(i.name):'—';})();
    var storeName2=inv.storeId?(function(){var s=DB.stores.find(function(x){return x.id===inv.storeId;});return s?esc(s.name):'—';})():'—';
    var total=invTotalOf(inv);
    var typeBadge=isCreator?'<span class="badge b-pink">🎬 クリエイター</span>':'<span class="badge b-purple">👤 INF</span>';
    var breakdown=isCreator
      ?[['制作費',inv.makeFee],['交通費',inv.crTransport],['その他',inv.other]]
      :[['PR費',inv.prFee],['交通費',inv.transport],['飲食代',inv.food]];
    var breakdownHtml=breakdown.filter(function(b){return b[1];}).map(function(b){return'<span style="white-space:nowrap;color:var(--text3)">'+b[0]+' ¥'+Number(b[1]).toLocaleString()+'</span>';}).join('<span style="color:var(--text3)"> / </span>')||'<span style="color:var(--text3)">—</span>';
    return'<tr>'
      +'<td class="td-mono" style="white-space:nowrap">'+(inv.receivedDate||'—')+'</td>'
      +'<td>'+typeBadge+'</td>'
      +'<td style="font-weight:500">'+payeeName+'</td>'
      +'<td style="color:var(--text2)">'+storeName2+'</td>'
      +'<td style="font-size:12px">'+breakdownHtml+'</td>'
      +'<td class="td-mono" style="text-align:right;font-weight:500;color:var(--accent)">¥'+total.toLocaleString()+'</td>'
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

function invTotalOf(inv){
  return inv.payeeType==='creator'
    ?(inv.makeFee||0)+(inv.crTransport||0)+(inv.other||0)
    :(inv.prFee||0)+(inv.transport||0)+(inv.food||0);
}
