<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center px-6">

      <!-- Icon -->
      <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AppIcon name="offline" class="text-gray-400" />
      </div>

      <h1 class="text-xl font-semibold text-gray-900 mb-2">Internet aloqasi yo'q</h1>
      <p class="text-sm text-gray-400 mb-8 max-w-[260px] mx-auto leading-relaxed">
        Tarmoq ulanishini tekshirib, qayta urinib ko'ring
      </p>

      <!-- Retry button -->
      <button
        @click="retry"
        :disabled="checking"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition disabled:opacity-50 cursor-pointer">
        <AppIcon name="refresh" class="checking ? 'animate-spin' : ''" />
        {{ checking ? 'Tekshirilmoqda...' : 'Qayta urinish' }}
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";
import { API } from "@/config";

const router  = useRouter();
const checking = ref(false);

async function retry() {
  checking.value = true;
  try {
    await fetch(`${API}/teachers/`, {
      signal: AbortSignal.timeout(5000),
    });
    // Internet bor — orqaga qayt
    router.back();
  } catch {
    // Hali yo'q — sahifada qol
  } finally {
    checking.value = false;
  }
}
</script>