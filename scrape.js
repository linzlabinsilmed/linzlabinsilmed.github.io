const puppeteer = require('puppeteer');
const fs = require('fs');

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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Go to LinkedIn company page
    const LINKEDIN_URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });

    // Wait 2 seconds for pop-up to appear
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close pop-up if exists
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Dismiss"]') || document.querySelector('button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    });

    // Scroll to load posts
    await autoScroll(page);

    // Wait extra 3 seconds to ensure posts load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for at least one post container
    await page.waitForSelector('div.feed-shared-update-v2', { timeout: 8000 });

    // Extract posts data
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll('div.feed-shared-update-v2');
      const data = [];

      postElements.forEach(post => {
        const titleEl = post.querySelector('span.break-words') || post.querySelector('span[dir="ltr"]');
        const linkEl = post.querySelector('a.app-aware-link');
        const timeEl = post.querySelector('span.visually-hidden');

        if (titleEl && linkEl && timeEl) {
          data.push({
            title: titleEl.innerText.trim().slice(0, 300),
            url: linkEl.href,
            date: timeEl.innerText.trim()
          });
        }
      });

      return data.slice(0, 5);
    });

    console.log(`✅ Extracted ${posts.length} posts`);
    fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));

  } catch (err) {
    console.error('Error during scraping:', err);
  } finally {
    await browser.close();
  }
})();
