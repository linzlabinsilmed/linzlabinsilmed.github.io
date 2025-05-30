const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Go to the company page
  const URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';
  await page.goto(URL, { waitUntil: 'networkidle2' });

  // Wait for the pop-up to appear and close it
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Dismiss"]') || document.querySelector('button[aria-label="Close"]');
    if (closeBtn) closeBtn.click();
  });

  // Scroll the page to load posts
  await page.evaluate(() => {
    return new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
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

  await page.waitForTimeout(3000); // Let feed load

  // Try to wait for at least one post to appear
  try {
    await page.waitForSelector('div.feed-shared-update-v2', { timeout: 8000 });
  } catch {
    console.warn('⚠️ No posts found on page after timeout.');
  }

  // Extract post data
  const posts = await page.evaluate(() => {
    const postElements = document.querySelectorAll('div.feed-shared-update-v2');
    const data = [];

    postElements.forEach(post => {
      const textEl = post.querySelector('span[dir="ltr"]') || post.querySelector('span.break-words');
      const linkEl = post.querySelector('a.app-aware-link');
      const timeEl = post.querySelector('span.visually-hidden');

      if (textEl && linkEl && timeEl) {
        data.push({
          text: textEl.innerText.trim().slice(0, 300),
          url: linkEl.href,
          date: timeEl.innerText.trim()
        });
      }
    });

    return data;
  });

  console.log(`✅ Extracted ${posts.length} posts`);
  fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts.slice(0, 5), null, 2));

  await browser.close();
})();
