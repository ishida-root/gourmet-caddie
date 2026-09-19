# インフルエンサー登録のアルバイト外注：検討メモ

アルバイトを雇ってインフルエンサーの新規登録作業を任せるかどうか、
まだ決まっていない段階での検討内容をまとめたもの。実際に雇うことが決まったら、
このメモを元に採用する方式を選んで実装する。

## 課題

- インフルエンサー登録（アカウントのリサーチ・情報入力）をアルバイトに頼みたい
- ただし本体アプリ（グルメキャディ）にそのままログインさせると、料金・請求書・
  他店舗情報など無関係なデータまで全部見えてしまい、セキュリティ的に良くない
- 同じアカウントを重複して調べる・登録する無駄も避けたい

## 前提として分かった重要な事実（セキュリティ）

現在、Supabase（本番データベース）の各テーブルには `anon_all_plans`（ALL・anon向け）
や `allow all`（ALL・public向け）といった、**ログインなしでも全テーブルを読み書きできる
ポリシー**が設定されている。アプリの「ログイン画面」はUI上の入り口にすぎず、
JSファイルに書かれている接続情報（anonキー）さえ分かれば、理論上は誰でも
全データに直接アクセスできてしまう状態。

厳重にするなら、この anon 向けの全開放ポリシーを締めて `authenticated`（実際に
ログインした人）専用にし、代わりに用途ごとに必要最小限の情報だけを見せる
「ビュー」を別途作る、という対応が必要（本体アプリの動作に影響する可能性があるため、
実施する場合は慎重にテストしながら進める）。

## 検討した3つの方式

### A. その場で直接登録できるフォームを作る
- 👍 二度手間がない（スプレッドシート入力→あなたが転記、という工程が丸ごと不要）
- 👍 転記ミスがゼロになる
- 👍 リアルタイムに反映される
- 👎 ログイン不要で本番データベースに書き込める入口を新しく作ることになり、
  読み取り専用の仕組みより攻撃面が増える

### B. 重複チェック専用ページ（読み取り専用）＋スプレッドシート入力
- 👍 書き込み穴を作らずに済む（一番安全）
- 👍 あなたが最終的にスプレッドシートを見てから登録するので、人の目のチェックが入る
- 👍 権限設計がシンプル（「名前とIDだけ読み取り許可」の1パターンのみ）
- 👎 スプレッドシート→本体アプリへの転記が手作業のまま残る
- **実装済み**：`handle-check.html`（ログイン不要、IDを入力すると「登録済み／未登録」だけを
  表示。名前・ID以外の情報は一切取得・表示しない）。ローカルにコミット済みだが、
  実際に運用するかどうか決まっていないためリモートには未プッシュ。

### C. スプレッドシート内で完結させる（非公開シート方式）
1. 管理画面から「名前・IDだけ」の軽量なリストをエクスポートする機能を追加
2. そのリストを、スプレッドシート内のアルバイトが編集できない保護された非公開シートに貼る
3. アルバイトが作業する表側のシートに、非公開シートを参照するVLOOKUP等の数式を
   仕込んでおき、IDを入力すると自動で「登録済み／未登録」が出る
- 👍 外部通信も鍵の露出も一切なく、スプレッドシート内で完結するので最も安全
- 👎 リストが「最後にエクスポートした時点」のスナップショットになり、
  リアルタイムには更新されない（頻繁に登録が増える場合は手動更新が面倒）

### C'. Cをリアルタイム化する（Google Apps Script案）
- スプレッドシートに Google Apps Script を組み込み、Supabaseから「名前・ID」だけを
  定期的に自動取得して非公開シートに書き込み続ける
- 例：10分ごとに自動更新／シートを開いた瞬間に更新／メニューに「🔄 今すぐ更新」ボタン
- 通信は読み取り専用（handle-check.htmlと同じ方式）なので書き込みの危険性はない
- Cの安全性を保ったまま、ほぼリアルタイムに近い状態にできる
- **未実装**。採用する場合はApps Scriptのコードを作成し、スプレッドシートへの
  貼り付け手順を案内する。

