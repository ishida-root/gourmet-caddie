function onPlanSelect(){
  showPlanPreview();
  var pid=document.getElementById('sPlanId').value;
  if(!pid)return;
  var p=DB.plans.find(function(x){return x.id===pid;});
  if(p&&p.price){
    var discEl=document.getElementById('sDiscountPercent');
    var pct=discEl?Number(discEl.value)||0:0;
    document.getElementById('sMonthlyFee').value=pct?Math.round(p.price*(1-pct/100)):p.price;
  }
}
function showPlanPreview(){
  var pid=document.getElementById('sPlanId').value;
  var el=document.getElementById('sPlanPreview');
  if(!pid){el.textContent='';return;}
  var p=DB.plans.find(function(x){return x.id===pid;});
  if(p){
    var discEl=document.getElementById('sDiscountPercent');
    var pct=discEl?Number(discEl.value)||0:0;
    var priceStr=pct?'<s style="color:var(--text3)">'+fmtMoney(p.price)+'</s> '+fmtMoney(Math.round(p.price*(1-pct/100)))+'（'+pct+'%引き）':fmtMoney(p.price);
    el.innerHTML='月額 <strong>'+priceStr+'</strong>'+(p.setup?' / 初期 '+fmtMoney(p.setup):'')+(p.adBudget?' / 広告費 '+fmtMoney(p.adBudget)+'含む':'')+(p.desc?' — '+esc(p.desc.slice(0,40)):'');
  }
}
function toggleOpenPrice(){
  var chk=document.getElementById('plOpenPrice');
  var priceEl=document.getElementById('plPrice');
  if(chk&&priceEl){
    priceEl.placeholder=chk.checked?'304000（下限）':'100000';
  }
}

/* プラン名から初期値を自動入力 */
document.addEventListener('DOMContentLoaded',function(){
  var plNameEl=document.getElementById('plName');
  if(plNameEl){
    plNameEl.addEventListener('change',function(){
      var defaults={
        'パター':{price:100000,setup:100000,adBudget:40000},
        'ウェッジ':{price:200000,setup:100000,adBudget:100000},
        'アイアン':{price:304000,setup:120000,adBudget:120000},
        'ドライバー':{price:304000,setup:120000,adBudget:120000}
      };
      var d=defaults[this.value];
      if(d){
        var pe=document.getElementById('plPrice');var se=document.getElementById('plSetup');var ae=document.getElementById('plAdBudget');
        if(pe&&!pe.value)pe.value=d.price;
        if(se&&!se.value)se.value=d.setup;
        if(ae&&!ae.value)ae.value=d.adBudget;
        if(this.value==='ドライバー'){
          var chk=document.getElementById('plOpenPrice');if(chk)chk.checked=true;
          toggleOpenPrice();
        }
      }
    });
  }
});

var PLAN_ORDER={'パター':1,'ウェッジ':2,'アイアン':3,'ドライバー':4};
var PLAN_BADGE={'パター':'b-gray','ウェッジ':'b-blue','アイアン':'b-purple','ドライバー':'b-green'};

function savePlan(){
  var nameEl=document.getElementById('plName');
  var name=nameEl?nameEl.value.trim():'';
  if(!name){alert('プランを選択してください');return;}
  var price=document.getElementById('plPrice').value;
  var setup=document.getElementById('plSetup').value;
  var adBudget=document.getElementById('plAdBudget').value;
  var openPrice=document.getElementById('plOpenPrice').checked;
  var desc=document.getElementById('plDesc').value;
  var p={
    id:uid(),
    name:name,
    price:price,
    setup:setup,
    adBudget:adBudget,
    openPrice:openPrice,
    desc:desc
  };
  DB.plans.push(p);
  nameEl.value='';
  document.getElementById('plPrice').value='';
  document.getElementById('plSetup').value='';
  document.getElementById('plAdBudget').value='';
  document.getElementById('plOpenPrice').checked=false;
  document.getElementById('plDesc').value='';
  renderPlans();
  renderRevSummary();
  var nb=document.getElementById('nb-plans');if(nb)nb.textContent=DB.plans.length;
  saveItem('plans',p);
}

function deletePlan(id){
  if(!confirm('このプランを削除しますか？（店舗への紐づけは解除されます）'))return;
  DB.stores.forEach(function(s){if(s.planId===id){s.planId='';saveItem('stores',s);}});
  DB.plans=DB.plans.filter(function(p){return p.id!==id;});
  renderPlans();renderRevSummary();
  var nb=document.getElementById('nb-plans');if(nb)nb.textContent=DB.plans.length;
  deleteItem('plans',id);
}

