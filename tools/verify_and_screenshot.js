const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('========================================');
  console.log('ABC 寫字本 — 截圖與驗證檢驗 (verify_and_screenshot.js)');
  console.log('========================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const indexHtml = path.join(rootDir, 'index.html');
  const overviewHtml = path.join(rootDir, 'overview.html');
  const screenshotsDir = path.join(rootDir, 'screenshots');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  
  // 1. Console 錯誤監控與手機寬度（390px）檢驗
  console.log('--- 1. 瀏覽器 Console 監控與手機寬度檢查 ---');
  const consoleMessages = [];
  const consoleErrors = [];

  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const phonePage = await phoneContext.newPage();

  phonePage.on('console', msg => {
    const text = `[Console ${msg.type()}]: ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') consoleErrors.push(text);
  });
  phonePage.on('pageerror', err => {
    const text = `[Page Error]: ${err.message}`;
    consoleMessages.push(text);
    consoleErrors.push(text);
  });

  await phonePage.goto('file:///' + indexHtml.replace(/\\/g, '/'));
  await phonePage.waitForLoadState('networkidle');

  // 檢查首頁 scrollWidth
  const homeScrollWidth = await phonePage.evaluate(() => document.documentElement.scrollWidth);
  const homeInnerWidth = await phonePage.evaluate(() => window.innerWidth);
  console.log(`首頁 (390px): scrollWidth = ${homeScrollWidth}px, innerWidth = ${homeInnerWidth}px (無橫向捲軸: ${homeScrollWidth <= homeInnerWidth})`);

  // 截圖: home-phone.png (390x844)
  await phonePage.screenshot({ path: path.join(screenshotsDir, 'home-phone.png') });
  console.log('已輸出截圖: screenshots/home-phone.png');

  // 切到練習頁檢查 390px
  await phonePage.evaluate(() => window.__app.openPractice('A'));
  await phonePage.waitForTimeout(400);
  const practiceScrollWidth = await phonePage.evaluate(() => document.documentElement.scrollWidth);
  console.log(`練習頁 (390px): scrollWidth = ${practiceScrollWidth}px, innerWidth = ${homeInnerWidth}px (無橫向捲軸: ${practiceScrollWidth <= homeInnerWidth})`);

  // 切到老師模式檢查 390px
  await phonePage.evaluate(() => window.__app.openTeacher('A'));
  await phonePage.waitForTimeout(400);
  const teacherScrollWidth = await phonePage.evaluate(() => document.documentElement.scrollWidth);
  console.log(`老師模式 (390px): scrollWidth = ${teacherScrollWidth}px, innerWidth = ${homeInnerWidth}px (無橫向捲軸: ${teacherScrollWidth <= homeInnerWidth})`);

  // 2. 桌面版截圖: home-desktop.png (1200x900)
  console.log('\n--- 2. 桌面版截圖 ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2
  });
  const desktopPage = await desktopContext.newPage();
  desktopPage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[Desktop Console Error]: ${msg.text()}`);
  });
  desktopPage.on('pageerror', err => {
    consoleErrors.push(`[Desktop Page Error]: ${err.message}`);
  });

  await desktopPage.goto('file:///' + indexHtml.replace(/\\/g, '/'));
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'home-desktop.png') });
  console.log('已輸出截圖: screenshots/home-desktop.png (1200x900)');

  // 3. 審閱頁截圖: overview.png (整頁)
  console.log('\n--- 3. 審閱頁整頁截圖 ---');
  const ovPage = await desktopContext.newPage();
  ovPage.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[Overview Console Error]: ${msg.text()}`);
  });
  ovPage.on('pageerror', err => {
    consoleErrors.push(`[Overview Page Error]: ${err.message}`);
  });

  await ovPage.goto('file:///' + overviewHtml.replace(/\\/g, '/'));
  await ovPage.waitForLoadState('networkidle');
  await ovPage.screenshot({ path: path.join(screenshotsDir, 'overview.png'), fullPage: true });
  console.log('已輸出截圖: screenshots/overview.png (整頁)');

  // 4. practice-k.png: 小寫 k 的看筆順畫面，動畫播完
  console.log('\n--- 4. 小寫 k 筆順畫面截圖 ---');
  await desktopPage.evaluate(() => {
    window.__app.openPractice('K');
    window.__app.setCase(false); // 小寫 k
  });
  // 等待小寫 k 的 demo 動畫播完 (k 有 2 筆，動畫約 1.5 秒)
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'practice-k.png') });
  console.log('已輸出截圖: screenshots/practice-k.png');

  // 5. practice-j-dot.png: 小寫 j 寫到第 2 筆「點」的畫面
  console.log('\n--- 5. 小寫 j 寫到第 2 筆「點」的畫面截圖 ---');
  await desktopPage.evaluate(() => {
    window.__app.openPractice('J');
    window.__app.setCase(false); // 小寫 j
    window.__app.startStage(1); // 描一描關卡
    // 模擬第 1 筆完成，進入第 2 筆 (dot)
    const pts1 = window.__app.info(window.__app.LET['j'].s[0]).pts;
    const dummyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    window.__app.board.onStroke(pts1, dummyPath);
  });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'practice-j-dot.png') });
  console.log('已輸出截圖: screenshots/practice-j-dot.png');

  // 6. teacher-M.png: 老師模式，大寫 M 播完全部筆畫
  console.log('\n--- 6. 老師模式大寫 M 全部筆畫截圖 ---');
  await desktopPage.evaluate(async () => {
    window.__app.openTeacher('M');
    // 直接顯示所有 4 筆筆畫
    const tb = window.__app.tb;
    const n = window.__app.LET['M'].s.length;
    tb.clear('anim');
    for (let i = 0; i < n; i++) tb.staticStroke(i, 'demo');
    tb.clear('mark');
    window.__app.T.shown = n;
    document.getElementById('tCount').textContent = `M　${n} / ${n} 筆`;
  });
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'teacher-M.png') });
  console.log('已輸出截圖: screenshots/teacher-M.png');

  // 7. sheet-Qq.png: Qq 練習單預覽
  console.log('\n--- 7. Qq 練習單預覽截圖 ---');
  await desktopPage.evaluate(() => {
    window.__app.openSheets(['Q']);
  });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(screenshotsDir, 'sheet-Qq.png') });
  console.log('已輸出截圖: screenshots/sheet-Qq.png');

  await browser.close();

  // Console 錯誤檢查總結
  console.log('\n========================================');
  console.log(`Console 訊息數: ${consoleMessages.length}`);
  console.log(`Console 錯誤數: ${consoleErrors.length}`);
  if (consoleErrors.length === 0) {
    console.log('Console 錯誤狀態: PASS (無任何錯誤)');
  } else {
    console.log('Console 錯誤內容:');
    consoleErrors.forEach(err => console.log('  ', err));
  }
  console.log('========================================');
})();
