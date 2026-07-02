// One-Button Roguelite Reflex — прототип ігрового циклу.
// Один інпут (клік/тап/пробіл), рандомні мікро-виклики, permadeath, ескалація складності.
// Мета-прогресія: фрагменти за пройдені раунди → розблокування нових викликів і щита (localStorage).

const WIDTH = 480;
const HEIGHT = 800;

const COLORS = {
  bg: 0x0a0a12,
  accent: 0x00ffc8,
  danger: 0xff3355,
  warn: 0xffd23f,
  magenta: 0xff2bd6,
  text: '#e8ffff',
};

// Кожен раунд скорочує вікно реакції — джерело ескалації складності.
function windowForRound(round) {
  return Math.max(280, 900 - round * 35);
}

// --- Збереження ---

const SAVE_KEY = 'obrr-save-v1';

const DEFAULT_SAVE = {
  best: 0,
  shards: 0,
  unlocks: { mash: false, hold: false, shield: false },
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      unlocks: { ...DEFAULT_SAVE.unlocks, ...(parsed.unlocks || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

function saveSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // приватний режим без localStorage — граємо без збереження
  }
}

// --- Локалізація ---
// Мова визначається з navigator.languages; en — дефолт і фолбек для відсутніх ключів.

const I18N = {
  en: {
    best: 'BEST', shards: 'SHARDS', shardsShort: 'SH', owned: 'OWNED', play: 'PLAY [SPACE]',
    mashName: 'CHALLENGE: BURST', mashDesc: 'new trial — press 5 times in time',
    holdName: 'CHALLENGE: HOLD', holdDesc: 'new trial — hold and release in the zone',
    shieldName: 'SHIELD', shieldDesc: 'first mistake of a run is forgiven',
    round: 'ROUND', shieldChip: 'SHIELD ●', hintStart: 'Press to start the run',
    ok: 'OK', fail: 'FAILED', shieldSaved: 'SHIELD SAVED YOU!', goingOn: 'GOING ON',
    pressNow: 'PRESS!', dontPress: "DON'T PRESS", catchMoment: 'CATCH THE MOMENT',
    pressX: (n) => `PRESS x${n}`, holdDown: 'HOLD DOWN', releaseZone: 'RELEASE IN THE ZONE',
    btnContinue: '▶ CONTINUE (AD)', btnMenu: 'MENU [SPACE]',
    overStats: (s, e) => `Rounds: ${s} · +${e} shards`,
  },
  uk: {
    best: 'РЕКОРД', shards: 'ФРАГМЕНТИ', shardsShort: 'ФР', owned: 'КУПЛЕНО', play: 'ГРАТИ [ПРОБІЛ]',
    mashName: 'ВИКЛИК: ШКВАЛ', mashDesc: 'нове випробування — встигни натиснути 5 разів',
    holdName: 'ВИКЛИК: ТРИМАЙ', holdDesc: 'нове випробування — утримуй і відпусти в зоні',
    shieldName: 'ЩИТ', shieldDesc: 'перша помилка в забігу прощається',
    round: 'РАУНД', shieldChip: 'ЩИТ ●', hintStart: 'Тисни, щоб почати забіг',
    ok: 'OK', fail: 'ПРОВАЛ', shieldSaved: 'ЩИТ ВРЯТУВАВ!', goingOn: 'ПРОДОВЖУЄМО',
    pressNow: 'ТИСНИ!', dontPress: 'НЕ ТИСНИ', catchMoment: 'ЛОВИ МОМЕНТ',
    pressX: (n) => `ТИСНИ x${n}`, holdDown: 'ЗАТИСНИ', releaseZone: 'ВІДПУСТИ В ЗОНІ',
    btnContinue: '▶ ПРОДОВЖИТИ (РЕКЛАМА)', btnMenu: 'В МЕНЮ [ПРОБІЛ]',
    overStats: (s, e) => `Раундів: ${s} · +${e} фрагментів`,
  },
  es: {
    best: 'RÉCORD', shards: 'FRAGMENTOS', shardsShort: 'FR', owned: 'COMPRADO', play: 'JUGAR [ESPACIO]',
    mashName: 'DESAFÍO: RÁFAGA', mashDesc: 'nueva prueba — pulsa 5 veces a tiempo',
    holdName: 'DESAFÍO: MANTÉN', holdDesc: 'nueva prueba — mantén y suelta en la zona',
    shieldName: 'ESCUDO', shieldDesc: 'se perdona el primer error de la partida',
    round: 'RONDA', shieldChip: 'ESCUDO ●', hintStart: 'Pulsa para empezar',
    ok: 'OK', fail: 'FALLO', shieldSaved: '¡EL ESCUDO TE SALVÓ!', goingOn: 'SEGUIMOS',
    pressNow: '¡PULSA!', dontPress: 'NO PULSES', catchMoment: 'CAZA EL MOMENTO',
    pressX: (n) => `PULSA x${n}`, holdDown: 'MANTÉN PULSADO', releaseZone: 'SUELTA EN LA ZONA',
    btnContinue: '▶ CONTINUAR (ANUNCIO)', btnMenu: 'MENÚ [ESPACIO]',
    overStats: (s, e) => `Rondas: ${s} · +${e} fragmentos`,
  },
  pt: {
    best: 'RECORDE', shards: 'FRAGMENTOS', shardsShort: 'FR', owned: 'COMPRADO', play: 'JOGAR [ESPAÇO]',
    mashName: 'DESAFIO: RAJADA', mashDesc: 'novo teste — aperte 5 vezes a tempo',
    holdName: 'DESAFIO: SEGURE', holdDesc: 'novo teste — segure e solte na zona',
    shieldName: 'ESCUDO', shieldDesc: 'o primeiro erro da corrida é perdoado',
    round: 'RODADA', shieldChip: 'ESCUDO ●', hintStart: 'Aperte para começar',
    ok: 'OK', fail: 'FALHOU', shieldSaved: 'O ESCUDO TE SALVOU!', goingOn: 'CONTINUANDO',
    pressNow: 'APERTE!', dontPress: 'NÃO APERTE', catchMoment: 'PEGUE O MOMENTO',
    pressX: (n) => `APERTE x${n}`, holdDown: 'SEGURE', releaseZone: 'SOLTE NA ZONA',
    btnContinue: '▶ CONTINUAR (ANÚNCIO)', btnMenu: 'MENU [ESPAÇO]',
    overStats: (s, e) => `Rodadas: ${s} · +${e} fragmentos`,
  },
  de: {
    best: 'REKORD', shards: 'SPLITTER', shardsShort: 'SP', owned: 'GEKAUFT', play: 'SPIELEN [LEERTASTE]',
    mashName: 'PRÜFUNG: SALVE', mashDesc: 'neue Prüfung — drücke 5x rechtzeitig',
    holdName: 'PRÜFUNG: HALTEN', holdDesc: 'neue Prüfung — halten und in der Zone loslassen',
    shieldName: 'SCHILD', shieldDesc: 'der erste Fehler eines Laufs wird verziehen',
    round: 'RUNDE', shieldChip: 'SCHILD ●', hintStart: 'Drücke, um zu starten',
    ok: 'OK', fail: 'VERSAGT', shieldSaved: 'SCHILD HAT DICH GERETTET!', goingOn: 'WEITER GEHTS',
    pressNow: 'DRÜCK!', dontPress: 'NICHT DRÜCKEN', catchMoment: 'FANG DEN MOMENT',
    pressX: (n) => `DRÜCK x${n}`, holdDown: 'GEDRÜCKT HALTEN', releaseZone: 'IN DER ZONE LOSLASSEN',
    btnContinue: '▶ WEITER (WERBUNG)', btnMenu: 'MENÜ [LEERTASTE]',
    overStats: (s, e) => `Runden: ${s} · +${e} Splitter`,
  },
  fr: {
    best: 'RECORD', shards: 'FRAGMENTS', shardsShort: 'FR', owned: 'ACHETÉ', play: 'JOUER [ESPACE]',
    mashName: 'DÉFI : RAFALE', mashDesc: 'nouvelle épreuve — appuie 5 fois à temps',
    holdName: 'DÉFI : MAINTIENS', holdDesc: 'nouvelle épreuve — maintiens et relâche dans la zone',
    shieldName: 'BOUCLIER', shieldDesc: 'la première erreur du run est pardonnée',
    round: 'MANCHE', shieldChip: 'BOUCLIER ●', hintStart: 'Appuie pour commencer',
    ok: 'OK', fail: 'ÉCHEC', shieldSaved: "LE BOUCLIER T'A SAUVÉ !", goingOn: 'ON CONTINUE',
    pressNow: 'APPUIE !', dontPress: "N'APPUIE PAS", catchMoment: 'SAISIS LE MOMENT',
    pressX: (n) => `APPUIE x${n}`, holdDown: 'MAINTIENS', releaseZone: 'RELÂCHE DANS LA ZONE',
    btnContinue: '▶ CONTINUER (PUB)', btnMenu: 'MENU [ESPACE]',
    overStats: (s, e) => `Manches : ${s} · +${e} fragments`,
  },
  pl: {
    best: 'REKORD', shards: 'FRAGMENTY', shardsShort: 'FR', owned: 'KUPIONE', play: 'GRAJ [SPACJA]',
    mashName: 'WYZWANIE: SERIA', mashDesc: 'nowa próba — naciśnij 5 razy na czas',
    holdName: 'WYZWANIE: TRZYMAJ', holdDesc: 'nowa próba — przytrzymaj i puść w strefie',
    shieldName: 'TARCZA', shieldDesc: 'pierwszy błąd w biegu jest wybaczany',
    round: 'RUNDA', shieldChip: 'TARCZA ●', hintStart: 'Naciśnij, aby zacząć',
    ok: 'OK', fail: 'PORAŻKA', shieldSaved: 'TARCZA CIĘ URATOWAŁA!', goingOn: 'GRAMY DALEJ',
    pressNow: 'NACIŚNIJ!', dontPress: 'NIE NACISKAJ', catchMoment: 'ZŁAP MOMENT',
    pressX: (n) => `NACIŚNIJ x${n}`, holdDown: 'PRZYTRZYMAJ', releaseZone: 'PUŚĆ W STREFIE',
    btnContinue: '▶ KONTYNUUJ (REKLAMA)', btnMenu: 'MENU [SPACJA]',
    overStats: (s, e) => `Rundy: ${s} · +${e} fragmentów`,
  },
  tr: {
    best: 'REKOR', shards: 'PARÇALAR', shardsShort: 'PR', owned: 'ALINDI', play: 'OYNA [BOŞLUK]',
    mashName: 'GÖREV: SERİ', mashDesc: 'yeni deneme — zamanında 5 kez bas',
    holdName: 'GÖREV: BASILI TUT', holdDesc: 'yeni deneme — basılı tut, bölgede bırak',
    shieldName: 'KALKAN', shieldDesc: 'koşudaki ilk hata affedilir',
    round: 'TUR', shieldChip: 'KALKAN ●', hintStart: 'Başlamak için bas',
    ok: 'OK', fail: 'BAŞARISIZ', shieldSaved: 'KALKAN SENİ KURTARDI!', goingOn: 'DEVAM',
    pressNow: 'BAS!', dontPress: 'BASMA', catchMoment: 'ANI YAKALA',
    pressX: (n) => `BAS x${n}`, holdDown: 'BASILI TUT', releaseZone: 'BÖLGEDE BIRAK',
    btnContinue: '▶ DEVAM ET (REKLAM)', btnMenu: 'MENÜ [BOŞLUK]',
    overStats: (s, e) => `Tur: ${s} · +${e} parça`,
  },
};

function detectLang() {
  const candidates = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || 'en'];
  for (const c of candidates) {
    const code = String(c).slice(0, 2).toLowerCase();
    if (I18N[code]) return code;
  }
  return 'en';
}

