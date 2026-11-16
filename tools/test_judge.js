const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('========================================');
  console.log('ABC 寫字本 — 判斷邏輯自動測試 (test_judge.js)');
  console.log('========================================\n');

  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForLoadState('domcontentloaded');

  const testReport = await page.evaluate(() => {
    const app = window.__app;
    const LET = app.LET;
    const info = app.info;
    const judge = app.judge;
    const TOL = [0, 32, 28, 26];

    const results = [];
    let totalStrokes = 0;
    let passedStrokes = 0;
    let failedStrokes = 0;

    for (const ch of Object.keys(LET)) {
      const item = LET[ch];
      const strokeDetails = [];
      let letterOk = true;

      item.s.forEach((d, idx) => {
        totalStrokes++;
        const sNum = idx + 1;

        if (d && d.dot) {
          const [tx, ty] = d.dot;
          // 點在目標上 -> 對
          const rOn = judge(d, [[tx, ty]], TOL[1]);
          // 點在 50 單位外 -> 錯
          const rOff = judge(d, [[tx + 50, ty]], TOL[1]);

          const pass = rOn.ok === true && rOff.ok === false;
          if (pass) {
            passedStrokes++;
            strokeDetails.push(`筆畫 ${sNum} (點型: 正確位置判定=通過, 偏差50單位判定=失敗)`);
          } else {
            failedStrokes++;
            letterOk = false;
            strokeDetails.push(`[失敗] 筆畫 ${sNum} (點型): rOn=${rOn.ok}, rOff=${rOff.ok}`);
          }
        } else {
          const f = info(d);
          // 取樣點 -> 判對
          const rFwd = judge(d, f.pts, TOL[1]);
          // 取樣點反向 -> 判錯
          const rev = [...f.pts].reverse();
          const rRev = judge(d, rev, TOL[1]);

          const pass = rFwd.ok === true && rRev.ok === false;
          if (pass) {
            passedStrokes++;
            strokeDetails.push(`筆畫 ${sNum} (正向取樣=通過, 反向取樣=失敗)`);
          } else {
            failedStrokes++;
            letterOk = false;
            strokeDetails.push(`[失敗] 筆畫 ${sNum}: rFwd=${rFwd.ok} (${rFwd.why}), rRev=${rRev.ok} (${rRev.why})`);
          }
        }
      });

      results.push({
        ch,
        strokes: item.s.length,
        ok: letterOk,
        details: strokeDetails
      });
    }

    return {
      results,
      totalStrokes,
      passedStrokes,
      failedStrokes,
      totalLetters: Object.keys(LET).length
    };
  });

  await browser.close();

  // 輸出測試細節
  testReport.results.forEach(r => {
    const tag = r.ok ? '[PASS]' : '[FAIL]';
    console.log(`${tag} 字母 ${r.ch} (共 ${r.strokes} 筆):`);
    r.details.forEach(det => {
      console.log(`    - ${det}`);
    });
  });

  console.log('\n========================================');
  console.log(`總測試字母數: ${testReport.totalLetters} 個`);
  console.log(`總測試筆畫數: ${testReport.totalStrokes} 筆`);
  console.log(`成功通過筆數: ${testReport.passedStrokes} 筆`);
  console.log(`失敗筆數:     ${testReport.failedStrokes} 筆`);
  console.log('----------------------------------------');

  if (testReport.failedStrokes === 0) {
    console.log('RESULT: ALL PASS');
    process.exit(0);
  } else {
    console.log('RESULT: FAIL');
    process.exit(1);
  }
})();
