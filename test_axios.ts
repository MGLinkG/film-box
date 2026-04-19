import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run(url: string, query: string) {
  let searchUrl = url.endsWith('/') 
      ? `${url}index.php/vod/search.html?wd=${encodeURIComponent(query)}` 
      : `${url}/index.php/vod/search.html?wd=${encodeURIComponent(query)}`;
  
  if (url.includes('zhenbuka') || url.includes('cupfox') || url.includes('mudvod') || url.includes('xbaosp') || url.includes('ttmj')) {
      searchUrl = url.endsWith('/') ? `${url}search.php?searchword=${encodeURIComponent(query)}` : `${url}/search.php?searchword=${encodeURIComponent(query)}`;
  } else if (url.includes('555dy') || url.includes('qmyy') || url.includes('hanjutv')) {
      searchUrl = url.endsWith('/') ? `${url}vod/search.html?wd=${encodeURIComponent(query)}` : `${url}/vod/search.html?wd=${encodeURIComponent(query)}`;
  }
      
  try {
    const res = await axios.get(searchUrl, { httpsAgent, timeout: 5000, headers: {'User-Agent': 'Mozilla/5.0'} });
    console.log(`[${url}] GET ${searchUrl} -> Status: ${res.status}`);
    const $ = cheerio.load(res.data);
    const items = $('.module-item, .mac_vod_list li, .stui-vodlist__item, .video-list-item, .post-box, .bt_img, article').length;
    console.log(`[${url}] Found items: ${items}`);
  } catch (e: any) {
    console.log(`[${url}] Failed: ${e.message}`);
  }
}

run('https://www.zhenbuka.com', 'batman');
run('https://www.555dy.com', 'batman');
run('https://mudvod.tv', 'batman');
run('https://xbaosp.com', 'batman');
