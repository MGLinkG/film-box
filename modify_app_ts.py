import re

with open('src/renderer/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'\$\{discoverFilters\.([a-zA-Z]+) === c\.value \|\| discoverFilters\.\1 === c \?',
    r'${discoverFilters.\1 === ((c as any).value || c) ?',
    content
)

with open('src/renderer/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
