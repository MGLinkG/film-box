import re

with open('src/renderer/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Sidebar and Nav
content = content.replace(
    '<div className="w-64 bg-surface border-r border-white/5 flex flex-col p-4 z-10">',
    '<div className="w-72 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col p-8 z-10 shadow-2xl">'
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
content = re.sub(
    r'className={`w-full flex items-center gap-3 px-4 py-2\.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent \$\{([^}]+)\}`}',
    r'className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-none text-sm font-medium tracking-wide uppercase transition-all focus-visible:outline-none border-l-2 ${activeTab === \1 ? "border-accent text-white bg-gradient-to-r from-accent/10 to-transparent" : "border-transparent text-secondary hover:text-white hover:border-white/20"}`}',
    content
)
# The above regex might be tricky. Let's do exact replacements for the nav buttons.
