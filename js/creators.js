var editingCreatorId=null;

var CR_STATUS_LABELS={none:'未依頼',requesting:'依頼中',scheduling:'日程調整中',confirmed:'来店確定',editing:'編集中',delivered:'納品済み',cancelled:'キャンセル'};
var CR_STATUS_BADGE={none:'b-gray',requesting:'b-blue',scheduling:'b-amber',confirmed:'b-green',editing:'b-purple',delivered:'b-green',cancelled:'b-red'};
function crStatusBadge(status,visitDate){
  if(!status)return'';
  var label=CR_STATUS_LABELS[status]||status;
  if(status==='confirmed'&&visitDate){label+=' '+fmtD(visitDate);}
  return'<span class="badge '+(CR_STATUS_BADGE[status]||'b-gray')+'">'+label+'</span>';
}
function onCreatorStatusChange(){
  var sel=document.getElementById('crStatus');
  var field=document.getElementById('crVisitDateField');
  if(!sel||!field)return;
  field.style.display=sel.value==='confirmed'?'':'none';
  if(sel.value==='confirmed'){
    makeDatePicker('crVisitDateWrap','crVisitDate',{yearFrom:2024,yearTo:new Date().getFullYear()+2,yearLabel:'年'});
  }
}
var CREATOR_SKILL_LABELS={crSkillPlan:'企画',crSkillShoot:'撮影',crSkillEdit:'編集',crSkillAnalyze:'投稿分析',crSkillFood:'外食知見',crSkillCooking:'料理撮影',crSkillStill:'フィード作成',crSkillComm:'コミュニケーション'};
var CREATOR_SKILL_VALS={'3':'◎','2':'○','1':'△','0':'✗','':''};
var FEED_SKILL_VALS={'3':'可','0':'不可','':''};
function skillValLabel(skillId,val){
  if(skillId==='crSkillStill')return FEED_SKILL_VALS[val]||'';
  return CREATOR_SKILL_VALS[val]||'';
}



function initDatePickers(){
  makeDatePicker('crBirthdayWrap','crBirthday',{yearFrom:1950,yearTo:new Date().getFullYear()-10,yearLabel:'年'});
  makeDatePicker('crInterviewDateWrap','crInterviewDate',{yearFrom:2020,yearTo:new Date().getFullYear()+1,yearLabel:'年'});
  makeDatePicker('sContractStartWrap','sContractStart',{yearFrom:2020,yearTo:new Date().getFullYear()+3,yearLabel:'年'});
  makeTimePicker24('sHoursFromWrap','sHoursFrom',function(){updateHoursData();});
  makeTimePicker24('sHoursToWrap','sHoursTo',function(){updateHoursData();});
}


function switchCreatorTab(idx){
  document.querySelectorAll('#creatorTabBtns .tab-btn').forEach(function(b,i){b.classList.toggle('active',i===idx);});
  [0,1,2,3].forEach(function(i){var el=document.getElementById('ctab'+i);if(el)el.classList.toggle('active',i===idx);});
}

function clearCreatorForm(){
  var fields=['crName','crRealName','crAddress','crArea','crReachTime','crTel','crEmail','crContact',
    'crEquipment','crSoftware','crSns','crPortfolio','crPhoto','crSpecialty',
    'crOrderPoint','crCondition','crDelivery','crImpression',
    'crGender','crBirthday','crInterviewDate','crInterviewer','crVisitDate'];
  var crStatusEl=document.getElementById('crStatus');if(crStatusEl)crStatusEl.value='';
  var crVField=document.getElementById('crVisitDateField');if(crVField)crVField.style.display='none';
  fields.forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  Object.keys(CREATOR_SKILL_LABELS).forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.querySelectorAll('input[name="crPromanage"]').forEach(function(r){r.checked=false;});
  var chkEl=document.getElementById('crInterviewerChecks');
  if(chkEl)chkEl.querySelectorAll('input[type=checkbox]').forEach(function(cb){cb.checked=false;});
}

