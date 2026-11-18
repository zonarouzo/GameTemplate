# Android アプリ化メモ（代表者向け）

このゲームは、[Capacitor](https://capacitorjs.com/) で Android アプリにすることを前提に作っています。
開発メンバーは、この作業をする必要はありません（パソコンに開発ツールのインストールが必要なため、代表者が行います）。

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

1. Node.js と Android Studio を用意する（代表者のパソコン）
2. このリポジトリを取得し、Capacitor を追加する
   ```
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "ゲーム名" "com.example.gamename" --web-dir www
   npx cap add android
   ```
3. ゲームを更新したら `npx cap sync` で Android 側に反映する
4. `npx cap open android` で Android Studio を開き、実機やエミュレーターで確認・ビルドする

## アプリ化のときに確認すること

- [ ] 画面の向き（`docs/design.md` の「画面の向き」）を Android 側の設定と合わせる
- [ ] Android の「戻る」ボタンを押したときの動き（一時停止・終了の確認など）
- [ ] 音が最初のタップのあとに鳴ること
- [ ] アプリ名・アイコン・バージョン番号
- [ ] `docs/credits.md` の素材が、アプリでの配布（商用含む）に使える条件か
- [ ] Google Play で配布する場合は、開発者アカウント・署名用の鍵・プライバシーポリシーなど
