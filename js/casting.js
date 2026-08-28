var INF_PLATFORM_LIST=[
  {id:'ig_feed',       label:'Instagram フィード'},
  {id:'ig_reel',       label:'Instagram リール'},
  {id:'ig_story',      label:'Instagram ストーリーズ'},
  {id:'ig_pin',        label:'Instagram ピン留め'},
  {id:'ig_collab',     label:'Instagram コラボ投稿'},
  {id:'tiktok',        label:'TikTok'},
  {id:'facebook',      label:'Facebook'},
  {id:'lemon8',        label:'Lemon8'},
  {id:'google_review', label:'Googleマップ クチコミ'},
  {id:'tabelog',       label:'食べログ'},
  {id:'tripadvisor',   label:'TripAdvisor'},
  {id:'yt_shorts',     label:'YouTube Shorts'},
];

/* 対応媒体・費用設定：
   ・上段は「対応可否」チェックリスト（チェックのみ、料金は持たない）
   ・下段は「料金設定」。個別料金、または複数媒体をまとめた「セット料金」を選べる。
   セット料金は _bundles[bundleId]={fee,taxIncl,transIncl} に保持し、
   各媒体エントリは {enabled, bundleId} のみを持つ（個別のfeeは持たない）。 */
var _curPlatformData={};
var _bundleCreateOpen=false;

function platformFeeInfo(pd,plId){
  var d=(pd&&pd[plId])||{};
  if(d.bundleId&&pd._bundles&&pd._bundles[d.bundleId]){
    var b=pd._bundles[d.bundleId];
    var lo=b.feeLow!==undefined?b.feeLow:b.fee;
    return{fee:lo||0,feeLow:lo||0,feeHigh:b.feeHigh||0,taxIncl:!!b.taxIncl,transIncl:!!b.transIncl,bundleId:d.bundleId};
  }
  return{fee:d.fee||0,feeLow:d.fee||0,feeHigh:0,taxIncl:!!d.taxIncl,transIncl:!!d.transIncl,bundleId:null};
}

function platFeeInputHtml(idLow,idHigh,valLow,valHigh){
  return'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
    +'<span style="font-size:13px;color:var(--text2)">PR費用</span>'
    +'<input type="number" id="'+idLow+'" value="'+(valLow||'')+'" placeholder="例: 50000（下限）" style="width:130px;font-size:13px;padding:4px 8px">'
    +'<span style="font-size:13px;color:var(--text3)">〜</span>'
    +'<input type="number" id="'+idHigh+'" value="'+(valHigh||'')+'" placeholder="上限（幅なしは空欄）" style="width:150px;font-size:13px;padding:4px 8px">'
    +'<span style="font-size:13px;color:var(--text3)">円</span>'
  +'</div>';
}
/* 費用表示：下限≠上限なら「下限〜上限」、幅がなければ1個だけ表示 */
function feeRangeStr(low,high,taxIncl){
  var lo=Number(low)||0,hi=Number(high)||0;
  if(!lo&&!hi)return'料金未設定';
  var taxLabel=taxIncl?' 税込':' 税別';
  if(hi&&lo&&lo!==hi)return'¥'+lo.toLocaleString()+'〜¥'+hi.toLocaleString()+taxLabel;
  return'¥'+(lo||hi).toLocaleString()+taxLabel;
}
function platTaxToggleHtml(fn,key,taxIncl){
  var name='pltax_'+fn+'_'+key;
  return'<div style="display:flex;gap:4px">'
    +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(taxIncl?'var(--accent)':'var(--bg3)')+';color:'+(taxIncl?'#fff':'var(--text2)')+'" onclick="'+fn+'(\''+key+'\',true)">'
      +'<input type="radio" name="'+name+'" value="1" '+(taxIncl?'checked':'')+' style="display:none"> 税込</label>'
    +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(!taxIncl?'var(--accent)':'var(--bg3)')+';color:'+(!taxIncl?'#fff':'var(--text2)')+'" onclick="'+fn+'(\''+key+'\',false)">'
      +'<input type="radio" name="'+name+'" value="0" '+(!taxIncl?'checked':'')+' style="display:none"> 税別</label>'
  +'</div>';
}
function platTransToggleHtml(fn,key,transIncl){
  var name='pltrans_'+fn+'_'+key;
  return'<div style="display:flex;gap:4px">'
    +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(transIncl?'var(--green)':'var(--bg3)')+';color:'+(transIncl?'#fff':'var(--text2)')+'" onclick="'+fn+'(\''+key+'\',true)">'
      +'<input type="radio" name="'+name+'" value="1" '+(transIncl?'checked':'')+' style="display:none"> 交通費込</label>'
    +'<label style="font-size:12px;padding:3px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border);background:'+(!transIncl?'var(--green)':'var(--bg3)')+';color:'+(!transIncl?'#fff':'var(--text2)')+'" onclick="'+fn+'(\''+key+'\',false)">'
      +'<input type="radio" name="'+name+'" value="0" '+(!transIncl?'checked':'')+' style="display:none"> 交通費別</label>'
  +'</div>';
}

function renderPlatformDetails(saved){
  var el=document.getElementById('iPlatformDetails');
  if(!el)return;
  saved=saved||{};
  _curPlatformData=saved;
  var bundles=saved._bundles||{};

  /* ① 対応可否チェックリスト */
  var checklistHtml='<div style="padding:10px 12px;border-bottom:1px solid var(--border)">'
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">対応媒体</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px 16px">'
    +INF_PLATFORM_LIST.map(function(pl){
      var checked=!!(saved[pl.id]&&saved[pl.id].enabled);
      return'<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">'
        +'<input type="checkbox" id="plchk_'+pl.id+'" '+(checked?'checked':'')+' onchange="onPlatformCheck(\''+pl.id+'\')" style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent)">'
        +esc(pl.label)
      +'</label>';
    }).join('')
    +'</div></div>';

  /* ② 料金設定（対応中の媒体のみ。「＋料金を作る」で1媒体〜まとめて設定） */
  var enabledIds=INF_PLATFORM_LIST.filter(function(pl){return saved[pl.id]&&saved[pl.id].enabled;}).map(function(pl){return pl.id;});
  var shown={};
  var feeRowsHtml=enabledIds.map(function(pid){
    if(shown[pid])return'';
    var d=saved[pid]||{};
    var bid=d.bundleId;
    if(!bid||!bundles[bid]){
      /* セット未設定の単独媒体：チェックした時点で個別の料金入力欄を出す（従来はここが空欄でセット作成しないと入力できなかった） */
      shown[pid]=true;
      var pl=INF_PLATFORM_LIST.find(function(x){return x.id===pid;});
      return'<div style="padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);margin-bottom:6px">'
        +'<div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:6px">'+esc(pl?pl.label:pid)+'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
          +'<div style="display:flex;align-items:center;gap:6px"><input type="number" id="plfee_'+pid+'" value="'+(d.fee||'')+'" placeholder="例: 50000" style="width:130px;font-size:13px;padding:4px 8px"><span style="font-size:13px;color:var(--text3)">円</span></div>'
          +platTaxToggleHtml('setPlatformTax',pid,!!d.taxIncl)
          +platTransToggleHtml('setPlatformTrans',pid,!!d.transIncl)
        +'</div>'
        +'<div style="font-size:12px;color:var(--text3);margin-top:4px">→ '+feeRangeStr(d.fee,0,d.taxIncl)+'</div>'
      +'</div>';
    }
    var members=enabledIds.filter(function(x){return(saved[x]||{}).bundleId===bid;});
    members.forEach(function(m){shown[m]=true;});
    var b=bundles[bid];
    var labels=members.map(function(m){var p=INF_PLATFORM_LIST.find(function(x){return x.id===m;});return p?p.label:m;});
    var titleHtml=labels.length>1?'📦 セット：'+labels.map(esc).join('＋'):esc(labels[0]);
    var undoLabel=labels.length>1?'解除':'削除';
    return'<div style="padding:8px 10px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:var(--r);margin-bottom:6px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
        +'<div style="font-size:13px;font-weight:500;color:var(--accent)">'+titleHtml+'</div>'
        +'<button type="button" class="btn-ghost-danger" style="font-size:11px;padding:2px 8px" onclick="dissolveBundle(\''+bid+'\')">'+undoLabel+'</button>'
      +'</div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
        +platFeeInputHtml('bundlefee_'+bid,'bundlefeehigh_'+bid,(b.feeLow!==undefined?b.feeLow:b.fee),b.feeHigh)
        +platTaxToggleHtml('setBundleTax',bid,!!b.taxIncl)
        +platTransToggleHtml('setBundleTrans',bid,!!b.transIncl)
      +'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:4px">→ '+feeRangeStr(b.feeLow!==undefined?b.feeLow:b.fee,b.feeHigh,b.taxIncl)+'</div>'
    +'</div>';
  }).join('');

  /* セット作成候補は「対応中の全媒体」から選べるようにする（既にセット済みの媒体も対象に含める。
     含めないと一度セットに入れた媒体が二度と選べなくなってしまうため） */
  var bundleBtnHtml=enabledIds.length>=1?'<button type="button" class="btn btn-sm" onclick="toggleBundleCreatePanel()">＋ セット料金を作る</button>':'';
  var bundlePanelHtml='';
  if(_bundleCreateOpen){
    if(enabledIds.length<1){
      bundlePanelHtml='<div style="margin-top:8px;padding:10px;background:var(--bg3);border-radius:var(--r);font-size:12px;color:var(--text3)">上で対応媒体を選択してください</div>';
    }else{
      bundlePanelHtml='<div style="margin-top:8px;padding:10px;background:var(--bg3);border-radius:var(--r)">'
        +'<div style="font-size:12px;color:var(--text2);margin-bottom:6px">料金を設定する媒体を選択（1つでも可・複数選ぶとセット料金に・例：料理写真セットで5万円）<br>※既に別のセットに入っている媒体を選ぶと、そちらから外れて新しいセットに移動します</div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:8px">'
        +enabledIds.map(function(id){
          var pl=INF_PLATFORM_LIST.find(function(x){return x.id===id;});
          var already=(saved[id]&&saved[id].bundleId)?'<span style="font-size:11px;color:var(--text3)">（セット済み）</span>':'';
          return'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">'
            +'<input type="checkbox" class="bundle-create-chk" value="'+id+'" style="width:14px;height:14px;cursor:pointer;accent-color:var(--accent)"> '+esc(pl?pl.label:id)+already
          +'</label>';
        }).join('')
        +'</div>'
        +'<button type="button" class="btn btn-sm btn-primary" onclick="createPlatformBundle()">作成</button>'
        +' <button type="button" class="btn btn-sm" onclick="toggleBundleCreatePanel()">キャンセル</button>'
      +'</div>';
    }
  }

  var feeSectionHtml='<div style="padding:10px 12px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +'<span style="font-size:12px;font-weight:500;color:var(--text2)">料金設定</span>'
      +bundleBtnHtml
    +'</div>'
    +(enabledIds.length?(feeRowsHtml||'<div style="font-size:12px;color:var(--text3)">「＋ セット料金を作る」から料金を設定してください</div>'):'<div style="font-size:12px;color:var(--text3)">上で対応媒体を選択してください</div>')
    +bundlePanelHtml
  +'</div>';

  el.innerHTML=checklistHtml+feeSectionHtml;
}

