function updateSalesPlanSelect(){
  var sel=document.getElementById('sl-plan');
  if(!sel)return;
  sel.innerHTML='<option value="">選択...</option>'+DB.plans.map(function(p){return'<option value="'+p.id+'">'+esc(p.name)+(p.price?' — '+fmtMoney(p.price):'')+'</option>';}).join('');
}
function submitSalesForm(){
  /* 必須チェック */
  var REQUIRED=[
    ['sl-contract-type','契約区分'],
    ['sl-name','店舗名'],
    ['sl-corp','法人名（個人事業主名）'],
    ['sl-zip','郵便番号'],
    ['sl-area','本社登記住所（市区町村・番地）'],
    ['sl-corp-tel','代表電話番号'],
    ['sl-contact','申込担当者氏名'],
    ['sl-contact-kana','申込担当者フリガナ'],
    ['sl-tel','申込担当者電話番号'],
    ['sl-email','契約書送付先メールアドレス'],
    ['sl-bill-corp','法人名（請求先）'],
    ['sl-bill-tel','代表電話番号（請求先）'],
    ['sl-bill-zip','郵便番号（請求先）'],
    ['sl-bill-area','住所（市区町村・番地）（請求先）'],
    ['sl-bill-contact','担当者名（請求先）'],
    ['sl-bill-contact-tel','担当者電話番号（請求先）'],
    ['sl-bill-email','メールアドレス（請求先）'],
    ['sl-bill-method','帳票送付方法'],
    ['sl-bill-payment','支払方法'],
    ['sl-sales','作成者']
  ];
  var missing=REQUIRED.filter(function(r){var el=document.getElementById(r[0]);return!el||!el.value.trim();}).map(function(r){return r[1];});
  if(missing.length){alert('以下の必須項目を入力してください：\n\n・'+missing.join('\n・'));return;}
  var g=function(id){var el=document.getElementById(id);return el?el.value.trim():'';}; /* getVal */
  var name=g('sl-name');
  var sales=g('sl-sales');
  var s={
    id:uid(),
    name:name,
    clientId:g('sl-client-id'),
    contractType:g('sl-contract-type'),
    corp:g('sl-corp'),
    genre:document.getElementById('sl-genre').value,
    zip:g('sl-zip'),
    pref:document.getElementById('sl-pref').value,
    area:document.getElementById('sl-area').value,
    corpTel:g('sl-corp-tel'),
    fax:g('sl-fax'),
    planId:document.getElementById('sl-plan').value,
    contractTerm:document.getElementById('sl-term').value,
    contactName:g('sl-contact'),
    contactKana:g('sl-contact-kana'),
    contactRole:g('sl-role'),
    contactTel:g('sl-tel'),
    contactEmail:g('sl-email'),
    billId:g('sl-bill-id'),
    billCorp:g('sl-bill-corp'),
    billTel:g('sl-bill-tel'),
    billFax:g('sl-bill-fax'),
    billZip:g('sl-bill-zip'),
    billPref:document.getElementById('sl-bill-pref').value,
    billArea:document.getElementById('sl-bill-area').value,
    billContact:g('sl-bill-contact'),
    billContactTel:g('sl-bill-contact-tel'),
    billEmail:g('sl-bill-email'),
    billMethod:g('sl-bill-method'),
    billPayment:g('sl-bill-payment'),
    memo:document.getElementById('sl-memo').value,
    request:document.getElementById('sl-request').value,
    status:'pending',
    color:COLORS[DB.stores.length%COLORS.length],
    progress:{},
    progressMode:'first',
    salesBy:sales,
    salesAt:new Date().toISOString()
  };
  var plan=DB.plans.find(function(p){return p.id===s.planId;});
  if(plan&&plan.price)s.monthlyFee=plan.price;
  s.rakurakuRegistered=false;
  DB.stores.push(s);
  if(!DB.salesNotifs)DB.salesNotifs=[];
  var notif={id:uid(),storeId:s.id,storeName:name,salesBy:sales,plan:plan?plan.name:'未設定',at:new Date().toISOString(),read:false};
  DB.salesNotifs.unshift(notif);
  saveItem('stores',s);
  saveItem('salesnotifs',notif);
  /* Webhook通知 */
  var planName=plan?plan.name:'未設定';
  notifyChatwork(name,planName,sales,s.contactName,s.contactTel,s.contactEmail,s.corp).then(function(results){
    if(results.length){
      var allOk=results.every(function(r){return r.ok;});
      if(allOk){setSyncStatus('ok','✓ Chatwork通知送信完了');setTimeout(function(){setSyncStatus('ok','同期済み');},3000);}
      else{setSyncStatus('error','Chatwork通知失敗');}
    }
  });
  /* フォームリセット */
  ['sl-client-id','sl-contract-type','sl-name','sl-corp','sl-genre','sl-zip','sl-pref','sl-area',
   'sl-corp-tel','sl-fax','sl-contact','sl-contact-kana','sl-role','sl-tel','sl-email',
   'sl-bill-id','sl-bill-corp','sl-bill-tel','sl-bill-fax','sl-bill-zip','sl-bill-pref','sl-bill-area',
   'sl-bill-contact','sl-bill-contact-tel','sl-bill-email','sl-bill-method','sl-bill-payment',
   'sl-memo','sl-request','sl-sales'
  ].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('sl-plan').value='';
  updateSalesNotifBadge();
  renderSalesNotifs();
  refreshAll();
  alert('✓ 登録しました！Webhook通知を送信しました。');
}
function getSalesNotifs(){
  if(!DB.salesNotifs)DB.salesNotifs=[];
  return DB.salesNotifs;
}
function saveSalesNotifs(){
  try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e){}
}
function renderSalesNotifs(){
  var el=document.getElementById('salesNotifList');
  if(!el)return;
  var notifs=getSalesNotifs();
  if(!notifs.length){el.innerHTML='<div class="empty-state" style="padding:20px">通知はありません</div>';return;}
  el.innerHTML=notifs.map(function(n){
    var dt=new Date(n.at);
    var timeStr=(dt.getMonth()+1)+'/'+dt.getDate()+' '+pad(dt.getHours())+':'+pad(dt.getMinutes());
    return'<div style="padding:10px 12px;margin-bottom:6px;border-radius:var(--r);background:'+(n.read?'var(--bg3)':'var(--accent-bg)')+';border:1px solid '+(n.read?'var(--border)':'var(--accent-border)')+';">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +(n.read?'':'<span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;display:inline-block"></span>')
      +'<span style="font-size:14px;font-weight:500;flex:1">'+esc(n.storeName)+'</span>'
      +'<span style="font-size:11px;color:var(--text3)">'+timeStr+'</span>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-bottom:8px">'
      +'プラン: <strong>'+esc(n.plan)+'</strong>　営業担当: <strong>'+esc(n.salesBy)+'</strong>'
      +'</div>'
      +'<button class="btn btn-sm" onclick="openStoreFromNotif(\''+n.storeId+'\')" style="font-size:12px">店舗詳細を見る →</button>'
      +'</div>';
  }).join('');
}
function openStoreFromNotif(storeId,tabIdx){
  if(!DB.salesNotifs)DB.salesNotifs=[];
  DB.salesNotifs.forEach(function(n){
    if(n.storeId===storeId&&!n.read){n.read=true;saveItem('salesnotifs',n);}
  });
  updateSalesNotifBadge();
  renderSalesNotifs();
  renderDashboard();
  navigate('stores');
  setTimeout(function(){showDetail(storeId);if(tabIdx!=null)setTimeout(function(){switchStoreTab(tabIdx);},50);},100);
}
function clearSalesNotifs(){
  if(!DB.salesNotifs)DB.salesNotifs=[];
  DB.salesNotifs.forEach(function(n){
    if(!n.read){n.read=true;saveItem('salesnotifs',n);}
  });
  updateSalesNotifBadge();
  renderSalesNotifs();
  renderDashboard();
}
function updateSalesNotifBadge(){
  if(!DB.salesNotifs)DB.salesNotifs=[];
  var unread=DB.salesNotifs.filter(function(n){return!n.read;}).length;
  var badge=document.getElementById('nb-sales');
  if(badge){
    if(unread>0){badge.style.display='';badge.textContent=unread;}
    else{badge.style.display='none';badge.textContent='';}
  }
}

