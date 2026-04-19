import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  const { data: html } = await axios.get('https://www.pdy3.com/mv/65972.html', { httpsAgent });
  const $ = cheerio.load(html);
  
  const links = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('magnet:')) links.push(href);
  });
  console.log('Found magnets in a tags:', links.length);

  const inputs = [];
  $('input, textarea').each((_, el) => {
    const val = $(el).val();
    if (typeof val === 'string' && val.startsWith('magnet:')) inputs.push(val);
  });
  console.log('Found magnets in inputs:', inputs.length);

  const regex = /(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*)/ig;
  const regexMatches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    regexMatches.push(match[1]);
  }
  console.log('Found magnets via regex:', regexMatches.length);
}
run();
