# 削除した死にコードの保管記録

**作成日：2026-09-04**
**バックアップ：`_backup_20260904_1100/`（修正前の index.html / js / css の完全コピー）**

このファイルは、2026-09-04 のコードスクリーニングで削除した「到達不能コード」を、
将来復元できるように全文保存したものです。**削除前の状態に戻したい場合は、以下のコードを
記載の位置に貼り戻してください。**

---

## 目次

| # | 対象 | 元の場所 | 削除理由 |
|---|---|---|---|
| 1 | `onSlCorpSelect()` | `js/corps.js:81-89` | 呼び出し元がゼロ。参照先 `sl-corp-select` がHTMLに存在しない |
| 2 | `sl-corp-select` 更新ブロック | `js/corps.js:63-64` | 同上。対象要素が存在せず常に skip される |
| 3 | `saveSalesNotifs()` | `js/dashboard.js:178-180` | 呼び出し元がゼロ |
| 4 | `runChecks()` / `toggleWeekDone()` / `toggleMonthDone()` | `js/schedule.js:532-552` | `js/check.js:115-136` に完全同一の定義があり、読込順で check.js が上書きするため schedule.js 側は実行されない |

---

## 1. `onSlCorpSelect()` — js/corps.js:81-89

### 削除理由
プロジェクト全体を検索して**出現1回＝この定義のみ**。HTML の `onchange` からも
他の JS からも呼ばれていない。さらに参照する `sl-corp-select` という要素は
`index.html` に存在しない（営業入力フォームの会社名は `sl-corp` という
**自由入力テキストボックス**に変更済みで、法人セレクトは廃止されている）。

### 削除したコード（全文）

```javascript
function onSlCorpSelect(){
  var sel=document.getElementById('sl-corp-select');
  var inp=document.getElementById('sl-corp');
  if(!sel||!inp)return;
  if(sel.value){
    var corp=DB.corporations.find(function(x){return x.id===sel.value;});
    if(corp)inp.value=corp.name;
  }
}
```

### 復元する場合
`js/corps.js` の `onCorpSelect()` と `openCorpDetail()` の間に貼り戻す。
**加えて** `index.html` の営業入力フォームに以下の要素を追加しないと機能しない：

```html
<select id="sl-corp-select" onchange="onSlCorpSelect()">
  <option value="">新規法人 / 個人</option>
</select>
```

---

## 2. `sl-corp-select` の選択肢更新ブロック — js/corps.js:63-64

### 削除理由
`updateCorpSelects()` 内で `sl-corp-select` を探しているが、その要素は存在しないため
`if(slCorpSel)` が常に false となり中身が実行されない。上記 1 とセットの残骸。

### 削除したコード（全文）

```javascript
  var slCorpSel=document.getElementById('sl-corp-select');
  if(slCorpSel){var pv2=slCorpSel.value;slCorpSel.innerHTML='<option value="">新規法人 / 個人</option>'+DB.corporations.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('');if(pv2)slCorpSel.value=pv2;}
```

### 復元する場合
`js/corps.js` の `updateCorpSelects()` 内、`sCorp` の行と `nb` の行の**あいだ**に貼り戻す。

---

## 3. `saveSalesNotifs()` — js/dashboard.js:178-180

### 削除理由
プロジェクト全体で**出現1回＝この定義のみ**。呼び出し元が存在しない。
中身は `DB` 全体を localStorage の `adcore3` に書き出すもので、
同じ処理は `js/db.js` の同期処理（409/423/438/442/475/478行）が担っている。

### 削除したコード（全文）

```javascript
function saveSalesNotifs(){
  try{localStorage.setItem('adcore3',JSON.stringify(DB));}catch(e){}
}
```

### 復元する場合
`js/dashboard.js` の `getSalesNotifs()` と `renderSalesNotifs()` の間に貼り戻す。

---

## 4. 重複定義 3関数 — js/schedule.js:532-552

### 削除理由
`js/check.js:115-136` に**バイト単位で同一**の定義が存在する。
`index.html` のスクリプト読込順は

```
... schedule.js (6番目) → casting.js (7番目) → check.js (8番目) ...
```

であり、**後から読まれる check.js の定義が schedule.js の定義を上書きする**。
そのため schedule.js 側の3関数は一度も実行されない。

これを放置すると「schedule.js の該当関数を修正したのに挙動が変わらない」という
デバッグ困難な罠になるため削除した。**check.js 側の定義はそのまま残っている**ので
機能は一切変わらない。

### 削除したコード（全文）

