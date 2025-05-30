const puppeteer = require('puppeteer');
const fs = require('fs');

async function autoScroll(page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 500);
      await new Promise(r => setTimeout(r, 1000));
    }
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    const LINKEDIN_URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 4000));

    // Close pop-up by clicking buttons with “Dismiss” or “Close” text
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.forEach(btn => {
        const text = btn.innerText.toLowerCase();
        if (text.includes('dismiss') || text.includes('close')) {
          btn.click();
        }
      });
    });

    await autoScroll(page);
    await new Promise(r => setTimeout(r, 4000));

    // Save debug files to check what loaded
    await page.screenshot({ path: 'debug_linkedin.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('debug_linkedin.html', html);

    const posts = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.main-feed-card__overlay-link');
      const data = [];

      anchors.forEach(anchor => {
        const url = anchor.href;
        const postContainer = anchor.closest('div.main-feed-card');
        if (!postContainer) return;

        const titleEl = postContainer.querySelector('span.break-words') ||
                        postContainer.querySelector('p') ||
                        postContainer.querySelector('span[dir="ltr"]');
        const title = titleEl ? titleEl.innerText.trim().slice(0, 300) : '';

        const timeEl = postContainer.querySelector('time') || postContainer.querySelector('span.visually-hidden');
        const date = timeEl ? timeEl.innerText.trim() : '';

        data.push({ title, url, date });
      });

      return data.slice(0, 5);
    });

    if (posts.length === 0) {
      console.warn('⚠️ No posts found! Check debug_linkedin.png and debug_linkedin.html for clues.');
    } else {
      console.log(`✅ Extracted ${posts.length} posts`);
      fs.writeFileSync('linkedin_feed.json', JSON.stringify(posts, null, 2));
    }

  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
})();