function onPlatformCheck(pid){
  renderPlatformDetails(getPlatformData());
}

function setPlatformTax(pid,val){
  var d=getPlatformData();
  if(!d[pid])d[pid]={enabled:true};
  d[pid].taxIncl=val;
  renderPlatformDetails(d);
}

function setPlatformTrans(pid,val){
  var d=getPlatformData();
  if(!d[pid])d[pid]={enabled:true};
  d[pid].transIncl=val;
  renderPlatformDetails(d);
}

function setBundleTax(bid,val){
  var d=getPlatformData();
  if(!d._bundles)d._bundles={};
  if(!d._bundles[bid])d._bundles[bid]={feeLow:0,feeHigh:0,taxIncl:false,transIncl:false};
  d._bundles[bid].taxIncl=val;
  renderPlatformDetails(d);
}

function setBundleTrans(bid,val){
  var d=getPlatformData();
  if(!d._bundles)d._bundles={};
  if(!d._bundles[bid])d._bundles[bid]={feeLow:0,feeHigh:0,taxIncl:false,transIncl:false};
  d._bundles[bid].transIncl=val;
  renderPlatformDetails(d);
}

function toggleBundleCreatePanel(){
  _bundleCreateOpen=!_bundleCreateOpen;
  renderPlatformDetails(getPlatformData());
}

function createPlatformBundle(){
  var checked=Array.from(document.querySelectorAll('.bundle-create-chk:checked')).map(function(cb){return cb.value;});
  if(checked.length<1){alert('媒体を選んでください');return;}
  var data=getPlatformData();
  var bid=uid();
  if(!data._bundles)data._bundles={};
  data._bundles[bid]={feeLow:0,feeHigh:0,taxIncl:false,transIncl:false};
  /* 既に別セットに入っている媒体を選んだ場合、そちらから外す（元のセットが空になれば削除） */
  var oldBundleIds={};
  checked.forEach(function(id){
    if(!data[id])data[id]={enabled:true};
    if(data[id].bundleId&&data[id].bundleId!==bid)oldBundleIds[data[id].bundleId]=true;
    data[id].bundleId=bid;
  });
  Object.keys(oldBundleIds).forEach(function(oldBid){
    var stillHasMembers=Object.keys(data).some(function(k){return k!=='_bundles'&&data[k]&&data[k].bundleId===oldBid;});
    if(!stillHasMembers&&data._bundles)delete data._bundles[oldBid];
  });
  _bundleCreateOpen=false;
  renderPlatformDetails(data);
}

function dissolveBundle(bid){
  var data=getPlatformData();
  var b=(data._bundles||{})[bid];
  var memberIds=Object.keys(data).filter(function(k){return k!=='_bundles'&&data[k]&&data[k].bundleId===bid;});
  memberIds.forEach(function(id,i){
    data[id].bundleId=null;
    data[id].fee=(i===0&&b)?(b.feeLow!==undefined?b.feeLow:b.fee)||0:0;
    data[id].taxIncl=b?!!b.taxIncl:false;
    data[id].transIncl=b?!!b.transIncl:false;
  });
  if(data._bundles)delete data._bundles[bid];
  renderPlatformDetails(data);
}

function getPlatformData(){
  var prev=_curPlatformData||{};
  var prevBundles=prev._bundles||{};
  var result={_bundles:{}};
  Object.keys(prevBundles).forEach(function(bid){
    var feeEl=document.getElementById('bundlefee_'+bid);
    var feeHighEl=document.getElementById('bundlefeehigh_'+bid);
    var prevLow=prevBundles[bid].feeLow!==undefined?prevBundles[bid].feeLow:prevBundles[bid].fee;
    result._bundles[bid]={
      feeLow:feeEl?(Number(feeEl.value)||0):(prevLow||0),
      feeHigh:feeHighEl?(Number(feeHighEl.value)||0):(prevBundles[bid].feeHigh||0),
      taxIncl:!!prevBundles[bid].taxIncl,
      transIncl:!!prevBundles[bid].transIncl
    };
  });
  INF_PLATFORM_LIST.forEach(function(pl){
    var chk=document.getElementById('plchk_'+pl.id);
    var enabled=chk?chk.checked:!!(prev[pl.id]&&prev[pl.id].enabled);
    var bundleId=(prev[pl.id]&&prev[pl.id].bundleId)||null;
    if(bundleId&&result._bundles[bundleId]){
      result[pl.id]={enabled:enabled,bundleId:bundleId};
    }else{
      var feeEl=document.getElementById('plfee_'+pl.id);
      var taxEl=document.querySelector('input[name="pltax_setPlatformTax_'+pl.id+'"]:checked');
      var transEl=document.querySelector('input[name="pltrans_setPlatformTrans_'+pl.id+'"]:checked');
      result[pl.id]={
        enabled:enabled,
        fee:feeEl?(Number(feeEl.value)||0):((prev[pl.id]&&prev[pl.id].fee)||0),
        taxIncl:taxEl?taxEl.value==='1':!!(prev[pl.id]&&prev[pl.id].taxIncl),
        transIncl:transEl?transEl.value==='1':!!(prev[pl.id]&&prev[pl.id].transIncl)
      };
    }
  });
  return result;
}

var editingInfId=null;

function openInfluencerModal(id){
  editingInfId=id||null;
  var titleEl=document.getElementById('infModalTitle');
  if(titleEl)titleEl.textContent=id?'インフルエンサーを編集':'インフルエンサーを追加';
  ['iName','iHandle','iUrl','iGenre','iContact','iAgency','iMemo','iFeeLow','iFeeHigh','iOutreachDate','iArea','iTendency'].forEach(function(fid){var el=document.getElementById(fid);if(el)el.value='';});
  document.getElementById('iPlatform').value='Instagram';
  document.getElementById('iFollowers').value='';
  document.getElementById('iRating').value='';
  /* 新規追加は「未声掛け」から開始。起用実績はキャスティング履歴から自動判定するため、
     声かけ状況が未設定の既存登録はここでは強制せず「—（未設定）」のままにする */
  document.getElementById('iOutreachStatus').value=id?'':'未声掛け';
  if(id){
    var inf=DB.influencers.find(function(x){return x.id===id;});
    if(inf){
      var map={iName:'name',iHandle:'handle',iUrl:'url',iPlatform:'platform',iFollowers:'followers',iGenre:'genre',iContact:'contact',iAgency:'agency',iMemo:'memo',iRating:'rating',iArea:'area',iTendency:'tendency',iOutreachDate:'outreachDate'};
      Object.keys(map).forEach(function(fid){var el=document.getElementById(fid);if(el&&inf[map[fid]]!==undefined)el.value=inf[map[fid]]||'';});
      if(inf.outreachStatus)document.getElementById('iOutreachStatus').value=inf.outreachStatus;
      /* fee range */
      if(inf.feeLow!==undefined){document.getElementById('iFeeLow').value=inf.feeLow||'';}
      else if(inf.fee){document.getElementById('iFeeLow').value=inf.fee;}
      document.getElementById('iFeeHigh').value=inf.feeHigh||'';
      renderPlatformDetails(inf.platformDetails||{});
    }else{
      renderPlatformDetails({});
    }
  }
  openModal('infModal');
}

