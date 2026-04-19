import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  const params = ['1', '', 'hits', encodeURIComponent('科幻'), '', '', '', '', '1', '', '', '2024'];
  const url = `https://www.pdy3.com/ms/${params.join('-')}.html`;
  console.log('Fetching', url);
  const { data: html } = await axios.get(url, { httpsAgent });
  const $ = cheerio.load(html);
  const results = [];
  $('.vod-list .row li').each((_, el) => {
    const title = $(el).find('.name h3 a').text().trim();
    const href = $(el).find('.name h3 a').attr('href');
    const poster = $(el).find('.pic img, .img-wrapper').attr('data-original') || $(el).find('.pic img, .img-wrapper').attr('data-src');
    const rating = $(el).find('.s2').text().trim();
    const tagsStr = $(el).find('.item-status').text().trim(); // e.g. "2024 / 美国 / 科幻 / 英语"
    
    if (title && href) {
      results.push({
        id: href,
        title,
        titleZh: title,
        rating: rating || 'N/A',
        poster: poster ? (poster.startsWith('http') ? poster : `https://www.pdy3.com${poster}`) : '',
        url: `https://www.pdy3.com${href}`,
        tags: tagsStr.split('/').map(s => s.trim()).filter(Boolean).slice(0, 3)
      });
    }
  });
  console.log(results.slice(0, 3));
}
run();
