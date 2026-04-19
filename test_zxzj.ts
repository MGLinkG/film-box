import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  const { data: html } = await axios.get('https://www.zxzj.pro/vodshow/1-----------2024.html', { httpsAgent, headers: { 'User-Agent': 'Mozilla/5.0' }});
  const $ = cheerio.load(html);
  $('.stui-vodlist__item, .stui-vodlist__box').each((_, el) => {
    console.log($(el).find('.title a').text());
  });
}
run();
