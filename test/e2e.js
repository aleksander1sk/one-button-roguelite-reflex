// E2E-перевірка One-Button Roguelite Reflex.
// Сценарій A: Poki SDK ЗАБЛОКОВАНО (adblock-емуляція) — повний детермінований прогін,
//             включно з rewarded-continue через заглушку. Вимога Poki: гра працює без SDK.
// Сценарій B: реальний SDK з CDN (dev-режим на localhost) — init + gameplayStart/Stop.
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:8123';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const results = [];
const check = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

async function newPage(browser, blockPoki) {
  const errors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 560, height: 900 });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (blockPoki) {
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().includes('poki') ? r.abort() : r.continue()));
  }
  return { page, errors };
}

async function scenarioA(browser) {
  const { page, errors } = await newPage(browser, true);
  // Фіксуємо мову браузера — headless бере локаль ОС, тест не має від неї залежати
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(800);

  check('A: Phaser loaded', await page.evaluate(() => !!window.Phaser && !!window.game));
  check('A: MenuScene active at start', await page.evaluate(() => window.game.scene.isActive('MenuScene')));
  check('A: portal fallback (no-sdk)', await page.evaluate(() => window.portal.log.includes('no-sdk')));

  // Пробіл у меню → commercialBreak (миттєвий без SDK) → забіг
  await page.keyboard.press('Space');
  await sleep(600);
  check('A: GameScene active after Space', await page.evaluate(() => window.game.scene.isActive('GameScene')));

  await page.keyboard.press('Space'); // раунд 1
  await sleep(200);
  check('A: round 1 + gameplayStart', await page.evaluate(() => {
    return window.game.scene.getScene('GameScene').round === 1
      && window.portal.log.filter(e => e === 'gameplayStart').length === 1;
  }));

  await page.keyboard.press('Space'); // миттєвий тиск = провал
  await sleep(400);
  check('A: game over + gameplayStop', await page.evaluate(() => {
    return window.game.scene.getScene('GameScene').gameOver
      && window.portal.log.filter(e => e === 'gameplayStop').length === 1;
  }));
  check('A: game over buttons shown (continue + menu)', await page.evaluate(() =>
    window.game.scene.getScene('GameScene').overUI.length === 4));

  const save1 = await page.evaluate(() => JSON.parse(localStorage.getItem('obrr-save-v1')));
  check('A: save written after run', !!save1 && save1.shards === 0 && save1.best === 0);

  // Клік «ПРОДОВЖИТИ» → rewarded-заглушка → відродження
  const box = await page.evaluate(() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const gx = (x) => box.x + (box.w / 480) * x;
  const gy = (y) => box.y + (box.h / 800) * y;
  await page.mouse.click(gx(240), gy(620)); // HEIGHT/2 + 220
  // Фіксуємо виклик після revive: тільки avoid — будь-який тиск = детермінований провал
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.challengePool = s.challengePool.slice(1, 2);
  });
  await sleep(1000); // rewarded миттєвий + 600ms до нового раунду

  check('A: revived after rewarded continue', await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    return !s.gameOver && s.round >= 2 && s.continueUsed
      && window.portal.log.includes('rewardedBreak')
      && window.portal.log.filter(e => e === 'gameplayStart').length === 2;
  }));

  await page.keyboard.press('Space'); // миттєвий тиск = другий провал
  await sleep(400);
  const st = await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    return {
      over: s.gameOver,
      overUI: s.overUI.length,
      round: s.round,
      shards: JSON.parse(localStorage.getItem('obrr-save-v1')).shards,
      stops: window.portal.log.filter(e => e === 'gameplayStop').length,
    };
  });
  check('A: second fail — no continue button, only menu', st.over && st.overUI === 2 && st.stops === 2);
  check('A: shards not double-counted', st.shards === st.round - 1);

  await page.mouse.click(gx(240), gy(700)); // «В МЕНЮ»
  await sleep(600);
  check('A: back to MenuScene via button', await page.evaluate(() => window.game.scene.isActive('MenuScene')));

  // Регресія: другий забіг БЕЗ перезавантаження сторінки (сцени Phaser переюзуються,
  // залиплий прапорець starting у MenuScene блокував повторний старт)
  await page.keyboard.press('Space');
  await sleep(600);
  check('A: second run starts without page reload', await page.evaluate(() => window.game.scene.isActive('GameScene')));
  await page.keyboard.press('Space'); // раунд 1 другого забігу
  await sleep(200);
  await page.keyboard.press('Space'); // миттєвий провал
  await sleep(400);
  await page.keyboard.press('Space'); // пробіл = в меню
  await sleep(600);
  check('A: menu → run → menu cycle repeats', await page.evaluate(() => window.game.scene.isActive('MenuScene')));

  // Магазин + щит (перевірка, що нічого не зламалось після SDK-змін)
  await page.evaluate(() => {
    localStorage.setItem('obrr-save-v1', JSON.stringify({ best: 7, shards: 100, unlocks: { mash: false, hold: false, shield: false } }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('canvas');
  await sleep(800);
  await page.mouse.click(gx(240), gy(300)); // ШКВАЛ
  await sleep(500);
  await page.mouse.click(gx(240), gy(520)); // ЩИТ
  await sleep(500);
  const save2 = await page.evaluate(() => JSON.parse(localStorage.getItem('obrr-save-v1')));
  check('A: purchases work (mash+shield, 100->35)', !!save2 && save2.unlocks.mash && save2.unlocks.shield && save2.shards === 35);

  await page.keyboard.press('Space'); // грати
  await sleep(600);
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.challengePool = s.challengePool.slice(1, 2); // тільки avoid — будь-який тиск = провал
  });
  await page.keyboard.press('Space'); // раунд 1
  await sleep(200);
  await page.keyboard.press('Space'); // провал — але є щит
  await sleep(400);
  check('A: shield absorbs first fail', await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    return !s.gameOver && s.shieldCharges === 0;
  }));
  check('A: AudioContext created after input', await page.evaluate(() => !!window.sfx && !!window.sfx.ctx));
  check('A: en locale → English UI', await page.evaluate(() =>
    window.i18n.lang === 'en' && window.i18n.T.play === 'PLAY [SPACE]'));

  const realErrors = errors.filter(e => !/poki|ERR_BLOCKED|Failed to load resource/i.test(e));
  check('A: no page errors', realErrors.length === 0);
  if (realErrors.length) console.log('A ERRORS:\n' + realErrors.join('\n'));
  await page.close();
}

