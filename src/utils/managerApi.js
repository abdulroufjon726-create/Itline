// Menejer / supermenejer paneli uchun API chaqiruvlari.
//
// Backend chaqiruvchini 'Authorization: Bearer <access_token>' orqali
// aniqlaydi — token SECRET_KEY bilan imzolangan, uni brauzerda
// o'zgartirib bo'lmaydi (avvalgi 'X-User-Phone' sarlavhasidan farqli
// o'laroq, u istalgan qiymatga o'zgartirilishi mumkin edi).
// 'X-Device-Id' esa qurilmani belgilaydi: supermenejer panelga qaysi
// qurilmalar kirayotganini shu orqali ko'radi (xavfsizlik uchun emas,
// faqat statistika uchun).
import { API_BASE } from "@/config";
import { clearCache } from "@/utils/cache";

export const API = `${API_BASE}/api`;

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// TOKENLAR
// ─────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem("access_token") || "";
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token") || "";
}

/** Login javobidagi `tokens: {access, refresh}` ni saqlaydi. */
export function storeTokens(tokens) {
  if (!tokens?.access || !tokens?.refresh) return;
  localStorage.setItem("access_token", tokens.access);
  localStorage.setItem("refresh_token", tokens.refresh);
}

/**
 * Hisobdan chiqish.
 *
 * `router.push('/login')` yetarli emas edi: sahifa almashsa ham, ochiq
 * turgan panelning xotiradagi holati (o'quvchilar ro'yxati, ishlab
 * turgan setInterval'lar, keshlangan javoblar) o'chmaydi va route
 * komponenti tarmoqdan yuklanguncha eski sahifa ko'rinib turadi —
 * shuning uchun "chiqdim" bosilgach ham bir marta refresh qilish
 * kerak bo'lardi.
 *
 * `location.replace` esa ilovani noldan ko'taradi: hech qanday eski
 * holat qolmaydi va tarixda ham qaytadigan sahifa qolmaydi.
 */
export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("used_default_password");
  // Router "oxirgi ochilgan sahifa" ni shu yerdan o'qiydi — tozalanmasa
  // login sahifasi eski sahifaga qaytarib yuborishi mumkin
  sessionStorage.removeItem("lastPath");
  // Keshdagi ro'yxatlar ham ketsin: shu brauzerdan boshqa odam kirsa
  // bir lahzaga oldingi menejerning ma'lumoti ko'rinib qolardi
  clearCache();
  window.location.replace("/login");
}

/** Shu brauzer uchun bir marta yaratiladigan barqaror qurilma ID. */
export function deviceId() {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("device_id", id);
  }
  return id;
}

export function authHeaders(extra = {}) {
  const h = { "X-Device-Id": deviceId(), ...extra };
  const token = getAccessToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function headers() {
  return authHeaders({ "Content-Type": "application/json" });
}

// Bir vaqtda bir nechta so'rov 401 qaytarsa ham, refresh so'rovi
// faqat bitta marta yuborilishi uchun — parallel so'rovlar shu bitta
// promise'ni kutadi, aks holda refresh token bir necha marta
// ishlatilib, ROTATE_REFRESH_TOKENS tufayli keyingilari xato beradi.
let refreshingPromise = null;

async function tryRefreshToken() {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.access) return false;
      localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
      return true;
    } catch {
      return false;
    }
  })();

  const result = await refreshingPromise;
  refreshingPromise = null;
  return result;
}

/**
 * Javobni {ok, data} ko'rinishida qaytaradi — chaqiruvchi xatoni o'zi ko'rsatadi.
 *
 * Access token muddati tugagan bo'lsa (401), refresh token bilan
 * yangisi so'raladi va so'rov bir marta qayta yuboriladi —
 * foydalanuvchi buni sezmaydi, qayta login qilish shart bo'lmaydi.
 * Refresh ham muvaffaqiyatsiz bo'lsa (masalan 30 kundan beri
 * kirilmagan), hisobdan chiqariladi.
 */
export async function apiCall(path, options = {}) {
  let res = await fetch(`${API}${path}`, { headers: headers(), ...options });

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await fetch(`${API}${path}`, { headers: headers(), ...options });
    } else {
      logout();
      return { ok: false, status: 401, data: {} };
    }
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

export const apiGet = (path) => apiCall(path);

export const apiSend = (path, method, body) =>
  apiCall(path, { method, body: JSON.stringify(body ?? {}) });

// ─────────────────────────────────────────
// VAKOLATLAR
// ─────────────────────────────────────────

export function isSuper(user = currentUser()) {
  return !!user?.is_super;
}

export function isManager(user = currentUser()) {
  return user?.role === "manager";
}

/**
 * Foydalanuvchida shu vakolat bormi.
 *
 * Supermenejerda hammasi bor. Menejer uchun login javobidagi
 * `permissions` ro'yxati tekshiriladi. Menejer bo'lmaganlar (ustoz,
 * admin o'quvchi) eski holicha ishlaydi — vakolatlar tizimi faqat
 * menejerlarni cheklaydi.
 */
export function can(key, user = currentUser()) {
  if (!user) return false;
  if (user.is_super) return true;
  if (user.role !== "manager") return true;
  // Vakolatlar tizimidan oldin kirgan menejerning localStorage'ida bu
  // maydon umuman yo'q — unga hamma narsa ochiq qoladi. Qayta
  // kirganida haqiqiy ro'yxat keladi. Bo'sh ro'yxat esa boshqa gap:
  // supermenejer ataylab hech narsa bermagan degani.
  if (!Array.isArray(user.permissions)) return true;
  return user.permissions.includes(key);
}