const LANG = detectLang();
const T = { ...I18N.en, ...I18N[LANG] };
window.i18n = { lang: LANG, T };

const UNLOCK_DEFS = [
  { key: 'mash', name: T.mashName, desc: T.mashDesc, cost: 15 },
  { key: 'hold', name: T.holdName, desc: T.holdDesc, cost: 30 },
  { key: 'shield', name: T.shieldName, desc: T.shieldDesc, cost: 50 },
];

// --- Ретро/глітч FX (усе процедурне, без асетів — тримає розмір під вимоги порталів) ---

function ensureFxTextures(scene) {
  if (scene.textures.exists('px')) return;
  let g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
  g.generateTexture('px', 4, 4);
  g.destroy();
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x000000, 1).fillRect(0, 0, 8, 2);
  g.generateTexture('scanline', 8, 4);
  g.destroy();
  g = scene.make.graphics({ add: false });
  g.lineStyle(1, COLORS.accent, 0.15);
  g.strokeRect(0, 0, 40, 40);
  g.generateTexture('grid', 40, 40);
  g.destroy();
}

// Фон: неонова сітка, що повзе вниз (швидкість росте з раундами), CRT-сканлайни, флікер.
function addRetroBackdrop(scene) {
  ensureFxTextures(scene);
  scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.bg);
  const grid = scene.add.tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 'grid').setAlpha(0.3);
  scene.gridSpeed = 0.15;
  scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
    grid.tilePositionY -= scene.gridSpeed;
  });
  scene.add.tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 'scanline').setAlpha(0.12).setDepth(1000);
  const flick = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0).setDepth(999);
  scene.time.addEvent({
    delay: 2200,
    loop: true,
    callback: () => {
      flick.setAlpha(0.06);
      scene.time.delayedCall(60, () => flick.setAlpha(0));
    },
  });
  return grid;
}