function openCreatorModal(id){
  editingCreatorId=id||null;
  clearCreatorForm();
  var titleEl=document.getElementById('creatorModalTitle');
  if(titleEl)titleEl.textContent=id?'クリエイターを編集':'クリエイターを追加';
  if(id){
    var cr=DB.creators.find(function(x){return x.id===id;});
    if(cr){
      var textFields=['crName','crRealName','crAddress','crArea','crReachTime','crTel','crEmail','crContact',
        'crEquipment','crSoftware','crSns','crPortfolio','crPhoto','crSpecialty',
        'crOrderPoint','crCondition','crDelivery','crImpression'];
      textFields.forEach(function(fid){var el=document.getElementById(fid);if(el&&cr[fid]!==undefined)el.value=cr[fid]||'';});
      ['crGender'].forEach(function(fid){var el=document.getElementById(fid);if(el&&cr[fid])el.value=cr[fid];});
  var crSel=document.getElementById('crStatus');if(crSel)crSel.value=cr.crStatus||'';
  if(cr.crStatus==='confirmed'){
    var vf=document.getElementById('crVisitDateField');if(vf)vf.style.display='';
    makeDatePicker('crVisitDateWrap','crVisitDate',{yearFrom:2024,yearTo:new Date().getFullYear()+2,yearLabel:'年'});
    var vw=document.getElementById('crVisitDateWrap');if(vw&&vw._setDate)vw._setDate(cr.crVisitDate||'');
  }
      ['crBirthday','crInterviewDate'].forEach(function(fid){var el=document.getElementById(fid);if(el&&cr[fid])el.value=cr[fid];});
      Object.keys(CREATOR_SKILL_LABELS).forEach(function(fid){var el=document.getElementById(fid);if(el&&cr[fid]!==undefined)el.value=cr[fid];});
      if(cr.crPromanage){var r=document.querySelector('input[name="crPromanage"][value="'+cr.crPromanage+'"]');if(r)r.checked=true;}
    }
  }
  /* 面談担当者チェックボックス初期化 */
  var ivVal=id?(DB.creators.find(function(x){return x.id===id;})||{}).crInterviewer||'':'';
  renderInterviewerChecks(ivVal);
  switchCreatorTab(0);
  initDatePickers();
  /* 編集時: 生年月日と面接日を復元 */
  if(id){
    var _cr=DB.creators.find(function(x){return x.id===id;});
    if(_cr){
      var _bwrap=document.getElementById('crBirthdayWrap');if(_bwrap&&_bwrap._setDate)_bwrap._setDate(_cr.crBirthday||'');
      var _iwrap=document.getElementById('crInterviewDateWrap');if(_iwrap&&_iwrap._setDate)_iwrap._setDate(_cr.crInterviewDate||'');
    }
  }
  openModal('creatorModal');
}

function saveCreator(){
  var name=document.getElementById('crName').value.trim();
  if(!name){alert('活動名を入力してください');return;}
  var isEdit=!!editingCreatorId;
  var id=isEdit?editingCreatorId:uid();
  var proEl=document.querySelector('input[name="crPromanage"]:checked');
  var cr={id:id};
  ['crName','crRealName','crAddress','crArea','crReachTime','crTel','crEmail','crContact',
   'crEquipment','crSoftware','crSns','crPortfolio','crPhoto','crSpecialty',
   'crOrderPoint','crCondition','crDelivery','crImpression',
   'crGender','crBirthday','crInterviewDate','crVisitDate'].forEach(function(fid){
    var el=document.getElementById(fid);cr[fid]=el?el.value:'';
  });
  Object.keys(CREATOR_SKILL_LABELS).forEach(function(fid){
    var el=document.getElementById(fid);cr[fid]=el?el.value:'';
  });
  cr.crPromanage=proEl?proEl.value:'';
  var crSel=document.getElementById('crStatus');cr.crStatus=crSel?crSel.value:'';
  /* 面談担当者：チェックされた人を配列で保存 */
  var interviewerEl=document.getElementById('crInterviewerChecks');
  if(interviewerEl){
    var checked=Array.from(interviewerEl.querySelectorAll('input[type=checkbox]:checked')).map(function(cb){return cb.value;});
    cr.crInterviewer=checked.join(',');
    var hidEl=document.getElementById('crInterviewer');if(hidEl)hidEl.value=cr.crInterviewer;
  }
  if(isEdit){
    var idx=DB.creators.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.creators[idx]=cr;}else{DB.creators.push(cr);}
  }else{
    DB.creators.push(cr);
  }
  closeModal('creatorModal');
  closeModal('creatorDetailModal');
  refreshAll();
  saveItem('creators',cr);
}

function deleteCreator(id){
  if(!confirm('このクリエイターを削除しますか？'))return;
  DB.creators=DB.creators.filter(function(c){return c.id!==id;});
  closeModal('creatorDetailModal');
  refreshAll();
  deleteItem('creators',id);
}

function calcAge(birthday){
  if(!birthday)return null;
  var b=new Date(birthday),t=new Date();
  var age=t.getFullYear()-b.getFullYear();
  if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))age--;
  return age;
}

function skillBadge(fid,val){
  var m={'3':'b-green','2':'b-blue','1':'b-amber','0':'b-red'};
  if(fid==='crSkillStill'){m={'3':'b-green','0':'b-red'};}
  var l=skillValLabel(fid,val);
  if(!l)return'';
  return'<span class="badge '+(m[val]||'b-gray')+'">'+l+'</span>';
}

