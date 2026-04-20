import { net, ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import * as cheerio from 'cheerio'
import * as https from 'https'
import { URL } from 'url'
import * as crypto from 'crypto'
import { Parser } from 'm3u8-parser'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export const activeDownloads = new Map<string, any>()

async function getM3u8Url(playUrl: string): Promise<string | null> {
  try {
    const { data: playHtml } = await axios.get(playUrl, {
      httpsAgent,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const $ = cheerio.load(playHtml)
    const scriptContent = $('script')
      .filter((_, el) => {
        return $(el).html()?.includes('player_aaaa')
      })
      .html()

    if (scriptContent) {
      let jsonStr = scriptContent.split('var player_aaaa=')[1]
      jsonStr = jsonStr.split('var mac_')[0].trim()
      if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1)
      return JSON.parse(jsonStr).url
    }
  } catch (err) {
    console.error('Failed to get m3u8 url:', err)
  }
  return null
}

export function setupDownloader(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('fetch-movie-details', async (_, movieUrl: string) => {
    try {
      const { data: detailHtml } = await axios.get(movieUrl, {
        httpsAgent,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const $ = cheerio.load(detailHtml)

      const onlineLinks: { name: string; url: string }[] = []
      $('ul.ewave-playlist-content li a').each((_, el) => {
        onlineLinks.push({
          name: $(el).text().trim(),
          url: movieUrl.startsWith('http')
            ? new URL($(el).attr('href') || '', movieUrl).href
            : $(el).attr('href') || ''
        })
      })

      // Try to get magnet links if any
      const magnetLinks: { title: string; url: string }[] = []
      $('a[href^="magnet:"]').each((_, el) => {
        magnetLinks.push({
          title: $(el).text().trim() || 'Magnet Link',
          url: $(el).attr('href') || ''
        })
      })

      return { onlineLinks, magnetLinks }
    } catch (e) {
      console.error(e)
      return { onlineLinks: [], magnetLinks: [] }
    }
  })

  ipcMain.handle('start-download', async (event, { playUrl, name, title }) => {
    const m3u8Url = await getM3u8Url(playUrl)
    if (!m3u8Url) {
      return { success: false, error: '无法解析在线播放地址' }
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '保存视频',
      defaultPath: `${title}_${name}.mp4`,
      filters: [{ name: '视频文件', extensions: ['mp4', 'ts', 'mkv'] }]
    })

    if (canceled || !filePath) return { success: false, error: '已取消' }

    const downloadId = Date.now().toString()

    // Start download process asynchronously
    startM3u8Download(downloadId, m3u8Url, filePath, mainWindow).catch(console.error)

    return { success: true, downloadId }
  })
}

async function startM3u8Download(
  id: string,
  m3u8Url: string,
  filePath: string,
  win: Electron.BrowserWindow
) {
  try {
    win.webContents.send('download-progress', { id, status: 'parsing', progress: 0 })

    let { data: m3u8Content } = await axios.get(m3u8Url, { httpsAgent })

    // Check if it's a master playlist
    if (m3u8Content.includes('#EXT-X-STREAM-INF')) {
      const parser = new Parser()
      parser.push(m3u8Content)
      parser.end()
      const manifest = parser.manifest
      if (manifest.playlists && manifest.playlists.length > 0) {
        m3u8Url = new URL(manifest.playlists[0].uri, m3u8Url).href
        const subRes = await axios.get(m3u8Url, { httpsAgent })
        m3u8Content = subRes.data
      }
    }

    const parser = new Parser()
    parser.push(m3u8Content)
    parser.end()
    const manifest = parser.manifest

    const segments = manifest.segments || []
    if (segments.length === 0) {
      win.webContents.send('download-progress', { id, status: 'error', error: '未找到视频分片' })
      return
    }

    activeDownloads.set(id, { abort: false, paused: false })

    const stream = fs.createWriteStream(filePath)
    let downloaded = 0
    const total = segments.length

    let currentKeyBuffer: Buffer | null = null
    let currentKeyUri: string | null = null

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      let state = activeDownloads.get(id)

      // Handle Pause
      while (state && state.paused && !state.abort) {
        await new Promise((r) => setTimeout(r, 1000))
        state = activeDownloads.get(id)
      }

      // Handle Abort
      if (!state || state.abort) {
        stream.close()
        fs.unlink(filePath, () => {}) // Delete incomplete file
        win.webContents.send('download-progress', { id, status: 'aborted' })
        return
      }

      // Handle Key
      let ivBuffer: Buffer | null = null
      let isEncrypted = false

      if (seg.key && seg.key.method && seg.key.method !== 'NONE') {
        isEncrypted = true
        if (seg.key.uri !== currentKeyUri) {
          currentKeyUri = seg.key.uri
          const keyUrl = new URL(currentKeyUri, m3u8Url).href
          const keyRes = await axios.get(keyUrl, { httpsAgent, responseType: 'arraybuffer' })
          currentKeyBuffer = Buffer.from(keyRes.data)
        }

        if (seg.key.iv) {
          ivBuffer = Buffer.alloc(16)
          for (let j = 0; j < 4; j++) {
            ivBuffer.writeUInt32BE(seg.key.iv[j], j * 4)
          }
        } else {
          ivBuffer = Buffer.alloc(16)
          ivBuffer.writeUInt32BE(manifest.mediaSequence + i, 12)
        }
      }

      const tsUrl = new URL(seg.uri, m3u8Url).href

      let retries = 3
      while (retries > 0) {
        try {
          const response = await axios.get(tsUrl, {
            responseType: 'arraybuffer',
            httpsAgent,
            timeout: 15000
          })
          let chunk = Buffer.from(response.data)

          if (isEncrypted && currentKeyBuffer && ivBuffer) {
            const decipher = crypto.createDecipheriv('aes-128-cbc', currentKeyBuffer, ivBuffer)
            decipher.setAutoPadding(false) // TS chunks padding might not be standard PKCS7
            chunk = Buffer.concat([decipher.update(chunk), decipher.final()])
          }

          await new Promise<void>((resolve, reject) => {
            stream.write(chunk, (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
          break
        } catch (err) {
          retries--
          if (retries === 0) throw err
          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      downloaded++
      win.webContents.send('download-progress', {
        id,
        status: 'downloading',
        progress: Math.round((downloaded / total) * 100)
      })
    }

    stream.end()
    activeDownloads.delete(id)
    win.webContents.send('download-progress', { id, status: 'completed', progress: 100 })
  } catch (error: any) {
    console.error('Download error:', error)
    win.webContents.send('download-progress', { id, status: 'error', error: error.message })
    activeDownloads.delete(id)
  }
}

ipcMain.handle('pause-download', (_, id: string) => {
  const dl = activeDownloads.get(id)
  if (dl) {
    dl.paused = true
    return true
  }
  return false
})

ipcMain.handle('resume-download', (_, id: string) => {
  const dl = activeDownloads.get(id)
  if (dl) {
    dl.paused = false
    return true
  }
  return false
})

ipcMain.handle('cancel-download', (_, id: string) => {
  const dl = activeDownloads.get(id)
  if (dl) {
    dl.abort = true
    return true
  }
  return false
})
