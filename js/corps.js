var editingCorpId=null;

function openCorpModal(id){
  editingCorpId=id||null;
  var titleEl=document.getElementById('corpModalTitle');
  if(titleEl)titleEl.textContent=id?'法人を編集':'法人を追加';
  ['coName','coRep','coTel','coEmail','coAddress','coGenre','coMemo'].forEach(function(fid){
    var el=document.getElementById(fid);if(el)el.value='';
  });
  var ct=document.getElementById('coContractType');if(ct)ct.value='';
  if(id){
    var corp=DB.corporations.find(function(x){return x.id===id;});
    if(corp){
      var map={coName:'name',coRep:'rep',coTel:'tel',coEmail:'email',coAddress:'address',coGenre:'genre',coMemo:'memo',coContractType:'contractType'};
      Object.keys(map).forEach(function(fid){var el=document.getElementById(fid);if(el&&corp[map[fid]]!==undefined)el.value=corp[map[fid]]||'';});
    }
  }
  openModal('corpModal');
}

function saveCorp(){
  var name=document.getElementById('coName').value.trim();
  if(!name){alert('法人名を入力してください');return;}
  var isEdit=!!editingCorpId;
  var id=isEdit?editingCorpId:uid();
  var corp={
    id:id,
    name:name,
    rep:document.getElementById('coRep').value,
    tel:document.getElementById('coTel').value,
    email:document.getElementById('coEmail').value,
    address:document.getElementById('coAddress').value,
    genre:document.getElementById('coGenre').value,
    contractType:document.getElementById('coContractType').value,
    memo:document.getElementById('coMemo').value
  };
  if(isEdit){
    var idx=DB.corporations.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.corporations[idx]=corp;}else{DB.corporations.push(corp);}
  }else{
    DB.corporations.push(corp);
  }
  closeModal('corpModal');
  closeModal('corpDetailModal');
  refreshAll();
  saveItem('corporations',corp);
  updateCorpSelects();
}

function deleteCorp(id){
  if(!confirm('この法人を削除しますか？（店舗の法人紐づけは解除されます）'))return;
  DB.stores.forEach(function(s){if(s.corpId===id){s.corpId='';saveItem('stores',s);}});
  DB.corporations=DB.corporations.filter(function(c){return c.id!==id;});
  closeModal('corpDetailModal');
  refreshAll();
  deleteItem('corporations',id);
}

function updateCorpSelects(){
  var opts='<option value="">選択しない（個人・未設定）</option>'+DB.corporations.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('');
  var sCorp=document.getElementById('sCorpId');
  if(sCorp){var pv=sCorp.value;sCorp.innerHTML=opts;if(pv)sCorp.value=pv;}
  var slCorpSel=document.getElementById('sl-corp-select');
  if(slCorpSel){var pv2=slCorpSel.value;slCorpSel.innerHTML='<option value="">新規法人 / 個人</option>'+DB.corporations.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('');if(pv2)slCorpSel.value=pv2;}
  var nb=document.getElementById('nb-corps');
  if(nb)nb.textContent=DB.corporations.length;
}

function onCorpSelect(){
  var corpId=document.getElementById('sCorpId').value;
  if(!corpId)return;
  var corp=DB.corporations.find(function(x){return x.id===corpId;});
  if(!corp)return;
  /* 契約タブの連絡先に自動引用（空欄のときのみ） */
  var tel=document.getElementById('sContactTel');
  var email=document.getElementById('sContactEmail');
  if(tel&&!tel.value&&corp.tel)tel.value=corp.tel;
  if(email&&!email.value&&corp.email)email.value=corp.email;
}

function onSlCorpSelect(){
  var sel=document.getElementById('sl-corp-select');
  var inp=document.getElementById('sl-corp');
  if(!sel||!inp)return;
  if(sel.value){
    var corp=DB.corporations.find(function(x){return x.id===sel.value;});
    if(corp)inp.value=corp.name;
  }
}

