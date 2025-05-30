const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

puppeteer.use(StealthPlugin());

async function autoScroll(page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 500);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const LINKEDIN_URL = 'https://www.linkedin.com/company/linz-lab-for-in-silico-medical-interventions';
    await page.goto(LINKEDIN_URL, { waitUntil: 'networkidle2' });
     await new Promise(r => setTimeout(r, 4000));

    // Close popups
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

    // Extract posts
    const posts = await page.evaluate(() => {
    // Select all main post containers that wrap both link and text
    const postContainers = document.querySelectorAll('div.feed-shared-update-v2, div.some-parent-selector'); // Adjust selector if needed

    const data = [];

    postContainers.forEach(container => {
        const textContainer = container.querySelector('div.attributed-text-segment-list__container');
        const paragraph = textContainer?.querySelector('p.attributed-text-segment-list__content');
        const text = paragraph ? paragraph.innerText.trim() : '';

        const linkContainer = container.querySelector('div[data-id="entire-feed-card-link"]');
        const linkEl = linkContainer?.querySelector('a.main-feed-card__overlay-link');
        const url = linkEl ? linkEl.href : '';

        if (text && url) {
        data.push({
            title: text,
            url,
        });
        }
    });

    return data.slice(0, 10);
    });


    if (posts.length === 0) {
      console.warn('⚠️ No posts found!');
    } else {
      const outputPath = path.join('_data', 'linkedin_feed.yml');
      fs.mkdirSync('_data', { recursive: true });
      fs.writeFileSync(outputPath, YAML.stringify(posts));
      console.log(`✅ Saved ${posts.length} posts to ${outputPath}`);
    }
  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
  }
})();