function renderPlans(){
  var tb=document.getElementById('planTableBody');
  if(!tb)return;
  if(!DB.plans.length){
    tb.innerHTML='<tr><td colspan="8" class="empty-state">プランがありません<br><span style="font-size:12px;color:var(--text3)">パター・ウェッジ・アイアン・ドライバーの順に登録してください</span></td></tr>';
    return;
  }
  var sorted=DB.plans.slice().sort(function(a,b){
    return(PLAN_ORDER[a.name]||9)-(PLAN_ORDER[b.name]||9);
  });
  tb.innerHTML=sorted.map(function(p){
    var count=DB.stores.filter(function(s){return s.planId===p.id;}).length;
    var priceStr=p.openPrice
      ?fmtMoney(p.price)+'〜（応相談）'
      :fmtMoney(p.price);
    return'<tr>'
      +'<td><span class="badge '+(PLAN_BADGE[p.name]||'b-gray')+'">'+esc(p.name)+'</span></td>'
      +'<td class="td-mono" style="font-size:14px;font-weight:500;color:var(--text)">'+priceStr+'</td>'
      +'<td class="td-mono" style="color:var(--text2)">'+(p.adBudget?fmtMoney(p.adBudget):'—')+'</td>'
      +'<td class="td-mono">'+fmtMoney(p.setup)+'</td>'
      +'<td style="text-align:center">'+(p.openPrice?'<span class="badge b-amber">応相談</span>':'—')+'</td>'
      +'<td style="text-align:center"><span style="font-size:14px;font-weight:500;color:var(--accent)">'+count+'</span></td>'
      +'<td style="color:var(--text3);max-width:160px">'+esc((p.desc||'').slice(0,50))+'</td>'
      +'<td><button class="btn-ghost-danger" onclick="deletePlan(\''+p.id+'\')">削除</button></td>'
      +'</tr>';
  }).join('');
  /* 店舗登録のプランselectも更新 */
  updatePlanSelect();
}

function updatePlanSelect(){
  var sel=document.getElementById('sPlanId');
  if(!sel)return;
  var prev=sel.value;
  var sorted=DB.plans.slice().sort(function(a,b){return(PLAN_ORDER[a.name]||9)-(PLAN_ORDER[b.name]||9);});
  sel.innerHTML='<option value="">選択...</option>'+sorted.map(function(p){
    var label=p.name+(p.openPrice?' (応相談)':'');
    return'<option value="'+p.id+'">'+esc(label)+'</option>';
  }).join('');
  if(prev)sel.value=prev;
}
function renderRevSummary(){
  var el=document.getElementById('revSummary');
  if(!el)return;
  var active=DB.stores.filter(function(s){return s.status==='active';});
  var totalMonthly=active.reduce(function(sum,s){return sum+(Number(s.monthlyFee)||0);},0);
  var byPlan={};
  active.forEach(function(s){
    var key=s.planId?s.planId:'none';
    if(!byPlan[key])byPlan[key]={count:0,revenue:0};
    byPlan[key].count++;
    byPlan[key].revenue+=Number(s.monthlyFee)||0;
  });
  var rows=Object.keys(byPlan).sort(function(a,b){
    var pa=DB.plans.find(function(x){return x.id===a;}),pb=DB.plans.find(function(x){return x.id===b;});
    return(PLAN_ORDER[(pa||{}).name]||9)-(PLAN_ORDER[(pb||{}).name]||9);
  }).map(function(pid){
    var p=DB.plans.find(function(x){return x.id===pid;});
    var label=p?p.name:'プランなし';
    var d=byPlan[pid];
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:13px;font-weight:400">'+esc(label)+'</div><div style="font-size:12px;color:var(--text3)">'+d.count+'店舗</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:500;font-family:"Noto Sans JP",sans-serif">'+fmtMoney(d.revenue)+'</div><div style="font-size:11px;color:var(--text3)">/月</div></div></div>';
  }).join('');
  el.innerHTML='<div style="padding-bottom:10px;margin-bottom:10px;border-bottom:2px solid var(--border)"><div style="font-size:12px;color:var(--text3);margin-bottom:2px">稼働中 月次合計</div><div style="font-size:24px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--accent)">'+fmtMoney(totalMonthly)+'</div><div style="font-size:12px;color:var(--text3)">'+active.length+'店舗</div></div>'+rows+(rows?'':'<div class="empty-state" style="padding:16px">稼働中の店舗がありません</div>');
}