// Випадкові горизонтальні смуги-перешкоди на весь екран.
function glitchBurst(scene, count = 10) {
  const palette = [COLORS.accent, COLORS.danger, COLORS.magenta];
  for (let i = 0; i < count; i++) {
    const r = scene.add.rectangle(
      Phaser.Math.Between(0, WIDTH),
      Phaser.Math.Between(0, HEIGHT),
      Phaser.Math.Between(40, 220),
      Phaser.Math.Between(2, 8),
      Phaser.Utils.Array.GetRandom(palette),
      0.55,
    ).setDepth(900);
    scene.time.delayedCall(Phaser.Math.Between(60, 200), () => r.destroy());
  }
}

// Короткий RGB-розсинхрон навколо текстового об'єкта.
function rgbSplit(scene, textObj, duration = 220) {
  const mk = (color, dx) => scene.add.text(textObj.x + dx, textObj.y, textObj.text, {
    fontFamily: 'Courier New',
    fontSize: textObj.style.fontSize,
    color,
    align: 'center',
  }).setOrigin(0.5).setAlpha(0.5);
  const a = mk('#ff2bd6', -3);
  const b = mk('#00ffc8', 3);
  scene.time.delayedCall(duration, () => {
    a.destroy();
    b.destroy();
  });
}

// --- Процедурний звук (WebAudio, без аудіофайлів) ---
// Контекст створюється ліниво з першого інпуту — обходить autoplay-політику браузерів.

