var GENRES=['焼肉','居酒屋','ラーメン','イタリアン','フレンチ','カフェ','寿司','焼き鳥','中華','その他'];
try{var _g=localStorage.getItem('gc_genres');if(_g)GENRES=JSON.parse(_g);}catch(e){}
/* 初期設定チェックリスト（技術設定に専念。クリエイター/ヒアリング/キックオフは「案件進捗」タブで日付付き管理） */
var SETUP_LABELS=["Facebookページ設定","Meta広告アカウント開設","広告アカウント設定","Instagramアカウント確認・権限取得","SNSアカウント確認・権限付与","楽々販売登録","初回撮影日確定"];
var COLORS=['#4f8ef7','#e85d75','#f5a623','#7ed321','#9b59b6','#1abc9c','#e67e22','#e74c3c','#3498db','#2ecc71','#f39c12','#8e44ad'];
var DB={stores:[],posts:[],influencers:[],castings:[],plans:[],corporations:[],invoices:[]};
var NOW=new Date();
var calYear=NOW.getFullYear(),calMonth=NOW.getMonth();
var calActiveStores={};
var editingStoreId=null;
var currentPage='dashboard';

