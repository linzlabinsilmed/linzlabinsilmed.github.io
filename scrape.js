const fs = require('fs');
const puppeteer = require('puppeteer');

const LINKEDIN_URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
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
}

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false, // easier for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });

    // 🕐 Wait for the popup to appear
    await page.waitForTimeout(3000);

    // ❌ Close the popup if it exists
    try {
      await page.evaluate(() => {
        const closeButton = document.querySelector('button[aria-label="Dismiss"]') ||
                            document.querySelector('button[aria-label="Close"]');
        if (closeButton) closeButton.click();
      });
      await page.waitForTimeout(1000); // wait a bit for UI to settle
    } catch (err) {
      console.warn('Popup may not have appeared.');
    }

    // ✅ Scroll to load posts
    await autoScroll(page);
    await page.waitForTimeout(2000);

    // 📥 Scrape post data
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
      return data.slice(0, 5); // limit to latest 5
    });

    // 💾 Save to file
    fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));
    console.log('✅ Scraped posts saved to linkedin_feed.json');

    await browser.close();
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    process.exit(1);
  }
})();
