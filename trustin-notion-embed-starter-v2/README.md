# Trustin Jr. Quest Mapper — Notion Embed Starter

## 1) Install
```bash
npm i
```

## 2) Run locally
```bash
npm run dev
```
Open the URL it prints. Add `?embed=1` to simulate Notion embed.

## 3) Deploy to Vercel
- Push this folder to GitHub.
- In Vercel, **Import Project** from the repo and deploy.
- In **Project Settings → Security → Content Security Policy**, add this response header:
  ```
  Content-Security-Policy: frame-ancestors https://www.notion.so https://*.notion.site 'self'
  ```
  (Or create a `vercel.json` if you prefer managing it in code.)

## 4) Embed in Notion
In a Notion page:
- Type `/embed` and paste your deployed URL (e.g., `https://your-app.vercel.app/?embed=1`).

> Styling uses Tailwind CDN (no config). Replace with your design system if you want.
