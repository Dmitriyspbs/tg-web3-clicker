/// <reference types="vite/client" />

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
  };
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
