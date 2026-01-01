// ===============================
// 🎄 私藏童年聖誕歌單回憶錄 (p5.js + p5.sound)
// 你素材：song0~song4.mp3（每首60s）
//        img0~img4.jpg（1280x720）
// 功能：歌單 → 播放器(上一首/下一首/播放暫停/速度±/音量)
//      播放時圖片由馬賽克逐步顯影 + 文字故事同步切換
// ===============================

const MODE = { LIST: 0, PLAYER: 1 };
let mode = MODE.LIST;

const CLIP_SECONDS = 60;   // ✅ 你已統一每首 60 秒
const REVEAL_SECONDS = 25; // ✅ 前45秒逐步顯影，最後15秒讓畫面完整沉浸

// 你只要把 story 改成你自己的五段回憶
const tracks = [
  {
    title: "Last Christmas",
    file: "song0.mp3",
    img: "img0.jpg",
    story:
      "（你的回憶文字1）\n" +
      "建議 3~6 行，講一個具體場景。\n" +
      "例如：小時候家裡的燈很黃，這首歌一出現就知道冬天到了。"
  },
  {
    title: "All I Want For Christmas Is You",
    file: "song1.mp3",
    img: "img1.jpg",
    story:
      "（你的回憶文字2）\n" +
      "例如：每次百貨公司都播到我會背，但又不得不承認它很猛。"
  },
  {
    title: "Jingle Bell Rock",
    file: "song2.mp3",
    img: "img2.jpg",
    story:
      "（你的回憶文字3）\n" +
      "例如：第一次覺得聖誕歌也可以很有節奏，像小孩的快樂一樣直接。"
  },
  {
    title: "Feliz Navidad",
    file: "song3.mp3",
    img: "img3.jpg",
    story:
      "（你的回憶文字4）\n" +
      "例如：這首歌簡單重複到像咒語，但那種單純的快樂很難忘。"
  },
  {
    title: "Rockin' Around the Christmas Tree",
    file: "song4.mp3",
    img: "img4.jpg",
    story:
      "（你的回憶文字5）\n" +
      "例如：腦內會自動出現老電影的派對畫面，明明沒參加過但很有畫面。"
  }
];

let currentIndex = 0;

// lazy load：只載目前那首，切歌比較穩
let currentSound = null;
let currentImage = null;
let soundLoading = false;
let imageLoading = false;

let audioStarted = false;
let isPlaying = false;
let playRate = 1.0;

// UI
let ui = {};
let listButtons = [];

// 顯影 grid（0..1）
let cols = 72, rows = 42;
let cellW = 10, cellH = 10;
let revealGrid = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  noSmooth();

  rebuildGrid();
  buildUI();
  buildListButtons();

  setPlayerUIVisible(false);
  setListButtonsVisible(true);
  mode = MODE.LIST;
}

function draw() {
  background(6, 10, 24);
  drawBackgroundDust();

  if (mode === MODE.LIST) drawListScreen();
  else drawPlayerScreen();
}

// ------------------------------
// LIST
// ------------------------------
function buildListButtons() {
  for (const b of listButtons) b.remove();
  listButtons = [];

  for (let i = 0; i < tracks.length; i++) {
    const btn = createButton(`▶  ${tracks[i].title}`);
    btn.addClass("track-btn");
    btn.mousePressed(() => {
      startAudioOnce();
      goToPlayer(i, true);
    });
    listButtons.push(btn);
  }
  layoutListButtons();
}

function layoutListButtons() {
  const w = min(560, width * 0.78);
  const x = (width - w) / 2;
  let y = height * 0.30;

  for (let i = 0; i < listButtons.length; i++) {
    listButtons[i].position(x, y);
    listButtons[i].size(w, 46);
    y += 60;
  }
}

function setListButtonsVisible(v) {
  for (const b of listButtons) v ? b.show() : b.hide();
}

