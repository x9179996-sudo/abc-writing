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

    // --- 連筆測試 (Combo Tests) ---
    const comboCases = [
      { ch: 'B', start: 1, count: 2, desc: 'B 第2、3筆連寫 (上下兩個半圓連寫)' },
      { ch: 'K', start: 1, count: 2, desc: 'K 第2、3筆連寫 (< 形一筆)' },
      { ch: 'L', start: 0, count: 2, desc: 'L 第1、2筆連寫 (直橫一筆)' },
      { ch: 'V', start: 0, count: 2, desc: 'V 第1、2筆連寫 (斜下斜上一筆)' },
      { ch: 'W', start: 0, count: 4, desc: 'W 全部4筆連寫' },
      { ch: 'Z', start: 0, count: 3, desc: 'Z 全部3筆連寫' },
      { ch: 'k', start: 1, count: 2, desc: 'k 第2、3筆連寫 (< 形一筆)' },
      { ch: 'v', start: 0, count: 2, desc: 'v 第1、2筆連寫 (斜下斜上一筆)' },
      { ch: 'w', start: 0, count: 4, desc: 'w 全部4筆連寫' },
      { ch: 'z', start: 0, count: 3, desc: 'z 全部3筆連寫' }
    ];

    const comboResults = [];
    let passedCombo = 0;
    let failedCombo = 0;

    for (const c of comboCases) {
      const strokes = LET[c.ch].s.slice(c.start, c.start + c.count);
      const pts = [].concat(...strokes.map(s => info(s).pts));
      const res = app.judgeStroke(c.ch, c.start, pts, TOL[1]);
      const pass = res.ok === true && res.count === c.count && res.combo === true;
      if (pass) {
        passedCombo++;
        comboResults.push({ ok: true, desc: `${c.desc} -> 判對且回傳 count=${res.count}` });
      } else {
        failedCombo++;
        comboResults.push({ ok: false, desc: `[失敗] ${c.desc} -> ok=${res.ok}, count=${res.count}, why=${res.why}` });
      }
    }

    // 反例測試：V 連寫但方向反過來（從右上往下再往左上）
    const vStrokes = LET['V'].s;
    const vPts = [].concat(...vStrokes.map(s => info(s).pts)).reverse();
    const vRevRes = app.judgeStroke('V', 0, vPts, TOL[1]);
    const passVRev = vRevRes.ok === false;
    if (passVRev) {
      passedCombo++;
      comboResults.push({ ok: true, desc: 'V 連寫反向反例 (從右上往下再往左上) -> 正確判錯' });
    } else {
      failedCombo++;
      comboResults.push({ ok: false, desc: `[失敗] V 連寫反向反例 -> 誤判為正確 ok=${vRevRes.ok}` });
    }

    return {
      results,
      totalStrokes,
      passedStrokes,
      failedStrokes,
      totalLetters: Object.keys(LET).length,
      comboResults,
      passedCombo,
      failedCombo
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

  console.log('\n--- 連筆判定與反例測試 ---');
  testReport.comboResults.forEach(c => {
    const tag = c.ok ? '[PASS]' : '[FAIL]';
    console.log(`${tag} ${c.desc}`);
  });

  console.log('\n========================================');
  console.log(`總測試字母數: ${testReport.totalLetters} 個`);
  console.log(`總測試筆畫數: ${testReport.totalStrokes} 筆`);
  console.log(`成功通過筆數: ${testReport.passedStrokes} 筆`);
  console.log(`失敗筆數:     ${testReport.failedStrokes} 筆`);
  console.log(`連筆測試通過: ${testReport.passedCombo} 項`);
  console.log(`連筆測試失敗: ${testReport.failedCombo} 項`);
  console.log('----------------------------------------');

  if (testReport.failedStrokes === 0 && testReport.failedCombo === 0) {
    console.log('RESULT: ALL PASS');
    process.exit(0);
  } else {
    console.log('RESULT: FAIL');
    process.exit(1);
  }
})();
