const axios = require('axios');
const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

axios.get('https://www.czzy.site/', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
  httpsAgent
}).then(res => {
  const m = res.data.match(/href="([^"]+)"/g);
  console.log('Redirects to:', m.find(h => h.includes('czzy')));
});