function drawListScreen() {
  push();
  textAlign(CENTER, CENTER);

  fill(255, 235, 180);
  textSize(44);
  text("🎄 私藏童年聖誕歌單回憶錄", width / 2, height * 0.18);

  fill(255, 220, 150, 200);
  textSize(16);
  text("點一首歌開始。第一次點擊會啟動音訊（瀏覽器規定）。", width / 2, height * 0.23);

  fill(255, 255, 255, 120);
  textSize(13);
  text("功能：上一首 / 下一首 / 播放暫停 / 速度± / 音量 / 圖片馬賽克顯影 + 文字回憶", width / 2, height * 0.26);

  pop();
}

// ------------------------------
// PLAYER
// ------------------------------
function buildUI() {
  ui.btnBack = createButton("← 回歌單");
  ui.btnPrev = createButton("⏮ 上一首");
  ui.btnPlay = createButton("⏯ 播放/暫停");
  ui.btnNext = createButton("下一首 ⏭");
  ui.btnSlower = createButton("− 速度");
  ui.btnFaster = createButton("+ 速度");
  ui.vol = createSlider(0, 1, 0.85, 0.01);

  // 加上控制按鈕樣式
  ui.btnBack.addClass("ctrl-btn");
  ui.btnPrev.addClass("ctrl-btn");
  ui.btnPlay.addClass("ctrl-btn");
  ui.btnNext.addClass("ctrl-btn");
  ui.btnSlower.addClass("ctrl-btn");
  ui.btnFaster.addClass("ctrl-btn");

  ui.btnBack.mousePressed(() => {
    stopCurrent(true);
    mode = MODE.LIST;
    setPlayerUIVisible(false);
    setListButtonsVisible(true);
  });

  ui.btnPrev.mousePressed(() => prevTrack(true));
  ui.btnNext.mousePressed(() => nextTrack(true));
  ui.btnPlay.mousePressed(() => togglePlay());
  ui.btnSlower.mousePressed(() => setRate(playRate - 0.1));
  ui.btnFaster.mousePressed(() => setRate(playRate + 0.1));

  layoutPlayerUI();
  setPlayerUIVisible(false);
}

function layoutPlayerUI() {
  const pad = 16;
  let x = pad;
  let y = height - 64;

  ui.btnBack.position(x, y); ui.btnBack.size(110, 38); x += 120;
  ui.btnPrev.position(x, y); ui.btnPrev.size(110, 38); x += 120;
  ui.btnPlay.position(x, y); ui.btnPlay.size(130, 38); x += 140;
  ui.btnNext.position(x, y); ui.btnNext.size(110, 38); x += 120;
  ui.btnSlower.position(x, y); ui.btnSlower.size(90, 38); x += 100;
  ui.btnFaster.position(x, y); ui.btnFaster.size(90, 38); x += 110;

  ui.vol.position(width - 200 - pad, y + 8);
  ui.vol.size(200);
}

function setPlayerUIVisible(v) {
  const method = v ? "show" : "hide";
  ui.btnBack[method]();
  ui.btnPrev[method]();
  ui.btnPlay[method]();
  ui.btnNext[method]();
  ui.btnSlower[method]();
  ui.btnFaster[method]();
  ui.vol[method]();
}

function drawPlayerScreen() {
  const leftW = width * 0.44;
  const rightX = leftW;

  // 卡片背景
  noStroke();
  fill(255, 255, 255, 18);
  rect(18, 18, leftW - 30, height - 110, 18);
  rect(rightX + 12, 18, width - rightX - 30, height - 110, 18);

  // 音量同步：用 amp 小 ramp 比 setVolume 穩
  if (currentSound && currentSound.isLoaded()) {
    currentSound.amp(ui.vol.value(), 0.05);
  }

  // 60 秒到了就下一首
  if (isPlaying && currentSound && currentSound.isLoaded()) {
    const t = currentSound.currentTime();
    if (t >= CLIP_SECONDS) {
      nextTrack(true);
      return;
    }
  }

  drawMosaicRevealArea(rightX + 12, 18, width - rightX - 30, height - 110);
  drawStoryArea(18, 18, leftW - 30, height - 110);
  drawProgressBar(18, height - 92, width - 36, 14);
}