function openCreatorDetail(id){
  var cr=DB.creators.find(function(x){return x.id===id;});
  if(!cr)return;
  var age=calcAge(cr.crBirthday);
  var editBtn=document.getElementById('creatorDetailEditBtn');
  if(editBtn)editBtn.onclick=function(){closeModal('creatorDetailModal');openCreatorModal(id);};
  document.getElementById('creatorDetailTitle').textContent=cr.crName+(cr.crRealName?' ('+cr.crRealName+')':'');

  var proManageColors={yes:'b-green',no:'b-red',pending:'b-amber'};
  var proManageLabels={yes:'可',no:'不可',pending:'要相談'};

  var skillRows=Object.keys(CREATOR_SKILL_LABELS).map(function(fid){
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">'
      +'<span style="font-size:13px;color:var(--text2)">'+CREATOR_SKILL_LABELS[fid]+'</span>'
      +(cr[fid]!==undefined&&cr[fid]!==''?skillBadge(fid,cr[fid]):'<span style="font-size:12px;color:var(--text3)">—</span>')
    +'</div>';
  }).join('');

  var photoHtml=cr.crPhoto
    ?'<img src="'+esc(cr.crPhoto)+'" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0" onerror="this.style.display=&quot;none&quot;">'
    :'<div style="width:56px;height:56px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📷</div>';

  document.getElementById('creatorDetailBody').innerHTML=
    '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px">'
      +photoHtml
      +'<div style="flex:1">'
        +'<div style="font-size:17px;font-weight:500;margin-bottom:4px">'+esc(cr.crName)+'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
          +(cr.crGender?'<span class="badge b-gray">'+esc(cr.crGender)+'</span>':'')
          +(age!==null?'<span class="badge b-gray">'+age+'歳</span>':'')
          +(cr.crStatus?crStatusBadge(cr.crStatus,cr.crVisitDate):'')
          +(cr.crSpecialty?'<span class="badge b-blue">'+esc(cr.crSpecialty)+'</span>':'')
          +(cr.crPromanage?'<span class="badge '+proManageColors[cr.crPromanage]+'">プロマネ提出: '+proManageLabels[cr.crPromanage]+'</span>':'')
        +'</div>'
        +(cr.crArea?'<div style="font-size:13px;color:var(--text2);margin-top:6px">📍 '+esc(cr.crArea)+'</div>':'')
      +'</div>'
    +'</div>'

    +'<div class="grid2" style="margin-bottom:16px">'
      +'<div>'
        +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">連絡先</div>'
        +(cr.crTel?'<div style="font-size:13px;margin-bottom:4px">📱 '+esc(cr.crTel)+'</div>':'')
        +(cr.crEmail?'<div style="font-size:13px;margin-bottom:4px">✉ '+esc(cr.crEmail)+'</div>':'')
        +(cr.crContact?'<div style="font-size:13px;margin-bottom:4px;color:var(--text2)">'+esc(cr.crContact)+'</div>':'')
        +(cr.crReachTime?'<div style="font-size:12px;color:var(--text3)">連絡時間: '+esc(cr.crReachTime)+'</div>':'')
      +'</div>'
      +'<div>'
        +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">面談</div>'
        +(cr.crInterviewDate?'<div style="font-size:13px;margin-bottom:4px">日付: '+fmtD(cr.crInterviewDate)+'</div>':'')
        +(cr.crInterviewer?'<div style="font-size:13px;margin-bottom:4px">👥 '+esc(cr.crInterviewer.split(',').join(' / '))+'</div>':'')
        +(cr.crPortfolio?'<div style="font-size:13px"><a href="'+esc(cr.crPortfolio)+'" target="_blank" style="color:var(--accent)">ポートフォリオ ↗</a></div>':'')
      +'</div>'
    +'</div>'

    +'<div class="grid2" style="margin-bottom:16px">'
      +'<div>'
        +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">スキル</div>'
        +skillRows
      +'</div>'
      +'<div>'
        +(cr.crEquipment?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">機材</div><div style="font-size:13px;white-space:pre-wrap;color:var(--text2)">'+esc(cr.crEquipment)+'</div>':'')
        +(cr.crSoftware?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin:8px 0 4px">ソフト</div><div style="font-size:13px;color:var(--text2)">'+esc(cr.crSoftware)+'</div>':'')
        +(cr.crSns?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin:8px 0 4px">SNS</div><div style="font-size:13px;white-space:pre-wrap;color:var(--accent)">'+esc(cr.crSns)+'</div>':'')
      +'</div>'
    +'</div>'

    +(cr.crCondition||cr.crDelivery||cr.crOrderPoint
      ?'<div class="card-sm" style="margin-bottom:12px">'
        +(cr.crOrderPoint?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:4px">発注ポイント</div><div style="font-size:13px;white-space:pre-wrap;margin-bottom:8px">'+esc(cr.crOrderPoint)+'</div>':'')
        +(cr.crCondition?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:4px">条件</div><div style="font-size:13px;white-space:pre-wrap;margin-bottom:8px">'+esc(cr.crCondition)+'</div>':'')
        +(cr.crDelivery?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:4px">納品スケジュール</div><div style="font-size:13px">'+esc(cr.crDelivery)+'</div>':'')
      +'</div>'
      :'')

    +(cr.crImpression
      ?'<div style="padding:10px 12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--r);font-size:13px;white-space:pre-wrap;line-height:1.7;margin-bottom:12px">'+esc(cr.crImpression)+'</div>'
      :'')


    /* 撮影履歴 */
    +(function(){
      var shoots=DB.posts.filter(function(p){return p.type==='shooting'&&p.creatorId===id;})
        .sort(function(a,b){return new Date(b.date)-new Date(a.date);});
      if(!shoots.length)return'';
      return'<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">'
        +'<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">📷 撮影履歴</div>'
        +shoots.map(function(p){
          var sName=storeName(p.storeId);
          return'<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg3);border-radius:var(--r);margin-bottom:4px">'
            +'<span style="font-size:13px;font-weight:500;color:var(--accent)">'+fmtD((p.date||'').split('T')[0])+'</span>'
            +'<span style="font-size:13px;color:var(--text2);flex:1">'+esc(sName)+'</span>'
            +(p.note?'<span style="font-size:12px;color:var(--text3)">'+esc(p.note)+'</span>':'')
            +'</div>';
        }).join('')
        +'</div>';
    })()

    +'<div class="form-actions" style="border-top:1px solid var(--border);margin-top:4px;padding-top:14px">'
      +'<button class="btn-ghost-danger" onclick="deleteCreator(\''+id+'\')">削除</button>'
      +'<button class="btn" onclick="closeModal(\'creatorDetailModal\')">閉じる</button>'
      +'<button class="btn btn-primary" onclick="closeModal(\'creatorDetailModal\');openCreatorModal(\''+id+'\')">編集</button>'
    +'</div>';

  openModal('creatorDetailModal');
}

function renderCreators(){
  if(!DB.creators)DB.creators=[];
  var tb=document.getElementById('creatorTableBody');
  if(!tb)return;
  if(!DB.creators.length){tb.innerHTML='<tr><td colspan="8" class="empty-state">クリエイターが登録されていません</td></tr>';return;}
  var nb=document.getElementById('nb-creators');
  if(nb)nb.textContent=DB.creators.length;
  tb.innerHTML=DB.creators.map(function(cr){
    var age=calcAge(cr.crBirthday);
    var topSkills=Object.keys(CREATOR_SKILL_LABELS).filter(function(k){return cr[k]==='3';}).map(function(k){return CREATOR_SKILL_LABELS[k];}).slice(0,3);
    var proColors={yes:'b-green',no:'b-red',pending:'b-amber'};
    var proLabels={yes:'可',no:'不可',pending:'要相談'};
    return'<tr style="cursor:pointer" onclick="openCreatorDetail(\''+cr.id+'\')">'
      +'<td><div style="font-weight:500;color:var(--accent)">'+esc(cr.crName)+'</div>'+(age?'<div style="font-size:11px;color:var(--text3)">'+age+'歳</div>':'')+'</td>'
      +'<td>'+(cr.crGender?'<span class="badge b-gray">'+esc(cr.crGender)+'</span>':'—')+'</td>'
      +'<td style="font-size:13px;color:var(--text2)">'+esc(cr.crArea||'—')+'</td>'
      +'<td>'+topSkills.map(function(s){return'<span class="badge b-blue" style="margin-right:2px">'+esc(s)+'</span>';}).join('')+'</td>'
      +'<td style="font-size:13px">'+(cr.crInterviewDate?fmtD(cr.crInterviewDate):'—')+'</td>'
      +'<td>'+(cr.crPromanage?'<span class="badge '+proColors[cr.crPromanage]+'">'+proLabels[cr.crPromanage]+'</span>':'—')+'</td>'
      +'<td style="font-size:12px;color:var(--text2);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(cr.crTel||cr.crEmail||'—')+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap"><button class="btn btn-sm" style="margin-right:4px" onclick="openCreatorModal(\''+cr.id+'\')">編集</button><button class="btn-ghost-danger" onclick="deleteCreator(\''+cr.id+'\')">削除</button></td>'
      +'</tr>';
  }).join('');
}


/* ============================================================
   法人管理（Corporations）
   ============================================================ */
