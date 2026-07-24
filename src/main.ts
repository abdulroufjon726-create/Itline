import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/main.css'
// Tema butun ilovaga qo'llanishi uchun shu yerda yuklanadi —
// aks holda u faqat Profile sahifasi ochilganda ishga tushardi
import './composables/useTheme'

const app = createApp(App)

app.use(router)
app.use(createPinia())

app.mount('#app')

// PWA — "ilovani o'rnatish" (asosiy ekranga qo'shish) imkoniyati uchun
// service worker ro'yxatga olinadi. Keshsiz, faqat installability uchun.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}