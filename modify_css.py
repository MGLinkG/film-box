import os

main_css = """@import 'tailwindcss';

@theme {
  --color-background: #020202;
  --color-surface: #0a0a0a;
  --color-primary: #ffffff;
  --color-secondary: #999999;
  --color-accent: #E50914; /* Cinematic Red */
  --color-danger: #ff3333;
}

@layer base {
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;800&display=swap');

  body {
    background-color: var(--color-background);
    color: var(--color-primary);
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
    background-image: 
      radial-gradient(circle at 15% 50%, rgba(229, 9, 20, 0.04), transparent 35%),
      radial-gradient(circle at 85% 30%, rgba(229, 9, 20, 0.02), transparent 25%);
    background-attachment: fixed;
  }

  /* Cinematic Grain */
  body::before {
    content: "";
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.035;
    pointer-events: none;
    z-index: 9999;
  }

  h1, h2, h3, h4, h5, h6, .font-serif {
    font-family: 'Cormorant Garamond', serif;
  }
}
"""

base_css = ""

with open('src/renderer/src/assets/main.css', 'w', encoding='utf-8') as f:
    f.write(main_css)

with open('src/renderer/src/assets/base.css', 'w', encoding='utf-8') as f:
    f.write(base_css)
