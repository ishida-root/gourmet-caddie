var editingFaqId=null;
var FAQ_CATEGORIES=['支払い','契約','素材','運用','その他'];
var FAQ_SEED=[
  {q:'お支払い方法について',a:'お支払い方法は口座振替・請求書払いの2種類からお選びいただけます。特にご指定がない場合は、原則として口座振替にてご案内しております。',category:'支払い'},
  {q:'お支払いのタイミングについて',a:'弊社は前払い制を採用しており、ご利用月の前月末にお引き落としとなります。例えば8月からのご運用開始の場合、7月末のお引き落としとなります。',category:'支払い'},
  {q:'お引き落としのご案内メールは毎月届きますか？',a:'はい、お引き落としの都度、毎月ご案内メールをお送りしております。',category:'支払い'},
  {q:'広告費のお支払いはお客様のカードになりますか？',a:'いいえ、広告費のお支払いは弊社にて代行いたします。ご契約プランに広告費が含まれておりますので、お客様のご負担は発生いたしません。',category:'支払い'},
  {q:'撮影素材をいただくことは可能ですか？',a:'二次利用費をお支払いいただくことで、撮影素材をお渡しすることが可能です。なお、継続してご契約いただいている案件につきましては、無償でのお渡しも可能な場合がございますので、お気軽にご相談ください。',category:'素材'}
];
/* 旧文言（初回リリース時の表現）→ 新文言への一度きりの置き換え。
   既にユーザーが編集した内容は上書きしないよう、旧文言と完全一致する場合のみ更新する。 */
var FAQ_WORDING_MIGRATIONS=[
  {oldQ:'支払方法について',oldA:'口座振替または請求書払いをお選びいただけます。\nお申し入れがない限り基本的には口座振替でご案内いたします。',newQ:'お支払い方法について',newA:'お支払い方法は口座振替・請求書払いの2種類からお選びいただけます。特にご指定がない場合は、原則として口座振替にてご案内しております。',newCategory:'支払い'},
  {oldQ:'支払いタイミングについて',oldA:'弊社は前払いのため、例えば8月運用開始の場合は7月末に引き落とされます。',newQ:'お支払いのタイミングについて',newA:'弊社は前払い制を採用しており、ご利用月の前月末にお引き落としとなります。例えば8月からのご運用開始の場合、7月末のお引き落としとなります。',newCategory:'支払い'},
  {oldQ:'引き落としのメールは毎月届きますか？',oldA:'はい。毎月送付いたします。',newQ:'お引き落としのご案内メールは毎月届きますか？',newA:'はい、お引き落としの都度、毎月ご案内メールをお送りしております。',newCategory:'支払い'},
  {oldQ:'広告費の決済は自分のカードになるんですか？',oldA:'いいえ。弊社でお支払いいたします。広告費はプランに含まれております。',newQ:'広告費のお支払いはお客様のカードになりますか？',newA:'いいえ、広告費のお支払いは弊社にて代行いたします。ご契約プランに広告費が含まれておりますので、お客様のご負担は発生いたしません。',newCategory:'支払い'},
  {oldQ:'撮影素材が欲しいです。くれますか？',oldA:'二次利用費をお支払いいただければ、お渡し可能です。（継続案件の場合無償お渡しも可能。要相談）',newQ:'撮影素材をいただくことは可能ですか？',newA:'二次利用費をお支払いいただくことで、撮影素材をお渡しすることが可能です。なお、継続してご契約いただいている案件につきましては、無償でのお渡しも可能な場合がございますので、お気軽にご相談ください。',newCategory:'素材'}
];
var _faqSeeded=false;
var _faqMigrated=false;
function seedFaqsIfEmpty(){
  if(_faqSeeded)return;
  _faqSeeded=true;
  if(!DB.faqs)DB.faqs=[];
  if(DB.faqs.length)return;
  FAQ_SEED.forEach(function(item){
    var f={id:uid(),question:item.q,answer:item.a,category:item.category||''};
    DB.faqs.push(f);
    saveItem('faqs',f);
  });
}
function migrateFaqWording(){
  if(_faqMigrated)return;
  _faqMigrated=true;
  if(!DB.faqs)return;
  DB.faqs.forEach(function(f){
    var m=FAQ_WORDING_MIGRATIONS.find(function(x){return x.oldQ===f.question&&x.oldA===f.answer;});
    if(m){
      f.question=m.newQ;f.answer=m.newA;if(!f.category)f.category=m.newCategory;
      saveItem('faqs',f);
    }
  });
}

function openFaqModal(id){
  editingFaqId=id||null;
  var titleEl=document.getElementById('faqModalTitle');
  if(titleEl)titleEl.textContent=id?'Q&Aを編集':'Q&Aを追加';
  document.getElementById('faqQuestion').value='';
  document.getElementById('faqCategory').value='';
  document.getElementById('faqAnswer').value='';
  if(id){
    var f=DB.faqs.find(function(x){return x.id===id;});
    if(f){
      document.getElementById('faqQuestion').value=f.question||'';
      document.getElementById('faqCategory').value=f.category||'';
      document.getElementById('faqAnswer').value=f.answer||'';
      if(titleEl&&!f.answer)titleEl.textContent='質問に回答する';
    }
  }
  openModal('faqModal');
}

