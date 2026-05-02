import re

with open('src/renderer/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Main Layout & Sidebar
content = content.replace(
    '<div className="w-64 bg-surface border-r border-white/5 flex flex-col p-4 z-10">',
    '<div className="w-72 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col p-8 z-10 shadow-2xl relative">'
)
content = content.replace(
    '<div className="flex items-center gap-3 mb-12">',
    '<div className="flex items-center gap-4 mb-16">'
)
content = content.replace(
    '<div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">',
    '<div className="w-10 h-10 rounded-sm bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.4)]">'
)
content = content.replace(
    '<h1 className="text-lg font-semibold tracking-tight">MovieFinder</h1>',
    '<h1 className="text-2xl font-serif font-bold tracking-widest uppercase text-white">CinéFind</h1>'
)

# 2. Nav Buttons
def replace_nav_button(match):
    tab = match.group(1)
    return f"className={{`w-full flex items-center gap-4 px-4 py-3.5 rounded-none text-sm font-medium tracking-widest uppercase transition-all focus-visible:outline-none border-l-2 ${{activeTab === '{tab}' ? 'border-accent text-white bg-gradient-to-r from-accent/10 to-transparent' : 'border-transparent text-secondary hover:text-white hover:border-white/20 hover:bg-white/5'}}`}}"

content = re.sub(
    r'className={`w-full flex items-center gap-3 px-4 py-2\.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent \$\{([^}]+) \? \'bg-white/10 text-white\' : \'text-secondary hover:text-white hover:bg-white/5\'\}`}',
    lambda m: replace_nav_button(re.search(r"activeTab === '([^']+)'", m.group(1))),
    content
)

# 3. Headers
content = content.replace(
    '<h2 className="text-3xl font-bold tracking-tight">发现影视</h2>',
    '<h2 className="text-5xl font-serif italic tracking-wide text-white/90">发现影视</h2>'
)
content = content.replace(
    '<h2 className="text-3xl font-bold tracking-tight">我的收藏</h2>',
    '<h2 className="text-5xl font-serif italic tracking-wide text-white/90">我的收藏</h2>'
)
content = content.replace(
    '<h2 className="text-3xl font-bold tracking-tight">本地资源</h2>',
    '<h2 className="text-5xl font-serif italic tracking-wide text-white/90">本地资源</h2>'
)
content = content.replace(
    '<h2 className="text-3xl font-bold tracking-tight">下载管理</h2>',
    '<h2 className="text-5xl font-serif italic tracking-wide text-white/90">下载管理</h2>'
)
content = content.replace(
    '<h2 className="text-3xl font-bold tracking-tight">{t(\'settings\')}</h2>',
    '<h2 className="text-5xl font-serif italic tracking-wide text-white/90">{t(\'settings\')}</h2>'
)

# 4. Search Bar
content = content.replace(
    '<input\n                  type="text"\n                  value={query}',
    '<input\n                  type="text"\n                  value={query}'
)
content = re.sub(
    r'className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-transparent transition-all"',
    r'className="w-full bg-transparent border-b-2 border-white/10 py-6 pl-14 pr-4 text-3xl font-serif text-white placeholder-white/20 focus:outline-none focus:border-accent transition-all rounded-none"',
    content
)
content = re.sub(
    r'className="absolute inset-y-2 right-2 px-6 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"',
    r'className="absolute inset-y-4 right-0 px-8 bg-accent text-white tracking-widest uppercase font-medium rounded-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)]"',
    content
)

# 5. Filter Pills
content = re.sub(
    r'className={`px-3 py-1\.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent \$\{discoverFilters\.([a-zA-Z]+) === c(?:\.value)? \? \'bg-accent text-white font-medium\' : \'text-secondary hover:bg-white/5 hover:text-white\'\}`}',
    r'className={`px-3 py-1.5 rounded-sm text-sm tracking-wide transition-all focus-visible:outline-none border-b-2 ${discoverFilters.\1 === c.value || discoverFilters.\1 === c ? "border-accent text-white font-medium" : "border-transparent text-secondary hover:border-white/20 hover:text-white"}`}',
    content
)
content = content.replace(
    'className="bg-surface border border-white/5 rounded-xl p-6 space-y-4"',
    'className="bg-transparent border-t border-b border-white/10 py-6 space-y-4 my-8"'
)

# 6. Movie Cards
content = content.replace(
    'className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"',
    'className="group relative flex flex-col rounded-sm overflow-hidden bg-transparent border border-transparent hover:border-white/10 transition-all duration-500 cursor-pointer text-left focus-visible:outline-none hover:shadow-2xl"'
)
content = content.replace(
    'className="aspect-[2/3] w-full relative bg-black/40 flex items-center justify-center overflow-hidden"',
    'className="aspect-[2/3] w-full relative bg-black flex items-center justify-center overflow-hidden border border-white/5 rounded-sm"'
)
content = content.replace(
    'className="text-sm font-bold text-white mb-1 line-clamp-1"',
    'className="text-lg font-serif text-white/90 mb-1 line-clamp-1 group-hover:text-accent transition-colors"'
)

# 7. Modals
content = content.replace(
    'className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"',
    'className="bg-[#0a0a0a] border border-white/10 rounded-sm w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"'
)
content = content.replace(
    'className="w-full rounded-xl object-cover shadow-lg border border-white/5 aspect-[2/3]"',
    'className="w-full rounded-sm object-cover shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 aspect-[2/3]"'
)

with open('src/renderer/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
