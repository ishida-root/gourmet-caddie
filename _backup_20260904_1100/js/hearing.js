/* ============================================================
   SNSマーケティングヒアリングシート 自動生成
   - assets/ヒアリングシート_template.xlsx の {会社名}{担当営業} を
     埋めて.xlsxをダウンロードする。
   - vendor同梱のdocxtemplaterはxlsx未対応（docx/pptxのみ）のため、
     PizZipでxl/sharedStrings.xmlを直接文字列置換する（外部通信なし）。
   ============================================================ */
var HEARING_TEMPLATE_URL='assets/ヒアリングシート_template.xlsx?v=1';

function hearingXmlEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

async function buildAndDownloadHearingSheet(companyName,salesRep){
  if(typeof window.PizZip==='undefined'){
    throw new Error('ライブラリの読み込みに失敗しました（再読み込みしてください）');
  }
  var resp=await fetch(HEARING_TEMPLATE_URL);
  if(!resp.ok)throw new Error('テンプレート取得失敗 ('+resp.status+')');
  var buf=await resp.arrayBuffer();
  var zip=new window.PizZip(buf);
  var ss=zip.file('xl/sharedStrings.xml').asText();
  ss=ss.split('{会社名}').join(hearingXmlEsc(companyName)).split('{担当営業}').join(hearingXmlEsc(salesRep));
  zip.file('xl/sharedStrings.xml',ss);
  var out=zip.generate({
    type:'blob',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  var safe=function(s){return String(s||'').replace(/[\\\/:*?"<>|]/g,'_');};
  var fname='ヒアリングシート_'+safe(companyName||'無題')+'.xlsx';
  var url=URL.createObjectURL(out);
  var a=document.createElement('a');
  a.href=url;a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  return fname;
}