function saveFaq(){
  var q=document.getElementById('faqQuestion').value.trim();
  var category=document.getElementById('faqCategory').value.trim();
  var a=document.getElementById('faqAnswer').value.trim();
  if(!q){alert('質問を入力してください');return;}
  if(!a){alert('回答を入力してください');return;}
  var isEdit=!!editingFaqId;
  var id=isEdit?editingFaqId:uid();
  var prev=isEdit?DB.faqs.find(function(x){return x.id===id;}):null;
  var f={id:id,question:q,category:category,answer:a,askedBy:prev?prev.askedBy:'',createdAt:prev?prev.createdAt:new Date().toISOString()};
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

/* ---- 質問箱（営業からの質問投稿） ---- */
function openAskFaqModal(){
  document.getElementById('askFaqQuestion').value='';
  document.getElementById('askFaqCategory').value='';
  openModal('askFaqModal');
}

function submitFaqQuestion(){
  var q=document.getElementById('askFaqQuestion').value.trim();
  if(!q){alert('質問内容を入力してください');return;}
  var category=document.getElementById('askFaqCategory').value.trim();
  var askedBy=(currentUser&&currentUser.email)?currentUser.email.split('@')[0]:'';
  var f={id:uid(),question:q,category:category,answer:'',askedBy:askedBy,createdAt:new Date().toISOString()};
  if(!DB.faqs)DB.faqs=[];
  DB.faqs.push(f);
  closeModal('askFaqModal');
  refreshAll();
  saveItem('faqs',f);
  if(typeof notifyFaqQuestion==='function'){
    notifyFaqQuestion(q,askedBy,category).catch(function(){});
  }
}

function renderFaqCategoryOptions(){
  var used=(DB.faqs||[]).map(function(f){return f.category;}).filter(Boolean);
  var all=[...new Set(FAQ_CATEGORIES.concat(used))];
  var dl=document.getElementById('faqCategoryList');
  if(dl)dl.innerHTML=all.map(function(c){return'<option value="'+esc(c)+'">';}).join('');
  var filterEl=document.getElementById('faqCategoryFilter');
  if(filterEl){
    var cur=filterEl.value;
    filterEl.innerHTML='<option value="">全カテゴリ</option>'+all.map(function(c){return'<option value="'+esc(c)+'"'+(c===cur?' selected':'')+'>'+esc(c)+'</option>';}).join('');
  }
}

function renderFaqs(){
  if(!DB.faqs)DB.faqs=[];
  seedFaqsIfEmpty();
  migrateFaqWording();
  var badgeEl=document.getElementById('nb-faq');
  if(badgeEl)badgeEl.textContent=DB.faqs.length;
  renderFaqCategoryOptions();
  var searchEl=document.getElementById('faqSearch');
  var search=(searchEl?searchEl.value:'').toLowerCase();
  var catFilter=(document.getElementById('faqCategoryFilter')||{}).value||'';
  var list=DB.faqs.slice();
  if(search)list=list.filter(function(f){
    return(f.question||'').toLowerCase().includes(search)||(f.answer||'').toLowerCase().includes(search)||(f.category||'').toLowerCase().includes(search);
  });
  if(catFilter)list=list.filter(function(f){return f.category===catFilter;});
  /* 未回答を先頭に、それ以外は元の並び順を維持 */
  list=list.map(function(f,i){return{f:f,i:i};}).sort(function(a,b){
    var au=a.f.answer?1:0,bu=b.f.answer?1:0;
    return au-bu||a.i-b.i;
  }).map(function(x){return x.f;});
  var el=document.getElementById('faqListBody');
  if(!el)return;
  if(!list.length){
    el.innerHTML='<div class="empty-state" style="padding:20px">Q&amp;Aがまだ登録されていません</div>';
    return;
  }
  el.innerHTML=list.map(function(f){
    var unanswered=!f.answer;
    var catBadge=f.category?'<span class="badge b-gray" style="font-size:11px;margin-left:6px">'+esc(f.category)+'</span>':'';
    var statusBadge=unanswered
      ?'<span class="badge" style="font-size:11px;margin-left:6px;background:var(--red-bg);color:var(--red);border:1px solid var(--red-border)">未回答</span>'
      :'';
    var askedLine=(unanswered&&f.askedBy)?'<div style="font-size:11px;color:var(--text3);margin-top:4px">質問者：'+esc(f.askedBy)+'</div>':'';
    var answerHtml=unanswered
      ?'<div style="font-size:13px;color:var(--text3);margin-top:6px;font-style:italic">まだ回答がありません</div>'
      :'<div style="font-size:13px;color:var(--text2);margin-top:6px;white-space:pre-wrap;line-height:1.6">'+esc(f.answer)+'</div>';
    return'<div style="padding:14px;border-bottom:1px solid var(--border)'+(unanswered?';background:var(--red-bg)':'')+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:14px;font-weight:500;color:var(--text)">'+esc(f.question)+catBadge+statusBadge+'</div>'
          +askedLine
          +answerHtml
        +'</div>'
        +'<div style="display:flex;gap:4px;flex-shrink:0">'
          +'<button class="btn btn-sm" onclick="openFaqModal(\''+f.id+'\')">'+(unanswered?'回答する':'編集')+'</button>'
          +'<button class="btn-ghost-danger" onclick="deleteFaq(\''+f.id+'\')">削除</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }).join('');
}