function drawStoryArea(x, y, w, h) {
  push();
  translate(x, y);

  fill(255, 235, 180);
  textSize(28);
  textAlign(LEFT, TOP);
  text(tracks[currentIndex].title, 18, 16);

  // 狀態列
  fill(255, 255, 255, 150);
  textSize(13);

  let status = "尚未載入";
  if (soundLoading) status = "音訊載入中…";
  else if (currentSound && currentSound.isLoaded()) status = isPlaying ? "播放中" : "暫停";

  text(
    `狀態：${status}   |   速度：${nf(playRate, 1, 1)}x   |   音量：${nf(ui.vol.value(), 1, 2)}`,
    18, 56
  );

  // 故事
  fill(255, 220, 150, 220);
  textSize(16);
  textAlign(LEFT, TOP);
  textLeading(24);
  text(tracks[currentIndex].story, 18, 98, w - 36, h - 140);

  pop();
}

function drawProgressBar(x, y, w, h) {
  const t = (currentSound && currentSound.isLoaded()) ? currentSound.currentTime() : 0;
  const p = constrain(t / CLIP_SECONDS, 0, 1);

  noStroke();
  fill(255, 255, 255, 55);
  rect(x, y, w, h, 8);

  fill(255, 220, 150, 200);
  rect(x, y, w * p, h, 8);

  fill(255, 255, 255, 140);
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text(`${nf(t, 2, 1)}s / ${CLIP_SECONDS}s`, x + w, y - 6);
}

function drawMosaicRevealArea(x, y, w, h) {
  push();
  translate(x, y);

  noStroke();
  fill(0, 0, 0, 30);
  rect(0, 0, w, h, 18);

  if (!currentImage) {
    fill(255, 255, 255, 130);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("圖片載入中…", w / 2, h / 2);
    pop();
    return;
  }

  // 播放時間 → 顯影進度
  const t = (currentSound && currentSound.isLoaded()) ? currentSound.currentTime() : 0;
const revealProgress = constrain(t / REVEAL_SECONDS, 0, 1);
stepRevealTo(revealProgress);

// ✅ 顯影完成後：直接顯示清晰原圖（cover）
// 0.995 是保險值，避免浮點數剛好不到 1
if (revealProgress >= 0.995) {
  imageMode(CORNER);
  drawImageCover(currentImage, w, h);
} else {
  drawMosaicBase(w, h);
  drawReveal(w, h);
}

  pop();
}

// ===============================
// Reveal grid
// ===============================
function rebuildGrid() {
  cols = int(constrain(windowWidth / 18, 56, 96));
  rows = int(constrain(windowHeight / 18, 32, 72));
  revealGrid = new Array(cols * rows).fill(0);
}

function resetReveal() {
  revealGrid.fill(0);
}

function stepRevealTo(target) {
  const total = cols * rows;
  const steps = 240; // 每幀更新格子數（可調）

  for (let i = 0; i < steps; i++) {
    const idx = int(random(total));
    const cur = revealGrid[idx];
    if (cur < target) {
      revealGrid[idx] = min(target, cur + 0.03 + target * 0.02);
    }
  }
}

function drawMosaicBase(w, h) {
  const m = 36; // 大馬賽克塊
  for (let yy = 0; yy < h; yy += m) {
    for (let xx = 0; xx < w; xx += m) {
      const ix = int(map(xx + m * 0.5, 0, w, 0, currentImage.width - 1));
      const iy = int(map(yy + m * 0.5, 0, h, 0, currentImage.height - 1));
      const c = currentImage.get(ix, iy);

      // 用附近的顯影估計讓馬賽克逐步變透明
      const r = sampleReveal(xx / w, yy / h);
      const a = map(r, 0, 1, 235, 0);

      noStroke();
      fill(red(c) * 0.9, green(c) * 0.9, blue(c) * 0.9, a);
      rect(xx, yy, m + 1, m + 1, 6);
    }
  }
}

