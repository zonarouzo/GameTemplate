/*
 * リワード広告（仮組み用のハウス広告）
 * ------------------------------------------------------------
 * 本物の広告（AdMob など）を入れる前に、チームのハウス広告で
 * 「広告を見たら報酬がもらえる」流れを作って試すための部品です。
 * 代表者が Android アプリにするときに、本物の広告に差し替えます。
 *
 * 使い方：
 *   RewardAd.show({
 *     onReward: function () { ... },          // 最後まで見て閉じたとき（報酬を渡す）
 *     onClose:  function (rewarded) { ... }    // 広告が閉じたとき（必ず呼ばれる。rewarded は true/false）
 *   });
 *
 * 動き：
 *   - 画像をタップすると、広告のリンク先を別の画面で開く
 *   - 5秒たつと右上に × が出て、閉じられる（閉じると報酬あり）
 *   - 5秒たつ前に「戻る」（Android の戻るボタン・ブラウザの戻る・Esc キー）を押すと、
 *     「今閉じると報酬はもらえません」と確認が出る。閉じる → 報酬なしで終了／広告にもどる → 続きから
 *   - 5秒たったあとの「戻る」は、× と同じ（報酬あり）
 *   - 待ち時間は、画面が表示されているあいだ・確認が出ていないあいだだけ進む
 *
 * アプリ化（Capacitor）のとき：
 *   @capacitor/app の backButton で RewardAd.handleBack() を呼ぶと、戻るボタンを広告側で処理できます。
 *   （true が返ったら広告が処理済み）
 */
