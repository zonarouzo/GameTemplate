# Android アプリ化メモ（けんちくぶ！向け）

このゲームは、[Capacitor](https://capacitorjs.com/) で Android アプリにすることを前提に作っています。
開発メンバーは、この作業をする必要はありません（パソコンに開発ツールのインストールが必要なため、けんちくぶ！が行います）。

## このリポジトリの前提

- ゲーム本体は `www/` フォルダだけで完結している（Capacitor の `webDir` は `www`）。
- 外部サイトからの読み込み（CDN・Webフォント・解析タグなど）はない。オフラインで動く。
- JavaScript は `<script src>` で読み込む通常のファイル（ES Modules・ビルド不要）。
- 画面はタッチ操作・画面サイズの変化・ノッチ（切り欠き）に対応している。
- アプリが裏に回ると `visibilitychange` で一時停止する。
- セーブデータは `localStorage`（キーはゲームごとの名前で始まる）。
- 素材の出典は `docs/credits.md` に記録している。

## アプリ化の流れ（参考）

コマンドやバージョンは変わることがあるため、作業時に [Capacitor 公式ドキュメント](https://capacitorjs.com/docs) で確認してください。

1. Node.js と Android Studio を用意する（けんちくぶ！のパソコン）
2. このリポジトリを取得し、Capacitor を追加する
   ```
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "ゲーム名" "com.example.gamename" --web-dir www
   npx cap add android
   ```
3. ゲームを更新したら `npx cap sync` で Android 側に反映する
4. `npx cap open android` で Android Studio を開き、実機やエミュレーターで確認・ビルドする

## リワード広告を使っている場合

- 開発中は、`www/reward_ad.js`（チームのハウス広告）で仮組みしています。呼び出し方は `RewardAd.show({ onReward, onClose })` です。
- 本物の広告（AdMob など）に差し替えるときは、同じ呼び出し方のまま中身を差し替えると、ゲーム側を直さずに済みます。
- Android の戻るボタンは、`@capacitor/app` の `backButton` で `RewardAd.handleBack()` を呼ぶと、広告表示中の確認（報酬なしで閉じるか）を出せます（`true` が返ったら広告側で処理済み）。
- 広告をタップしたときのリンク（外部サイト）が、アプリ内ではなく外部のブラウザで開くか確認してください。

## アプリ化のときに確認すること

- [ ] 画面の向き（`docs/design.md` の「画面の向き」）を Android 側の設定と合わせる
- [ ] Android の「戻る」ボタンを押したときの動き（一時停止・終了の確認など）
- [ ] 音が最初のタップのあとに鳴ること
- [ ] アプリ名・アイコン・バージョン番号
- [ ] `docs/credits.md` の素材が、アプリでの配布（商用含む）に使える条件か
- [ ] Google Play で配布する場合は、開発者アカウント・署名用の鍵・プライバシーポリシーなど
- [ ] リワード広告を使っている場合、仮組みのハウス広告を本物の広告に差し替えたか