function openCorpDetail(id){
  var corp=DB.corporations.find(function(x){return x.id===id;});
  if(!corp)return;
  var stores=DB.stores.filter(function(s){return s.corpId===id;});
  var active=stores.filter(function(s){return s.status==='active';});
  var totalRev=active.reduce(function(sum,s){return sum+(Number(s.monthlyFee)||0);},0);
  var editBtn=document.getElementById('corpDetailEditBtn');
  if(editBtn)editBtn.onclick=function(){closeModal('corpDetailModal');openCorpModal(id);};
  document.getElementById('corpDetailTitle').textContent=corp.name;
  document.getElementById('corpDetailBody').innerHTML=
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px">'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:22px;font-weight:500;font-family:"Noto Sans JP",sans-serif">'+stores.length+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">契約店舗数</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:22px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--green)">'+active.length+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">稼働中</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:15px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--accent)">'+totalRev.toLocaleString()+'円</div><div style="font-size:11px;color:var(--text3);margin-top:2px">月次売上</div></div>'
    +'</div>'
    +'<div class="grid2" style="margin-bottom:16px">'
      +'<div>'
        +(corp.rep?'<div style="font-size:13px;margin-bottom:4px">👤 '+esc(corp.rep)+'</div>':'')
        +(corp.tel?'<div style="font-size:13px;margin-bottom:4px">📱 '+esc(corp.tel)+'</div>':'')
        +(corp.email?'<div style="font-size:13px;margin-bottom:4px">✉ '+esc(corp.email)+'</div>':'')
      +'</div>'
      +'<div>'
        +(corp.address?'<div style="font-size:13px;margin-bottom:4px">📍 '+esc(corp.address)+'</div>':'')
        +(corp.genre?'<div style="font-size:13px;margin-bottom:4px">業種: '+esc(corp.genre)+'</div>':'')
        +(corp.contractType?'<div style="font-size:13px">契約: '+esc(corp.contractType)+'</div>':'')
      +'</div>'
    +'</div>'
    +(corp.memo?'<div style="padding:10px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px;margin-bottom:16px;white-space:pre-wrap">'+esc(corp.memo)+'</div>':'')
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">傘下店舗</div>'
    +(stores.length===0
      ?'<div class="empty-state" style="padding:12px">傘下店舗なし</div>'
      :'<div class="table-wrap"><table><thead><tr><th>店舗名</th><th>ステータス</th><th>プラン</th><th>月額</th><th>営業担当</th></tr></thead><tbody>'
        +stores.map(function(s){
          var plan=s.planId?DB.plans.find(function(x){return x.id===s.planId;}):null;
          return'<tr><td><span style="cursor:pointer;color:var(--accent)" onclick="closeModal(\'corpDetailModal\');setTimeout(function(){showDetail(\''+s.id+'\');},100)">'+esc(s.name)+'</span></td>'
            +'<td>'+statusBadge(s.status)+'</td>'
            +'<td style="font-size:13px">'+(plan?esc(plan.name):'—')+'</td>'
            +'<td class="td-mono">'+fmtMoney(s.monthlyFee)+'</td>'
            +'<td style="font-size:13px">'+esc(s.ourManager||'—')+'</td>'
            +'</tr>';
        }).join('')
        +'</tbody></table></div>'
    )
    +'<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">'
      +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">一括設定</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<select id="bulkPlanSel" style="font-size:13px;padding:4px 8px"><option value="">プランを選択...</option>'+DB.plans.map(function(p){return'<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join('')+'</select>'
        +'<button class="btn btn-sm" onclick="bulkApplyPlan(\''+id+'\')">全店舗に適用</button>'
        +'<select id="bulkMgrSel" style="font-size:13px;padding:4px 8px"><option value="">担当者を選択...</option>'+getActiveStaff('sales').map(function(p){return'<option value="'+esc(p.name)+'">'+esc(p.name)+'</option>';}).join('')+'</select>'
        +'<button class="btn btn-sm" onclick="bulkApplyManager(\''+id+'\')">全店舗に適用</button>'
      +'</div>'
    +'</div>'
    +'<div class="form-actions" style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">'
      +'<button class="btn-ghost-danger" onclick="deleteCorp(\''+id+'\')">削除</button>'
      +'<button class="btn" onclick="closeModal(\'corpDetailModal\')">閉じる</button>'
      +'<button class="btn btn-primary" onclick="closeModal(\'corpDetailModal\');openCorpModal(\''+id+'\')">編集</button>'
    +'</div>';
  openModal('corpDetailModal');
}