var ZIP_PREF={
  '010':'北海道','020':'岩手県','021':'岩手県','022':'岩手県','023':'岩手県','024':'岩手県','025':'岩手県','026':'岩手県','027':'岩手県','028':'岩手県','029':'岩手県',
  '030':'青森県','031':'青森県','032':'青森県','033':'青森県','034':'青森県','035':'青森県','036':'青森県','037':'青森県','038':'青森県','039':'青森県',
  '040':'宮城県','041':'宮城県','042':'宮城県','043':'宮城県','044':'宮城県','045':'宮城県','046':'宮城県','047':'宮城県','048':'宮城県','049':'宮城県',
  '050':'秋田県','051':'秋田県','052':'秋田県','053':'秋田県','054':'秋田県','055':'秋田県','056':'秋田県','057':'秋田県','058':'秋田県','059':'秋田県',
  '060':'山形県','061':'山形県','062':'山形県','063':'山形県','064':'山形県','065':'山形県','066':'山形県','067':'山形県','068':'山形県','069':'山形県',
  '070':'福島県','071':'福島県','072':'福島県','073':'福島県','074':'福島県','075':'福島県','076':'福島県','077':'福島県','078':'福島県','079':'福島県',
  '080':'茨城県','081':'茨城県','082':'茨城県','083':'茨城県','084':'茨城県','085':'茨城県','086':'茨城県','087':'茨城県','088':'茨城県','089':'茨城県',
  '090':'栃木県','091':'栃木県','092':'栃木県','093':'栃木県','094':'栃木県','095':'栃木県','096':'栃木県','097':'栃木県','098':'栃木県','099':'栃木県',
  '100':'東京都','101':'東京都','102':'東京都','103':'東京都','104':'東京都','105':'東京都','106':'東京都','107':'東京都','108':'東京都','109':'東京都',
  '110':'東京都','111':'東京都','112':'東京都','113':'東京都','114':'東京都','115':'東京都','116':'東京都','117':'東京都','118':'東京都','119':'東京都',
  '120':'東京都','121':'東京都','122':'東京都','123':'東京都','124':'東京都','125':'東京都','126':'東京都','127':'東京都','128':'東京都','129':'東京都',
  '130':'東京都','131':'東京都','132':'東京都','133':'東京都','134':'東京都','135':'東京都','136':'東京都','137':'東京都','138':'東京都','139':'東京都',
  '140':'東京都','141':'東京都','142':'東京都','143':'東京都','144':'東京都','145':'東京都','146':'東京都','147':'東京都','148':'東京都','149':'東京都',
  '150':'東京都','151':'東京都','152':'東京都','153':'東京都','154':'東京都','155':'東京都','156':'東京都','157':'東京都','158':'東京都','159':'東京都',
  '160':'東京都','161':'東京都','162':'東京都','163':'東京都','164':'東京都','165':'東京都','166':'東京都','167':'東京都','168':'東京都','169':'東京都',
  '170':'東京都','171':'東京都','172':'東京都','173':'東京都','174':'東京都','175':'東京都','176':'東京都','177':'東京都','178':'東京都','179':'東京都',
  '180':'東京都','181':'東京都','182':'東京都','183':'東京都','184':'東京都','185':'東京都','186':'東京都','187':'東京都','188':'東京都','189':'東京都',
  '190':'東京都','191':'東京都','192':'東京都','193':'東京都','194':'東京都','195':'東京都','196':'東京都','197':'東京都','198':'東京都','199':'東京都',
  '210':'神奈川県','211':'神奈川県','212':'神奈川県','213':'神奈川県','214':'神奈川県','215':'神奈川県','216':'神奈川県','217':'神奈川県','218':'神奈川県','219':'神奈川県',
  '220':'神奈川県','221':'神奈川県','222':'神奈川県','223':'神奈川県','224':'神奈川県','225':'神奈川県','226':'神奈川県','227':'神奈川県','228':'神奈川県','229':'神奈川県',
  '230':'神奈川県','231':'神奈川県','232':'神奈川県','233':'神奈川県','234':'神奈川県','235':'神奈川県','236':'神奈川県','237':'神奈川県','238':'神奈川県','239':'神奈川県',
  '240':'神奈川県','241':'神奈川県','242':'神奈川県','243':'神奈川県','244':'神奈川県','245':'神奈川県','246':'神奈川県','247':'神奈川県','248':'神奈川県','249':'神奈川県',
  '250':'神奈川県','251':'神奈川県','252':'神奈川県','253':'神奈川県','254':'神奈川県','255':'神奈川県','256':'神奈川県','257':'神奈川県','258':'神奈川県','259':'神奈川県',
  '260':'千葉県','261':'千葉県','262':'千葉県','263':'千葉県','264':'千葉県','265':'千葉県','266':'千葉県','267':'千葉県','268':'千葉県','269':'千葉県',
  '270':'千葉県','271':'千葉県','272':'千葉県','273':'千葉県','274':'千葉県','275':'千葉県','276':'千葉県','277':'千葉県','278':'千葉県','279':'千葉県',
  '280':'千葉県','281':'千葉県','282':'千葉県','283':'千葉県','284':'千葉県','285':'千葉県','286':'千葉県','287':'千葉県','288':'千葉県','289':'千葉県',
  '290':'千葉県','291':'千葉県','292':'千葉県','293':'千葉県','294':'千葉県','295':'千葉県','296':'千葉県','297':'千葉県','298':'千葉県','299':'千葉県',
  '300':'茨城県','301':'茨城県','302':'茨城県','303':'茨城県','304':'茨城県','305':'茨城県','306':'茨城県','307':'茨城県','308':'茨城県','309':'茨城県',
  '310':'茨城県','311':'茨城県','312':'茨城県','313':'茨城県','314':'茨城県','315':'茨城県','316':'茨城県','317':'茨城県','318':'茨城県','319':'茨城県',
  '320':'栃木県','321':'栃木県','322':'栃木県','323':'栃木県','324':'栃木県','325':'栃木県','326':'栃木県','327':'栃木県','328':'栃木県','329':'栃木県',
  '330':'埼玉県','331':'埼玉県','332':'埼玉県','333':'埼玉県','334':'埼玉県','335':'埼玉県','336':'埼玉県','337':'埼玉県','338':'埼玉県','339':'埼玉県',
  '340':'埼玉県','341':'埼玉県','342':'埼玉県','343':'埼玉県','344':'埼玉県','345':'埼玉県','346':'埼玉県','347':'埼玉県','348':'埼玉県','349':'埼玉県',
  '350':'埼玉県','351':'埼玉県','352':'埼玉県','353':'埼玉県','354':'埼玉県','355':'埼玉県','356':'埼玉県','357':'埼玉県','358':'埼玉県','359':'埼玉県',
  '360':'埼玉県','361':'埼玉県','362':'埼玉県','363':'埼玉県','364':'埼玉県','365':'埼玉県','366':'埼玉県','367':'埼玉県','368':'埼玉県','369':'埼玉県',
  '370':'群馬県','371':'群馬県','372':'群馬県','373':'群馬県','374':'群馬県','375':'群馬県','376':'群馬県','377':'群馬県','378':'群馬県','379':'群馬県',
  '380':'長野県','381':'長野県','382':'長野県','383':'長野県','384':'長野県','385':'長野県','386':'長野県','387':'長野県','388':'長野県','389':'長野県',
  '390':'長野県','391':'長野県','392':'長野県','393':'長野県','394':'長野県','395':'長野県','396':'長野県','397':'長野県','398':'長野県','399':'長野県',
  '400':'山梨県','401':'山梨県','402':'山梨県','403':'山梨県','404':'山梨県','405':'山梨県','406':'山梨県','407':'山梨県','408':'山梨県','409':'山梨県',
  '410':'静岡県','411':'静岡県','412':'静岡県','413':'静岡県','414':'静岡県','415':'静岡県','416':'静岡県','417':'静岡県','418':'静岡県','419':'静岡県',
  '420':'静岡県','421':'静岡県','422':'静岡県','423':'静岡県','424':'静岡県','425':'静岡県','426':'静岡県','427':'静岡県','428':'静岡県','429':'静岡県',
  '430':'静岡県','431':'静岡県','432':'静岡県','433':'静岡県','434':'静岡県','435':'静岡県','436':'静岡県','437':'静岡県','438':'静岡県','439':'静岡県',
  '440':'愛知県','441':'愛知県','442':'愛知県','443':'愛知県','444':'愛知県','445':'愛知県','446':'愛知県','447':'愛知県','448':'愛知県','449':'愛知県',
  '450':'愛知県','451':'愛知県','452':'愛知県','453':'愛知県','454':'愛知県','455':'愛知県','456':'愛知県','457':'愛知県','458':'愛知県','459':'愛知県',
  '460':'愛知県','461':'愛知県','462':'愛知県','463':'愛知県','464':'愛知県','465':'愛知県','466':'愛知県','467':'愛知県','468':'愛知県','469':'愛知県',
  '470':'愛知県','471':'愛知県','472':'愛知県','473':'愛知県','474':'愛知県','475':'愛知県','476':'愛知県','477':'愛知県','478':'愛知県','479':'愛知県',
  '480':'愛知県','481':'愛知県','482':'愛知県','483':'愛知県','484':'愛知県','485':'愛知県','486':'愛知県','487':'愛知県','488':'愛知県','489':'愛知県',
  '490':'愛知県','491':'愛知県','492':'愛知県','493':'愛知県','494':'愛知県','495':'愛知県','496':'愛知県','497':'愛知県','498':'愛知県','499':'愛知県',
  '500':'岐阜県','501':'岐阜県','502':'岐阜県','503':'岐阜県','504':'岐阜県','505':'岐阜県','506':'岐阜県','507':'岐阜県','508':'岐阜県','509':'岐阜県',
  '510':'三重県','511':'三重県','512':'三重県','513':'三重県','514':'三重県','515':'三重県','516':'三重県','517':'三重県','518':'三重県','519':'三重県',
  '520':'滋賀県','521':'滋賀県','522':'滋賀県','523':'滋賀県','524':'滋賀県','525':'滋賀県','526':'滋賀県','527':'滋賀県','528':'滋賀県','529':'滋賀県',
  '530':'大阪府','531':'大阪府','532':'大阪府','533':'大阪府','534':'大阪府','535':'大阪府','536':'大阪府','537':'大阪府','538':'大阪府','539':'大阪府',
  '540':'大阪府','541':'大阪府','542':'大阪府','543':'大阪府','544':'大阪府','545':'大阪府','546':'大阪府','547':'大阪府','548':'大阪府','549':'大阪府',
  '550':'大阪府','551':'大阪府','552':'大阪府','553':'大阪府','554':'大阪府','555':'大阪府','556':'大阪府','557':'大阪府','558':'大阪府','559':'大阪府',
  '560':'大阪府','561':'大阪府','562':'大阪府','563':'大阪府','564':'大阪府','565':'大阪府','566':'大阪府','567':'大阪府','568':'大阪府','569':'大阪府',
  '570':'大阪府','571':'大阪府','572':'大阪府','573':'大阪府','574':'大阪府','575':'大阪府','576':'大阪府','577':'大阪府','578':'大阪府','579':'大阪府',
  '580':'大阪府','581':'大阪府','582':'大阪府','583':'大阪府','584':'大阪府','585':'大阪府','586':'大阪府','587':'大阪府','588':'大阪府','589':'大阪府',
  '590':'大阪府','591':'大阪府','592':'大阪府','593':'大阪府','594':'大阪府','595':'大阪府','596':'大阪府','597':'大阪府','598':'大阪府','599':'大阪府',
  '600':'京都府','601':'京都府','602':'京都府','603':'京都府','604':'京都府','605':'京都府','606':'京都府','607':'京都府','608':'京都府','609':'京都府',
  '610':'京都府','611':'京都府','612':'京都府','613':'京都府','614':'京都府','615':'京都府','616':'京都府','617':'京都府','618':'京都府','619':'京都府',
  '620':'京都府','621':'京都府','622':'京都府','623':'京都府','624':'京都府','625':'京都府','626':'京都府','627':'京都府','628':'京都府','629':'京都府',
  '630':'奈良県','631':'奈良県','632':'奈良県','633':'奈良県','634':'奈良県','635':'奈良県','636':'奈良県','637':'奈良県','638':'奈良県','639':'奈良県',
  '640':'和歌山県','641':'和歌山県','642':'和歌山県','643':'和歌山県','644':'和歌山県','645':'和歌山県','646':'和歌山県','647':'和歌山県','648':'和歌山県','649':'和歌山県',
  '650':'兵庫県','651':'兵庫県','652':'兵庫県','653':'兵庫県','654':'兵庫県','655':'兵庫県','656':'兵庫県','657':'兵庫県','658':'兵庫県','659':'兵庫県',
  '660':'兵庫県','661':'兵庫県','662':'兵庫県','663':'兵庫県','664':'兵庫県','665':'兵庫県','666':'兵庫県','667':'兵庫県','668':'兵庫県','669':'兵庫県',
  '670':'兵庫県','671':'兵庫県','672':'兵庫県','673':'兵庫県','674':'兵庫県','675':'兵庫県','676':'兵庫県','677':'兵庫県','678':'兵庫県','679':'兵庫県',
  '680':'鳥取県','681':'鳥取県','682':'鳥取県','683':'鳥取県','684':'鳥取県','685':'鳥取県','686':'鳥取県','687':'鳥取県','688':'鳥取県','689':'鳥取県',
  '690':'島根県','691':'島根県','692':'島根県','693':'島根県','694':'島根県','695':'島根県','696':'島根県','697':'島根県','698':'島根県','699':'島根県',
  '700':'岡山県','701':'岡山県','702':'岡山県','703':'岡山県','704':'岡山県','705':'岡山県','706':'岡山県','707':'岡山県','708':'岡山県','709':'岡山県',
  '710':'岡山県','711':'岡山県','712':'岡山県','713':'岡山県','714':'岡山県','715':'岡山県','716':'岡山県','717':'岡山県','718':'岡山県','719':'岡山県',
  '720':'広島県','721':'広島県','722':'広島県','723':'広島県','724':'広島県','725':'広島県','726':'広島県','727':'広島県','728':'広島県','729':'広島県',
  '730':'広島県','731':'広島県','732':'広島県','733':'広島県','734':'広島県','735':'広島県','736':'広島県','737':'広島県','738':'広島県','739':'広島県',
  '740':'山口県','741':'山口県','742':'山口県','743':'山口県','744':'山口県','745':'山口県','746':'山口県','747':'山口県','748':'山口県','749':'山口県',
  '750':'山口県','751':'山口県','752':'山口県','753':'山口県','754':'山口県','755':'山口県','756':'山口県','757':'山口県','758':'山口県','759':'山口県',
  '760':'香川県','761':'香川県','762':'香川県','763':'香川県','764':'香川県','765':'香川県','766':'香川県','767':'香川県','768':'香川県','769':'香川県',
  '770':'徳島県','771':'徳島県','772':'徳島県','773':'徳島県','774':'徳島県','775':'徳島県','776':'徳島県','777':'徳島県','778':'徳島県','779':'徳島県',
  '780':'高知県','781':'高知県','782':'高知県','783':'高知県','784':'高知県','785':'高知県','786':'高知県','787':'高知県','788':'高知県','789':'高知県',
  '790':'愛媛県','791':'愛媛県','792':'愛媛県','793':'愛媛県','794':'愛媛県','795':'愛媛県','796':'愛媛県','797':'愛媛県','798':'愛媛県','799':'愛媛県',
  '800':'福岡県','801':'福岡県','802':'福岡県','803':'福岡県','804':'福岡県','805':'福岡県','806':'福岡県','807':'福岡県','808':'福岡県','809':'福岡県',
  '810':'福岡県','811':'福岡県','812':'福岡県','813':'福岡県','814':'福岡県','815':'福岡県','816':'福岡県','817':'福岡県','818':'福岡県','819':'福岡県',
  '820':'福岡県','821':'福岡県','822':'福岡県','823':'福岡県','824':'福岡県','825':'福岡県','826':'福岡県','827':'福岡県','828':'福岡県','829':'福岡県',
  '830':'福岡県','831':'福岡県','832':'福岡県','833':'福岡県','834':'福岡県','835':'福岡県','836':'福岡県','837':'福岡県','838':'福岡県','839':'福岡県',
  '840':'佐賀県','841':'佐賀県','842':'佐賀県','843':'佐賀県','844':'佐賀県','845':'佐賀県','846':'佐賀県','847':'佐賀県','848':'佐賀県','849':'佐賀県',
  '850':'長崎県','851':'長崎県','852':'長崎県','853':'長崎県','854':'長崎県','855':'長崎県','856':'長崎県','857':'長崎県','858':'長崎県','859':'長崎県',
  '860':'熊本県','861':'熊本県','862':'熊本県','863':'熊本県','864':'熊本県','865':'熊本県','866':'熊本県','867':'熊本県','868':'熊本県','869':'熊本県',
  '870':'大分県','871':'大分県','872':'大分県','873':'大分県','874':'大分県','875':'大分県','876':'大分県','877':'大分県','878':'大分県','879':'大分県',
  '880':'宮崎県','881':'宮崎県','882':'宮崎県','883':'宮崎県','884':'宮崎県','885':'宮崎県','886':'宮崎県','887':'宮崎県','888':'宮崎県','889':'宮崎県',
  '890':'鹿児島県','891':'鹿児島県','892':'鹿児島県','893':'鹿児島県','894':'鹿児島県','895':'鹿児島県','896':'鹿児島県','897':'鹿児島県','898':'鹿児島県','899':'鹿児島県',
  '900':'沖縄県','901':'沖縄県','902':'沖縄県','903':'沖縄県','904':'沖縄県','905':'沖縄県','906':'沖縄県','907':'沖縄県','908':'沖縄県','909':'沖縄県'
};

