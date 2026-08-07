import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/main.css'
// Tema butun ilovaga qo'llanishi uchun shu yerda yuklanadi —
// aks holda u faqat Profile sahifasi ochilganda ishga tushardi
import './composables/useTheme'
import { startKeepAwake } from './composables/useKeepAwake'

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