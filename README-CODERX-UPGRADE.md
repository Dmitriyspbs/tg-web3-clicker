# CoderX upgrade pack

Скопируй файлы из этого архива в корень своего проекта с заменой:

- index.html
- src/App.tsx
- src/styles.css
- public/favicon.svg
- public/icon.svg
- public/tonconnect-manifest.json

Важно: в public/tonconnect-manifest.json замени YOUR-VERCEL-DOMAIN на свой настоящий домен Vercel.

После замены:

```bash
npm run dev
```

Если всё работает:

```bash
git add .
git commit -m "Add CoderX splash screen favicon and profile"
git push
```