const sfx = {
  ctx: null,
  muted: false,
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone({ freq = 440, end = freq, type = 'square', dur = 0.1, vol = 0.15, when = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  noise({ dur = 0.2, vol = 0.2 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(gain).connect(ctx.destination);
    src.start(t);
  },
  press() { this.tone({ freq: 880, end: 660, dur: 0.05, vol: 0.05 }); },
  success() {
    this.tone({ freq: 520, end: 1040, dur: 0.12, vol: 0.12 });
    this.tone({ freq: 780, end: 1560, dur: 0.1, vol: 0.08, when: 0.06 });
  },
  fail() {
    this.tone({ freq: 300, end: 60, type: 'sawtooth', dur: 0.45, vol: 0.18 });
    this.noise({ dur: 0.3, vol: 0.12 });
  },
  shield() {
    this.tone({ freq: 440, end: 880, type: 'triangle', dur: 0.15, vol: 0.14 });
    this.tone({ freq: 880, end: 440, type: 'triangle', dur: 0.15, vol: 0.1, when: 0.12 });
  },
  buy() {
    this.tone({ freq: 660, dur: 0.08, vol: 0.12 });
    this.tone({ freq: 990, dur: 0.12, vol: 0.12, when: 0.08 });
  },
};
// Доступ ззовні — для тестів і mute через Poki/CrazyGames SDK.
window.sfx = sfx;

// --- Інтеграція порталу (Poki SDK з фолбеком-заглушкою) ---
// Вимога Poki: гра мусить повністю працювати і без SDK (adblock, локальний запуск,
// інші портали). Тому всі виклики йдуть через цю обгортку, а не напряму в PokiSDK.
// portal.log — журнал подій для E2E-тестів.

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const portal = {
  sdk: null,
  log: [],
  mark(e) { this.log.push(e); },
  async init() {
    this.mark('init');
    if (!window.PokiSDK) {
      this.mark('no-sdk');
      return;
    }
    try {
      await withTimeout(PokiSDK.init(), 5000);
      this.sdk = PokiSDK;
      PokiSDK.gameLoadingFinished();
      this.mark('initialized');
    } catch {
      this.mark('init-failed');
    }
  },
  gameplayStart() {
    this.mark('gameplayStart');
    if (this.sdk) this.sdk.gameplayStart();
  },
  gameplayStop() {
    this.mark('gameplayStop');
    if (this.sdk) this.sdk.gameplayStop();
  },
  async commercialBreak() {
    this.mark('commercialBreak');
    if (!this.sdk) return;
    sfx.muted = true;
    try {
      await withTimeout(this.sdk.commercialBreak(() => {}), 8000);
    } catch { /* реклами може не бути — це ок */ }
    sfx.muted = false;
  },
  // true = нагороду отримано. Без SDK — завжди true, щоб continue працював у dev-режимі.
  async rewardedBreak() {
    this.mark('rewardedBreak');
    if (!this.sdk) return true;
    sfx.muted = true;
    let ok = false;
    try {
      ok = !!(await withTimeout(this.sdk.rewardedBreak(() => {}), 10000, false));
    } catch {
      ok = false;
    }
    sfx.muted = false;
    return ok;
  },
};
window.portal = portal;
portal.init();

// --- Меню / магазин між забігами ---

class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.save = loadSave();
    this.starting = false; // сцени Phaser переюзуються — прапорець треба скидати щоразу

    addRetroBackdrop(this);

    const title = this.add.text(WIDTH / 2, 110, 'ONE-BUTTON\nROGUELITE REFLEX', {
      fontFamily: 'Courier New',
      fontSize: '34px',
      color: '#00ffc8',
      align: 'center',
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#00ffc8', 14, true, true);

    // Періодичний глітч-тік заголовка.
    this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        glitchBurst(this, 4);
        rgbSplit(this, title, 120);
        this.tweens.add({
          targets: title,
          x: WIDTH / 2 + Phaser.Math.Between(-5, 5),
          duration: 40,
          yoyo: true,
          repeat: 2,
          onComplete: () => title.setX(WIDTH / 2),
        });
      },
    });

    this.add.text(WIDTH / 2, 200, `${T.best}: ${this.save.best}   ${T.shards}: ${this.save.shards}`, {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: COLORS.text,
    }).setOrigin(0.5);

    UNLOCK_DEFS.forEach((def, i) => this.renderUnlockRow(def, 300 + i * 110));

    const playBtn = this.add.rectangle(WIDTH / 2, HEIGHT - 110, 300, 80, COLORS.accent, 0.2)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, HEIGHT - 110, T.play, {
      fontFamily: 'Courier New',
      fontSize: '22px',
      color: COLORS.text,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: playBtn,
      fillAlpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const startRun = async () => {
      if (this.starting) return;
      this.starting = true;
      sfx.press();
      await portal.commercialBreak();
      this.scene.start('GameScene');
    };
    playBtn.on('pointerdown', startRun);
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (!event.repeat) startRun();
    });
  }

  renderUnlockRow(def, y) {
    const owned = this.save.unlocks[def.key];
    const affordable = this.save.shards >= def.cost;

    const rect = this.add.rectangle(WIDTH / 2, y, 420, 90, owned ? COLORS.accent : 0xffffff, owned ? 0.12 : 0.05)
      .setStrokeStyle(1, owned ? COLORS.accent : 0x555566);

    this.add.text(WIDTH / 2 - 195, y - 22, def.name, {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: COLORS.text,
    }).setOrigin(0, 0.5);

    this.add.text(WIDTH / 2 - 195, y + 8, def.desc, {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#8899aa',
    }).setOrigin(0, 0.5);

    this.add.text(WIDTH / 2 + 195, y - 22, owned ? T.owned : `${def.cost} ${T.shardsShort}`, {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: owned ? '#00ffc8' : (affordable ? '#ffd23f' : '#555566'),
    }).setOrigin(1, 0.5);

    if (!owned && affordable) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => {
        sfx.buy();
        this.save.shards -= def.cost;
        this.save.unlocks[def.key] = true;
        saveSave(this.save);
        this.scene.restart();
      });
    }
  }
}

