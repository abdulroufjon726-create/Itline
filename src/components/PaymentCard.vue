<script setup>
import { computed } from "vue";

/**
 * Virtual to'lov kartasi — ortiqcha balans (kartada qolgan pul) va
 * qarzdorlikni ko'rsatadi. Student va manager bo'limlarida qayta ishlatiladi.
 */
const props = defineProps({
  balance: { type: Number, default: 0 }, // kartada qolgan (ortiqcha) pul
  debt: { type: Number, default: 0 }, // qarzdorlik
  monthlyDiscount: { type: Number, default: 0 }, // doimiy oylik chegirma
  name: { type: String, default: "" }, // karta egasi (ixtiyoriy)
  loading: { type: Boolean, default: false },
});

const fmt = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";

// Qarz bo'lsa qizil ohang, aks holda ko'k/binafsha — vizual holat
const inDebt = computed(() => (props.debt || 0) > 0);
</script>

<template>
  <div
    class="rounded-2xl p-5 relative overflow-hidden shadow-sm text-white transition-colors"
    :class="
      inDebt
        ? 'bg-gradient-to-br from-rose-500 to-red-600'
        : 'bg-gradient-to-br from-indigo-500 to-violet-600'
    "
  >
    <!-- dekorativ doiralar -->
    <div class="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
    <div class="absolute -bottom-10 -left-6 w-28 h-28 bg-white/10 rounded-full"></div>

    <div class="relative">
      <div class="flex items-center justify-between mb-5">
        <span class="text-xs font-medium text-white/70 uppercase tracking-wider">
          To'lov kartasi
        </span>
        <svg class="w-7 h-7 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      </div>

      <div v-if="loading" class="py-3">
        <div class="h-7 w-40 bg-white/20 rounded animate-pulse"></div>
      </div>

      <template v-else>
        <!-- Asosiy summa: qarz bo'lsa qarz, aks holda balans -->
        <p class="text-xs text-white/70 mb-1">
          {{ inDebt ? "Qarzdorlik" : "Kartada qolgan" }}
        </p>
        <p class="text-2xl sm:text-3xl font-bold tabular-nums break-words">
          {{ inDebt ? "−" : "" }}{{ fmt(inDebt ? debt : balance) }}
        </p>

        <!-- Ikkinchi qator: balans va qarz doim alohida ko'rinadi -->
        <div class="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/20">
          <div>
            <p class="text-[11px] text-white/60 mb-0.5">Kartada qolgan</p>
            <p class="text-sm font-semibold tabular-nums">{{ fmt(balance) }}</p>
          </div>
          <div>
            <p class="text-[11px] text-white/60 mb-0.5">Qarzdorlik</p>
            <p class="text-sm font-semibold tabular-nums">{{ fmt(debt) }}</p>
          </div>
        </div>

        <div v-if="name || monthlyDiscount > 0" class="flex items-center justify-between mt-4">
          <span v-if="name" class="text-sm font-medium text-white/90 truncate">{{ name }}</span>
          <span
            v-if="monthlyDiscount > 0"
            class="text-[11px] px-2 py-0.5 rounded-full bg-white/20 shrink-0"
          >
            Oylik chegirma: {{ fmt(monthlyDiscount) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
