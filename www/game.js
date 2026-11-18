/*
 * 【サンプル】ほしあつめ
 * 落ちてくる星をタップして集める、30秒のミニゲームです。
 * テンプレートの使い方の例なので、初期設定のときに自分のゲームに置き換えます。
 *
 * アプリ化（Capacitor）を意識した作りの例：
 * - 画面サイズに合わせて自動で拡大縮小（縦画面の基準サイズ 360×640）
 * - マウスとタッチの両方で操作（Pointer Events）
 * - 音は最初のタップのあとに鳴らす（スマホの自動再生制限への対応）
 * - アプリが裏に回ったら一時停止（visibilitychange）
 * - ハイスコアは localStorage に保存
 * - 外部ファイル・外部サイトに頼らない（効果音もプログラムで作る）
 */
(function () {
  "use strict";

  // ---- 基本設定 ----
  var GAME_W = 360;           // 基準の横幅
  var GAME_H = 640;           // 基準の高さ（縦画面）
  var PLAY_SECONDS = 30;
  var SAVE_KEY = "hoshiatsume.highscore"; // 保存キーはゲーム名を頭に付ける

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var scale = 1;

  // ---- 状態 ----
  var state = "title";        // "title" | "play" | "paused" | "result"
  var stars = [];
  var particles = [];
  var score = 0;
  var timeLeft = PLAY_SECONDS;
  var spawnTimer = 0;
  var highScore = loadHighScore();
  var lastTime = 0;

  // ---- 保存 ----
  function loadHighScore() {
    try { return Number(localStorage.getItem(SAVE_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveHighScore(v) {
    try { localStorage.setItem(SAVE_KEY, String(v)); } catch (e) { /* 保存できない環境では何もしない */ }
  }

  // ---- 画面サイズ ----
  function resize() {
    var app = document.getElementById("app");
    var w = app.clientWidth, h = app.clientHeight;
    scale = Math.min(w / GAME_W, h / GAME_H);
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(GAME_W * scale) + "px";
    canvas.style.height = Math.floor(GAME_H * scale) + "px";
    canvas.width = Math.floor(GAME_W * scale * dpr);
    canvas.height = Math.floor(GAME_H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  // ---- 効果音（Web Audio でその場で作る） ----
  var audio = null;
  function initAudio() {
    if (audio) return;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
  }
  function beep(freq) {
    if (!audio) return;
    var o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.2);
  }

  // ---- 入力（マウス・タッチ共通） ----
  function toGame(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    initAudio();
    var p = toGame(e);
    if (state === "title" || state === "result") { startGame(); return; }
    if (state === "paused") { state = "play"; return; }
    if (state === "play") {
      // 右上の一時停止ボタン
      if (p.x > GAME_W - 56 && p.y < 56) { state = "paused"; return; }
      for (var i = stars.length - 1; i >= 0; i--) {
        var s = stars[i];
        var dx = p.x - s.x, dy = p.y - s.y;
        if (dx * dx + dy * dy < (s.r + 14) * (s.r + 14)) {
          score += s.gold ? 5 : 1;
          beep(s.gold ? 1046 : 784);
          burst(s.x, s.y, s.gold);
          stars.splice(i, 1);
          break;
        }
      }
    }
  });

  // アプリが裏に回ったら一時停止
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "play") state = "paused";
  });

  // ---- ゲームの流れ ----
  function startGame() {
    state = "play"; stars = []; particles = [];
    score = 0; timeLeft = PLAY_SECONDS; spawnTimer = 0;
  }
  function endGame() {
    state = "result";
    if (score > highScore) { highScore = score; saveHighScore(score); }
  }
  function spawnStar() {
    var gold = Math.random() < 0.12;
    stars.push({
      x: 24 + Math.random() * (GAME_W - 48), y: -20,
      r: gold ? 14 : 18,
      vy: (gold ? 220 : 120) + Math.random() * 80,
      rot: Math.random() * Math.PI, gold: gold
    });
  }
  function burst(x, y, gold) {
    for (var i = 0; i < 10; i++) {
      var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, gold: gold });
    }
  }

  function update(dt) {
    if (state !== "play") return;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnStar(); spawnTimer = 0.45 + Math.random() * 0.35; }
    for (var i = stars.length - 1; i >= 0; i--) {
      var s = stars[i];
      s.y += s.vy * dt; s.rot += dt * 2;
      if (s.y > GAME_H + 30) stars.splice(i, 1);
    }
    for (var j = particles.length - 1; j >= 0; j--) {
      var p = particles[j];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(j, 1);
    }
  }

  // ---- 描画 ----
  function drawStar(x, y, r, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 === 0 ? r : r * 0.45, a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
  function text(str, x, y, size, color, align) {
    ctx.fillStyle = color || "#fff";
    ctx.font = "bold " + size + "px sans-serif";
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
  }

  function draw() {
    var grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
    grad.addColorStop(0, "#1b1d3a"); grad.addColorStop(1, "#3b2f5c");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, GAME_W, GAME_H);

    stars.forEach(function (s) { drawStar(s.x, s.y, s.r, s.rot, s.gold ? "#ffd166" : "#bde0fe"); });
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(p.life * 2, 0);
      ctx.fillStyle = p.gold ? "#ffd166" : "#bde0fe";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    });

    if (state === "title") {
      text("ほしあつめ", GAME_W / 2, 220, 40, "#ffd166");
      text("おちてくる星をタップ！", GAME_W / 2, 290, 18);
      text("金の星は5点", GAME_W / 2, 320, 16, "#ffd166");
      text("タップでスタート", GAME_W / 2, 420, 20);
      text("ハイスコア " + highScore, GAME_W / 2, 470, 16, "#cdb4db");
    } else {
      text("スコア " + score, 16, 28, 20, "#fff", "left");
      text("のこり " + Math.ceil(timeLeft), GAME_W / 2, 28, 20);
      if (state === "play") { text("❚❚", GAME_W - 28, 28, 20); }
    }
    if (state === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, GAME_W, GAME_H);
      text("いちじていし", GAME_W / 2, 300, 28);
      text("タップでつづける", GAME_W / 2, 350, 18);
    }
    if (state === "result") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, GAME_W, GAME_H);
      text("おしまい！", GAME_W / 2, 230, 34, "#ffd166");
      text("スコア " + score, GAME_W / 2, 300, 28);
      text("ハイスコア " + highScore, GAME_W / 2, 345, 18, "#cdb4db");
      text("タップでもう一度", GAME_W / 2, 430, 20);
    }
  }

  // ---- メインループ ----
  function loop(t) {
    var dt = Math.min((t - lastTime) / 1000 || 0, 0.05); // 間が空いても大きく飛ばない
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();
