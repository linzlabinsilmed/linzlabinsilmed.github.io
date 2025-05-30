const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: puppeteer.executablePath(), // ✅ this is critical in Actions
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions', {
    waitUntil: 'networkidle2'
  });

  await page.waitForTimeout(4000);

  try {
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Dismiss"]') ||
                       document.querySelector('button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(1000);
  } catch {}

  await page.evaluate(() => {
    return new Promise(resolve => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });

  await page.waitForTimeout(3000);

  const posts = await page.evaluate(() => {
    const data = [];
    const items = document.querySelectorAll('div.feed-shared-update-v2');
    items.forEach(item => {
      const textEl = item.querySelector('span[dir="ltr"]') || item.querySelector('span.break-words');
      const linkEl = item.querySelector('a.app-aware-link');
      const timeEl = item.querySelector('span.visually-hidden');

      if (textEl && linkEl && timeEl) {
        data.push({
          text: textEl.innerText.trim().slice(0, 300),
          url: linkEl.href,
          date: timeEl.innerText.trim()
        });
      }
    });
    return data.slice(0, 5);
  });

  fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));
  await browser.close();
})();