// --- Забіг ---

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.save = loadSave();
    this.round = 0;
    this.gameOver = false;
    this.challengeActive = false;
    this.shieldCharges = this.save.unlocks.shield ? 1 : 0;
    this.gameplayActive = false;
    this.continueUsed = false;
    this.adInProgress = false;
    this.bankedRounds = 0; // скільки раундів уже конвертовано у фрагменти (через continue провалів може бути кілька)
    this.overUI = [];

    this.challengePool = [reactionChallenge, avoidChallenge, timingChallenge];
    if (this.save.unlocks.mash) this.challengePool.push(mashChallenge);
    if (this.save.unlocks.hold) this.challengePool.push(holdChallenge);

    addRetroBackdrop(this);

    this.burst = this.add.particles(0, 0, 'px', {
      speed: { min: 80, max: 220 },
      lifespan: 450,
      scale: { start: 1.2, end: 0 },
      tint: COLORS.accent,
      emitting: false,
    });

    this.scoreText = this.add.text(WIDTH / 2, 60, `${T.round} 0`, {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: COLORS.text,
    }).setOrigin(0.5);
    this.scoreText.setShadow(0, 0, '#00ffc8', 10, true, true);

    this.shieldText = this.add.text(WIDTH - 20, 30, this.shieldCharges ? T.shieldChip : '', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#ffd23f',
    }).setOrigin(1, 0.5);

    this.promptText = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, '', {
      fontFamily: 'Courier New',
      fontSize: '40px',
      color: COLORS.text,
      align: 'center',
    }).setOrigin(0.5);

    this.zone = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 120, 300, 120, COLORS.accent, 0.15);

    this.hintText = this.add.text(WIDTH / 2, HEIGHT - 80, T.hintStart, {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#888',
    }).setOrigin(0.5);

    this.input.on('pointerdown', () => this.onPress(false));
    this.input.on('pointerup', () => this.onRelease());
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (!event.repeat) this.onPress(true);
    });
    this.input.keyboard.on('keyup-SPACE', () => this.onRelease());

    this.state = 'idle';
  }

  onPress(fromKeyboard) {
    if (this.adInProgress) return;
    sfx.press();
    if (this.gameOver) {
      // Тап обробляють кнопки game over; пробіл — швидкий вихід у меню.
      if (fromKeyboard) this.scene.start('MenuScene');
      return;
    }
    if (this.state === 'idle') {
      this.startRound();
      return;
    }
    if (!this.challengeActive) return;

    const result = this.currentChallenge.onPress(this);
    if (result !== null) this.resolveChallenge(result);
  }

  onRelease() {
    if (this.gameOver || !this.challengeActive) return;
    const ch = this.currentChallenge;
    if (!ch.onRelease) return;
    const result = ch.onRelease(this);
    if (result !== null) this.resolveChallenge(result);
  }

  startRound() {
    this.round += 1;
    this.scoreText.setText(`${T.round} ${this.round}`);
    this.gridSpeed = 0.15 + this.round * 0.02;
    this.hintText.setText('');
    this.promptText.setColor(COLORS.text);
    this.zone.setFillStyle(COLORS.accent, 0.15);
    this.state = 'challenge';
    this.challengeActive = true;

    if (!this.gameplayActive) {
      this.gameplayActive = true;
      portal.gameplayStart();
    }

    this.currentChallenge = Phaser.Utils.Array.GetRandom(this.challengePool);
    this.currentChallenge.start(this, windowForRound(this.round));
  }

  resolveChallenge(success) {
    this.challengeActive = false;
    const ch = this.currentChallenge;
    if (ch.timer) { ch.timer.remove(); ch.timer = null; }
    if (ch.tween) { ch.tween.stop(); ch.tween = null; }
    if (ch.cleanup) ch.cleanup(this);

    if (success) {
      this.promptText.setText(T.ok);
      this.zone.setFillStyle(COLORS.accent, 0.3);
      sfx.success();
      this.burst.explode(14, WIDTH / 2, HEIGHT / 2 + 120);
      this.tweens.add({ targets: this.scoreText, scale: 1.2, duration: 90, yoyo: true });
      this.state = 'idle';
      this.time.delayedCall(400, () => {
        if (!this.gameOver) this.startRound();
      });
    } else {
      this.failRun();
    }
  }

  failRun() {
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.shieldText.setText('');
      this.promptText.setText(T.shieldSaved);
      this.promptText.setColor('#ffd23f');
      this.zone.setFillStyle(COLORS.warn, 0.3);
      sfx.shield();
      this.cameras.main.shake(150, 0.006);
      glitchBurst(this, 5);
      this.state = 'idle';
      this.time.delayedCall(700, () => {
        if (!this.gameOver) this.startRound();
      });
      return;
    }

    this.gameOver = true;
    this.gameplayActive = false;
    portal.gameplayStop();
    sfx.fail();
    this.cameras.main.shake(280, 0.014);
    this.cameras.main.flash(120, 255, 51, 85);
    glitchBurst(this, 14);

    // Через continue провалів у забігу може бути кілька — конвертуємо лише нові раунди.
    const survived = this.round - 1;
    const earned = survived - this.bankedRounds;
    this.bankedRounds = survived;
    this.save.shards += earned;
    this.save.best = Math.max(this.save.best, survived);
    saveSave(this.save);

    this.promptText.setText(T.fail);
    this.promptText.setColor('#ff3355');
    rgbSplit(this, this.promptText, 400);
    this.zone.setFillStyle(COLORS.danger, 0.3);
    this.hintText.setY(HEIGHT - 30);
    this.hintText.setText(T.overStats(survived, earned));
    this.showGameOverButtons();
  }

  showGameOverButtons() {
    const mkBtn = (y, label, cb) => {
      const r = this.add.rectangle(WIDTH / 2, y, 340, 64, COLORS.accent, 0.15)
        .setStrokeStyle(2, COLORS.accent)
        .setInteractive({ useHandCursor: true })
        .setDepth(950);
      const t = this.add.text(WIDTH / 2, y, label, {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: COLORS.text,
      }).setOrigin(0.5).setDepth(951);
      r.on('pointerdown', cb);
      this.overUI.push(r, t);
    };
    if (!this.continueUsed) {
      mkBtn(HEIGHT / 2 + 220, T.btnContinue, () => this.tryContinue());
    }
    mkBtn(HEIGHT / 2 + 300, T.btnMenu, () => this.scene.start('MenuScene'));
  }

  destroyOverUI() {
    this.overUI.forEach((o) => o.destroy());
    this.overUI = [];
  }

  async tryContinue() {
    if (this.continueUsed || !this.gameOver || this.adInProgress) return;
    this.continueUsed = true;
    this.adInProgress = true;
    const ok = await portal.rewardedBreak();
    this.adInProgress = false;
    this.destroyOverUI();
    if (!ok) {
      // Нагороди немає — лишаємо game over, тільки без кнопки продовження.
      this.showGameOverButtons();
      return;
    }
    this.gameOver = false;
    this.promptText.setText(T.goingOn);
    this.promptText.setColor('#00ffc8');
    this.zone.setFillStyle(COLORS.accent, 0.15);
    this.hintText.setText('');
    this.state = 'idle';
    this.time.delayedCall(600, () => {
      if (!this.gameOver) this.startRound();
    });
  }
}