function saveInfluencer(){
  var name=document.getElementById('iName').value.trim();
  if(!name){alert('名前を入力してください');return;}
  var isEdit=!!editingInfId;
  var id=isEdit?editingInfId:uid();
  var feeLow=document.getElementById('iFeeLow').value;
  var feeHigh=document.getElementById('iFeeHigh').value;
  var inf={
    id:id,
    name:name,
    handle:document.getElementById('iHandle').value,
    url:document.getElementById('iUrl').value,
    platform:document.getElementById('iPlatform').value,
    followers:document.getElementById('iFollowers').value,
    genre:document.getElementById('iGenre').value,
    feeLow:feeLow,
    feeHigh:feeHigh,
    fee:feeLow, /* 後方互換 */
    contact:document.getElementById('iContact').value,
    agency:document.getElementById('iAgency').value,
    rating:document.getElementById('iRating').value,
    memo:document.getElementById('iMemo').value,
    outreachStatus:document.getElementById('iOutreachStatus').value,
    outreachDate:document.getElementById('iOutreachDate').value,
    area:document.getElementById('iArea').value,
    tendency:document.getElementById('iTendency').value,
    platformDetails:getPlatformData()
  };
  if(isEdit){
    var idx=DB.influencers.findIndex(function(x){return x.id===id;});
    if(idx>=0){DB.influencers[idx]=inf;}else{DB.influencers.push(inf);}
  }else{
    DB.influencers.push(inf);
  }
  closeModal('infModal');
  closeModal('infDetailModal');
  refreshAll();
  saveItem('influencers',inf);
}

function updatePostStatus(id,newStatus){
  var p=DB.posts.find(function(x){return x.id===id;});
  if(!p)return;
  p.status=newStatus;
  saveItem('posts',p);
  refreshAll();
}

function reschedulePost(id){
  closeModal('postModal');
  openPostModal(id);
}

/* 支払い（弊社から出ていく：インフルエンサー/クリエイター）
   中間ステップは維持し、最終段階のみ「支払い済み」に。既存キーはそのまま。 */
var INV_FLOW_PAYABLE=[
  {key:'pending',             label:'未受領',    icon:'📄', color:'var(--text3)', bg:'var(--bg3)',        border:'var(--border)'},
  {key:'sns_received',        label:'請求書受領', icon:'📥', color:'var(--accent)', bg:'var(--accent-bg)', border:'var(--accent-border)'},
  {key:'accounting_submitted',label:'経理申請',   icon:'📊', color:'var(--amber)',  bg:'var(--amber-bg)',  border:'var(--amber-border)'},
  {key:'done',                label:'支払い済み', icon:'💸', color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)'}
];
/* 入金（弊社が受け取る：広告費） */
var INV_FLOW_RECEIVABLE=[
  {key:'pending',  label:'未送付',        icon:'📄', color:'var(--text3)', bg:'var(--bg3)',        border:'var(--border)'},
  {key:'invoiced', label:'請求書送付済み', icon:'📤', color:'var(--accent)', bg:'var(--accent-bg)', border:'var(--accent-border)'},
  {key:'received', label:'入金確認済み',   icon:'✅', color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)'}
];
function invFlowFor(inv){return inv.payeeType==='ad'?INV_FLOW_RECEIVABLE:INV_FLOW_PAYABLE;}
/* 決済完了（支払い済み or 入金確認済み） */
function invSettled(inv){return inv.payeeType==='ad'?inv.status==='received':inv.status==='done';}

function renderInvFlow(inv){
  var FLOW=invFlowFor(inv);
  var cur=inv.status||'pending';
  var curIdx=FLOW.findIndex(function(s){return s.key===cur;});
  return'<div style="display:flex;align-items:center;gap:3px">'
    +FLOW.map(function(step,i){
      var done=i<=curIdx;
      var isNext=i===curIdx+1;
      var style='font-size:12px;padding:3px 7px;border-radius:5px;border:1px solid;white-space:nowrap;'
        +'background:'+(done?step.bg:'var(--bg3)')
        +';color:'+(done?step.color:'var(--text3)')
        +';border-color:'+(done?step.border:'var(--border)')
        +(isNext?';cursor:pointer;opacity:0.7':'');
      var click=isNext?'onclick="advanceInvFlow(\''+inv.id+'\',\''+step.key+'\')"':'';
      return'<span style="'+style+'" '+click+' title="'+(isNext?'クリックで次へ':'')+'">'+step.icon+' '+step.label+'</span>'
        +(i<FLOW.length-1?'<span style="color:var(--text3);font-size:11px">›</span>':'');
    }).join('')
  +'</div>';
}

