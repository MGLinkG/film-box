const fs = require('fs');

let content = fs.readFileSync('src/main/downloader.ts', 'utf8');

const oldFuncRegex = /async function startM3u8Download\([\s\S]*?\n\}\n\nipcMain.handle\('pause-download'/;

const newFunc = `async function startM3u8Download(
  id: string,
  playUrls: string[],
  filePath: string,
  win: Electron.BrowserWindow
) {
  activeDownloads.set(id, { abort: false, paused: false })

  let lastError: any = null

  for (let sourceIdx = 0; sourceIdx < playUrls.length; sourceIdx++) {
    try {
      const playUrl = playUrls[sourceIdx]
      win.webContents.send('download-progress', { 
        id, 
        status: 'parsing', 
        progress: 0, 
        error: sourceIdx > 0 ? \`尝试备用源 \${sourceIdx + 1}...\` : undefined 
      })
      
      let m3u8Url = await getM3u8Url(playUrl)
      if (!m3u8Url) throw new Error('无法解析在线播放地址')

      let { data: m3u8Content } = await axios.get(m3u8Url, { httpsAgent })
      
      // Check if master playlist
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
        throw new Error('未找到视频分片')
      }
      
      // Clear any previous error in UI
      win.webContents.send('download-progress', { id, status: 'downloading', progress: 0, error: null })

      const stream = fs.createWriteStream(filePath)
      let downloaded = 0
      const total = segments.length
      
      let currentKeyBuffer: Buffer | null = null
      let currentKeyUri: string | null = null
      const speedWindow: { bytes: number; time: number }[] = []

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        let state = activeDownloads.get(id)
        
        while (state && state.paused && !state.abort) {
          await new Promise(r => setTimeout(r, 1000))
          state = activeDownloads.get(id)
        }
        
        if (!state || state.abort) {
          stream.close()
          fs.unlink(filePath, () => {})
          win.webContents.send('download-progress', { id, status: 'aborted' })
          return // Aborted by user
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
                ivBuffer.writeUInt32BE((manifest.mediaSequence || 0) + i, 12)
            }
        }
        
        const tsUrl = new URL(seg.uri, m3u8Url).href
        
        let retries = 3
        while (retries > 0) {
          try {
            const startChunkTime = Date.now()
            const response = await axios.get(tsUrl, { responseType: 'arraybuffer', httpsAgent, timeout: 15000 })
            const endChunkTime = Date.now()
            let chunk = Buffer.from(response.data)
            
            speedWindow.push({ bytes: chunk.length, time: endChunkTime - startChunkTime })
            if (speedWindow.length > 5) speedWindow.shift()

            if (isEncrypted && currentKeyBuffer && ivBuffer) {
                const decipher = crypto.createDecipheriv('aes-128-cbc', currentKeyBuffer, ivBuffer)
                decipher.setAutoPadding(false)
                chunk = Buffer.concat([decipher.update(chunk), decipher.final()])
            }
            
            await new Promise((resolve, reject) => {
                stream.write(chunk, (err) => {
                    if (err) reject(err)
                    else resolve(undefined)
                })
            })
            break
          } catch (err) {
            retries--
            if (retries === 0) throw err
            await new Promise(r => setTimeout(r, 1000))
          }
        }
        
        downloaded++
        const totalBytes = speedWindow.reduce((acc, curr) => acc + curr.bytes, 0)
        const totalTime = speedWindow.reduce((acc, curr) => acc + curr.time, 0)
        const avgSpeed = totalTime > 0 ? (totalBytes / 1024 / 1024) / (totalTime / 1000) : 0

        win.webContents.send('download-progress', { 
          id, 
          status: 'downloading', 
          progress: Math.round((downloaded / total) * 100), 
          speed: avgSpeed.toFixed(1) 
        })
      }
      
      stream.end()
      activeDownloads.delete(id)
      win.webContents.send('download-progress', { id, status: 'completed', progress: 100 })
      return // Success, exit function
      
    } catch (error: any) {
      console.error(\`Download error on source \${sourceIdx}:\`, error)
      lastError = error
      // If we reach here, this source failed. We loop to the next source.
    }
  }

  // If we exit the loop, all sources failed
  win.webContents.send('download-progress', { id, status: 'error', error: lastError?.message || '所有播放源均下载失败' })
  activeDownloads.delete(id)
}

ipcMain.handle('pause-download'`;

content = content.replace(oldFuncRegex, newFunc);
fs.writeFileSync('src/main/downloader.ts', content, 'utf8');
