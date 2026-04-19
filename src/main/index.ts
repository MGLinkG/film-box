import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as cheerio from 'cheerio'
import axios from 'axios'
import * as https from 'https'

// MUST BE CALLED BEFORE APP IS READY
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // On certificate error we disable default behavior (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
});

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Create a generic scraper function using hidden BrowserWindow to bypass anti-bot protections
async function scrapeSite(url: string, query: string, siteName: string): Promise<any[]> {
  return new Promise(async (resolve) => {
    try {
      if (!url) return resolve([]);
      
      // Generic MacCMS API Attempt (Fastest & Bypass Anti-bot)
      try {
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const apiUrl = `${baseUrl}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(query)}&limit=99999`;
      console.log(`Attempting API Search: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': baseUrl
        },
        httpsAgent,
        timeout: 5000
      });

      if (response.data && response.data.list && Array.isArray(response.data.list) && response.data.list.length > 0) {
        const results = response.data.list.map((item: any) => {
          const itemUrl = url.includes('pdy') 
            ? `${baseUrl}/mv/${item.id}.html` 
            : `${baseUrl}/voddetail/${item.id}.html`; 

          return {
            id: `${url}-${item.id}`,
            title: item.name,
            titleZh: item.name,
            rating: item.en || 'N/A', // English name or rating
            poster: item.pic && item.pic.startsWith('http') ? item.pic : (item.pic ? new URL(item.pic, url).toString() : ''),
            url: itemUrl,
            tags: [siteName]
          };
        });
        console.log(`API returned ${results.length} results for ${url}`);
        return resolve(results);
      }
    } catch (error) {
      console.log(`API Search failed or unsupported for ${url}, falling back to browser...`);
    }

    // Generic Search Route Guesser
    let searchUrl = url.endsWith('/') 
      ? `${url}index.php/vod/search.html?wd=${encodeURIComponent(query)}` 
      : `${url}/index.php/vod/search.html?wd=${encodeURIComponent(query)}`;

    // Fallback known search routes
    if (url.includes('pianku')) {
      searchUrl = url.endsWith('/') ? `${url}search?q=${encodeURIComponent(query)}` : `${url}/search?q=${encodeURIComponent(query)}`;
    } else if (url.includes('czzy') || url.includes('ddys')) {
      searchUrl = url.endsWith('/') ? `${url}?s=${encodeURIComponent(query)}` : `${url}/?s=${encodeURIComponent(query)}`;
    } else if (url.includes('zxzj') || url.includes('libvio')) {
      searchUrl = url.endsWith('/') ? `${url}vodsearch/-------------.html?wd=${encodeURIComponent(query)}` : `${url}/vodsearch/-------------.html?wd=${encodeURIComponent(query)}`;
    } else if (url.includes('pdy3') || url.includes('pdy')) {
      searchUrl = url.endsWith('/') 
        ? `${url}vs/-------------.html?wd=${encodeURIComponent(query)}`
        : `${url}/vs/-------------.html?wd=${encodeURIComponent(query)}`;
    } else if (url.includes('zhenbuka') || url.includes('cupfox') || url.includes('mudvod') || url.includes('xbaosp') || url.includes('ttmj')) {
      searchUrl = url.endsWith('/') ? `${url}search.php?searchword=${encodeURIComponent(query)}` : `${url}/search.php?searchword=${encodeURIComponent(query)}`;
    } else if (url.includes('555dy') || url.includes('qmyy') || url.includes('hanjutv')) {
      searchUrl = url.endsWith('/') ? `${url}vod/search.html?wd=${encodeURIComponent(query)}` : `${url}/vod/search.html?wd=${encodeURIComponent(query)}`;
    }

    console.log(`Searching with Browser: ${searchUrl}`);

    const win = new BrowserWindow({
      show: false, // Run invisibly
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false // Help bypass some strict CORS on scrape
      }
    });

    // Spoof User Agent to avoid detection
    win.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let isResolved = false;

    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.log(`Timeout while scraping ${url}`);
        if (!win.isDestroyed()) win.destroy();
        resolve([]);
      }
    }, 15000); // 15 seconds timeout to allow captcha bypass

    try {
      win.loadURL(searchUrl).catch(err => {
        console.error(`Failed to load ${searchUrl}:`, err.message);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          if (!win.isDestroyed()) win.destroy();
          resolve([]);
        }
      });
    } catch (e) {
      console.error(`Failed to initiate loadURL ${searchUrl}:`, e);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        if (!win.isDestroyed()) win.destroy();
        resolve([]);
      }
    }

    win.webContents.on('did-finish-load', async () => {
      if (isResolved) return;
      try {
        const title = await win.webContents.executeJavaScript('document.title');
        
        // Check if we hit a known captcha/verification page
        if (title.includes('安全验证') || title.includes('Captcha') || title.includes('验证') || title.includes('Just a moment')) {
          console.log(`Still verifying ${url}... waiting for redirect.`);
          return; // Don't resolve yet, wait for the next did-finish-load after redirect
        }

        // Wait for JS rendered lists (some sites render list via ajax after load)
        await new Promise(r => setTimeout(r, 3000));

        const currentUrl = await win.webContents.executeJavaScript('window.location.href');
        
        // Get the fully rendered HTML
        const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
        const $ = cheerio.load(html);
        const results: any[] = [];

        // Adapter for generic maccms / applecms / custom style sites
        $('.module-item, .mac_vod_list li, .stui-vodlist__item, .video-list-item, .post-box, .bt_img, article').each((i, el) => {
          const titleEl = $(el).find('.module-item-title a, .video-name a, .title a, a.module-item-title, .stui-vodlist__title a, .mac_ul_title a, h3 a, h2 a, .post-title a').first();
          let titleText = titleEl.text().trim() || $(el).attr('title') || $(el).find('a').first().attr('title');
          
          // If standard title search fails, find any link with text containing the query
          if (!titleText) {
            const a = $(el).find('a').filter((_, e) => $(e).text().trim().toLowerCase().includes(query.toLowerCase()));
            if (a.length > 0) titleText = a.first().text().trim();
          }

          const href = titleEl.attr('href') || $(el).find('a').first().attr('href');
          const poster = $(el).find('img').first().attr('data-original') || $(el).find('img').first().attr('data-src') || $(el).find('img').first().attr('src');
          const rating = $(el).find('.module-item-note, .pic-text, .pic-tag, .score, .note').first().text().trim();
          
          if (titleText && href && (titleText.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(titleText.toLowerCase()))) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, currentUrl).toString();
            if (!results.find(r => r.url === fullUrl)) {
              results.push({
                id: `${url}-${i}`,
                title: titleText,
                titleZh: titleText,
                rating: rating || 'N/A',
                poster: poster && poster.startsWith('http') ? poster : (poster ? new URL(poster, currentUrl).toString() : ''),
                url: fullUrl,
                tags: [siteName]
              });
            }
          }
        });

        if (results.length === 0) {
          // Sometimes the site renders a totally different structure. Try a very generic approach:
          // Look for any <a> tag that wraps an image and has a title, or any <a> tag next to an image
          $('a').each((i, el) => {
            try {
              let titleText = $(el).text().trim() || $(el).attr('title') || $(el).find('img').first().attr('alt') || '';
              const href = $(el).attr('href');
              
              if (titleText && href && (titleText.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(titleText.toLowerCase()))) {
                
                const img = $(el).find('img').first().length > 0 ? $(el).find('img').first() : $(el).parent().find('img').first();
                const poster = img.attr('data-original') || img.attr('data-src') || img.attr('src') || '';
                
                // Only accept if it has a poster OR the text length is reasonable (avoids nav links)
                if (poster || titleText.length > 3) {
                  // Ignore obvious non-movie links
                  if (['关于', '首页', '联系', '留言', '求片', '排行', 'APP', 'app', '下载'].includes(titleText)) return;
                  
                  const fullUrl = href.startsWith('http') ? href : new URL(href, currentUrl).toString();
                  if (!results.find(r => r.url === fullUrl)) {
                    results.push({
                      id: `${url}-fallback-${i}`,
                      title: titleText,
                      titleZh: titleText,
                      rating: 'N/A',
                      poster: poster && poster.startsWith('http') ? poster : (poster ? new URL(poster, currentUrl).toString() : ''),
                      url: fullUrl,
                      tags: [siteName]
                    });
                  }
                }
              }
            } catch (e) {
              // Ignore individual parsing errors
            }
          });
        }
        
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          if (!win.isDestroyed()) win.destroy();
          resolve(results);
        }

      } catch (error) {
        console.error(`Error parsing ${url}:`, error);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          if (!win.isDestroyed()) win.destroy();
          resolve([]);
        }
      }
    });

    } catch (globalError) {
      console.error(`Fatal error in scrapeSite for ${url}:`, globalError);
      resolve([]);
    }
  });
}

// Create a magnet link scraper function using hidden BrowserWindow
async function scrapeMagnetLinks(url: string): Promise<any[]> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });
    win.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let isResolved = false;
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        if (!win.isDestroyed()) win.destroy();
        resolve([]);
      }
    }, 15000);

    win.webContents.on('did-finish-load', async () => {
      if (isResolved) return;
      try {
        const title = await win.webContents.executeJavaScript('document.title');
        if (title.includes('安全验证') || title.includes('Captcha') || title.includes('验证') || title.includes('Just a moment')) {
          return;
        }

        // Wait for ajax/tabs to load
        await new Promise(r => setTimeout(r, 2000));

        const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
        const $ = cheerio.load(html);
        const links: any[] = [];
        const seen = new Set();

        const addLink = (title: string, href: string) => {
          if (!href) return;
          const cleanHref = href.trim();
          const lowerHref = cleanHref.toLowerCase();
          // Match magnet, ed2k, thunder, and popular cloud drives
          if (
            cleanHref.startsWith('magnet:') || 
            cleanHref.startsWith('ed2k://') || 
            cleanHref.startsWith('thunder://') ||
            lowerHref.includes('pan.baidu.com') ||
            lowerHref.includes('aliyundrive.com') ||
            lowerHref.includes('alipan.com') ||
            lowerHref.includes('quark.cn') ||
            lowerHref.includes('115.com') ||
            lowerHref.includes('xunlei.com')
          ) {
            if (!seen.has(cleanHref)) {
              seen.add(cleanHref);
              links.push({ title: title || '资源链接', url: cleanHref });
            }
          }
        };

        $('a').each((_, el) => {
          const href = $(el).attr('href');
          let text = $(el).text().trim();
          if (!text) text = $(el).parent().text().replace(/\s+/g, ' ').trim().substring(0, 100);
          addLink(text, href || '');
        });

        $('input, textarea').each((_, el) => {
          const val = $(el).val() as string;
          addLink('资源链接', val || '');
        });

        // Fallback Regex
        const magnetRegex = /(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*)/ig;
        let match;
        while ((match = magnetRegex.exec(html)) !== null) {
          addLink('磁力链接', match[1]);
        }

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          if (!win.isDestroyed()) win.destroy();
          resolve(links);
        }
      } catch (error) {
        console.error(`Error extracting links from ${url}:`, error);
      }
    });

    win.loadURL(url).catch(() => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        if (!win.isDestroyed()) win.destroy();
        resolve([]);
      }
    });
  });
}

const CANDIDATE_SITES = [
  { name: '胖丁影视', url: 'https://www.pdy3.com', desc: '海量高清影视资源，更新快。' },
  { name: '厂长资源', url: 'https://www.czzy.site', desc: '高质量影视在线观看，资源丰富。' },
  { name: '在线之家', url: 'https://www.zxzj.pro', desc: '主打美剧、韩剧等海外剧集。' },
  { name: '奈飞中文', url: 'https://www.nfmovies.com', desc: '提供超清画质的电影和剧集。' },
  { name: 'LIBVIO', url: 'https://www.libvio.pw', desc: '界面清爽，资源丰富的影视站。' },
  { name: '片库', url: 'https://www.pianku.tv', desc: '电影、电视剧、动漫等高清下载与观看。' },
  { name: '低端影视', url: 'https://ddys.pro', desc: '提供高质量的影视资源下载与在线观看。' },
  { name: '真不卡', url: 'https://www.zhenbuka.com', desc: '免费高清无广告的影视播放站。' },
  { name: '茶杯狐', url: 'https://cupfox.app', desc: '提供国内外最新高清影视资源。' },
  { name: '大师兄', url: 'https://dsxys.pro', desc: '影视聚合搜索引擎，找剧好帮手。' },
  { name: '泥巴影院', url: 'https://mudvod.tv', desc: '主要提供海外华人在线看剧服务。' },
  { name: '星辰影院', url: 'https://www.xcyy.tv', desc: '高清在线视频观看网站，涵盖各种影视类型。' },
  { name: '小宝影院', url: 'https://xbaosp.com', desc: '海量免费高清影视剧在线观看。' },
  { name: '555电影', url: 'https://www.555dy.com', desc: '更新及时的免费影视在线平台。' },
  { name: '天天影视', url: 'https://www.ttmj.tv', desc: '每天同步更新各大视频网站影视。' },
  { name: '素白白', url: 'https://www.subaibai.com', desc: '专注于高清电影分享。' },
  { name: '全民影院', url: 'https://www.qmyy.tv', desc: '适合大众的高清影视平台。' },
  { name: '韩剧TV', url: 'https://www.hanjutv.com', desc: '专门看最新韩剧的网站。' },
  { name: '美剧鸟', url: 'https://www.meijuniao.com', desc: '主打最新最全美剧资源。' },
  { name: '努努影院', url: 'https://www.nunuyy.cc', desc: '国内知名的免费影视平台。' },
  { name: '飞飞影视', url: 'https://www.ffys.tv', desc: '老牌免费影视观看网站。' },
  { name: '看剧吧', url: 'https://www.kanjuba.com', desc: '包含最新电视剧、电影。' },
  { name: '剧迷', url: 'https://gimy.tv', desc: '台湾知名影视聚合站，海量资源。' },
  { name: '电影蜜蜂', url: 'https://www.dianyingmifeng.com', desc: '高质量无广告的良心电影站。' },
  { name: '南瓜影视', url: 'https://www.nangua.tv', desc: '界面清爽的优质影视平台。' },
  { name: '神马影院', url: 'https://www.shenma.tv', desc: '神马搜索技术支持的影视聚合。' },
  { name: '八戒影院', url: 'https://www.bajie.tv', desc: '热门影视更新极快。' },
  { name: '琪琪影院', url: 'https://www.qiqi.tv', desc: '提供免费影视大全在线观看。' },
  { name: '久久影院', url: 'https://www.jiujiu.tv', desc: '长久稳定的免费影视站。' },
  { name: '人人影视', url: 'https://www.renren.tv', desc: '主打美剧及外语片字幕翻译。' },
  { name: '飘零影院', url: 'https://www.piaoling.tv', desc: '经典老牌影视平台。' }
];

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true // Enable webview for the embedded browser
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // If it's a popup from the webview, let the webview handle it or open in external browser
    if (details.disposition === 'new-window' || details.disposition === 'foreground-tab') {
      shell.openExternal(details.url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('web-contents-created', (_, contents) => {
    // Handle new windows created by webview
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  // IPC handlers
  ipcMain.handle('search-sites', async (_, { query, sites }) => {
    if (!sites || sites.length === 0) return { results: [], authRequired: null };

    const allResults: any[] = [];
    let authRequiredSite: string | null = null;

    // Search all sites concurrently with a limit to prevent OOM / black screen
    const concurrencyLimit = 5;
    const queue = [...sites];

    const worker = async () => {
      while (queue.length > 0) {
        const site = queue.shift()!;
        try {
          const siteResults = await scrapeSite(site.url, query, site.name);
          allResults.push(...siteResults);
        } catch (error: any) {
           console.error(`Search failed for ${site.name} (${site.url}):`, error?.message || error);
           if (error?.message && error.message.startsWith('AUTH_REQUIRED:')) {
               authRequiredSite = error.message.split(':')[1];
           }
        }
      }
    };

    const workers = Array(Math.min(concurrencyLimit, sites.length)).fill(null).map(() => worker());
    await Promise.all(workers);

    return { 
      results: allResults,
      authRequired: authRequiredSite 
    };
  })

  ipcMain.handle('fetch-recommended-sites', async (_, { page = 1, pageSize = 10 } = {}) => {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedCandidates = CANDIDATE_SITES.slice(startIdx, endIdx);

    const results = await Promise.all(paginatedCandidates.map(async (site) => {
      const start = Date.now();
      try {
        await axios.get(site.url, { 
          timeout: 5000, 
          httpsAgent,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        return { ...site, available: true, ping: Date.now() - start };
      } catch (e) {
        return { ...site, available: false, ping: 9999 };
      }
    }));

    // Sort: available first, then by ping (faster first)
    return {
      sites: results.sort((a, b) => {
        if (a.available === b.available) return a.ping - b.ping;
        return a.available ? -1 : 1;
      }),
      hasMore: endIdx < CANDIDATE_SITES.length,
      total: CANDIDATE_SITES.length
    };
  });

  ipcMain.handle('fetch-magnet-links', async (_, url) => {
    return await scrapeMagnetLinks(url);
  });

  ipcMain.handle('fetch-discover-movies', async (_, filters) => {
    try {
      const { source = 'https://www.pdy3.com', channel = '1', type = '', region = '', language = '', year = '', sort = 'time', page = 1 } = filters;
      const params = [
        channel,
        encodeURIComponent(region),
        sort,
        encodeURIComponent(type),
        encodeURIComponent(language),
        '', '', '',
        page.toString(),
        '', '',
        year
      ];
      
      let baseUrl = source.endsWith('/') ? source.slice(0, -1) : source;
      
      // Adapt different sites to their discover URL
      let url = '';
      if (baseUrl.includes('pdy') || baseUrl.includes('czzy')) {
         url = `${baseUrl}/ms/${params.join('-')}.html`;
      } else if (baseUrl.includes('zxzj') || baseUrl.includes('libvio')) {
         url = `${baseUrl}/vodshow/${params.join('-')}.html`;
      } else {
         // Generic fallback (might fail for some)
         url = `${baseUrl}/index.php/vod/show/id/${channel}/year/${year}.html`;
      }
      
      console.log('Discover URL:', url);
      
      const { data: html } = await axios.get(url, { 
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000
      });
      
      const $ = cheerio.load(html);
      const results: any[] = [];
      
      $('.vod-list .row li, .stui-vodlist__item, .stui-vodlist__box, .module-item').each((_, el) => {
        const title = $(el).find('.name h3 a, .title a, .stui-vodlist__title a, .module-item-title a').text().trim() || $(el).find('a').attr('title') || '';
        const href = $(el).find('.name h3 a, .title a, .stui-vodlist__title a, .module-item-title a').attr('href') || $(el).find('a').attr('href');
        const poster = $(el).find('.pic img, .img-wrapper, .stui-vodlist__thumb, .module-item-pic img').attr('data-original') || $(el).find('.pic img, .img-wrapper, .stui-vodlist__thumb, .module-item-pic img').attr('data-src') || $(el).find('img').attr('src');
        const rating = $(el).find('.s2, .s1, .pic-text, .module-item-note').text().trim();
        const tagsStr = $(el).find('.item-status, .text-muted').text().trim(); // e.g. "2024 / 美国 / 科幻 / 英语"
        
        if (title && href) {
          results.push({
            id: `discover-${href}`,
            title,
            titleZh: title,
            rating: rating || 'N/A',
            poster: poster ? (poster.startsWith('http') ? poster : `${baseUrl}${poster}`) : '',
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            tags: tagsStr ? tagsStr.split('/').map(s => s.trim()).filter(Boolean).slice(0, 3) : ['全网推荐']
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Discover movies failed:', error);
      return [];
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
