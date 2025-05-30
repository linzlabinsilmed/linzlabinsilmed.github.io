const puppeteer = require('puppeteer');
const fs = require('fs');

async function autoScroll(page) {
  // Scroll slowly to load posts properly
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

    // Wait some time for pop-ups to load
    await new Promise(r => setTimeout(r, 4000));

    // Close any pop-up by clicking buttons with “Dismiss” or “Close” text
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.forEach(btn => {
        const text = btn.innerText.toLowerCase();
        if (text.includes('dismiss') || text.includes('close')) {
          btn.click();
        }
      });
    });

    // Scroll to load posts
    await autoScroll(page);

    // Wait extra for posts to load after scrolling
    await new Promise(r => setTimeout(r, 4000));

    // Save screenshot and HTML for debugging
    await page.screenshot({ path: 'debug_linkedin.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('debug_linkedin.html', html);

    // Try selecting posts broadly - articles or divs with feed-shared-update in class name
    const posts = await page.evaluate(() => {
      // Try article first, fallback to divs with feed-shared-update
      let postElements = document.querySelectorAll('article');
      if (!postElements.length) {
        postElements = document.querySelectorAll('div[class*="feed-shared-update"]');
      }
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
