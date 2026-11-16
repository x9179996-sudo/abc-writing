const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');

(async () => {
  console.log('========================================');
  console.log('ABC 寫字本 — 產生 A4 練習單 PDF (make_pdf.js)');
  console.log('========================================\n');

  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const pdfPath = path.resolve(__dirname, '..', 'ABC寫字本_A4練習單_全26張.pdf');

  console.log(`開啟網頁: ${htmlPath}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForLoadState('domcontentloaded');

  console.log('呼叫 window.__buildPrint() 生成 26 組字母練習單...');
  await page.evaluate(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    window.__buildPrint(letters);
  });

  console.log(`輸出 PDF: ${pdfPath}`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true
  });

  await browser.close();
  console.log('Playwright PDF 輸出完成！\n');

  // 使用 pdf-lib 檢驗頁數與尺寸
  console.log('--- 檢驗 PDF 內容 ---');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  console.log(`PDF 總頁數: ${pageCount} 頁`);

  for (let i = 0; i < pageCount; i++) {
    const pg = pdfDoc.getPage(i);
    const { width, height } = pg.getSize();
    const mmW = (width / 72 * 25.4).toFixed(1);
    const mmH = (height / 72 * 25.4).toFixed(1);
    const letter = String.fromCharCode(65 + i);
    console.log(`第 ${(i + 1).toString().padStart(2, ' ')} 頁 [${letter}${letter.toLowerCase()}]: ${width.toFixed(2)} x ${height.toFixed(2)} pt (${mmW} x ${mmH} mm)`);
  }

  console.log('\n========================================');
  if (pageCount === 26) {
    console.log('RESULT: PASS (共 26 頁無邊界 A4)');
  } else {
    console.log(`RESULT: FAIL (期望 26 頁，實際 ${pageCount} 頁)`);
    process.exit(1);
  }
})();
