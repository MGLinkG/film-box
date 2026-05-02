import re

with open('src/renderer/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_code = """  const [deepFilterEnabled, setDeepFilterEnabled] = useState(() => {
    const saved = localStorage.getItem('movie_deep_filter')
    return saved ? saved === 'true' : false
  })
  useEffect(() => {
    localStorage.setItem('movie_deep_filter', deepFilterEnabled.toString())
  }, [deepFilterEnabled])

  const [updateRepo, setUpdateRepo] = useState(() => localStorage.getItem('movie_update_repo') || '')
  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean
    error: string | null
    result: any | null
  }>({ loading: false, error: null, result: null })
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    // @ts-ignore
    window.api.getAppVersion().then(setAppVersion).catch(() => {})
  }, [])

  const handleCheckUpdate = async () => {
    if (!updateRepo) return
    setUpdateStatus({ loading: true, error: null, result: null })
    try {
      const match = updateRepo.match(/github\.com\/([^\/]+)\/([^\/]+)/)
      if (!match) {
        throw new Error('请输入有效的 GitHub 仓库地址 (例如: https://github.com/user/repo)')
      }
      const owner = match[1]
      const repo = match[2].replace(/\.git$/, '')
      
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('未找到发布版本 (Release)')
        if (res.status === 403) throw new Error('API 频率限制或仓库私有')
        throw new Error('网络请求失败')
      }
      const data = await res.json()
      
      setUpdateStatus({
        loading: false,
        error: null,
        result: data
      })
    } catch(e: any) {
      setUpdateStatus({ loading: false, error: e.message, result: null })
    }
  }"""

if 'const [updateRepo' not in content:
    content = re.sub(r'  const \[deepFilterEnabled, setDeepFilterEnabled\] = useState\(\(\) => \{[\s\S]*?\}, \[deepFilterEnabled\]\)', state_code, content)
    print('Injected update states')

ui_code = """            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DownloadCloud size={18} />
                  检查更新
                </h3>
                <p className="text-sm text-secondary mt-1">输入 GitHub 仓库地址拉取最新版本</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={updateRepo}
                    onChange={(e) => {
                      setUpdateRepo(e.target.value)
                      localStorage.setItem('movie_update_repo', e.target.value)
                      setUpdateStatus({ loading: false, error: null, result: null })
                    }}
                    placeholder="https://github.com/用户名/项目名"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                  <button
                    onClick={handleCheckUpdate}
                    disabled={updateStatus.loading || !updateRepo}
                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updateStatus.loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                    检查
                  </button>
                </div>

                {appVersion && (
                  <div className="text-xs text-secondary">
                    当前版本: v{appVersion}
                  </div>
                )}

                {updateStatus.error && (
                  <div className="text-sm text-red-400 p-3 bg-red-400/10 rounded-lg">
                    {updateStatus.error}
                  </div>
                )}

                {updateStatus.result && (
                  <div className="mt-4 p-4 border border-white/10 rounded-xl bg-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-white">
                          发现新版本: {updateStatus.result.tag_name}
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          发布时间: {new Date(updateStatus.result.published_at).toLocaleDateString()}
                        </div>
                      </div>
                      {updateStatus.result.tag_name.replace(/^v/, '') === appVersion.replace(/^v/, '') && (
                        <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/20">
                          已是最新
                        </div>
                      )}
                    </div>
                    
                    {updateStatus.result.body && (
                      <div className="text-sm text-secondary whitespace-pre-wrap bg-black/20 p-3 rounded-lg max-h-40 overflow-y-auto">
                        {updateStatus.result.body}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {updateStatus.result.assets?.map((asset: any) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            // @ts-ignore
                            window.api.openExternal(asset.browser_download_url)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-lg text-xs text-white transition-colors"
                        >
                          <DownloadCloud size={14} />
                          下载 {asset.name}
                        </button>
                      ))}
                      {(!updateStatus.result.assets || updateStatus.result.assets.length === 0) && (
                         <button
                          onClick={() => {
                            // @ts-ignore
                            window.api.openExternal(updateStatus.result.html_url)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-lg text-xs text-white transition-colors"
                        >
                          <ExternalLink size={14} />
                          前往 Release 页面
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{t('languageSettings')}</h3>"""

if '检查更新' not in content:
    old_lang = """            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{t('languageSettings')}</h3>"""
    content = content.replace(old_lang, ui_code)
    print('Injected update UI')

with open('src/renderer/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
