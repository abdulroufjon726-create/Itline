<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const deferredPrompt = ref(null);
const show = ref(false);
const installing = ref(false);

const SEEN_KEY = "pwa_install_seen";
// Taklif ko'rsatilmaydigan sahifalar (kiosk/kirish/oflayn)
const EXCLUDED = ["/login", "/offline", "/groups/board"];

function isLoggedIn() {
  try {
    return !!JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return false;
  }
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Shartlar bajarilsa taklifni ko'rsatamiz (birinchi login paytida bir marta)
function maybeShow() {
  if (show.value || !deferredPrompt.value) return;
  if (isStandalone()) return; // allaqachon ilova sifatida ochilgan
  if (localStorage.getItem(SEEN_KEY)) return; // bir marta ko'rsatilgan
  if (!isLoggedIn()) return;
  if (EXCLUDED.includes(router.currentRoute.value.path)) return;
  show.value = true;
}

function onBeforeInstall(e) {
  e.preventDefault();
  deferredPrompt.value = e;
  maybeShow();
}
function onInstalled() {
  show.value = false;
  deferredPrompt.value = null;
  localStorage.setItem(SEEN_KEY, "1");
}

async function install() {
  const dp = deferredPrompt.value;
  if (!dp) return;
  installing.value = true;
  try {
    dp.prompt();
    await dp.userChoice;
  } catch (e) {
    /* jim */
  } finally {
    installing.value = false;
    show.value = false;
    deferredPrompt.value = null;
    localStorage.setItem(SEEN_KEY, "1");
  }
}
function later() {
  show.value = false;
  localStorage.setItem(SEEN_KEY, "1");
}

let stopAfterEach = null;
onMounted(() => {
  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);
  // Login bo'lgach (route o'zgarganda) taklifni tekshiramiz
  stopAfterEach = router.afterEach(() => maybeShow());
});
onUnmounted(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  window.removeEventListener("appinstalled", onInstalled);
  if (stopAfterEach) stopAfterEach();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="pwa">
      <div v-if="show" class="pwa-overlay" @click.self="later">
        <div class="pwa-card">
          <div class="pwa-icon">
            <img src="/pwa-192.png" alt="ITLINE" />
          </div>
          <h3 class="pwa-title">ITLINE ilovasini o'rnating</h3>
          <p class="pwa-text">
            Ilovani asosiy ekranga qo'shing — brauzersiz, xuddi alohida ilova
            kabi tez va qulay oching.
          </p>
          <div class="pwa-actions">
            <button class="pwa-btn-ghost" @click="later">Keyinroq</button>
            <button class="pwa-btn-primary" :disabled="installing" @click="install">
              {{ installing ? "O'rnatilmoqda..." : "Ha, o'rnatish" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pwa-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  background: rgba(4, 7, 12, 0.6);
  backdrop-filter: blur(4px);
}
@media (min-width: 640px) {
  .pwa-overlay {
    align-items: center;
  }
}
.pwa-card {
  width: 100%;
  max-width: 24rem;
  background: #ffffff;
  border-radius: 1.5rem;
  padding: 1.75rem 1.5rem 1.5rem;
  text-align: center;
  box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.4);
}
:global([data-theme="dark"]) .pwa-card {
  background: #151f36;
  color: #e8edf7;
}
.pwa-icon {
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto 1rem;
  border-radius: 1.1rem;
  overflow: hidden;
  box-shadow: 0 8px 24px -6px rgba(79, 70, 229, 0.5);
}
.pwa-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pwa-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
}
.pwa-text {
  font-size: 0.9rem;
  line-height: 1.55;
  color: #64748b;
  margin: 0 0 1.4rem;
}
:global([data-theme="dark"]) .pwa-text {
  color: #a8b6cf;
}
.pwa-actions {
  display: flex;
  gap: 0.6rem;
}
.pwa-btn-ghost,
.pwa-btn-primary {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.85rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.pwa-btn-ghost {
  background: transparent;
  border-color: #e2e8f0;
  color: #64748b;
}
.pwa-btn-ghost:hover {
  background: #f8fafc;
}
:global([data-theme="dark"]) .pwa-btn-ghost {
  border-color: #2a3854;
  color: #a8b6cf;
}
.pwa-btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 6px 16px -4px rgba(99, 102, 241, 0.5);
}
.pwa-btn-primary:hover {
  filter: brightness(1.05);
}
.pwa-btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.pwa-enter-active,
.pwa-leave-active {
  transition: opacity 0.3s ease;
}
.pwa-enter-active .pwa-card,
.pwa-leave-active .pwa-card {
  transition: transform 0.32s cubic-bezier(0.22, 1.2, 0.36, 1);
}
.pwa-enter-from,
.pwa-leave-to {
  opacity: 0;
}
.pwa-enter-from .pwa-card,
.pwa-leave-to .pwa-card {
  transform: translateY(24px);
}
</style>
