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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    const page = await browser.newPage();

    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });

    // Use improved scrolling to load posts
    await autoScroll(page);

    // Wait a bit to ensure content is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll('div.feed-shared-update-v2');
      const data = [];
      postElements.forEach(post => {
        const titleEl = post.querySelector('span.break-words') ||
                        post.querySelector('span[dir="ltr"]');
        const linkEl = post.querySelector('a.app-aware-link');
        const timeEl = post.querySelector('span.visually-hidden');

        if (titleEl && linkEl && timeEl) {
          data.push({
            title: titleEl.innerText.trim(),
            url: linkEl.href,
            date: timeEl.innerText.trim()
          });
        }
      });
      return data.slice(0, 5); // limit to 5 recent posts
    });

    fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));

    await browser.close();
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
})();