```javascript
function runChecks(){}/* 旧runChecksは廃止 */

function toggleWeekDone(){
  var wrap=document.getElementById('chk-week-done-wrap');
  var btn=document.getElementById('chk-week-done-btn');
  if(!wrap||!btn)return;
  var isOpen=wrap.style.display!=='none';
  wrap.style.display=isOpen?'none':'block';
  var count=wrap.children.length;
  btn.textContent=isOpen?'▼ 完了済みを表示（'+count+'件）':'▲ 完了済みを非表示';
}

function toggleMonthDone(){
  var wrap=document.getElementById('chk-month-done-wrap');
  var btn=document.getElementById('chk-month-done-btn');
  if(!wrap||!btn)return;
  var isOpen=wrap.style.display!=='none';
  wrap.style.display=isOpen?'none':'block';
  var count=wrap.children.length;
  btn.textContent=isOpen?'▼ 完了済みを表示（'+count+'件）':'▲ 完了済みを非表示';
}
```

### 復元する場合
`js/schedule.js` の `_calDragPostId=null;}` で終わる関数の直後に貼り戻す。
ただし **check.js 側と二重定義になり、再び check.js が勝つ状態に戻る**点に注意。

---

# 削除しなかったもの（誤解しやすい箇所の記録）

スクリーニング中に「死にコードに見えたが、実際は生きていた／消すと壊れる」と
判明したものを記録しておく。**今後これらを消さないこと。**

## A. 営業通知機能（`DB.salesNotifs`）— 削除禁止

一見すると `renderSalesNotifs()` と `updateSalesNotifBadge()` は
参照先要素（`salesNotifList` / `nb-sales`）が HTML に無いため何もしない。
しかし**データ層は完全に生きている**：

- `js/dashboard.js:110-113` — 営業入力の登録時に通知レコードを**新規作成**している
- `saveItem('salesnotifs', notif)` で **Supabase の `salesnotifs` テーブルに同期**される
- `js/db.js:403,417,421,427` — 読み込み・キャッシュ処理に組み込まれている
- `js/stores.js:657-659` — 店舗削除時に関連通知を掃除している
- **`js/dashboard.js:353` — `generateAlerts()` が未読通知を拾い、
  事前チェック画面と `nb-alerts` バッジに表示している**

つまり通知の表示先が「専用リスト」から「アラート集約」へ**統合された**のであり、
機能が死んだわけではない。`renderSalesNotifs()` / `updateSalesNotifBadge()` は
無害な no-op として**そのまま残してある**（呼び出し元も残置）。

これらを削除すると、`js/app.js:115,119,128` と `js/dashboard.js:118-119,207-208,218-219`
から `ReferenceError` が発生してアプリが停止する。

### もし専用リストUIを復活させたい場合
`index.html` に以下を追加すれば、既存コードがそのまま動く：

```html
<!-- ダッシュボードまたは営業入力ページ内に -->
<div id="salesNotifList"></div>
```

```html
<!-- サイドバー「営業入力」ナビ項目内（index.html の該当箇所は現在空行になっている） -->
<span class="nav-badge" id="nb-sales">0</span>
```

---

## B. `hAdStart` と `hAdStart2` の重複 — 要判断のため未修正

ヒアリングシートに「広告開始希望日」という**同じラベルの入力欄が2つ**ある。

| ID | 場所 | セクション |
|---|---|---|
| `hAdStart` | `index.html:749` | 広告配信 |
| `hAdStart2` | `index.html:766` | スケジュール |

両方が `js/stores.js:599` で**別々のフィールドとして保存**されている。
どちらを正とするかは業務上の判断が必要（かつ既存データの移行を伴う）ため、
今回は**統合せず、ラベルだけ区別できるように注記を追加**した。

統合する場合は、既存店舗データの `hearing.hAdStart` と `hearing.hAdStart2` の
どちらに値が入っているかを確認してから移行すること。

---

## C. GitHub PAT の localStorage 平文保存 — 設計判断のため未修正

`js/db.js:85-93` で入力された GitHub Personal Access Token が
`gc_session.ghPat` として **localStorage に平文保存**されている。

この PAT は `js/db.js:138` で
`https://api.github.com/repos/ishida-root/gourmet-caddie/actions/workflows/notify.yml/dispatches`
を叩き、**Chatwork通知の送信とユーザーアカウントの作成**を実行する権限を持つ。

UI 上は管理者メール（`js/app.js:51`）でカードを出し分けているが、
localStorage 自体には誰でもアクセスできるため、共用端末や XSS でトークンが漏れる。

改善するならサーバーサイド（Supabase Edge Function など）に PAT を持たせ、
ブラウザからは呼び出すだけにするのが望ましい。**アーキテクチャ変更を伴うため今回は未着手。**
