var editingFaqId=null;
var FAQ_SEED=[
  {q:'支払方法について',a:'口座振替または請求書払いをお選びいただけます。\nお申し入れがない限り基本的には口座振替でご案内いたします。'},
  {q:'支払いタイミングについて',a:'弊社は前払いのため、例えば8月運用開始の場合は7月末に引き落とされます。'},
  {q:'引き落としのメールは毎月届きますか？',a:'はい。毎月送付いたします。'},
  {q:'広告費の決済は自分のカードになるんですか？',a:'いいえ。弊社でお支払いいたします。広告費はプランに含まれております。'},
  {q:'撮影素材が欲しいです。くれますか？',a:'二次利用費をお支払いいただければ、お渡し可能です。（継続案件の場合無償お渡しも可能。要相談）'}
];
var _faqSeeded=false;
function seedFaqsIfEmpty(){
  if(_faqSeeded)return;
  _faqSeeded=true;
  if(!DB.faqs)DB.faqs=[];
  if(DB.faqs.length)return;
  FAQ_SEED.forEach(function(item){
    var f={id:uid(),question:item.q,answer:item.a};
    DB.faqs.push(f);
    saveItem('faqs',f);
  });
}

function openFaqModal(id){
  editingFaqId=id||null;
  var titleEl=document.getElementById('faqModalTitle');
  if(titleEl)titleEl.textContent=id?'Q&Aを編集':'Q&Aを追加';
  document.getElementById('faqQuestion').value='';
  document.getElementById('faqAnswer').value='';
  if(id){
    var f=DB.faqs.find(function(x){return x.id===id;});
    if(f){
      document.getElementById('faqQuestion').value=f.question||'';
      document.getElementById('faqAnswer').value=f.answer||'';
    }
  }
  openModal('faqModal');
}

function saveFaq(){
  var q=document.getElementById('faqQuestion').value.trim();
  var a=document.getElementById('faqAnswer').value.trim();
  if(!q){alert('質問を入力してください');return;}
  if(!a){alert('回答を入力してください');return;}
  var isEdit=!!editingFaqId;
  var id=isEdit?editingFaqId:uid();
  var f={id:id,question:q,answer:a};
  if(!DB.faqs)DB.faqs=[];
  if(isEdit){
    var idx=DB.faqs.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.faqs[idx]=f;}else{DB.faqs.push(f);}
  }else{
    DB.faqs.push(f);
  }
  closeModal('faqModal');
  refreshAll();
  saveItem('faqs',f);
}

function deleteFaq(id){
  if(!confirm('このQ&Aを削除しますか？'))return;
  DB.faqs=DB.faqs.filter(function(x){return x.id!==id;});
  refreshAll();
  deleteItem('faqs',id);
}

function renderFaqs(){
  if(!DB.faqs)DB.faqs=[];
  seedFaqsIfEmpty();
  var badgeEl=document.getElementById('nb-faq');
  if(badgeEl)badgeEl.textContent=DB.faqs.length;
  var searchEl=document.getElementById('globalSearch');
  var search=(searchEl?searchEl.value:'').toLowerCase();
  var list=DB.faqs.slice();
  if(search)list=list.filter(function(f){
    return(f.question||'').toLowerCase().includes(search)||(f.answer||'').toLowerCase().includes(search);
  });
  var el=document.getElementById('faqListBody');
  if(!el)return;
  if(!list.length){
    el.innerHTML='<div class="empty-state" style="padding:20px">Q&amp;Aがまだ登録されていません</div>';
    return;
  }
  el.innerHTML=list.map(function(f,idx){
    return'<div style="padding:14px;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:14px;font-weight:500;color:var(--text)">Q'+(idx+1)+'. '+esc(f.question)+'</div>'
          +'<div style="font-size:13px;color:var(--text2);margin-top:6px;white-space:pre-wrap;line-height:1.6">'+esc(f.answer)+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:4px;flex-shrink:0">'
          +'<button class="btn btn-sm" onclick="openFaqModal(\''+f.id+'\')">編集</button>'
          +'<button class="btn-ghost-danger" onclick="deleteFaq(\''+f.id+'\')">削除</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}
