import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/main.css'
// Tema butun ilovaga qo'llanishi uchun shu yerda yuklanadi —
// aks holda u faqat Profile sahifasi ochilganda ishga tushardi
import './composables/useTheme'
import { startKeepAwake } from './composables/useKeepAwake'
import axios from 'axios'

// ─────────────────────────────────────────
// JWT — HAR BIR API so'roviga avtomatik qo'shiladi
//
// Backend /api/ ostidagi barcha endpoint'lar JWT token talab qiladi
// (ommaviy ro'yxatdagi login/register/webhook'lardan tashqari).
// Menejer paneli managerApi.authHeaders() orqali yuboradi, lekin
// o'quvchi/ustoz panellari (admin, excellence, to'lov oynasi va h.k.)
// to'g'ridan-to'g'ri fetch() ishlatadi — ularni birma-bir tahrirlash
// o'rniga fetch'ni bir joyda o'raymiz: localStorage'da token bo'lsa
// 'Authorization: Bearer ...' sarlavhasi o'zi qo'shiladi.
// ─────────────────────────────────────────
const _origFetch = window.fetch.bind(window)
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    if (url.includes('/api/') && !url.includes('/token/refresh')) {
      const token = localStorage.getItem('access_token')
      if (token) {
        // Request obyektining sarlavhalari + init sarlavhalari birlashtiriladi
        const headers = new Headers(
          input instanceof Request ? input.headers : undefined,
        )
        new Headers(init?.headers).forEach((v, k) => headers.set(k, v))
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        init = { ...(init || {}), headers }
      }
    }
  } catch {
    // Sarlavha qo'shib bo'lmasa ham so'rov oqimi buzilmasin
  }
  return _origFetch(input as RequestInfo, init)
}) as typeof fetch

// Axios esa fetch'ni ishlatmaydi (DefaultFee.vue) — unga ham o'xshash
// interceptor: har bir /api/ so'roviga token qo'shiladi.
axios.interceptors.request.use((config) => {
  try {
    const url = String(config.url || '')
    if (url.includes('/api/') && !url.includes('/token/refresh')) {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers = config.headers || {}
        if (!config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
      }
    }
  } catch {
    // Sarlavha qo'shib bo'lmasa ham so'rov oqimi buzilmasin
  }
  return config
})

const app = createApp(App)

app.use(router)
app.use(createPinia())

app.mount('#app')

// Serverni uyg'oq tutish — bepul plandagi 30 soniyalik uyqudan
// uyg'onishni oldini oladi (batafsil izoh useKeepAwake ichida)
startKeepAwake()

// PWA — "ilovani o'rnatish" (asosiy ekranga qo'shish) imkoniyati uchun
// service worker ro'yxatga olinadi. Keshsiz, faqat installability uchun.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}