// --- Виклики ---
// Кожен об'єкт: start(scene, windowMs) готує стан, onPress(scene) повертає
// true (успіх) / false (провал) / null (виклик триває). Опційно onRelease(scene)
// з тим самим контрактом і cleanup(scene) для прибирання своїх об'єктів.

const reactionChallenge = {
  start(scene, windowMs) {
    scene.promptText.setText('...');
    scene.zone.setFillStyle(COLORS.accent, 0.1);
    scene.ready = false;
    const delay = Phaser.Math.Between(400, 1400);
    this.timer = scene.time.delayedCall(delay, () => {
      scene.ready = true;
      scene.promptText.setText(T.pressNow);
      scene.zone.setFillStyle(COLORS.accent, 0.4);
      this.timer = scene.time.delayedCall(windowMs, () => {
        if (scene.challengeActive) scene.resolveChallenge(false);
      });
    });
  },
  onPress(scene) {
    return !!scene.ready;
  },
};

const avoidChallenge = {
  start(scene, windowMs) {
    scene.promptText.setText(T.dontPress);
    scene.promptText.setColor('#ffd23f');
    scene.zone.setFillStyle(COLORS.warn, 0.35);
    this.timer = scene.time.delayedCall(windowMs, () => {
      if (scene.challengeActive) scene.resolveChallenge(true);
    });
  },
  onPress() {
    return false;
  },
};

