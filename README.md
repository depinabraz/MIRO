# Microsoft Advertising — Interactive Site

## Quick Start

### 1. Install Node.js
If you don't have it: https://nodejs.org (download LTS version)

### 2. Install dependencies
```bash
cd ms-ads-site
npm install
```

### 3. Run locally
```bash
npm run dev
```
Opens at `http://localhost:5173`

### 4. Build for production
```bash
npm run build
```
Creates a `dist/` folder ready to deploy.

---

## Adding Images & Videos

### Folder structure
```
public/
  assets/
    images/
      sol-search.jpg       ← Solutions card 1
      sol-display.jpg       ← Solutions card 2
      sol-video.jpg         ← Solutions card 3
      testimonial.jpg       ← Testimonial portrait
      closing-illustration.png  ← Closing section art
    videos/
      hero-reel.mp4         ← Main video player
```

### How to reference them in code

In `src/App.jsx`, images in `public/` are available at root `/`:

**Solutions cards** — find `.ms-sol-c1 .ms-sol-photo` in the styles and change:
```css
/* Before */
.ms-sol-c1 .ms-sol-photo { background: linear-gradient(...); }

/* After */
.ms-sol-c1 .ms-sol-photo { background: url('/assets/images/sol-search.jpg') center/cover no-repeat; }
.ms-sol-c2 .ms-sol-photo { background: url('/assets/images/sol-display.jpg') center/cover no-repeat; }
.ms-sol-c3 .ms-sol-photo { background: url('/assets/images/sol-video.jpg') center/cover no-repeat; }
```

**Testimonial portrait** — find `.ms-sol-test-portrait` and change:
```css
.ms-sol-test-portrait { background: url('/assets/images/testimonial.jpg') center/cover no-repeat; }
```

**Video** — find the `ms-video-bg-img` div in PhotoGallery and replace with:
```jsx
<video
  ref={vidRef}
  src="/assets/videos/hero-reel.mp4"
  muted
  playsInline
  style={{ width: "100%", height: "100%", objectFit: "cover" }}
/>
```

---

## Deploy Options

### Option A: Vercel (recommended, free)
1. Push to GitHub
2. Go to https://vercel.com
3. Import your repo
4. It auto-detects Vite — click Deploy
5. Done. You get a URL like `your-project.vercel.app`

### Option B: Netlify (also free)
1. Push to GitHub
2. Go to https://netlify.com
3. "Add new site" → "Import from Git"
4. Build command: `npm run build`
5. Publish directory: `dist`

### Option C: GitHub Pages
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json scripts: `"deploy": "npm run build && gh-pages -d dist"`
3. In `vite.config.js`, set `base: '/your-repo-name/'`
4. Run: `npm run deploy`

---

## Push to GitHub

```bash
# 1. Create a new repo on github.com (don't add README)

# 2. In terminal:
cd ms-ads-site
git init
git add .
git commit -m "Initial commit — Microsoft Ads interactive site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ms-ads-site.git
git push -u origin main
```

---

## File Overview

```
ms-ads-site/
├── index.html          ← Entry point
├── package.json        ← Dependencies
├── vite.config.js      ← Build config
├── public/
│   └── assets/
│       ├── images/     ← Drop your photos here
│       └── videos/     ← Drop your videos here
└── src/
    ├── main.jsx        ← React mount
    └── App.jsx         ← All components & styles
```
