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
    
    const scriptTags = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      let publishedDates = [];

      for (const script of scriptTags) {
        try {
          const json = JSON.parse(script.textContent);
          if (json['@graph']) {
            json['@graph'].forEach(item => {
              if (item['@type'] === 'DiscussionForumPosting' && item.datePublished) {
                publishedDates.push(item.datePublished.slice(0, 10));
              }
            });
          }
        } catch (e) {
          // Skip invalid JSON blocks
        }
      }
        
    const texts = Array.from(document.querySelectorAll('div.attributed-text-segment-list__container > p.attributed-text-segment-list__content'))
        .map(p => p.innerText.trim());

    const links = Array.from(document.querySelectorAll('div[data-id="entire-feed-card-link"] a.main-feed-card__overlay-link'))
        .map(a => a.href);

    const data = [];

    const count = Math.min(texts.length, links.length, 10);

    for (let i = 0; i < count; i++) {
        data.push({
        title: texts[i],
        url: links[i],
        published: publishedDates[i]
        });
    }

    return data;
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
