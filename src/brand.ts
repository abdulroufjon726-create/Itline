/**
 * BREND — loyihaning BARCHA nomi, logotip va matni BITTA JOYDA.
 *
 * Boshqa markazga loyihani sotganda faqat shu qiymatlar o'zgaradi:
 *   1) `.env` faylda VITE_BRAND_NAME / VITE_BRAND_NAME_FULL / ... yozing
 *      (yoki Vercel → Settings → Environment Variables'da),
 *   2) `npm run build` qiling — qayerda ishlatilganidan qat'i nazar,
 *      butun panel yangi nom bilan chiqadi.
 *
 * Kalit maxfiy emas — bu ommaviy Brend (boshqalar ham ko'radi).
 */
const env = import.meta.env as Record<string, string | undefined>;

/** Qisqa nom — navbar, logo yonidagi yozuv */
export const BRAND_NAME = env.VITE_BRAND_NAME || 'ITLINE';

/** To'liq nom — meta, rasmiy matnlar */
export const BRAND_NAME_FULL = env.VITE_BRAND_NAME_FULL || `${BRAND_NAME} o'quv markazi`;

/** Panelning o'z nomi — xodim ko'radigan sarlavha */
export const BRAND_PANEL_NAME = env.VITE_BRAND_PANEL_NAME || `${BRAND_NAME} Panel`;

/** PWA ilova nomi — "ilovani o'rnating" oynasi */
export const BRAND_APP_TITLE = env.VITE_BRAND_APP_TITLE || `${BRAND_NAME} ilovasini o'rnating`;

/** Logo rasmi (import qilingan asset) — Vite hash'langan URL beradi */
export { default as BRAND_LOGO } from '@/icon/itline.png';

/** QR kod rasmlari — LessonsPlans'dagi aloqa kartochkalari */
export { default as BRAND_QR_TELEGRAM } from '@/icon/telegram_QR.png';
export { default as BRAND_QR_WEBSITE } from '@/icon/Itline_web-qr.png';

/** Telegram bildirishnomalarida ishlatiladigan to'liq nom */
export const BRAND_PAYMENT_REMINDER = (oy: string) =>
  `${BRAND_NAME} o'quv markazida ${oy} oyi uchun to'lov muddati yaqinlashmoqda. `;

/** index.html title — build paytida to'ldiriladi */
export const BRAND_TITLE = `${BRAND_NAME} CRM — O'quv markazlari uchun boshqaruv tizimi`;