## 現時点の結論

まだアルバイトを雇うか決まっていないため、実装はここで一旦保留。
**採用する場合は C'（Google Apps Scriptでリアルタイム化した非公開シート方式）で進める方針。**
雇うことが決まったら、下記のコードをスプレッドシートに貼り付けて使う。

## C' 採用時の実装手順（未実施・準備用メモ）

### 1. スプレッドシート側の準備
1. アルバイトが作業する表のシートとは別に、新しいシートを追加し、名前を
   `登録済みリスト（非公開）` のようにする
2. そのシートを右クリック→保護（あなた以外は編集できないようにする）
3. アルバイトが作業する表のシートの適当な列（例：B列）に、ID入力に対応して
   以下のような数式を入れておく（A列にIDを入力する想定）
   ```
   =IFERROR(VLOOKUP(LOWER(SUBSTITUTE(TRIM(A2),"@","")), '登録済みリスト（非公開）'!A:C, 3, FALSE), "未登録")
   ```
   ※非公開シート側のA列に正規化済みID、C列に表示用メッセージを持たせる想定
   （具体的な列構成はスクリプト側の書き込み内容に合わせて調整する）

### 2. Google Apps Scriptのコード（貼り付け用）
スプレッドシートのメニュー「拡張機能」→「Apps Script」を開き、以下のコードを貼り付ける。

```javascript
// ここにSupabaseの接続情報を入れる（js/db.jsと同じ値）
var SUPA_URL = 'https://vwtcshwzetxnaedjhoej.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dGNzaHd6ZXR4bmFlZGpob2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzM3MTgsImV4cCI6MjA5NDIwOTcxOH0.S10RHDE7wvKUMa2SxeoNvkgg6TtiMInw7ax6J5ZuMZk';
var SHEET_NAME = '登録済みリスト（非公開）';

function normalizeHandle(h) {
  return (h || '').toString().trim().toLowerCase().replace(/^@/, '');
}

// Supabaseから「名前・ID」だけを取得して非公開シートに書き込む
function syncInfluencerHandles() {
  var url = SUPA_URL + '/rest/v1/influencers?select=' + encodeURIComponent('data->>handle,data->>name');
  var res = UrlFetchApp.fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }
  });
  var rows = JSON.parse(res.getContentText());

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet.appendRow(['正規化ID', 'ハンドル', '表示メッセージ']);

  var values = rows
    .filter(function (r) { return r.handle; })
    .map(function (r) {
      var norm = normalizeHandle(r.handle);
      var msg = '⚠️ 登録済み（' + r.name + '）';
      return [norm, r.handle, msg];
    });
  if (values.length) {
    sheet.getRange(2, 1, values.length, 3).setValues(values);
  }
}

// スプレッドシートを開いたときに自動更新＋メニューを追加
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('重複チェック')
    .addItem('🔄 今すぐ更新', 'syncInfluencerHandles')
    .addToUi();
  syncInfluencerHandles();
}

// 定期実行用（下記「トリガーの設定」で10分おきなどに設定する）
function scheduledSync() {
  syncInfluencerHandles();
}
```

### 3. 定期更新（トリガー）の設定
1. Apps Scriptの画面左メニューの時計アイコン「トリガー」を開く
2. 「トリガーを追加」→ 実行する関数：`scheduledSync`、イベントのソース：時間主導型、
   時間ベースのタイマー：分タイマー→10分ごと、を選んで保存

### 4. 動作確認
1. スプレッドシートを開き直すと、メニューバーに「重複チェック」が増えているはず
2. 「🔄 今すぐ更新」を押して、`登録済みリスト（非公開）`シートに
   正規化ID・ハンドル・表示メッセージの3列が入っていれば成功
3. 表のシート側のVLOOKUP数式で、既存IDを入力すると「⚠️ 登録済み（〇〇）」、
   未登録のIDだと「未登録」と出ることを確認する
