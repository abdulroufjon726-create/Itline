// Menejer / supermenejer paneli uchun API chaqiruvlari.
//
// Backend chaqiruvchini 'X-User-Phone' sarlavhasi orqali aniqlaydi —
// u orqali menejer, supermenejer yoki ustozligi va vakolatlari
// tekshiriladi. 'X-Device-Id' esa qurilmani belgilaydi: supermenejer
// panelga qaysi qurilmalar kirayotganini shu orqali ko'radi.
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
  const phone = currentUser()?.phone;
  if (phone) h["X-User-Phone"] = phone;
  return h;
}

function headers() {
  return authHeaders({ "Content-Type": "application/json" });
}

/** Javobni {ok, data} ko'rinishida qaytaradi — chaqiruvchi xatoni o'zi ko'rsatadi. */
export async function apiCall(path, options = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers(), ...options });
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
