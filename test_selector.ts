import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run(url: string) {
  try {
    const res = await axios.get(url, { httpsAgent, timeout: 5000, headers: {'User-Agent': 'Mozilla/5.0'} });
    const $ = cheerio.load(res.data);
    const results: any[] = [];
    $('.module-item, .mac_vod_list li, .stui-vodlist__item, .video-list-item, .post-box, .bt_img, article').each((i, el) => {
        const titleEl = $(el).find('.module-item-title a, .video-name a, .title a, a.module-item-title, .stui-vodlist__title a, .mac_ul_title a, h3 a, h2 a, .post-title a');
        let titleText = titleEl.text().trim() || $(el).attr('title') || $(el).find('a').attr('title');
        const href = titleEl.attr('href') || $(el).find('a').attr('href');
        if (titleText && href) {
            results.push({titleText, href});
        }
    });
    console.log(`[${url}] Found: ${results.length} items`);
    if (results.length > 0) console.log(results[0]);
  } catch (e: any) {
    console.log(`[${url}] Failed: ${e.message}`);
  }
}

run('https://www.zhenbuka.com/index.php/vod/search.html?wd=batman');
run('https://www.555dy.com/vod/search.html?wd=batman');