/* 今後1週間のインフルエンサー来店予定：社内全体が一目で「何日何時に誰が来るか」を把握できるように */
function renderUpcomingVisits(){
  var el=document.getElementById('dash-upcoming-visits');
  if(!el)return;
  var today=new Date();today.setHours(0,0,0,0);
  var weekLater=new Date(today.getTime()+7*86400000);
  var upcoming=(DB.posts||[]).filter(function(p){
    if(p.type!=='inf_visit'||p.status==='cancelled')return false;
    var dt=new Date(p.date);
    return dt>=today&&dt<weekLater;
  }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  if(!upcoming.length){
    el.innerHTML='<div class="empty-state" style="padding:16px">今後1週間の来店予定はありません</div>';
    return;
  }
  var STATUS_LABEL={unbooked:'予約未',booked:'予約済み',visited:'来店済み'};
  el.innerHTML=upcoming.map(function(p){
    var dt=new Date(p.date);
    var dateStr=(dt.getMonth()+1)+'/'+dt.getDate()+'（'+['日','月','火','水','木','金','土'][dt.getDay()]+'）'+pad(dt.getHours())+':'+pad(dt.getMinutes());
    var inf=p.infId?DB.influencers.find(function(x){return x.id===p.infId;}):null;
    var stLabel=STATUS_LABEL[p.status]||p.status;
    var stColor=p.status==='booked'?'var(--accent)':p.status==='visited'?'var(--green)':'var(--amber)';
    return'<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)">'
      +'<span class="td-mono" style="color:var(--text2);white-space:nowrap;min-width:110px">'+dateStr+'</span>'
      +'<span style="font-size:14px;font-weight:500;color:var(--purple);flex:1;min-width:0">'+esc(inf?inf.name:'不明')+'</span>'
      +'<span style="font-size:13px;color:var(--text3)">'+esc(storeName(p.storeId))+'</span>'
      +'<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:'+stColor+'18;color:'+stColor+';white-space:nowrap">'+stLabel+'</span>'
    +'</div>';
  }).join('');
}

/* やること一覧：案件名＋現状のみのシンプルな一覧（チェック機能なし・各管理ページへのリンクのみ）
   投稿スケジュール系の更新はスケジュール管理ページ、進捗・追加費用は店舗詳細から行う。 */
function renderTodoList(){
  var el=document.getElementById('dash-todo');
  if(!el)return;
  var today=new Date(); today.setHours(0,0,0,0);
  var rows=[];

  function badge(text,color){
    var bg=color==='red'?'var(--red-bg)':color==='amber'?'var(--amber-bg)':'var(--accent-bg)';
    var fg=color==='red'?'var(--red)':color==='amber'?'var(--amber)':'var(--accent)';
    var bd=color==='red'?'var(--red-border)':color==='amber'?'var(--amber-border)':'var(--accent-border)';
    return'<span style="font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;border:1px solid '+bd+';background:'+bg+';color:'+fg+';margin-right:5px;vertical-align:middle">'+text+'</span>';
  }
  var navStore='<button style="font-size:13px;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);white-space:nowrap;flex-shrink:0" onclick="openStoreFromNotif(\'STOREID\')">店舗を開く →</button>';
  var navSchedule='<button style="font-size:13px;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);white-space:nowrap;flex-shrink:0" onclick="navigate(\'schedule\')">スケジュールを開く →</button>';

  DB.stores.filter(function(s){return s.status==='active';}).forEach(function(s){
    var current=null; /* {label, color} */

    /* 1. 追加費用（未対応） */
    var pendingFee=(s.additionalFees||[]).find(function(f){return f.status!=='done';});
    if(pendingFee){
      current={label:'追加費用 未対応：'+esc(pendingFee.description)+'（'+fmtMoney(pendingFee.amount)+'）',color:'amber',nav:navStore.replace('STOREID',s.id)};
    }

    /* 2. 案件進捗：次の未完了ステップ */
    if(!current){
      var prog=s.progress||{};
      var steps=progressStepsFor(s);
      for(var i=0;i<steps.length;i++){
        var step=steps[i];
        var p=prog[step.key]||{};
        var done=step.accounts?isAccountsDone(p):(p.status==='done'||p.status==='na');
        if(done)continue;
        if(step.key==='kickoff'&&p.salesJoin){
          current={label:'キックオフ 営業同席希望あり（未実施）',color:'red',nav:navStore.replace('STOREID',s.id)};
        }else if(step.accounts){
          var missing=step.accounts.filter(function(n){return!(p.accountChecks||{})[n];});
          current={label:'アカウント未連携：'+missing.join('・'),color:'amber',nav:navStore.replace('STOREID',s.id)};
        }else{
          current={label:step.label+' 未完了',color:'amber',nav:navStore.replace('STOREID',s.id)};
        }
        break;
      }
    }

    /* 3. 投稿スケジュール：最も近い（または最も超過している）未完了の予定 */
    if(!current){
      var pending=DB.posts.filter(function(p){
        return p.storeId===s.id&&p.status!=='done'&&p.status!=='visited'&&p.status!=='cancelled'&&p.status!=='approved';
      }).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
      if(pending.length){
        var post=pending[0];
        var dt=new Date(post.date);
        var isOverdue=dt<today;
        var dateStr=(dt.getMonth()+1)+'/'+dt.getDate()+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
        var typeL=TYPE_LABEL[post.type]||post.type;
        current={label:dateStr+' '+typeL+(isOverdue?'（期限超過）':''),color:isOverdue?'red':'accent',nav:navSchedule};
      }
    }

    if(current)rows.push({storeId:s.id,name:s.name,current:current});
  });

  if(!rows.length){
    el.innerHTML='<div class="empty-state" style="padding:20px">✓ 今のところやることはありません</div>';
    return;
  }
  rows.sort(function(a,b){var order={red:0,amber:1,accent:2};return(order[a.current.color]||3)-(order[b.current.color]||3);});
  el.innerHTML=rows.map(function(r){
    var barColor=r.current.color==='red'?'var(--red)':r.current.color==='amber'?'var(--amber)':'var(--border2)';
    return'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);border-left:3px solid '+barColor+'">'
      +'<div style="min-width:0">'
        +'<div style="font-size:14px;font-weight:500;color:var(--text)">'+esc(r.name)+'</div>'
        +'<div style="font-size:12px;color:var(--text3);margin-top:2px">'+badge(r.current.color==='red'?'要対応':r.current.color==='amber'?'要対応':'予定',r.current.color)+r.current.label+'</div>'
      +'</div>'
      +r.current.nav
    +'</div>';
  }).join('');
}


function openGoalEdit(){
  var current=localStorage.getItem('gc_sales_goal')||'100000000';
  var val=prompt('年間売上目標を入力してください（円）\n例：100000000 → 1億円',current);
  if(val===null)return;
  var num=Number(val.replace(/[,，円]/g,''));
  if(!num||num<1){alert('正しい金額を入力してください');return;}
  localStorage.setItem('gc_sales_goal',String(num));
  if(typeof saveAppSetting==='function')saveAppSetting('sales_goal',num);
  refreshAll();
}

function markInvDone(invId){
  if(!DB.invoices)return;
  var inv=DB.invoices.find(function(x){return x.id===invId;});
  if(!inv)return;
  inv.status=inv.payeeType==='ad'?'received':'done';
  saveItem('invoices',inv);
  refreshAll();
  if(currentPage==='accounting')renderAccounting();
}

function advanceInvFlow(invId,newStatus){
  if(!DB.invoices)return;
  var inv=DB.invoices.find(function(x){return x.id===invId;});
  if(!inv)return;
  inv.status=newStatus;
  saveItem('invoices',inv);
  renderAccounting();
}

function deleteInfluencer(id){
  if(!confirm('このインフルエンサーを削除しますか？'))return;
  DB.influencers=DB.influencers.filter(function(i){return i.id!==id;});
  closeModal('infDetailModal');
  refreshAll();
  deleteItem('influencers',id);
}

function fmtFeeRange(inf){
  var low=inf.feeLow!==undefined?inf.feeLow:inf.fee;
  var high=inf.feeHigh;
  if(!low&&!high)return'—';
  if(low&&high&&String(low)!==String(high))return Number(low).toLocaleString()+'〜'+Number(high).toLocaleString()+'円';
  return Number(low||high).toLocaleString()+'円';
}

function ratingStars(r){
  if(!r)return'';
  var n=parseInt(r);
  var stars='★'.repeat(n)+'☆'.repeat(5-n);
  var colors={5:'var(--green)',4:'var(--green)',3:'var(--amber)',2:'var(--amber)',1:'var(--red)'};
  return '<span style="color:'+colors[n]+';font-size:13px">'+stars+'</span>';
}
/* 評価が「要注意」「NG」のインフルエンサーを一覧・詳細で一目でわかるようにするバッジ */
function ratingWarningBadge(r){
  var n=parseInt(r);
  if(n===2)return'<span class="badge" style="background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-border);white-space:nowrap">⚠️ 要注意</span>';
  if(n===1)return'<span class="badge" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);white-space:nowrap">🚫 NG</span>';
  return'';
}

function platformAbbr(label){
  if(!label)return'';
  if(label.indexOf('Instagram')===0)return'IG';
  if(label==='TikTok')return'TT';
  if(label.indexOf('YouTube')===0)return'YT';
  if(label==='Facebook')return'FB';
  if(label==='Lemon8')return'L8';
  if(label.indexOf('Google')===0)return'Google';
  return label;
}

function castPostUrlEntries(c){
  var entries=[];
  var pu=c.postUrls||{};
  Object.keys(pu).forEach(function(pid){
    if(!pu[pid])return;
    var pl=INF_PLATFORM_LIST.find(function(p){return p.id===pid;});
    entries.push({label:pl?pl.label:pid,url:pu[pid]});
  });
  if(!entries.length&&c.postUrl){
    var pp=c.platforms&&c.platforms.length?c.platforms:(c.platform?[c.platform]:[]);
    entries.push({label:pp[0]||'投稿',url:c.postUrl});
  }
  return entries;
}

function openInfluencerDetail(id){
  var inf=DB.influencers.find(function(x){return x.id===id;});
  if(!inf)return;
  var platColor={Instagram:'#e1306c',TikTok:'#010101',YouTube:'#ff0000',X:'#1da1f2'};
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  /* アカウントURL決定 */
  var accountUrl=inf.url||(inf.handle?(platUrl[inf.platform]||'')+(inf.handle.replace('@','')):'');
  var castings=DB.castings.filter(function(c){return c.infId===id;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var totalFee=castings.reduce(function(s,c){return s+(Number(c.fee)||0);},0);
  var totalReach=castings.reduce(function(s,c){return s+(Number(c.reach)||0);},0);
  document.getElementById('infDetailTitle').textContent=inf.name+(inf.handle?' ('+inf.handle+')':'');
  var editBtn=document.getElementById('infDetailEditBtn');
  if(editBtn)editBtn.onclick=function(){closeModal('infDetailModal');openInfluencerModal(id);};
  document.getElementById('infDetailBody').innerHTML=
    /* プロフィールヘッダ */
    '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:18px">'
      +'<div style="width:48px;height:48px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>'
      +'<div style="flex:1">'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          +(accountUrl
            ?'<a href="'+esc(accountUrl)+'" target="_blank" rel="noopener" style="font-size:16px;font-weight:500;color:var(--accent);text-decoration:none">'+esc(inf.name)+'&nbsp;↗</a>'
            :'<span style="font-size:16px;font-weight:500">'+esc(inf.name)+'</span>'
          )
          +(inf.handle?'<span style="font-size:13px;color:'+(platColor[inf.platform]||'var(--text3)')+'">'+esc(inf.handle)+'</span>':'')
          +ratingStars(inf.rating)
          +ratingWarningBadge(inf.rating)
        +'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">'
          +(infOutreachStatus(inf)?'<span class="badge" style="font-size:11px;border:1px solid;'+(INF_OUTREACH_BADGE[infOutreachStatus(inf)]||'')+'">'+esc(infOutreachStatus(inf))+'</span>':'')
          +'<span class="badge" style="font-size:11px;border:1px solid;'+(INF_ENGAGEMENT_BADGE[infEngagementStatus(inf)]||'')+'">'+esc(infEngagementStatus(inf))+'</span>'
          +(inf.platform?'<span class="badge b-blue">'+esc(inf.platform)+'</span>':'')
          +(inf.genre?'<span class="badge b-gray">'+esc(inf.genre)+'</span>':'')
          +(inf.agency&&inf.agency!=='なし'?'<span class="badge b-gray">'+esc(inf.agency)+'</span>':'')
        +'</div>'
        +((inf.area||inf.tendency||inf.outreachDate)?'<div style="font-size:12px;color:var(--text3);margin-top:6px">'
          +(inf.outreachDate?'声かけ日：'+esc(inf.outreachDate)+'　':'')
          +(inf.area?'エリア：'+esc(inf.area)+'　':'')
          +(inf.tendency?'傾向：'+esc(inf.tendency):'')
        +'</div>':'')
      +'</div>'
    +'</div>'
    /* 数値サマリー */
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px">'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:18px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--text)">'+(inf.followers?Number(inf.followers).toLocaleString():'—')+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">フォロワー</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:15px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--accent)">'+fmtFeeRange(inf)+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">PR 費用</div></div>'
      +'<div class="card-sm" style="text-align:center"><div style="font-size:18px;font-weight:500;font-family:"Noto Sans JP",sans-serif;color:var(--green)">'+castings.length+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">起用回数</div></div>'
    +'</div>'
    /* 連絡先 */
    +(inf.contact?'<div style="margin-bottom:12px;padding:10px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px"><span style="color:var(--text3)">連絡先：</span><span style="color:var(--accent)">'+esc(inf.contact)+'</span></div>':'')
    /* メモ */
    +(inf.memo?'<div style="margin-bottom:16px;padding:10px 12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:var(--r);font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap">'+esc(inf.memo)+'</div>':'')
    /* キャスティング履歴 */
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">キャスティング履歴</div>'
    +(castings.length===0
      ?'<div class="empty-state" style="padding:16px">まだ起用履歴がありません</div>'
      :('<div style="margin-bottom:12px;font-size:13px;color:var(--text3)">累計費用 <strong style="color:var(--text)">'+totalFee.toLocaleString()+'円</strong> ／ 累計リーチ <strong style="color:var(--text)">'+totalReach.toLocaleString()+'</strong></div>'
        +'<div class="table-wrap"><table><thead><tr><th>店舗</th><th>投稿日</th><th>媒体</th><th>費用</th><th>リーチ</th><th>成果メモ</th><th>投稿</th></tr></thead><tbody>'
        +castings.map(function(c){
          var pp=c.platforms&&c.platforms.length?c.platforms:(c.platform?[c.platform]:[]);
          var platCell=pp.length?pp.map(function(p){return'<span style="font-size:11px;padding:1px 5px;background:var(--accent-bg);color:var(--accent);border-radius:3px;margin:1px;display:inline-block">'+esc(p)+'</span>';}).join(''):'—';
          var urlEntries=castPostUrlEntries(c);
          var postCell=urlEntries.length?urlEntries.map(function(e){return'<a href="'+esc(e.url)+'" target="_blank" rel="noopener" style="color:var(--accent);display:block;white-space:nowrap;font-size:12px">'+esc(e.label)+' 🔗</a>';}).join(''):'<span style="color:var(--text3)">—</span>';
          return '<tr><td>'+esc(storeName(c.storeId))+'</td><td class="td-mono">'+fmtD(c.date)+'</td><td>'+platCell+'</td><td class="td-mono">'+fmtMoney(c.fee)+'</td><td class="td-mono">'+(c.reach?Number(c.reach).toLocaleString():'—')+'</td><td style="color:var(--text3);max-width:160px">'+esc((c.result||'').slice(0,60))+'</td><td onclick="event.stopPropagation()">'+postCell+'</td></tr>';
        }).join('')
        +'</tbody></table></div>'
      )
    )
    /* 投稿URL一覧（案件ごとに蓄積） */
    +(function(){
      var withUrls=castings.filter(function(c){return castPostUrlEntries(c).length>0;});
      if(!withUrls.length)return'';
      return'<div style="margin-top:16px;margin-bottom:16px">'
        +'<div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:8px">🔗 投稿URL一覧</div>'
        +withUrls.map(function(c){
          var entries=castPostUrlEntries(c);
          return'<div style="padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);margin-bottom:8px">'
            +'<div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px">'+esc(storeName(c.storeId))+' <span style="font-weight:400;color:var(--text3);font-size:12px">'+(c.date?fmtD(c.date):'—')+'</span></div>'
            +entries.map(function(e){
              return'<div style="font-size:12px;color:var(--text2);padding:2px 0;overflow-wrap:anywhere"><span style="color:var(--text3)">'+esc(e.label)+'：</span> <a href="'+esc(e.url)+'" target="_blank" rel="noopener" style="color:var(--accent)">'+esc(e.url)+'</a></div>';
            }).join('')
          +'</div>';
        }).join('')
      +'</div>';
    })()
    /* 対応媒体・費用（テキストのみ。ボタン行とは独立させる） */
    +(function(){
      var pd=inf.platformDetails||{};
      var enabledIds=INF_PLATFORM_LIST.filter(function(pl){return pd[pl.id]&&pd[pl.id].enabled;}).map(function(pl){return pl.id;});
      if(!enabledIds.length)return'';
      var shown={};
      var lines=enabledIds.map(function(pid){
        if(shown[pid])return'';
        var d=pd[pid]||{};
        var bid=d.bundleId;
        var label,feeStr,transStr;
        if(bid&&pd._bundles&&pd._bundles[bid]){
          var members=enabledIds.filter(function(x){return(pd[x]||{}).bundleId===bid;});
          members.forEach(function(m){shown[m]=true;});
          var b=pd._bundles[bid];
          var labels=members.map(function(m){var p=INF_PLATFORM_LIST.find(function(x){return x.id===m;});return p?p.label:m;});
          label=labels.length>1?labels.join('＋')+'（セット）':labels[0];
          feeStr=feeRangeStr(b.feeLow!==undefined?b.feeLow:b.fee,b.feeHigh,b.taxIncl);
          transStr=b.transIncl?'交通費込':'交通費別';
        }else{
          shown[pid]=true;
          var pl=INF_PLATFORM_LIST.find(function(x){return x.id===pid;});
          label=pl?pl.label:pid;
          feeStr=feeRangeStr(d.fee,d.feeHigh,d.taxIncl);
          transStr=d.transIncl?'交通費込':'交通費別';
        }
        return'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">'
          +'<span style="color:var(--text3);min-width:140px;flex-shrink:0">'+esc(label)+'</span>'
          +'<span style="flex:1;color:var(--text2)">'+feeStr+' ・ '+transStr+'</span>'
        +'</div>';
      }).join('');
      return'<div style="margin-bottom:14px">'
        +'<div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:6px">📱 対応媒体・費用</div>'
        +lines
      +'</div>';
    })()

    +'<div class="form-actions" style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">'
      +'<button class="btn-ghost-danger" onclick="deleteInfluencer(\''+id+'\')">削除</button>'
      +'<button class="btn" onclick="closeModal(\'infDetailModal\')">閉じる</button>'
      +'<button class="btn" onclick="closeModal(\'infDetailModal\');openCastingModal({infId:\''+id+'\'})">キャスティング登録</button>'
      +'<button class="btn btn-primary" onclick="closeModal(\'infDetailModal\');openInfluencerModal(\''+id+'\')">編集</button>'
    +'</div>';
  openModal('infDetailModal');
}

/* 来店予定日のリスケ履歴（変更前日付 → 変更後日付・理由）を表として表示 */
function renderRescheduleHistory(list){
  var el=document.getElementById('cRescheduleHistory');
  if(!el)return;
  if(!list||!list.length){el.innerHTML='';return;}
  var sorted=list.slice().sort(function(a,b){return new Date(b.at)-new Date(a.at);});
  el.innerHTML='<div style="margin-top:10px">'
    +'<div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">🔁 リスケ履歴（'+sorted.length+'件）</div>'
    +'<div class="table-wrap"><table><thead><tr><th style="font-size:11px">変更前</th><th style="font-size:11px">変更後</th><th style="font-size:11px">理由</th><th style="font-size:11px">記録日</th></tr></thead><tbody>'
    +sorted.map(function(r){
      return'<tr>'
        +'<td class="td-mono" style="font-size:12px">'+(r.from?(/^\d{4}-\d{2}-\d{2}/.test(r.from)?fmtD(r.from):esc(r.from)):'—')+'</td>'
        +'<td class="td-mono" style="font-size:12px">'+(r.to?(/^\d{4}-\d{2}-\d{2}/.test(r.to)?fmtD(r.to):esc(r.to)):'—')+'</td>'
        +'<td style="font-size:12px;color:var(--text2)">'+esc(r.reason||'—')+'</td>'
        +'<td style="font-size:11px;color:var(--text3)">'+fmtD((r.at||'').split('T')[0])+'</td>'
      +'</tr>';
    }).join('')
    +'</tbody></table></div>'
  +'</div>';
}

/* 「リスケ中（日程未定）」チェック時は来店予定日欄をクリアして矛盾した状態にならないようにする */
function onVisitTbdChange(){
  var cb=document.getElementById('cVisitTbd');
  if(!cb||!cb.checked)return;
  var dw=document.getElementById('cVisitDateWrap');
  if(dw&&dw._setDate)dw._setDate('');
  var dateEl=document.getElementById('cVisitDate');if(dateEl)dateEl.value='';
}

var editingCastId=null;
var _curCastPostUrls={};
function openCastingModal(opts){
  updateCastSelects();
  editingCastId=null;
  _curCastPostUrls={};
  ['cFee','cReach','cVisitCount','cResult','cVisitDate','cDraftDate','cDate','cVisitReason'].forEach(function(fid){
    var el=document.getElementById(fid);if(el)el.value='';
  });
  var ccb=document.getElementById('cContractSent');if(ccb)ccb.checked=false;
  var cStatusEl=document.getElementById('cStatus');if(cStatusEl)cStatusEl.value='active';
  var cTbdEl=document.getElementById('cVisitTbd');if(cTbdEl)cTbdEl.checked=false;
  renderRescheduleHistory([]);
  /* 媒体選択は updateCastPlatformSelect() で初期化するためここでは不要 */
  var titleEl=document.getElementById('castModalTitle');
  if(titleEl)titleEl.textContent='キャスティング記録';
  if(opts){
    /* 編集モード */
    if(opts.editId){
      editingCastId=opts.editId;
      var ec=DB.castings.find(function(x){return x.id===opts.editId;});
      if(ec){
        if(titleEl)titleEl.textContent='キャスティングを編集';
        var set=function(fid,v){var el=document.getElementById(fid);if(el&&v)el.value=v;};
        set('cStore',ec.storeId);set('cInf',ec.infId);
        /* 経理管理に紐づく請求書があれば、そちらの確定PR費用を優先する */
        var linkedInv=(DB.invoices||[]).find(function(x){return x.castingId===ec.id&&x.payeeType!=='ad';});
        var savedFee=(linkedInv&&linkedInv.prFee)?linkedInv.prFee:ec.fee;
        set('cFee',savedFee);
        /* 媒体は INF選択後に更新してから復元 */
        setTimeout(function(){
          updateCastPlatformBoxes();
          /* 保存済み platforms（配列）またはlegacy platform（文字列）を復元 */
          var savedPlats=ec.platforms&&ec.platforms.length?ec.platforms:(ec.platform?[ec.platform]:[]);
          document.querySelectorAll('.cast-plat-chk').forEach(function(cb){
            var pl=INF_PLATFORM_LIST.find(function(p){return p.id===cb.value;});
            var label=pl?pl.label:cb.value;
            if(savedPlats.indexOf(label)>=0||savedPlats.indexOf(cb.value)>=0){
              cb.checked=true;
            }
          });
          /* 投稿URL復元（新形式postUrls優先、旧形式postUrlは最初の媒体に割当） */
          _curCastPostUrls=Object.assign({},ec.postUrls||{});
          if(!Object.keys(_curCastPostUrls).length&&ec.postUrl&&savedPlats[0]){
            var pl0=INF_PLATFORM_LIST.find(function(p){return p.label===savedPlats[0];});
            if(pl0)_curCastPostUrls[pl0.id]=ec.postUrl;
          }
          /* onCastPlatformChangeは料金表からの自動計算で上書きするため、
             編集時は保存済み（または請求書確定済み）の実額を再度優先する */
          onCastPlatformChange();
          if(savedFee)document.getElementById('cFee').value=savedFee;
        },50);
        set('cReach',ec.reach);set('cVisitCount',ec.visitCount);set('cResult',ec.result);
        set('cVisitDate',ec.visitDate);set('cDraftDate',ec.draftDate);set('cDate',ec.date);
        var ccbEdit=document.getElementById('cContractSent');if(ccbEdit)ccbEdit.checked=!!ec.contractSent;
        var cStatusEdit=document.getElementById('cStatus');if(cStatusEdit)cStatusEdit.value=ec.status||'active';
        var linkedVisitPost=DB.posts.find(function(p){return p.castingId===ec.id&&p.type==='inf_visit';});
        var cTbdEdit=document.getElementById('cVisitTbd');if(cTbdEdit)cTbdEdit.checked=!!(linkedVisitPost&&linkedVisitPost.status==='date_tbd');
        renderRescheduleHistory(ec.reschedules||[]);
      }
    }
    /* プリセット */
    if(opts.storeId){var s=document.getElementById('cStore');if(s)s.value=opts.storeId;}
    if(opts.infId){var i=document.getElementById('cInf');if(i)i.value=opts.infId;}
  }
  /* 日付ピッカー初期化 */
  var yr=new Date().getFullYear();
  makeDatePicker('cVisitDateWrap','cVisitDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeDatePicker('cDraftDateWrap','cDraftDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeDatePicker('cDateWrap','cDate',{yearFrom:yr,yearTo:yr+2,yearLabel:'年'});
  makeTimePicker('cVisitTimeWrap','cVisitTime');
  /* 編集時: 日付を復元 */
  if(opts&&opts.editId){
    var ec2=DB.castings.find(function(x){return x.id===opts.editId;});
    if(ec2){
      var setDp=function(wrapId,hidId,val){
        var wrap=document.getElementById(wrapId);if(wrap&&wrap._setDate)wrap._setDate(val||'');
      };
      setDp('cVisitDateWrap','cVisitDate',ec2.visitDate);
      /* 来店時間復元 */
      if(ec2.visitDate&&ec2.visitDate.includes('T')){
        var vt=ec2.visitDate.split('T')[1].slice(0,5);
        var vtWrap=document.getElementById('cVisitTimeWrap');
        if(vtWrap&&vtWrap._setTime)vtWrap._setTime(vt);
      }
      setDp('cDraftDateWrap','cDraftDate',ec2.draftDate);
      setDp('cDateWrap','cDate',ec2.date);
    }
  }
  /* INF選択時に媒体を更新 */
  var cInfEl=document.getElementById('cInf');
  if(cInfEl)cInfEl.onchange=function(){updateCastPlatformBoxes();};
  updateCastPlatformBoxes();
  openModal('castModal');
}

function updateCastPlatformBoxes(){
  var infId=(document.getElementById('cInf')||{}).value||'';
  var inf=DB.influencers.find(function(x){return x.id===infId;});
  var pd=inf&&inf.platformDetails?inf.platformDetails:{};
  var enabled=INF_PLATFORM_LIST.filter(function(pl){return pd[pl.id]&&pd[pl.id].enabled;});
  var showList=enabled.length?enabled:INF_PLATFORM_LIST;
  var box=document.getElementById('cPlatformBoxes');
  if(!box)return;
  box.innerHTML=showList.map(function(pl){
    var info=platformFeeInfo(pd,pl.id);
    var feeStr=info.fee?' <span style="font-size:12px;color:var(--accent)">¥'+Number(info.fee).toLocaleString()+(info.bundleId?' (セット)':'')+'</span>':'';
    return'<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:20px;cursor:pointer;font-size:13px;white-space:nowrap;transition:background .1s,border-color .1s">'
      +'<input type="checkbox" value="'+pl.id+'" class="cast-plat-chk" onchange="onCastPlatformChange()" style="width:13px;height:13px;accent-color:var(--accent)">'
      +esc(pl.label)+feeStr
      +'</label>';
  }).join('');
  document.getElementById('cFee').value='';
  document.getElementById('cFeeTaxLabel').textContent='';
  document.getElementById('cFeeTransLabel').textContent='';
  renderCastPostUrlBoxes();
}
/* 後方互換: 旧コードからの呼び出しがあればBoxesにリダイレクト */
function updateCastPlatformSelect(){updateCastPlatformBoxes();}

function onCastPlatformChange(){
  var infId=(document.getElementById('cInf')||{}).value||'';
  var inf=DB.influencers.find(function(x){return x.id===infId;});
  var pd=inf&&inf.platformDetails?inf.platformDetails:{};
  /* チェック済みラベルのビジュアル更新 */
  document.querySelectorAll('.cast-plat-chk').forEach(function(cb){
    var lbl=cb.closest('label');
    if(!lbl)return;
    lbl.style.background=cb.checked?'var(--accent-bg)':'var(--bg2)';
    lbl.style.borderColor=cb.checked?'var(--accent)':'var(--border)';
    lbl.style.fontWeight=cb.checked?'500':'400';
  });
  /* 費用自動計算（INF媒体設定がある場合） */
  var checked=Array.from(document.querySelectorAll('.cast-plat-chk:checked'));
  if(!checked.length){
    document.getElementById('cFee').value='';
    document.getElementById('cFeeTaxLabel').textContent='';
    document.getElementById('cFeeTransLabel').textContent='';
    return;
  }
  var totalFee=0;var taxSet={};var transSet={};var countedBundles={};
  checked.forEach(function(cb){
    var info=platformFeeInfo(pd,cb.value);
    if(info.bundleId){
      if(countedBundles[info.bundleId])return; /* セット料金は1回のみ加算 */
      countedBundles[info.bundleId]=true;
    }
    if(info.fee){totalFee+=Number(info.fee);taxSet[info.taxIncl?'税込':'税別']=1;transSet[info.transIncl?'交通費込':'交通費別途']=1;}
  });
  if(totalFee>0){
    document.getElementById('cFee').value=totalFee;
    document.getElementById('cFeeTaxLabel').textContent=Object.keys(taxSet).join('・');
    document.getElementById('cFeeTransLabel').textContent=Object.keys(transSet).join('・');
  }
  renderCastPostUrlBoxes();
}

function renderCastPostUrlBoxes(){
  var box=document.getElementById('cPostUrlBoxes');
  if(!box)return;
  var checked=Array.from(document.querySelectorAll('.cast-plat-chk:checked'));
  if(!checked.length){
    box.innerHTML='<div style="font-size:12px;color:var(--text3)">媒体を選択すると入力欄が表示されます</div>';
    return;
  }
  box.innerHTML=checked.map(function(cb){
    var pl=INF_PLATFORM_LIST.find(function(p){return p.id===cb.value;});
    var label=pl?pl.label:cb.value;
    var val=_curCastPostUrls[cb.value]||'';
    return'<div style="display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:12px;color:var(--text2);min-width:80px;flex-shrink:0">'+esc(label)+'</span>'
      +'<input type="url" data-plid="'+esc(cb.value)+'" class="cast-posturl-input" value="'+esc(val)+'" placeholder="https://..." style="flex:1" oninput="onCastPostUrlInput(this)">'
    +'</div>';
  }).join('');
}
function onCastPostUrlInput(el){
  _curCastPostUrls[el.getAttribute('data-plid')]=el.value.trim();
}

function saveCasting(){
  var sid=document.getElementById('cStore').value;
  var iid=document.getElementById('cInf').value;
  var dt=document.getElementById('cDate').value;
  if(!sid||!iid){alert('店舗とインフルエンサーは必須です');return;}
  var isEdit=!!editingCastId;
  var visitDate=document.getElementById('cVisitDate').value;
  var draftDate=document.getElementById('cDraftDate').value;
  /* 複数選択された媒体を収集 */
  var platChks=Array.from(document.querySelectorAll('.cast-plat-chk:checked'));
  var platforms=platChks.map(function(cb){
    var pl=INF_PLATFORM_LIST.find(function(p){return p.id===cb.value;});
    return pl?pl.label:cb.value;
  });
  var platform=platforms[0]||''; /* 後方互換: 最初の媒体を単一フィールドにも保存 */
  var fee=document.getElementById('cFee').value;
  /* 編集時は既存IDを使う、新規時のみuid()生成 */
  var castId=isEdit?editingCastId:uid();
  /* 新規の場合：同じ店舗×同じINFの組み合わせが既にあれば上書き扱いにする
     （店舗を跨いでinfIdだけで一致判定すると、別店舗の既存キャスティングを
       誤って現在の店舗に付け替えてしまうため、storeIdも一致条件に含める） */
  if(!isEdit){
    var existing=DB.castings.find(function(x){return x.infId===iid&&x.storeId===sid;});
    if(existing){castId=existing.id;isEdit=true;}
  }
  var oldCastId=isEdit?castId:null;
  var prevRecord=isEdit?(DB.castings.find(function(x){return x.id===castId;})||{}):{};
  var prevVisitDate=prevRecord.visitDate||'';
  var visitTbd=!!(document.getElementById('cVisitTbd')&&document.getElementById('cVisitTbd').checked);
  /* 来店予定日を変更して保存した場合はリスケ履歴に記録（理由は任意）。
     日程未定（リスケ中）へ切り替えた場合も、日程が決まっていた状態からの変化として記録する。 */
  var reschedules=(prevRecord.reschedules||[]).slice();
  if(prevVisitDate&&visitDate&&prevVisitDate!==visitDate){
    reschedules.push({
      from:prevVisitDate,to:visitDate,
      reason:document.getElementById('cVisitReason').value.trim(),
      at:new Date().toISOString()
    });
  }else if(prevVisitDate&&!visitDate&&visitTbd){
    reschedules.push({
      from:prevVisitDate,to:'（日程未定）',
      reason:document.getElementById('cVisitReason').value.trim(),
      at:new Date().toISOString()
    });
  }
  var c={
    id:castId,storeId:sid,infId:iid,date:dt,
    visitDate:visitDate,draftDate:draftDate,
    platform:platform,platforms:platforms,fee:fee,
    reach:document.getElementById('cReach').value,
    visitCount:document.getElementById('cVisitCount').value,
    result:document.getElementById('cResult').value,
    postUrls:(function(){var o={};Object.keys(_curCastPostUrls).forEach(function(k){if(_curCastPostUrls[k])o[k]=_curCastPostUrls[k];});return o;})(),
    contractSent:!!(document.getElementById('cContractSent')&&document.getElementById('cContractSent').checked),
    status:document.getElementById('cStatus')?document.getElementById('cStatus').value:'active',
    liaisonNeeded:!!prevRecord.liaisonNeeded,
    reschedules:reschedules
  };
  if(isEdit){
    var eidx=DB.castings.findIndex(function(x){return x.id===c.id;});
    if(eidx>=0){DB.castings[eidx]=c;}else{DB.castings.push(c);}
  }else{
    DB.castings.push(c);
  }

  /* 投稿スケジュール3ステップ：日付が変わっていなければ既存のステータス（完了済みなど）を維持する。
     日付が実際に変更された場合のみ「リスケ」としてステータスをリセットする。
     日付欄が空になった場合はそのステップの予定を削除する。 */
  var existingPosts=oldCastId?DB.posts.filter(function(p){return p.castingId===oldCastId;}):[];
  function upsertSchedulePost(type,dateVal,defaultStatus,noteText,extra,keepIfEmpty){
    var existing=existingPosts.find(function(p){return p.type===type;});
    if(!dateVal&&!keepIfEmpty){
      if(existing){DB.posts=DB.posts.filter(function(p){return p.id!==existing.id;});deleteItem('posts',existing.id);}
      return;
    }
    if(existing){
      var rescheduled=dateVal&&existing.date&&existing.date!==dateVal;
      existing.date=dateVal;
      if(rescheduled||(!dateVal&&keepIfEmpty))existing.status=defaultStatus;
      Object.assign(existing,extra);
      existing.note=noteText;
      saveItem('posts',existing);
    }else{
      var np=Object.assign({id:uid(),storeId:sid,infId:iid,castingId:c.id,type:type,date:dateVal,status:defaultStatus,note:noteText},extra);
      DB.posts.push(np);
      saveItem('posts',np);
    }
  }
  var visitTime=document.getElementById('cVisitTime')?document.getElementById('cVisitTime').value:'12:00';
  var visitIsTbd=!visitDate&&visitTbd;
  upsertSchedulePost('inf_visit',visitDate?visitDate+'T'+visitTime:'',visitIsTbd?'date_tbd':'unbooked','キャスティングID:'+c.id,{platform:platform,infFee:fee},visitIsTbd);
  upsertSchedulePost('inf_draft',draftDate?draftDate+'T12:00':'','draft','初稿確認 キャスティングID:'+c.id,{platform:platform});
  upsertSchedulePost('inf_post',dt?dt+'T12:00':'','scheduled','投稿予定 キャスティングID:'+c.id,{platform:platform,infFee:fee});
  /* キャスティング自体をキャンセルにした場合、紐づく来店予定・初稿確認・投稿予定も
     まとめてキャンセル扱いにする（スケジュール側にキャンセル済み案件のアラートが残らないように） */
  if(c.status==='cancelled'){
    DB.posts.filter(function(p){return p.castingId===c.id;}).forEach(function(p){
      if(p.status!=='cancelled'){p.status='cancelled';saveItem('posts',p);}
    });
  }

  closeModal('castModal');
  ['cFee','cReach','cResult','cVisitDate','cDraftDate','cDate'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  saveItem('castings',c);
  refreshAll();
  /* 来店予定日が新たに入力された（未入力→入力、または日付変更）タイミングでSNS局に通知 */
  if(visitDate&&visitDate!==prevVisitDate&&typeof notifyCastingVisit==='function'){
    var _infForNotif=DB.influencers.find(function(x){return x.id===iid;});
    var _infNameForNotif=_infForNotif?_infForNotif.name:'不明';
    notifyCastingVisit(storeName(sid),_infNameForNotif,platform,visitDate,visitTime,infAccountUrlById(iid)).catch(function(){});
    /* 撮影スケジュール管理シート＋Googleカレンダー連携（担当営業マスタと名前が一致する場合のみ） */
    if(typeof notifyShootingCalendar==='function'){
      var _storeForCal=DB.stores.find(function(x){return x.id===sid;});
      if(_storeForCal&&_storeForCal.ourManager){
        notifyShootingCalendar(storeName(sid),visitDate,visitTime,_infNameForNotif,_storeForCal.ourManager).catch(function(){});
      }
    }
  }
}
function toggleCastContractSent(id){
  var c=DB.castings.find(function(x){return x.id===id;});
  if(!c)return;
  c.contractSent=!c.contractSent;
  saveItem('castings',c);
  renderCasting();
}

function toggleCastLiaison(id){
  var c=DB.castings.find(function(x){return x.id===id;});
  if(!c)return;
  c.liaisonNeeded=!c.liaisonNeeded;
  saveItem('castings',c);
  renderCasting();
}

function openInvoiceFromCasting(castingId){
  var c=DB.castings.find(function(x){return x.id===castingId;});
  if(!c)return;
  openInvoiceModal(null,{castingId:castingId,infId:c.infId,storeId:c.storeId,isEstimate:true});
}

function deleteCasting(id){
  if(!confirm('このキャスティング記録を削除しますか？\n紐づく来店予定・初稿確認・投稿予定も全て削除されます。'))return;
  /* 紐づくpostsもSupabase＆メモリから削除 */
  var toDelete=DB.posts.filter(function(p){return p.castingId===id;});
  toDelete.forEach(function(p){deleteItem('posts',p.id);});
  DB.posts=DB.posts.filter(function(p){return p.castingId!==id;});
  DB.castings=DB.castings.filter(function(c){return c.id!==id;});
  refreshAll();
  deleteItem('castings',id);
}

/* ============================================================
   撮影予定管理
   ============================================================ */

/* 声かけ状況（アプローチの進捗）。起用実績とは別軸で管理する（infEngagementStatusを参照） */
function infOutreachStatus(i){return i.outreachStatus||'';}
var INF_OUTREACH_BADGE={
  '未声掛け':'background:var(--bg3);color:var(--text3);border-color:var(--border)',
  '声掛け済み':'background:var(--accent-bg);color:var(--accent);border-color:var(--accent-border)',
  '返信待ち':'background:var(--amber-bg);color:var(--amber);border-color:var(--amber-border)',
  '交渉中':'background:var(--purple-bg);color:var(--purple);border-color:var(--purple-border)',
  'NG':'background:var(--red-bg);color:var(--red);border-color:var(--red-border)'
};
/* 起用実績（声掛け状況とは独立に、実際のキャスティング履歴から自動判定する）
   起用中＝キャンセル以外の有効なキャスティングがある／起用歴あり＝過去にキャスティングはあったが現在は無い／起用歴なし＝一度も無い */
function infEngagementStatus(i){
  var castings=(DB.castings||[]).filter(function(c){return c.infId===i.id;});
  if(!castings.length)return'起用歴なし';
  return castings.some(function(c){return c.status!=='cancelled';})?'起用中':'起用歴あり';
}
var INF_ENGAGEMENT_BADGE={
  '起用中':'background:var(--green-bg);color:var(--green);border-color:var(--green-border)',
  '起用歴あり':'background:var(--accent-bg);color:var(--accent);border-color:var(--accent-border)',
  '起用歴なし':'background:var(--bg3);color:var(--text3);border-color:var(--border)'
};
function renderInfluencers(){
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  var statusFilter=(document.getElementById('filterInfStatus')||{}).value||'';
  var engagementFilter=(document.getElementById('filterInfEngagement')||{}).value||'';
  var list=DB.influencers.filter(function(i){
    if(statusFilter&&infOutreachStatus(i)!==statusFilter)return false;
    if(engagementFilter&&infEngagementStatus(i)!==engagementFilter)return false;
    return!search||(i.name||'').toLowerCase().includes(search)||(i.handle||'').toLowerCase().includes(search)||(i.genre||'').toLowerCase().includes(search);
  });
  var tb=document.getElementById('infBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="9" class="empty-state">インフルエンサーが登録されていません</td></tr>';return;}
  var platColor={Instagram:'#e1306c',TikTok:'#010101',YouTube:'#ff0000',X:'#1da1f2'};
  var platUrl={Instagram:'https://www.instagram.com/',TikTok:'https://www.tiktok.com/@',YouTube:'',X:'https://x.com/'};
  tb.innerHTML=list.map(function(i){
    var last=DB.castings.filter(function(c){return c.infId===i.id;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);})[0];
    var accountUrl=i.url||(i.handle?(platUrl[i.platform]||'')+(i.handle.replace('@','')):'');
    var handleHtml=i.handle
      ?(accountUrl
        ?'<a href="'+esc(accountUrl)+'" target="_blank" rel="noopener" style="font-size:11px;color:'+(platColor[i.platform]||'var(--accent)')+';text-decoration:none">'+esc(i.handle)+'&nbsp;↗</a>'
        :'<span style="font-size:11px;color:'+(platColor[i.platform]||'var(--text3)')+'">'+esc(i.handle)+'</span>'
      ):'';
    var warnBadge=ratingWarningBadge(i.rating);
    var rowBg=parseInt(i.rating)===1?'background:var(--red-bg)':parseInt(i.rating)===2?'background:var(--amber-bg)':'';
    return'<tr style="cursor:pointer;'+rowBg+'" onclick="openInfluencerDetail(\''+i.id+'\')">'
      +'<td><div style="display:flex;align-items:center;gap:6px"><div style="font-weight:500;color:var(--accent)">'+esc(i.name)+'</div>'+warnBadge+'</div>'+handleHtml+'</td>'
      +'<td>'+esc(i.platform||'')+'</td>'
      +'<td class="td-mono">'+(i.followers?Number(i.followers).toLocaleString():'—')+'</td>'
      +'<td class="td-mono" style="white-space:nowrap">'+fmtFeeRange(i)+'</td>'
      +'<td>'+esc(i.genre||'—')+'</td>'
      +'<td style="white-space:nowrap">'
        +(infOutreachStatus(i)?'<span class="badge" style="font-size:11px;border:1px solid;white-space:nowrap;'+(INF_OUTREACH_BADGE[infOutreachStatus(i)]||'')+'">'+esc(infOutreachStatus(i))+'</span>':'<span style="color:var(--text3)">—</span>')
        +' <span class="badge" style="font-size:11px;border:1px solid;white-space:nowrap;'+(INF_ENGAGEMENT_BADGE[infEngagementStatus(i)]||'')+'">'+esc(infEngagementStatus(i))+'</span>'
      +'</td>'
      +'<td style="color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(i.contact||'—')+'</td>'
      +'<td style="color:var(--text3)">'+(last?fmtD(last.date):'—')+'</td>'
      +'<td onclick="event.stopPropagation()"><button class="btn btn-sm" onclick="openInfluencerModal(\''+i.id+'\')">編集</button></td>'
      +'</tr>';
  }).join('');
}

/* キャスティング履歴の並び替えキー：来店日・投稿日のうち新しい方を採用（片方しか無い場合はそちらを使用）。
   どちらも未設定の場合は最下部に沈むよう扱う（新しい順で並べたときにNaN比較でおかしな順序にならないように） */
function castSortKey(c){
  var d1=c.visitDate?new Date(c.visitDate).getTime():NaN;
  var d2=c.date?new Date(c.date).getTime():NaN;
  var candidates=[d1,d2].filter(function(x){return!isNaN(x);});
  return candidates.length?Math.max.apply(null,candidates):-Infinity;
}
function renderCasting(){
  var search=(document.getElementById('globalSearch').value||'').toLowerCase();
  var list=DB.castings.slice().sort(function(a,b){return castSortKey(b)-castSortKey(a);});
  if(search)list=list.filter(function(c){
    return storeName(c.storeId).toLowerCase().includes(search)
      ||infName(c.infId).toLowerCase().includes(search);
  });
  var tb=document.getElementById('castBody');
  if(!list.length){tb.innerHTML='<tr><td colspan="9" class="empty-state">キャスティング履歴がありません</td></tr>';return;}
  var INV_STATUS_LABEL={pending:'📄 未受領',sns_received:'📥 請求書受領',accounting_submitted:'📊 経理申請',done:'💸 支払い済み',invoiced:'📤 請求書送付済み',received:'✅ 入金確認済み'};
  tb.innerHTML=list.map(function(c){
    var inv=(DB.invoices||[]).find(function(x){return x.castingId===c.id;});
    var invCell=inv
      ?'<span style="font-size:12px;padding:2px 7px;border-radius:4px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);white-space:nowrap">'+(INV_STATUS_LABEL[inv.status]||inv.status)+'</span>'
      :'<button class="btn btn-sm" onclick="event.stopPropagation();openInvoiceFromCasting(\''+c.id+'\')" style="font-size:11px;padding:2px 8px;white-space:nowrap">🔖 仮登録</button>';
    var pp=c.platforms&&c.platforms.length?c.platforms:(c.platform?[c.platform]:[]);
    var abbrs=[...new Set(pp.map(platformAbbr).filter(Boolean))];
    var platCell=abbrs.length?abbrs.map(function(a){return'<span style="display:inline-block;font-size:11px;padding:1px 6px;background:var(--accent-bg);color:var(--accent);border-radius:3px;margin:1px;white-space:nowrap">'+esc(a)+'</span>';}).join(''):'—';
    var infObj=DB.influencers.find(function(x){return x.id===c.infId;});
    var isCancelled=c.status==='cancelled';
    var cancelBadge=isCancelled?'<span class="badge" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);font-size:11px;margin-left:5px">🚫 キャンセル</span>':'';
    var linkedVisitPost=(DB.posts||[]).find(function(p){return p.castingId===c.id&&p.type==='inf_visit';});
    var isVisitTbd=linkedVisitPost&&linkedVisitPost.status==='date_tbd';
    var visitCell=c.visitDate?fmtD(c.visitDate):(isVisitTbd?'<span style="color:var(--amber)">🔁 リスケ中</span>':'—');
    return'<tr'+(isCancelled?' style="opacity:0.55"':'')+'>'
      +'<td>'+esc(storeName(c.storeId))+cancelBadge+'</td>'
      +'<td style="color:var(--purple);font-weight:500;cursor:pointer;text-decoration:underline" onclick="openInfluencerDetail(\''+c.infId+'\')">'+esc(infObj?infObj.name:'不明')+'</td>'
      +'<td class="td-mono" style="color:var(--amber)">'+visitCell+'</td>'
      +'<td class="td-mono">'+fmtD(c.date)+'</td>'
      +'<td>'+platCell+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'
        +'<button onclick="toggleCastContractSent(\''+c.id+'\')" style="font-size:12px;padding:3px 8px;border-radius:5px;cursor:pointer;border:1px solid;white-space:nowrap;background:'+(c.contractSent?'var(--green-bg)':'var(--bg3)')+';color:'+(c.contractSent?'var(--green)':'var(--text3)')+';border-color:'+(c.contractSent?'var(--green-border)':'var(--border)')+';">'
          +(c.contractSent?'✓ 送付済み':'未送付')
        +'</button>'
      +'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap">'
        +'<button onclick="toggleCastLiaison(\''+c.id+'\')" style="font-size:12px;padding:3px 8px;border-radius:5px;cursor:pointer;border:1px solid;white-space:nowrap;background:'+(c.liaisonNeeded?'var(--red-bg)':'var(--bg3)')+';color:'+(c.liaisonNeeded?'var(--red)':'var(--text3)')+';border-color:'+(c.liaisonNeeded?'var(--red-border)':'var(--border)')+';">'
          +(c.liaisonNeeded?'🚨 渉外対応':'—')
        +'</button>'
      +'</td>'
      +'<td style="white-space:nowrap">'+invCell+'</td>'
      +'<td onclick="event.stopPropagation()" style="white-space:nowrap"><button class="btn btn-sm" style="margin-right:4px" onclick="openCastingModal({editId:\''+c.id+'\'})">編集</button><button class="btn-ghost-danger" onclick="deleteCasting(\''+c.id+'\')">削除</button></td>'
    +'</tr>';
  }).join('');
}

