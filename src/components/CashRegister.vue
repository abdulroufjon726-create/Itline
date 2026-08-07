<script setup>
/**
 * Kunlik kassa (kassir).
 *
 * Ikki qavat:
 *   1. Bugungi smena — tushgan pul va "Topshirish" (fizik sanoq).
 *   2. Oylik yig'im — qancha yig'ilishi kerak, qancha yig'ilgan, qancha
 *      qolgan. Ilgari faqat bugungi summa ko'rinardi: kassir oy oxirida
 *      qancha qarz qolganini panelda umuman ko'rmasdi.
 *
 * Kunlik kassa supermenejer tomonidan o'chirilgan bo'lsa yoki kassirda
 * `cash.view` vakolati bo'lmasa — hech narsa ko'rsatmaydi.
 */
import { ref, computed, watch, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import { API, authHeaders, can } from "@/utils/managerApi";

const props = defineProps({
  // Oylik yig'im qaysi oy uchun ko'rsatilsin. Bo'sh bo'lsa — joriy oy.
  // To'lovlar jadvali bilan bir oy turishi kerak, aks holda pastda iyul,
  // yuqorida avgust raqamlari turib qolardi.
  month: { type: String, default: "" },
});

const loading = ref(true);
const enabled = ref(false);
const requireCounted = ref(true);
const session = ref(null);
const plan = ref(null);

const showModal = ref(false);
const counted = ref(null);
const note = ref("");
const closing = ref(false);
const justClosed = ref(null); // topshirilgandan keyin qisqa xulosa
const toast = ref({ show: false, message: "", type: "success" });

const jsonHeaders = () => authHeaders({ "Content-Type": "application/json" });
const fmt = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const monthLabel = computed(() => {
  const m = plan.value?.month;
  if (!m) return "";
  return MONTHS[Number(m.slice(5, 7)) - 1] || m;
});

const expected = computed(() => session.value?.expected_total ?? 0);
const difference = computed(() => {
  const c = Number(counted.value);
  if (counted.value === null || counted.value === "" || isNaN(c)) return null;
  return c - expected.value;
});

// Progress chizig'i 100% dan oshmasin (ortiqcha to'lovlarda bo'lishi mumkin)
const percent = computed(() =>
  Math.min(100, Math.max(0, Number(plan.value?.collected_percent) || 0)),
);

function showToast(message, type = "success") {
  toast.value = { show: true, message, type };
  setTimeout(() => (toast.value.show = false), 3000);
}

async function load() {
  if (!can("cash.view")) {
    enabled.value = false;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const q = props.month ? `?month=${props.month}` : "";
    const res = await fetch(`${API}/cash/current/${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    enabled.value = !!data.enabled;
    requireCounted.value = data.require_counted !== false;
    session.value = data.session || null;
    plan.value = data.plan || null;
    // Kun davomida yangi to'lov tushsa smena qayta ochiladi — eski
    // "topshirildi" xulosasi ekranda qolib ketmasin
    if (session.value) justClosed.value = null;
  } catch {
    enabled.value = false;
  } finally {
    loading.value = false;
  }
}

// Tashqaridan (to'lov saqlangach) yangilash uchun
defineExpose({ reload: load });

function openModal() {
  counted.value = null;
  note.value = "";
  showModal.value = true;
}

async function submitClose() {
  if (requireCounted.value && (counted.value === null || counted.value === "")) {
    showToast("Sanalgan pulni kiriting", "error");
    return;
  }
  closing.value = true;
  try {
    const res = await fetch(`${API}/cash/close/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        counted_total: counted.value === "" ? null : counted.value,
        note: note.value.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Topshirishda xatolik", "error");
      return;
    }
    justClosed.value = data.session;
    session.value = null;
    showModal.value = false;
    showToast("Kassa topshirildi ✅");
  } catch {
    showToast("Internet aloqasini tekshiring", "error");
  } finally {
    closing.value = false;
  }
}
watch(() => props.month, load);
onMounted(load);
</script>

<template>
  <!-- Kassa o'chirilgan yoki vakolat yo'q — umuman ko'rinmaydi -->
  <div v-if="!loading && enabled" class="mb-5 space-y-3">
    <!-- ══════════ BUGUNGI SMENA ══════════ -->
    <!-- Ochiq smena bor -->
    <div v-if="session"
      class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full opacity-60"></div>
      <div class="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200 shrink-0">
            <AppIcon name="money" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Bugungi kassa</p>
            <p class="text-2xl font-bold text-slate-800 tabular-nums">{{ fmt(expected) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 sm:ml-2">
          <div class="text-center">
            <p class="text-lg font-bold text-slate-700 tabular-nums">{{ session.entries_count }}</p>
            <p class="text-[11px] text-slate-400">yozuv</p>
          </div>
          <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ochiq
          </span>
        </div>
        <button v-if="can('cash.close')" @click="openModal"
          class="sm:ml-auto px-5 py-2.5 text-sm font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5">
          <AppIcon name="check" /> Kassani topshirish
        </button>
      </div>
    </div>

    <!-- Bugun topshirilgan (yangi to'lovgacha) -->
    <div v-else-if="justClosed"
      class="bg-white rounded-2xl border border-white/20 shadow-sm p-5">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <AppIcon name="check" class="w-4 h-4 text-emerald-500" />
        </div>
        <p class="text-sm font-semibold text-slate-700">Kassa topshirildi</p>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-slate-100 rounded-xl p-3 text-center">
          <p class="text-sm font-bold text-slate-700 tabular-nums">{{ fmt(justClosed.expected_total) }}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Tizim hisobi</p>
        </div>
        <div class="bg-slate-100 rounded-xl p-3 text-center">
          <p class="text-sm font-bold text-slate-700 tabular-nums">{{ fmt(justClosed.counted_total) }}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Sanalgan</p>
        </div>
        <div class="rounded-xl p-3 text-center"
          :class="justClosed.difference === 0 ? 'bg-emerald-50' : (justClosed.difference < 0 ? 'bg-rose-50' : 'bg-amber-50')">
          <p class="text-sm font-bold tabular-nums"
            :class="justClosed.difference === 0 ? 'text-emerald-600' : (justClosed.difference < 0 ? 'text-rose-600' : 'text-amber-600')">
            {{ justClosed.difference > 0 ? "+" : "" }}{{ fmt(justClosed.difference) }}
          </p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            {{ justClosed.difference === 0 ? "To'g'ri" : (justClosed.difference < 0 ? "Kamomad" : "Ortiqcha") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Kassa yoqilgan, lekin bugun hali to'lov yo'q -->
    <div v-else
      class="bg-white/60 rounded-2xl border border-dashed border-slate-200 p-4 flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
        <AppIcon name="money" class="w-4 h-4 text-slate-400" />
      </div>
      <p class="text-sm text-slate-400">Kunlik kassa yoqilgan — birinchi to'lovda avtomatik ochiladi.</p>
    </div>

    <!-- ══════════ OYLIK YIG'IM ══════════ -->
    <!-- Jami qancha yig'ilishi kerak va shundan qanchasi yig'ilgan -->
    <div v-if="plan" class="bg-white rounded-2xl border border-white/20 shadow-sm p-5">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {{ monthLabel }} — oylik yig'im
        </p>
        <p class="text-xs text-slate-400 tabular-nums">
          <span class="font-semibold text-slate-600">{{ plan.paid_count }}</span>
          / {{ plan.total_count }} o'quvchi to'lagan
        </p>
      </div>

      <!-- Progress: yig'ilgan / yig'ilishi kerak -->
      <div class="h-2 w-full rounded-full bg-gray-200 overflow-hidden mb-3">
        <div class="h-full rounded-full bg-emerald-500 transition-all duration-500"
          :style="{ width: percent + '%' }"></div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <p class="text-[11px] text-slate-400 mb-0.5">Yig'ilgan</p>
          <p class="text-sm sm:text-base font-bold text-emerald-600 tabular-nums break-words">
            {{ fmt(plan.collected_total) }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-slate-400 mb-0.5">Qolgan</p>
          <p class="text-sm sm:text-base font-bold tabular-nums break-words"
            :class="plan.remaining_total > 0 ? 'text-rose-600' : 'text-emerald-600'">
            {{ fmt(plan.remaining_total) }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-slate-400 mb-0.5">Yig'ilishi kerak</p>
          <p class="text-sm sm:text-base font-bold text-slate-800 tabular-nums break-words">
            {{ fmt(plan.due_total) }}
          </p>
        </div>
      </div>

      <p class="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
        Kassaga shu oy tushgan:
        <span class="font-semibold text-slate-600 tabular-nums">{{ fmt(plan.cash_month_total) }}</span>
        <span class="text-slate-300"> — boshqa oylar uchun to'lovlar ham shunga kiradi</span>
      </p>
    </div>

    <!-- Topshirish modali -->
    <transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        @click.self="showModal = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <AppIcon name="money" class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-800">Kassani topshirish</h3>
              <p class="text-xs text-slate-400">Qo'lingizdagi pulni sanab kiriting</p>
            </div>
          </div>

          <div class="bg-slate-100 rounded-xl p-4 mb-4 flex items-center justify-between">
            <span class="text-sm text-slate-500">Tizim hisobi</span>
            <span class="text-lg font-bold text-slate-800 tabular-nums">{{ fmt(expected) }}</span>
          </div>

          <label class="block text-xs text-slate-400 mb-1.5">Sanalgan pul (so'm)</label>
          <input v-model.number="counted" type="number" min="0" placeholder="0"
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-300 transition mb-1" />

          <p v-if="difference !== null" class="text-sm font-medium mb-3 tabular-nums"
            :class="difference === 0 ? 'text-emerald-600' : (difference < 0 ? 'text-rose-500' : 'text-amber-600')">
            {{ difference === 0 ? "✅ To'g'ri keladi" :
              (difference < 0 ? `− ${fmt(Math.abs(difference))} kamomad` : `+ ${fmt(difference)} ortiqcha`) }}
          </p>

          <label class="block text-xs text-slate-400 mb-1.5">Izoh (ixtiyoriy)</label>
          <input v-model="note" type="text" placeholder="Masalan: sabab..."
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-300 transition mb-5" />

          <div class="flex gap-2">
            <button @click="showModal = false"
              class="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
              Bekor
            </button>
            <button @click="submitClose" :disabled="closing"
              class="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50">
              {{ closing ? "Topshirilmoqda..." : "Topshirish" }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
        class="fixed bottom-6 right-6 left-6 sm:left-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-[60]"
        :class="toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
