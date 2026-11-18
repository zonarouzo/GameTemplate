/*
 * ゲームの動作確認スクリプト（Claude が保存の前に実行する）
 *
 * 使い方：  node tools/check.js
 *
 * - www/index.html をブラウザ（Playwright の Chromium）で開く
 * - スマホ縦（390×844）とパソコン横（1280×720）の2つの画面サイズで確認
 * - 画面の中央を数回タップして、数秒動かす
 * - エラー（JavaScript のエラー・読み込めないファイル）があれば一覧を出して失敗にする
 * - 画面の画像を一時フォルダに保存する（リポジトリには保存しない）
 */
const path = require("path");
const fs = require("fs");
const os = require("os");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  console.error("Playwright が見つかりません。この環境ではブラウザでの確認ができません。");
  process.exit(2);
}

const root = path.resolve(__dirname, "..");
const page = path.join(root, "www", "index.html");
if (!fs.existsSync(page)) {
  console.error("www/index.html が見つかりません。");
  process.exit(1);
}
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "game-check-"));
const url = "file://" + page;

const views = [
  { name: "スマホ縦", file: "phone.png", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "パソコン横", file: "pc.png", viewport: { width: 1280, height: 720 } },
];

(async () => {
  const browser = await chromium.launch();
  let problems = 0;
  for (const v of views) {
    const ctx = await browser.newContext({ viewport: v.viewport, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push("エラー: " + e.message));
    p.on("console", (m) => { if (m.type() === "error") errors.push("コンソールのエラー: " + m.text()); });
    p.on("requestfailed", (r) => errors.push("読み込めないファイル: " + r.url()));
    await p.goto(url);
    await p.waitForTimeout(800);
    const cx = Math.floor(v.viewport.width / 2), cy = Math.floor(v.viewport.height / 2);
    for (let i = 0; i < 5; i++) {
      await p.mouse.click(cx, cy);
      await p.waitForTimeout(400);
    }
    await p.waitForTimeout(1500);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) errors.push("画面が横にはみ出しています（横スクロールが出ます）");
    const shot = path.join(outDir, v.file);
    await p.screenshot({ path: shot });
    if (errors.length) {
      problems += errors.length;
      console.log("✗ " + v.name + "：問題が " + errors.length + " 件あります");
      errors.forEach((e) => console.log("   - " + e));
    } else {
      console.log("✓ " + v.name + "：エラーはありません");
    }
    console.log("   画面の画像：" + shot);
    await ctx.close();
  }
  await browser.close();
  process.exit(problems ? 1 : 0);
})();