function drawReveal(w, h) {
  cellW = w / cols;
  cellH = h / rows;

  noStroke();
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const idx = gx + gy * cols;
      const r = revealGrid[idx];
      if (r <= 0.01) continue;

      const x = gx * cellW;
      const y = gy * cellH;

      const ix = int(map(x + cellW * 0.5, 0, w, 0, currentImage.width - 1));
      const iy = int(map(y + cellH * 0.5, 0, h, 0, currentImage.height - 1));
      const c = currentImage.get(ix, iy);

      fill(red(c), green(c), blue(c), 255 * r);
      rect(x, y, cellW + 1, cellH + 1);
    }
  }
}

function sampleReveal(nx, ny) {
  const gx = int(constrain(nx * cols, 0, cols - 1));
  const gy = int(constrain(ny * rows, 0, rows - 1));
  return revealGrid[gx + gy * cols];
}

// ===============================
// Audio / Switching
// ===============================
function startAudioOnce() {
  if (audioStarted) return;
  userStartAudio().then(() => audioStarted = true);
}

function goToPlayer(index, autoplay) {
  currentIndex = (index + tracks.length) % tracks.length;
  mode = MODE.PLAYER;
  setListButtonsVisible(false);
  setPlayerUIVisible(true);
  loadTrack(currentIndex, autoplay);
}

function loadTrack(index, autoplay) {
  stopCurrent(true);
  resetReveal();

  playRate = 1.0;
  soundLoading = true;
  imageLoading = true;

  const t = tracks[index];

  // load image
  currentImage = null;
  loadImage(
    t.img,
    (im) => { currentImage = im; imageLoading = false; },
    () => { currentImage = null; imageLoading = false; }
  );

  // load sound
  currentSound = loadSound(
    t.file,
    () => {
      soundLoading = false;
      if (autoplay) playCurrentFromStart();
    },
    () => {
      soundLoading = false;
      currentSound = null;
      isPlaying = false;
    }
  );
}

function playCurrentFromStart() {
  if (!currentSound || !currentSound.isLoaded()) return;

  currentSound.stop();
  currentSound.rate(playRate);
  currentSound.amp(ui.vol.value(), 0.05);
  currentSound.play(0, 1, ui.vol.value(), 0);
  isPlaying = true;
}

function togglePlay() {
  startAudioOnce();
  if (!currentSound || !currentSound.isLoaded()) return;

  if (isPlaying) {
    currentSound.pause();
    isPlaying = false;
  } else {
    currentSound.rate(playRate);
    currentSound.play();
    isPlaying = true;
  }
}

function setRate(r) {
  playRate = constrain(r, 0.6, 1.6);
  if (currentSound && currentSound.isLoaded()) currentSound.rate(playRate);
}

function nextTrack(autoplay) {
  currentIndex = (currentIndex + 1) % tracks.length;
  loadTrack(currentIndex, autoplay);
}

function prevTrack(autoplay) {
  currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
  loadTrack(currentIndex, autoplay);
}

function stopCurrent(hard) {
  if (currentSound) {
    try { hard ? currentSound.stop() : currentSound.pause(); } catch (e) {}
  }
  isPlaying = false;
}

// ------------------------------
// Background dust
// ------------------------------
function drawBackgroundDust() {
  stroke(255, 220, 160, 55);
  strokeWeight(2);
  for (let i = 0; i < 28; i++) point(random(width), random(height * 0.7));
}

// ------------------------------
// Resize
// ------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildGrid();
  layoutPlayerUI();
  layoutListButtons();
}
function drawImageCover(img, w, h) {
  // 讓圖片填滿框（保持比例，必要時裁切）
  const s = max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  image(img, dx, dy, dw, dh);
}
