var editingInvoiceId=null;

function openInvoiceModal(id,opts){
  editingInvoiceId=id||null;
  var titleEl=document.getElementById('invoiceModalTitle');
  if(titleEl)titleEl.textContent=id?'請求書を編集':'請求書を追加';
  /* セレクト初期化 */
  var infSel=document.getElementById('invInfId');
  infSel.innerHTML='<option value="">選択...</option>'+DB.influencers.map(function(i){return'<option value="'+i.id+'">'+esc(i.name)+(i.handle?' ('+i.handle+')':'')+'</option>';}).join('');
  var storeSel=document.getElementById('invStoreId');
  storeSel.innerHTML='<option value="">選択...</option>'+DB.stores.map(function(s){return'<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');
  /* フォームリセット */
  ['invPrFee','invTransport','invFood','invNote'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
  document.getElementById('invReceivedDate').value='';
  document.getElementById('invStatus').value='pending';
  document.getElementById('invTotal').textContent='¥0';
  document.getElementById('invCastingId').value='';
  if(id){
    var inv=DB.invoices.find(function(x){return x.id===id;});
    if(inv){
      infSel.value=inv.infId||'';
      storeSel.value=inv.storeId||'';
      document.getElementById('invReceivedDate').value=inv.receivedDate||'';
      document.getElementById('invStatus').value=inv.status||'pending';
      document.getElementById('invPrFee').value=inv.prFee||'';
      document.getElementById('invTransport').value=inv.transport||'';
      document.getElementById('invFood').value=inv.food||'';
      document.getElementById('invNote').value=inv.note||'';
      document.getElementById('invCastingId').value=inv.castingId||'';
      calcInvTotal();
    }
  }
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

function calcInvTotal(){
  var pr=Number(document.getElementById('invPrFee').value)||0;
  var tr=Number(document.getElementById('invTransport').value)||0;
  var fd=Number(document.getElementById('invFood').value)||0;
  document.getElementById('invTotal').textContent='¥'+(pr+tr+fd).toLocaleString();
}

function saveInvoice(){
  var castingId=document.getElementById('invCastingId').value||null;
  var infId=document.getElementById('invInfId').value;
  /* キャスティングリンク時: castingのinfId/storeIdを補完 */
  var storeId=document.getElementById('invStoreId').value;
  if(castingId){
    var lc=DB.castings.find(function(x){return x.id===castingId;});
    if(lc){if(!infId)infId=lc.infId;if(!storeId)storeId=lc.storeId;}
  }
  if(!infId){alert('インフルエンサーを選択してください');return;}
  var isEdit=!!editingInvoiceId;
  var id=isEdit?editingInvoiceId:uid();
  var inv={
    id:id,
    infId:infId,
    storeId:storeId,
    castingId:castingId,
    receivedDate:document.getElementById('invReceivedDate').value,
    status:document.getElementById('invStatus').value,
    prFee:Number(document.getElementById('invPrFee').value)||0,
    transport:Number(document.getElementById('invTransport').value)||0,
    food:Number(document.getElementById('invFood').value)||0,
    note:document.getElementById('invNote').value
  };
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
  var totalPr=0,totalTr=0,totalFd=0;
  list.forEach(function(inv){totalPr+=inv.prFee||0;totalTr+=inv.transport||0;totalFd+=inv.food||0;});
  var setVal=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setVal('acc-count',list.length);
  setVal('acc-pr','¥'+totalPr.toLocaleString());
  setVal('acc-transport','¥'+totalTr.toLocaleString());
  setVal('acc-food','¥'+totalFd.toLocaleString());

  var tb=document.getElementById('accBody');
  if(!tb)return;
  if(!list.length){tb.innerHTML='<tr><td colspan="10" class="empty-state">請求書記録がありません</td></tr>';return;}
  tb.innerHTML=list.map(function(inv){
    var infName2=inv.infId?(function(){var i=DB.influencers.find(function(x){return x.id===inv.infId;});return i?esc(i.name):'—';})():'—';
    var storeName2=inv.storeId?(function(){var s=DB.stores.find(function(x){return x.id===inv.storeId;});return s?esc(s.name):'—';})():'—';
    var total=(inv.prFee||0)+(inv.transport||0)+(inv.food||0);
    var statusBadge2=inv.status==='received'
      ?'<span class="badge b-green">✓ 受領済み</span>'
      :'<span class="badge b-amber">未受領</span>';
    return'<tr>'
      +'<td class="td-mono" style="white-space:nowrap">'+(inv.receivedDate||'—')+'</td>'
      +'<td style="font-weight:500">'+infName2+'</td>'
      +'<td style="color:var(--text2)">'+storeName2+'</td>'
      +'<td class="td-mono" style="text-align:right">'+(inv.prFee?'¥'+Number(inv.prFee).toLocaleString():'—')+'</td>'
      +'<td class="td-mono" style="text-align:right">'+(inv.transport?'¥'+Number(inv.transport).toLocaleString():'—')+'</td>'
      +'<td class="td-mono" style="text-align:right">'+(inv.food?'¥'+Number(inv.food).toLocaleString():'—')+'</td>'
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
