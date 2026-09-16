// Backend manzili. Lokal ishlab chiqishda yoki staging'da backend'ni
// almashtirish uchun VITE_API_BASE env o'zgaruvchisi beriladi:
//   VITE_API_BASE=http://127.0.0.1:8010 npx vite
// Production'da env berilmasa — eski qiymat (Render) ishlatiladi.
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'https://davomat-django-zbn4.onrender.com'

// Barcha sahifalar shu yerdan olib foydalanadi — URL hech qaysi
// komponentda qotirib qo'yilmagan (avval 21 faylda nusxa bo'lgan edi).
export const API = `${API_BASE}/api`