const timingChallenge = {
  start(scene, windowMs) {
    scene.promptText.setText(T.catchMoment);
    scene.inZone = false;
    this.bar = scene.add.rectangle(WIDTH / 2, HEIGHT / 2 + 120, 300, 24, 0x222233);
    this.marker = scene.add.rectangle(WIDTH / 2 - 150, HEIGHT / 2 + 120, 16, 40, COLORS.accent);

    this.tween = scene.tweens.add({
      targets: this.marker,
      x: WIDTH / 2 + 150,
      duration: windowMs,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        scene.inZone = Math.abs(this.marker.x - WIDTH / 2) < 40;
      },
    });

    this.timer = scene.time.delayedCall(windowMs * 3, () => {
      if (scene.challengeActive) scene.resolveChallenge(false);
    });
  },
  onPress(scene) {
    return !!scene.inZone;
  },
  cleanup() {
    if (this.bar) { this.bar.destroy(); this.bar = null; }
    if (this.marker) { this.marker.destroy(); this.marker = null; }
  },
};

// Розблоковується за фрагменти: встигни натиснути 5 разів у вікно.
const mashChallenge = {
  start(scene, windowMs) {
    this.needed = 5;
    this.count = 0;
    scene.promptText.setText(T.pressX(this.needed));
    scene.zone.setFillStyle(COLORS.accent, 0.25);
    this.timer = scene.time.delayedCall(Math.max(1300, windowMs * 3), () => {
      if (scene.challengeActive) scene.resolveChallenge(false);
    });
  },
  onPress(scene) {
    this.count += 1;
    if (this.count >= this.needed) return true;
    scene.promptText.setText(T.pressX(this.needed - this.count));
    return null;
  },
};

