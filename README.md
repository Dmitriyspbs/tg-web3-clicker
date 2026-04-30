# Telegram Web3 Clicker MVP

Это первая простая версия Telegram Web3 Mini App: кликер + TON Connect.

## Что внутри

- React + Vite + TypeScript
- Telegram WebApp SDK
- TON Connect Button
- Coins
- Energy
- Tasks
- Сохранение прогресса в localStorage

## Как запустить

1. Установи Node.js: https://nodejs.org/

2. Открой папку проекта в терминале.

3. Установи зависимости:

```bash
npm install
```

4. Запусти проект:

```bash
npm run dev
```

5. Открой адрес, который покажет Vite. Обычно это:

```txt
http://localhost:5173
```

## Что важно

Пока это локальная версия для обучения.

Чтобы открыть её внутри Telegram, понадобится HTTPS-ссылка. Позже можно загрузить проект на Vercel.

## Что менять первым

Основной экран игры находится здесь:

```txt
src/App.tsx
```

Стили находятся здесь:

```txt
src/styles.css
```

TON manifest находится здесь:

```txt
tonconnect-manifest.json
```

Перед публикацией замени:

```json
{
  "url": "https://your-domain.com",
  "name": "Telegram Web3 Clicker",
  "iconUrl": "https://your-domain.com/icon.png"
}
```

на свой настоящий домен.
 
 