(function () {
  "use strict";

  var config = {
    imageSrc: "assets/images/house_ad.jpg",
    linkUrl: "https://caitakenchikuclub.github.io/",
    waitSeconds: 5
  };

  var root = null, img = null, timerEl = null, closeBtn = null, confirmEl = null;
  var showing = false, confirming = false, finished = false;
  var elapsed = 0, intervalId = null, lastTick = 0;
  var callbacks = {};
  var historyArmed = false, ignorePop = false;

  // ---- 見た目（このファイルだけで完結させるため、CSS をここで入れる） ----
  function injectStyle() {
    if (document.getElementById("reward-ad-style")) return;
    var css = [
      ".rad-root{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;align-items:center;justify-content:center;",
      "touch-action:none;-webkit-user-select:none;user-select:none;font-family:sans-serif;}",
      ".rad-img{max-width:100%;max-height:100%;object-fit:contain;cursor:pointer;display:block;}",
      ".rad-label{position:absolute;left:calc(12px + env(safe-area-inset-left));top:calc(12px + env(safe-area-inset-top));",
      "background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:2px 8px;border-radius:4px;}",
      ".rad-timer,.rad-close{position:absolute;right:calc(12px + env(safe-area-inset-right));top:calc(12px + env(safe-area-inset-top));",
      "width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:2px solid rgba(255,255,255,.8);",
      "display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;box-sizing:border-box;}",
      ".rad-close{cursor:pointer;font-size:22px;padding:0;}",
      ".rad-confirm{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;}",
      ".rad-box{background:#fff;color:#222;border-radius:14px;padding:20px 18px;width:min(86%,320px);text-align:center;line-height:1.6;}",
      ".rad-box p{margin:0 0 16px;font-size:15px;}",
      ".rad-btn{display:block;width:100%;margin:8px 0 0;padding:10px;border-radius:999px;border:0;font-size:15px;font-weight:bold;cursor:pointer;}",
      ".rad-btn-main{background:#2e7d32;color:#fff;}",
      ".rad-btn-sub{background:#eee;color:#333;}"
    ].join("");
    var style = document.createElement("style");
    style.id = "reward-ad-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    injectStyle();
    root = document.createElement("div");
    root.className = "rad-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "広告");

    img = document.createElement("img");
    img.className = "rad-img";
    img.src = config.imageSrc;
    img.alt = "広告";
    img.addEventListener("click", function () {
      try { window.open(config.linkUrl, "_blank", "noopener"); } catch (e) { /* 開けない環境では何もしない */ }
    });

    var label = document.createElement("div");
    label.className = "rad-label";
    label.textContent = "広告";

    timerEl = document.createElement("div");
    timerEl.className = "rad-timer";

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "rad-close";
    closeBtn.setAttribute("aria-label", "広告を閉じる");
    closeBtn.textContent = "×";
    closeBtn.style.display = "none";
    closeBtn.addEventListener("click", function () { finish(true); });

    confirmEl = document.createElement("div");
    confirmEl.className = "rad-confirm";
    confirmEl.style.display = "none";
    var box = document.createElement("div");
    box.className = "rad-box";
    var msg = document.createElement("p");
    msg.textContent = "今閉じると、報酬はもらえません。広告を閉じますか？";
    var backBtn = document.createElement("button");
    backBtn.type = "button"; backBtn.className = "rad-btn rad-btn-main";
    backBtn.textContent = "広告にもどる";
    backBtn.addEventListener("click", function () { hideConfirm(); });
    var quitBtn = document.createElement("button");
    quitBtn.type = "button"; quitBtn.className = "rad-btn rad-btn-sub";
    quitBtn.textContent = "閉じる（報酬なし）";
    quitBtn.addEventListener("click", function () { finish(false); });
    box.appendChild(msg); box.appendChild(backBtn); box.appendChild(quitBtn);
    confirmEl.appendChild(box);

    root.appendChild(img);
    root.appendChild(label);
    root.appendChild(timerEl);
    root.appendChild(closeBtn);
    root.appendChild(confirmEl);
    // 広告の上の操作が、うしろのゲームに伝わらないようにする
    ["pointerdown", "pointerup", "touchstart", "touchend"].forEach(function (t) {
      root.addEventListener(t, function (e) { e.stopPropagation(); });
    });
    document.body.appendChild(root);
  }

  // ---- 待ち時間 ----
  function tick() {
    var now = Date.now();
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!document.hidden && !confirming) elapsed += dt;
    var left = Math.ceil(config.waitSeconds - elapsed);
    if (left > 0) {
      timerEl.textContent = String(left);
    } else if (!finished) {
      finished = true;
      timerEl.style.display = "none";
      closeBtn.style.display = "flex";
    }
  }

  // ---- 確認 ----
  function showConfirm() { confirming = true; confirmEl.style.display = "flex"; }
  function hideConfirm() { confirming = false; confirmEl.style.display = "none"; lastTick = Date.now(); }

  // ---- 戻る操作 ----
  function handleBack() {
    if (!showing) return false;
    if (finished) { finish(true); return true; }
    if (confirming) { hideConfirm(); return true; }
    showConfirm();
    return true;
  }

  // ブラウザ（と Android の WebView）の「戻る」を受け取るため、履歴を1つ積んでおく
  function armHistory() {
    try { history.pushState({ rewardAd: true }, ""); historyArmed = true; } catch (e) { historyArmed = false; }
  }
  window.addEventListener("popstate", function () {
    if (ignorePop) { ignorePop = false; return; }
    if (!showing) return;
    historyArmed = false;
    handleBack();
    if (showing) armHistory(); // まだ広告が出ているなら、次の「戻る」に備える
  });
  document.addEventListener("keydown", function (e) {
    if (showing && (e.key === "Escape" || e.key === "Backspace")) { e.preventDefault(); handleBack(); }
  });

  // ---- 開く・閉じる ----
  function show(opts) {
    if (showing) return;
    callbacks = opts || {};
    build();
    showing = true; confirming = false; finished = false;
    elapsed = 0; lastTick = Date.now();
    tick();
    intervalId = setInterval(tick, 100);
    armHistory();
  }

  function finish(rewarded) {
    if (!showing) return;
    showing = false;
    clearInterval(intervalId);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    if (historyArmed) { historyArmed = false; ignorePop = true; try { history.back(); } catch (e) { ignorePop = false; } }
    if (rewarded && typeof callbacks.onReward === "function") callbacks.onReward();
    if (typeof callbacks.onClose === "function") callbacks.onClose(!!rewarded);
  }

  window.RewardAd = {
    show: show,
    handleBack: handleBack,
    isShowing: function () { return showing; },
    config: config
  };
})();