function autoFillAddress(val,prefId,areaId){
  var zip=val.replace(/[^0-9]/g,'');
  var statusId=prefId==='sl-pref'?'sl-zip-status':prefId==='sl-bill-pref'?'sl-bill-zip-status':'sZip-status';
  var statusEl=document.getElementById(statusId);
  if(zip.length<3){if(statusEl)statusEl.textContent='';return;}
  var pref=ZIP_PREF[zip.slice(0,3)];
  if(pref){
    document.getElementById(prefId).value=pref;
    if(statusEl)statusEl.textContent='✓ '+pref;
    setTimeout(function(){if(statusEl)statusEl.textContent='';},2000);
  }else{
    if(statusEl)statusEl.textContent='';
  }
}

function updatePostStoreSelect(){document.getElementById('pStore').innerHTML='<option value="">選択...</option>'+DB.stores.map(function(s){return'<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');}
function updateCastSelects(){
  document.getElementById('cStore').innerHTML='<option value="">選択...</option>'+DB.stores.map(function(s){return'<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');
  document.getElementById('cInf').innerHTML='<option value="">選択...</option>'+DB.influencers.map(function(i){return'<option value="'+i.id+'">'+esc(i.name)+' '+esc(i.handle||'')+'</option>';}).join('');
}
function contractEndDate(s){if(!s.contractStart||!s.contractTerm)return null;var d=new Date(s.contractStart);d.setMonth(d.getMonth()+parseInt(s.contractTerm));return d;}
function statusBadge(v){var m={negotiating:'<span class="badge b-blue">商談中</span>',active:'<span class="badge b-green">稼働中</span>',pending:'<span class="badge b-amber">準備中</span>',ended:'<span class="badge b-gray">終了</span>'};return m[v]||'—';}
function onStoreStatusChange(){var v=document.getElementById('sStatus').value;var row=document.getElementById('sNegotiatingRow');if(row)row.style.display=v==='negotiating'?'':'none';}
function postStatusBadge(v){var m={draft:'<span class="badge b-gray">下書き</span>',shoot_set:'<span class="badge b-gray">撮影日確定</span>',editing:'<span class="badge b-amber">編集中</span>',delivered:'<span class="badge b-purple">納品済み</span>',scheduled:'<span class="badge b-blue">予約済み</span>',done:'<span class="badge b-green">投稿済み</span>',unbooked:'<span class="badge b-gray">予約未</span>',booked:'<span class="badge b-amber">予約済み</span>',visited:'<span class="badge b-green">来店済み</span>',cancelled:'<span class="badge b-red">キャンセル</span>',pending_review:'<span class="badge b-amber">確認待ち</span>',approved:'<span class="badge b-green">承認済み</span>'};return m[v]||v;}

function generateAlerts(){
  var alerts=[],today=new Date();

  /* 楽々販売未登録（商談中・準備中は対象外。稼働中の店舗のみ通知） */
  DB.stores.filter(function(s){return s.status==='active'&&s.rakurakuRegistered===false;}).forEach(function(s){
    alerts.push({level:'warn',msg:'📋 楽々販売未登録【'+s.name+'】登録をお願いします',storeId:s.id});
  });

  /* 営業からの未読通知 */
  var unreadNotifs=getSalesNotifs().filter(function(n){return!n.read;});
  unreadNotifs.forEach(function(n){
    alerts.push({level:'info',msg:'📬 新規契約【'+n.storeName+'】営業: '+n.salesBy+' / プラン: '+n.plan,storeId:n.storeId,isNotif:true,notifId:n.id});
  });

  /* 投稿日が3日以内 */
  var in3days=new Date(today.getTime()+3*86400000);
  DB.posts.filter(function(p){
    var d=new Date(p.date);
    return p.status!=='done'&&d>=today&&d<=in3days;
  }).forEach(function(p){
    var diff=Math.ceil((new Date(p.date)-today)/86400000);
    alerts.push({level:'warn',msg:'📅 投稿まで'+diff+'日【'+storeName(p.storeId)+'】'+fmtDT(p.date)+(p.caption?' — '+(p.caption||'').slice(0,20):'')});
  });

  /* 予約済みなのに過去 */
  DB.posts.forEach(function(p){
    if(p.status==='scheduled'&&new Date(p.date)<today)alerts.push({level:'danger',msg:'⚠ 投稿日が過去【'+storeName(p.storeId)+'】'+fmtDT(p.date),postId:p.id,action:'done'});
    if(!p.creative&&p.type==='video')alerts.push({level:'warn',msg:'🎬 クリエイティブ未設定【'+storeName(p.storeId)+'】'+fmtDT(p.date),postId:p.id,action:'edit'});
  });

  /* 同日重複 */
  var dateMap={};
  DB.posts.forEach(function(p){var k=p.storeId+'_'+(p.date||'').slice(0,10);if(!dateMap[k])dateMap[k]=[];dateMap[k].push(p);});
  Object.values(dateMap).forEach(function(ps){if(ps.length>1)alerts.push({level:'danger',msg:'⚠ 同日重複【'+storeName(ps[0].storeId)+'】'+(ps[0].date||'').slice(0,10)+' '+ps.length+'件'});});

  /* 契約終了・投稿本数 */
  DB.stores.forEach(function(s){
    var end=contractEndDate(s);
    if(end){var diff=(end-today)/86400000;if(diff<30&&diff>0)alerts.push({level:'warn',msg:'📋 契約終了まで'+Math.round(diff)+'日【'+s.name+'】'+fmtD(end)});}
    if(s.status==='active'){var mon=DB.posts.filter(function(p){var d=new Date(p.date);return p.storeId===s.id&&d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth();});if(mon.length<2)alerts.push({level:'warn',msg:'📉 今月'+mon.length+'本【'+s.name+'】目標: 2本'});}
  });
  return alerts;
}

function renderDashboard(){
  var active=DB.stores.filter(function(s){return s.status==='active';});
  var thisMon=DB.posts.filter(function(p){var d=new Date(p.date);return d.getFullYear()===NOW.getFullYear()&&d.getMonth()===NOW.getMonth();});
  var negotiating=DB.stores.filter(function(s){return s.status==='negotiating';});
  document.getElementById('ds-total').textContent=DB.stores.filter(function(s){return s.status!=='negotiating';}).length;
  document.getElementById('ds-active').textContent=active.length;
  document.getElementById('ds-negotiating').textContent=negotiating.length;
  document.getElementById('ds-posts').textContent=thisMon.length;
  document.getElementById('ds-inf').textContent=DB.influencers.length;
  document.getElementById('ss-active').textContent=active.length;
  document.getElementById('ss-posts').textContent=thisMon.length;
  document.getElementById('nb-stores').textContent=DB.stores.length;
  document.getElementById('nb-inf').textContent=DB.influencers.length;
  /* アラートバッジ更新 */
  var alerts=generateAlerts();
  document.getElementById('nb-alerts').textContent=alerts.length;
  /* やること一覧 */
  renderTodoList();
  /* 売上目標トラッカー */
  var goalEl=document.getElementById('dash-goal');
  if(goalEl){
    var GOAL=Number(localStorage.getItem('gc_sales_goal')||100000000);
    var active=DB.stores.filter(function(s){return s.status==='active';});
    var now=new Date();
    var thisYear=now.getFullYear();
    var remainMonths=12-now.getMonth(); /* 今月〜12月 */
    var monthlyTotal=active.reduce(function(sum,s){return sum+(Number(s.monthlyFee)||0);},0);
    var proj=monthlyTotal*remainMonths;
    var rem=Math.max(0,GOAL-proj);
    var pct=Math.min(100,Math.round(proj/GOAL*100));
    var barCol=pct>=100?'var(--green)':pct>=60?'var(--accent)':'var(--amber)';

    /* プラン別テーブル */
    var planPlans=DB.plans.filter(function(p){return Number(p.price)>0;});
    var planTable=planPlans.length
      ?'<div style="font-size:12px;font-weight:500;color:var(--text2);margin:12px 0 6px">📋 プラン別 必要件数</div>'
        +'<div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden">'
        +'<table style="width:100%;border-collapse:collapse;font-size:13px">'
        +'<thead><tr style="background:var(--bg3)">'
          +'<th style="padding:7px 10px;text-align:left;font-weight:500;color:var(--text2)">プラン</th>'
          +'<th style="padding:7px 10px;text-align:right;font-weight:400;color:var(--text2)">月額</th>'
          +'<th style="padding:7px 10px;text-align:right;font-weight:400;color:var(--amber)">年内合計</th>'
          +'<th style="padding:7px 10px;text-align:right;font-weight:400;color:var(--accent)">月当たり</th>'
        +'</tr></thead><tbody>'
        +planPlans.map(function(p,i){
          var monthly=Number(p.price);
          var cur=active.filter(function(s){return s.planId===p.id;}).length;
          var needed=rem>0&&monthly>0?Math.ceil(rem/(monthly*remainMonths)):0;
          var perMonth=remainMonths>0&&needed>0?Math.ceil(needed/remainMonths):0;
          var bg=i%2===1?'background:var(--bg3)':'';
          return'<tr style="'+bg+'">'
            +'<td style="padding:8px 10px"><span style="font-weight:500">'+esc(p.name)+'</span>'
              +'<span style="font-size:12px;color:var(--text3);margin-left:6px">現在'+cur+'件</span></td>'
            +'<td style="padding:8px 10px;text-align:right;color:var(--text2)">'+fmtMoney(monthly)+'</td>'
            +'<td style="padding:8px 10px;text-align:right">'
              +(needed<=0?'<span style="color:var(--green);font-weight:500">✓ 達成</span>'
                :'<span style="font-size:15px;font-weight:600;color:var(--amber)">'+needed+'件</span>')
            +'</td>'
            +'<td style="padding:8px 10px;text-align:right">'
              +(needed<=0?'—'
                :'<span style="font-weight:500;color:var(--accent)">'+perMonth+'件/月</span>')
            +'</td>'
          +'</tr>';
        }).join('')
        +'</tbody></table></div>'
      :'<div style="font-size:13px;color:var(--text3)">プランを登録すると表示されます</div>';

    goalEl.innerHTML=
      '<div style="margin-bottom:12px">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px">'
          +'<div>'
            +'<div style="font-size:12px;color:var(--text3);margin-bottom:2px">'+thisYear+'年 売上見込み</div>'
            +'<div style="font-size:26px;font-weight:500;color:'+barCol+'">'+fmtMoney(proj)+'</div>'
          +'</div>'
          +'<div style="text-align:right">'
            +'<div style="font-size:12px;color:var(--text3)">目標</div>'
            +'<div style="font-size:15px;font-weight:500">'+fmtMoney(GOAL)+'</div>'
          +'</div>'
        +'</div>'
        +'<div style="background:var(--bg4);border-radius:4px;height:8px;margin-bottom:6px">'
          +'<div style="height:8px;border-radius:4px;background:'+barCol+';width:'+pct+'%;transition:width .3s"></div>'
        +'</div>'
        +'<div style="display:flex;justify-content:space-between;font-size:13px">'
          +'<span style="color:'+barCol+';font-weight:500">達成率 '+pct+'%</span>'
          +(rem>0?'<span style="color:var(--text2)">残り <b>'+fmtMoney(rem)+'</b></span>'
            :'<span style="color:var(--green);font-weight:500">🎉 目標達成！</span>')
        +'</div>'
      +'</div>'
      +planTable;
  }

  /* 未決済（支払い待ち / 入金待ち） */
  var accPending=(DB.invoices||[]).filter(function(inv){return typeof invSettled==='function'?!invSettled(inv):inv.status!=='done';});
  var accEl=document.getElementById('dash-accounting');
  if(accEl){
    if(!accPending.length){
      accEl.innerHTML='<div class="empty-state" style="padding:16px">✓ 未決済の費用はありません</div>';
    }else{
      accEl.innerHTML='<div style="border-radius:0 0 var(--r) var(--r);overflow:hidden">'
        +accPending.map(function(inv){
          var type=inv.payeeType||'influencer';
          var isCreator=type==='creator',isAd=type==='ad';
          var payeeName=isAd?inv.adPlatform
            :isCreator?((DB.creators||[]).find(function(x){return x.id===inv.creatorId;})||{}).crName
            :(DB.influencers.find(function(x){return x.id===inv.infId;})||{}).name;
          var icon=isAd?'📢 ':isCreator?'🎬 ':'';
          var storeObj=DB.stores.find(function(x){return x.id===inv.storeId;})||{};
          var total=invInclTotal(inv);
          return'<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--amber-bg)">'
            +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:14px;font-weight:500">'+icon+esc(payeeName||'—')+'</div>'
              +'<div style="font-size:12px;color:var(--text2);margin-top:2px">'
                +esc(storeObj.name||'—')
                +(inv.receivedDate?' | 受領日：'+inv.receivedDate:'')
                +' | 合計：¥'+total.toLocaleString()
              +'</div>'
            +'</div>'
            +'<button class="btn btn-sm" style="background:var(--green-bg);color:var(--green);border-color:var(--green-border);white-space:nowrap" '
              +'onclick="markInvDone(\''+inv.id+'\')">'+(isAd?'✓ 入金確認':'✓ 支払い済み')+'</button>'
          +'</div>';
        }).join('')
      +'</div>';
    }
  }

  var setupPending=DB.stores.filter(function(s){return s.status==='active'&&progressPct(s)<100;}).slice(0,6);
  var se=document.getElementById('dash-setup');
  if(!setupPending.length){se.innerHTML='<div class="empty-state" style="padding:16px">全店舗の案件進捗が完了 ✓</div>';return;}
  se.innerHTML=setupPending.map(function(s){
    var steps=progressStepsFor(s);var prog=s.progress||{};
    var pct=progressPct(s);
    var done=Math.round(pct/100*steps.length);
    var modeLabel=(s.progressMode==='repeat')?'2回目以降':'初回';
    return'<div style="padding:10px 0;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
        +'<span style="font-size:13px;font-weight:500;cursor:pointer;color:var(--accent)" onclick="navigate(\'stores\');setTimeout(function(){showDetail(\''+s.id+'\');},100)">'+esc(s.name)+'</span>'
        +'<span class="badge b-gray" style="font-size:10px">'+modeLabel+'</span>'
        +'<div class="pbar-wrap" style="flex:1"><div class="pbar" style="width:'+pct+'%;background:'+(pct===100?'var(--green)':pct>=60?'var(--accent)':'var(--amber)')+'"></div></div>'
        +'<span style="font-size:12px;color:var(--text3)">'+done+'/'+steps.length+'</span>'
        +'<button class="btn btn-sm" style="font-size:11px;padding:2px 7px" onclick="openStoreModal(\''+s.id+'\')" >進捗</button>'
      +'</div>'
      +'<div style="display:flex;gap:3px;flex-wrap:wrap">'
        +steps.map(function(step){
          var p=prog[step.key]||{};
          var isDone=step.accounts?isAccountsDone(p):(p.status==='done'||p.status==='na');
          return'<span style="font-size:10px;padding:1px 5px;border-radius:10px;white-space:nowrap;background:'+(isDone?'var(--green-bg)':'var(--bg3)')+';color:'+(isDone?'var(--green)':'var(--text3)')+';border:1px solid '+(isDone?'var(--green-border)':'var(--border)')+';">'+(isDone?'✓ ':'')+esc(step.label)+'</span>';
        }).join('')
      +'</div>'
    +'</div>';
  }).join('');
}

