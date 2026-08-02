// Oxirgi muvaffaqiyatli javoblarni brauzerda saqlash.
//
// Nima uchun: server bepul planda turadi va bir necha daqiqa
// ishlatilmasa uxlab qoladi. Uyg'onishi yarim daqiqagacha cho'zilishi
// mumkin — shu vaqt ichida sahifa "Yuklanmoqda..." dan boshqa hech
// narsa ko'rsatmasdi va F5 bosgan odam bo'sh ekranga qarab o'tirardi.
//
// Yechim: oxirgi ko'rilgan ma'lumot darhol chiziladi, so'rov esa fonda
// ketaveradi va javob kelishi bilan ustiga yoziladi. Eskirgan bir necha
// soniyalik ma'lumot bo'sh ekrandan yaxshiroq.

const PREFIX = "cache:";

// Undan eskisi ishlatilmaydi — eski ma'lumotni ko'rsatgandan ko'ra
// kutgan ma'qul
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function readCache(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const { at, data } = JSON.parse(raw);
    if (!at || Date.now() - at > MAX_AGE_MS) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

/** Hamma keshni tozalaydi — hisobdan chiqishda chaqiriladi. */
export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage yopiq bo'lsa qiladigan ish yo'q
  }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Joy tugagan bo'lishi mumkin — kesh majburiy emas, jim o'tamiz
  }
}
