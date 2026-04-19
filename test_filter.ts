import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  const res = await axios.get('https://www.pdy3.com/ms/1-----------2024.html', { httpsAgent });
  const $ = cheerio.load(res.data);
  const titles = [];
  $('.module-item').each((_, el) => {
    titles.push($(el).find('.module-item-title a').text().trim());
  });
  console.log(titles.slice(0, 5));
}
run();
