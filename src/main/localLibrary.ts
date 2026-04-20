import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

type LocalVideoFile = {
  name: string
  fullPath: string
  episode: number | null
}

type LocalSeries = {
  id: string
  title: string
  folderPath: string
  episodes: number[]
  fileCount: number
}

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.ts'])

function parseEpisodeFromName(name: string): number | null {
  const m1 = name.match(/第\s*0*([0-9]{1,4})\s*集/)
  if (m1) return Number(m1[1])
  const m2 = name.match(/S[0-9]{1,2}E\s*0*([0-9]{1,4})/i)
  if (m2) return Number(m2[1])
  const m3 = name.match(/\bEP?\s*0*([0-9]{1,4})\b/i)
  if (m3) return Number(m3[1])
  const m4 = name.match(/\bE\s*0*([0-9]{1,4})\b/i)
  if (m4) return Number(m4[1])
  return null
}

async function walkFiles(dirPath: string, result: LocalVideoFile[]) {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(full, result)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!VIDEO_EXTS.has(ext)) continue
    const episode = parseEpisodeFromName(path.parse(entry.name).name)
    result.push({ name: entry.name, fullPath: full, episode })
  }
}

export function setupLocalLibrary() {
  ipcMain.handle('scan-local-library', async (_event, paths: string[]) => {
    const allSeries = new Map<string, LocalVideoFile[]>()

    for (const p of paths || []) {
      const files: LocalVideoFile[] = []
      await walkFiles(p, files)
      for (const f of files) {
        const folderPath = path.dirname(f.fullPath)
        if (!allSeries.has(folderPath)) allSeries.set(folderPath, [])
        allSeries.get(folderPath)!.push(f)
      }
    }

    const seriesList: LocalSeries[] = []
    for (const [folderPath, files] of allSeries.entries()) {
      const title = path.basename(folderPath)
      const eps = Array.from(
        new Set(files.map((f) => f.episode).filter((n): n is number => typeof n === 'number'))
      ).sort((a, b) => a - b)
      seriesList.push({
        id: folderPath,
        title,
        folderPath,
        episodes: eps,
        fileCount: files.length
      })
    }

    seriesList.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
    return seriesList
  })
}