// Розблоковується за фрагменти: затисни, шкала заповнюється, відпусти в зоні 65-95%.
const holdChallenge = {
  start(scene, windowMs) {
    scene.promptText.setText(T.holdDown);
    this.holding = false;
    this.duration = Math.max(900, windowMs * 2);
    this.track = scene.add.rectangle(WIDTH / 2, HEIGHT / 2 + 120, 300, 24, 0x222233);
    this.zoneMark = scene.add.rectangle(WIDTH / 2 - 150 + 300 * 0.65, HEIGHT / 2 + 120, 300 * 0.3, 32, COLORS.accent, 0.25).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(WIDTH / 2 - 150, HEIGHT / 2 + 120, 300, 24, COLORS.accent).setOrigin(0, 0.5).setScale(0, 1);

    // Якщо так і не затиснув — провал.
    this.timer = scene.time.delayedCall(windowMs * 2, () => {
      if (scene.challengeActive && !this.holding) scene.resolveChallenge(false);
    });
  },
  onPress(scene) {
    if (this.holding) return null;
    this.holding = true;
    if (this.timer) { this.timer.remove(); this.timer = null; }
    scene.promptText.setText(T.releaseZone);
    this.tween = scene.tweens.add({
      targets: this.fill,
      scaleX: 1,
      duration: this.duration,
      onComplete: () => {
        if (scene.challengeActive) scene.resolveChallenge(false); // перетримав
      },
    });
    return null;
  },
  onRelease() {
    if (!this.holding) return null;
    const ratio = this.fill.scaleX;
    return ratio >= 0.65 && ratio < 0.95;
  },
  cleanup() {
    this.holding = false;
    [this.track, this.zoneMark, this.fill].forEach((o) => o && o.destroy());
    this.track = this.zoneMark = this.fill = null;
  },
};

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game-container',
  backgroundColor: COLORS.bg,
  scene: [MenuScene, GameScene],
};

window.game = new Phaser.Game(config);
