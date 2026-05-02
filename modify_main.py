with open('src/renderer/src/main.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import './assets/base.css'", "import './assets/main.css'")

with open('src/renderer/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
