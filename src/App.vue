<script setup>
import { onMounted, onUnmounted } from 'vue'
import Loading from './components/Loading.vue'
import PwaInstall from './components/PwaInstall.vue'
import { apiSend, currentUser } from '@/utils/managerApi'

// ── Onlayn belgisi ──
// Supermenejer kim hozir saytda ekanini ko'radi. Buning uchun
// ochiq bo'lgan sahifa vaqti-vaqti bilan "men shu yerdaman" deb
// signal yuboradi. Yashirin (background) tabdan yuborilmaydi —
// aks holda yopilmagan tab odamni abadiy onlayn ko'rsatardi.
const PING_MS = 60_000
let timer = null

function ping() {
  if (document.visibilityState !== 'visible') return
  if (!currentUser()) return
  apiSend('/presence/ping/', 'POST').catch(() => {})
}

onMounted(() => {
  ping()
  timer = setInterval(ping, PING_MS)
  document.addEventListener('visibilitychange', ping)
})

onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', ping)
})
</script>

<template>
  <div  class="overflow-x-hidden min-h-screen px-4">
    <Suspense>
      <template #default>
        <RouterView />
      </template>
      <template #fallback>
        <div style="min-height:200px;display:flex;align-items:center;justify-content:center">
          <div class="inline-spinner" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(90deg,#06b6d4,#7c3aed);animation:spin 1s linear infinite"></div>
        </div>
      </template>
    </Suspense>
    <Loading />
    <PwaInstall />
  </div>
  
</template>

<style scoped>
@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
</style>

<style scoped></style>
