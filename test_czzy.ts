import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  try {
    const res = await axios.get('https://www.czzy.site/search?q=%E6%98%9F%E9%99%85%E7%A9%BF%E8%B6%8A', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      httpsAgent
    });
    console.log(res.status, res.data.slice(0, 200));
  } catch(e) {
    console.log(e.message);
  }
}
run();
