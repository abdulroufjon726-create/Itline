// Serverni uyg'oq tutish (Render bepul plani).
//
// Muammo: bepul plandagi servis ~15 daqiqa so'rovsiz qolsa uxlaydi va
// keyingi ochilish 30 soniyagacha cho'zilishi mumkin. Kod tezligi bu
// yerda ahamiyatsiz — 40 ms yoki 200 ms bo'lishi 30 soniya oldida
// sezilmaydi.
//
// Nega brauzerdan: repolar private, GitHub Actions'ning bepul limiti
// (2000 daqiqa/oy) esa har 10 daqiqada bir marta ishga tushirishga
// yetmaydi — har run kamida 1 daqiqa deb hisoblanadi. Tashqi monitoring
// xizmati ham ro'yxatdan o'tishni talab qiladi. Panel ish vaqtida
// baribir ochiq turadi (ayniqsa `/groups/board` — devordagi jadval
// ekrani), shuning uchun ping o'sha ochiq oynadan yuboriladi.
//
// Faqat KO'RINIB turgan oynadan yuboriladi: fonda qolgan o'nlab
// tablar serverni bir vaqtda urib turmasin.

import { API_BASE } from "@/config";

// Render 15 daqiqada uxlaydi — zaxira bilan 10 daqiqa
const PING_MS = 10 * 60 * 1000;

// Toshkent (UTC+5) bo'yicha soat oralig'i. Render bepul plani oyiga 750
// instance-soat beradi: kuniga 24 soat uyg'oq turish ~730 soatni yeydi
// va boshqa bepul servisga joy qolmaydi. Markaz ishlamaydigan tunda
// ping yubormaymiz — bu oyiga ~500 soat, zaxirasi bilan.
const FROM_HOUR = 6;
const TO_HOUR = 23;

function inWorkingHours(): boolean {
  const utcHour = new Date().getUTCHours();
  const tashkentHour = (utcHour + 5) % 24;
  return tashkentHour >= FROM_HOUR && tashkentHour < TO_HOUR;
}

function ping(): void {
  if (document.visibilityState !== "visible") return;
  if (!inWorkingHours()) return;
  // keepalive — sahifa yopilayotgan paytda ham so'rov uzilib qolmasin
  fetch(`${API_BASE}/api/ping/`, { cache: "no-store", keepalive: true }).catch(
    () => {
      // Server uxlagan bo'lsa so'rovning o'zi uni uyg'otadi; javob
      // kelmagani muhim emas
    },
  );
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Ilova ishga tushganda bir marta chaqiriladi (main.ts). */
export function startKeepAwake(): void {
  if (timer !== null) return;
  ping(); // sahifa ochilishi bilan — birinchi so'rov kutmasin
  timer = setInterval(ping, PING_MS);

  // Uzoq yopiq turgan noutbuk ochilganda interval "kechikib" qoladi:
  // oyna ko'rinishi bilan darhol bir marta uramiz.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ping();
  });
}