async function scenarioB(browser) {
  const { page, errors } = await newPage(browser, false);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(1500);

  const initState = await page.evaluate(() => window.portal.log.join(','));
  console.log('B: portal.log after load =', initState);
  check('B: SDK init attempted', /init/.test(initState));
  const sdkLive = await page.evaluate(() => window.portal.log.includes('initialized'));
  console.log('B: real SDK initialized =', sdkLive);

  // Старт забігу через commercialBreak реального SDK (dev-режим) — не має завісити гру
  await page.keyboard.press('Space');
  let inGame = false;
  for (let i = 0; i < 20 && !inGame; i++) {
    await sleep(500);
    inGame = await page.evaluate(() => window.game.scene.isActive('GameScene'));
  }
  check('B: run starts with real SDK (commercialBreak resolves)', inGame);

  // Тільки avoid-виклик — тиск = детермінований провал
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.challengePool = s.challengePool.slice(1, 2);
  });
  await page.keyboard.press('Space'); // раунд 1
  await sleep(300);
  check('B: gameplayStart logged', await page.evaluate(() => window.portal.log.includes('gameplayStart')));
  await page.keyboard.press('Space'); // провал
  await sleep(500);
  check('B: gameplayStop logged', await page.evaluate(() => window.portal.log.includes('gameplayStop')));

  const realErrors = errors.filter(e => !/poki|Failed to load resource|CORS|net::/i.test(e));
  check('B: no page errors', realErrors.length === 0);
  if (realErrors.length) console.log('B ERRORS:\n' + realErrors.join('\n'));
  await page.close();
}

async function scenarioC(browser) {
  // Локалізація: підміняємо мову браузера на українську → UI українською
  const { page } = await newPage(browser, true);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['uk-UA', 'uk'] });
  });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(500);
  check('C: uk locale detected', await page.evaluate(() =>
    window.i18n.lang === 'uk' && window.i18n.T.play === 'ГРАТИ [ПРОБІЛ]'));
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--disable-gpu', '--no-sandbox'],
  });
  await scenarioA(browser);
  await scenarioB(browser);
  await scenarioC(browser);
  console.log(results.join('\n'));
  console.log(results.every(r => r.startsWith('PASS')) ? 'ALL_PASS' : 'HAS_FAILURES');
  await browser.close();
})().catch((e) => { console.error('TEST_CRASH', e); process.exit(1); });