function bulkApplyPlan(corpId){
  var planId=document.getElementById('bulkPlanSel').value;
  if(!planId){alert('プランを選択してください');return;}
  var plan=DB.plans.find(function(x){return x.id===planId;});
  var stores=DB.stores.filter(function(s){return s.corpId===corpId;});
  if(!stores.length){alert('傘下店舗がありません');return;}
  if(!confirm(stores.length+'店舗のプランを「'+plan.name+'」に変更しますか？'))return;
  stores.forEach(function(s){
    s.planId=planId;
    if(plan.price)s.monthlyFee=plan.price;
    saveItem('stores',s);
  });
  refreshAll();
  openCorpDetail(corpId);
}
function bulkApplyManager(corpId){
  var mgr=document.getElementById('bulkMgrSel').value;
  if(!mgr){alert('担当者を選択してください');return;}
  var stores=DB.stores.filter(function(s){return s.corpId===corpId;});
  if(!stores.length){alert('傘下店舗がありません');return;}
  if(!confirm(stores.length+'店舗の担当者を「'+mgr+'」に変更しますか？'))return;
  stores.forEach(function(s){
    if(s.ourManager!==mgr){
      s.managerLog=s.managerLog||[];
      if(s.ourManager)s.managerLog.push({from:s.ourManager,to:mgr,at:new Date().toISOString()});
      s.ourManager=mgr;
      saveItem('stores',s);
    }
  });
  refreshAll();
  openCorpDetail(corpId);
}

function renderCorps(){
  if(!DB.corporations)DB.corporations=[];
  var tb=document.getElementById('corpTableBody');
  if(!tb)return;
  var nb=document.getElementById('nb-corps');
  if(nb)nb.textContent=DB.corporations.length;
  if(!DB.corporations.length){tb.innerHTML='<tr><td colspan="7" class="empty-state">法人が登録されていません</td></tr>';return;}
  tb.innerHTML=DB.corporations.map(function(corp){
    var stores=DB.stores.filter(function(s){return s.corpId===corp.id;});
    var active=stores.filter(function(s){return s.status==='active';});
    var totalRev=active.reduce(function(sum,s){return sum+(Number(s.monthlyFee)||0);},0);
    return'<tr style="cursor:pointer" onclick="openCorpDetail(\''+corp.id+'\')">'
      +'<td><div style="font-weight:500;color:var(--accent)">'+esc(corp.name)+'</div>'+(corp.genre?'<div style="font-size:11px;color:var(--text3)">'+esc(corp.genre)+'</div>':'')+'</td>'
      +'<td style="font-size:13px">'+esc(corp.rep||'—')+'</td>'
      +'<td style="font-size:13px;color:var(--text2)">'+esc(corp.tel||corp.email||'—')+'</td>'
      +'<td style="text-align:center;font-weight:500">'+stores.length+'</td>'
      +'<td style="text-align:center"><span style="color:var(--green);font-weight:500">'+active.length+'</span></td>'
      +'<td class="td-mono">'+fmtMoney(totalRev)+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="btn btn-sm" onclick="openCorpModal(\''+corp.id+'\')">編集</button></td>'
      +'</tr>';
  }).join('');
}


