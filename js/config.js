var GENRES=['焼肉','居酒屋','ラーメン','イタリアン','フレンチ','カフェ','寿司','焼き鳥','中華','その他'];
try{var _g=localStorage.getItem('gc_genres');if(_g)GENRES=JSON.parse(_g);}catch(e){}
/* 請求書の税別／税込入力で使う標準消費税率。設定ページ（app_settings: tax_rate）で変更できる */
var TAX_RATE=10;
try{var _tr=localStorage.getItem('gc_tax_rate');if(_tr)TAX_RATE=Number(_tr)||10;}catch(e){}
var COLORS=['#4f8ef7','#e85d75','#f5a623','#7ed321','#9b59b6','#1abc9c','#e67e22','#e74c3c','#3498db','#2ecc71','#f39c12','#8e44ad'];
var DB={stores:[],posts:[],influencers:[],castings:[],plans:[],corporations:[],invoices:[],orders:[]};
var NOW=new Date();
var calYear=NOW.getFullYear(),calMonth=NOW.getMonth();
var calActiveStores={};
var editingStoreId=null;
var currentPage='dashboard';

