import axios from 'axios';
import * as https from 'https';

async function scrapeSite(url: string, query: string): Promise<any[]> {
  return new Promise(async (resolve) => {
    try {
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const apiUrl = `${baseUrl}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(query)}&limit=50`;
      console.log(`Attempting API Search: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': baseUrl
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 5000
      });

      if (response.data && response.data.list && Array.isArray(response.data.list) && response.data.list.length > 0) {
        const results = response.data.list.map((item: any) => {
          return item;
        });
        console.log(`API returned ${results.length} results for ${url}`);
        return resolve(results);
      }
    } catch (error: any) {
      console.log(`API Search failed or unsupported for ${url}: ${error.message}`);
    }
    
    console.log('Falling back...');
    resolve([]);
  });
}

async function run() {
  const res = await scrapeSite('https://www.pdy3.com', '盗梦空间');
  console.log(res);
}

run();
