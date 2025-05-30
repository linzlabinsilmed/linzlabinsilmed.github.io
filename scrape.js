const fs = require('fs');
const puppeteer = require('puppeteer');

const LINKEDIN_URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });
    // Wait a bit for the pop-up to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to close the pop-up if it exists
    try {
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Dismiss"]') ||
                         document.querySelector('button[aria-label="Close"]');
        if (closeBtn) closeBtn.click();
      });
    } catch (err) {
      console.warn('No pop-up to close or error in closing it.');
    }

    // Use improved scrolling to load posts
    await autoScroll(page);

    // Wait a bit to ensure content is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    const posts = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('div.feed-shared-update-v2, div.feed-shared-update'));
    return articles.slice(0, 5).map(article => {
        const text = article.innerText;
        const linkEl = article.querySelector('a.app-aware-link');
        return {
        text: text?.substring(0, 200), // first 200 chars
        url: linkEl?.href || null
        };
    });
    });

    fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));

    await browser.close();
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
})();
