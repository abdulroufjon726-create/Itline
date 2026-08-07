<template>
  <SuperLayout title="Kassa" subtitle="Kunlik smenalar va topshiruvlar">

    <!-- ══════════ SOZLAMA (o'chirib-yoqish) ══════════ -->
    <div class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 mb-5">
      <h2 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
        Kassa sozlamasi
      </h2>
      <div class="space-y-3">
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <span>
            <span class="text-sm font-medium text-slate-700 block">Kunlik kassa</span>
            <span class="text-xs text-slate-400">Kassir kunlik smenani topshiradi. O'chirilsa — eski tartib.</span>
          </span>
          <button type="button" @click="toggle('enabled')"
            :class="settings.enabled ? 'bg-emerald-500' : 'bg-slate-200'"
            class="relative w-11 h-6 rounded-full transition-colors shrink-0">
            <span :class="settings.enabled ? 'translate-x-5' : 'translate-x-0.5'"
              class="absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform"></span>
          </button>
        </label>

        <label class="flex items-center justify-between gap-4 cursor-pointer" :class="!settings.enabled ? 'opacity-50 pointer-events-none' : ''">
          <span>
            <span class="text-sm font-medium text-slate-700 block">Fizik sanoq majburiy</span>
            <span class="text-xs text-slate-400">Topshirishda kassir haqiqiy pulni sanab kiritadi (kamomad nazorati).</span>
          </span>
          <button type="button" @click="toggle('require_counted')"
            :class="settings.require_counted ? 'bg-emerald-500' : 'bg-slate-200'"
            class="relative w-11 h-6 rounded-full transition-colors shrink-0">
            <span :class="settings.require_counted ? 'translate-x-5' : 'translate-x-0.5'"
              class="absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform"></span>
          </button>
        </label>
      </div>
    </div>

    <div class="flex justify-end mb-4">
      <input type="month" v-model="selectedMonth"
        class="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 shadow-sm" />
    </div>

    <div v-if="loading" class="bg-white rounded-2xl border border-white/20 shadow-sm p-16 text-center">
      <div class="flex flex-col items-center gap-3">
        <AppIcon name="spinner" class="w-8 h-8 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400">Yuklanmoqda...</p>
      </div>
    </div>

    <template v-else>
      <!-- ══════════ KPI ══════════ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-2xl border border-white/20 shadow-sm p-5">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tizim hisobi</p>
          <p class="text-lg sm:text-xl font-bold text-slate-800 tabular-nums break-words">{{ fmt(summary.expected_total) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-white/20 shadow-sm p-5">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Topshirilgan (sanoq)</p>
          <p class="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums break-words">{{ fmt(summary.counted_total) }}</p>
        </div>
        <div class="rounded-2xl p-5 shadow-sm"
          :class="summary.difference_total === 0 ? 'bg-white border border-white/20' : (summary.difference_total < 0 ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100')">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Umumiy farq</p>
          <p class="text-lg sm:text-xl font-bold tabular-nums break-words"
            :class="summary.difference_total === 0 ? 'text-slate-800' : (summary.difference_total < 0 ? 'text-rose-600' : 'text-amber-600')">
            {{ summary.difference_total > 0 ? "+" : "" }}{{ fmt(summary.difference_total) }}
          </p>
        </div>
        <div class="bg-white rounded-2xl border border-white/20 shadow-sm p-5">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Smenalar</p>
          <p class="text-lg sm:text-xl font-bold text-slate-800 tabular-nums">
            {{ summary.closed_count }}<span class="text-sm text-slate-400"> / {{ summary.sessions_count }}</span>
          </p>
          <p class="text-[11px] text-slate-400 mt-1">{{ summary.open_count }} ta ochiq</p>
        </div>
      </div>

      <!-- ══════════ OYLIK YIG'IM ══════════ -->
      <!-- Smenalar "kassaga qancha tushdi" ni ko'rsatadi; bu blok esa
           "qancha tushishi kerak edi" ni — ikkalasi yonma-yon turmasa
           oy oxirida qancha qarz qolgani ko'rinmasdi. -->
      <div v-if="plan" class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 mb-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            Oylik yig'im
          </h2>
          <p class="text-xs text-slate-400 tabular-nums">
            <span class="font-semibold text-slate-600">{{ plan.paid_count }}</span>
            / {{ plan.total_count }} o'quvchi to'lagan
          </p>
        </div>

        <div class="h-2 w-full rounded-full bg-gray-200 overflow-hidden mb-4">
          <div class="h-full rounded-full bg-emerald-500 transition-all duration-500"
            :style="{ width: percent + '%' }"></div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <p class="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Yig'ilgan</p>
            <p class="text-base sm:text-lg font-bold text-emerald-600 tabular-nums break-words">
              {{ fmt(plan.collected_total) }}
            </p>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Qolgan</p>
            <p class="text-base sm:text-lg font-bold tabular-nums break-words"
              :class="plan.remaining_total > 0 ? 'text-rose-600' : 'text-emerald-600'">
              {{ fmt(plan.remaining_total) }}
            </p>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Yig'ilishi kerak</p>
            <p class="text-base sm:text-lg font-bold text-slate-800 tabular-nums break-words">
              {{ fmt(plan.due_total) }}
            </p>
          </div>
        </div>
      </div>

      <!-- ══════════ SMENALAR ══════════ -->
      <div class="bg-white rounded-2xl border border-white/20 shadow-sm overflow-x-auto">
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="border-b border-white/20 bg-slate-50/70">
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Kassir</th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Sana</th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Tizim</th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Sanalgan</th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Farq</th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">Holat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="sessions.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-sm text-slate-400">Bu oy uchun smena topilmadi</td>
            </tr>
            <tr v-for="s in sessions" :key="s.id" class="hover:bg-white/10 transition-colors">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                    {{ initials(s.cashier_name) }}
                  </div>
                  <span class="text-sm font-medium text-slate-700">{{ s.cashier_name || "—" }}</span>
                </div>
              </td>
              <td class="px-5 py-3.5 text-sm text-slate-500 tabular-nums">{{ formatDate(s.date) }}</td>
              <td class="px-5 py-3.5 text-sm font-bold text-slate-700 tabular-nums">{{ fmt(s.expected_total) }}</td>
              <td class="px-5 py-3.5 text-sm font-bold tabular-nums" :class="s.counted_total != null ? 'text-emerald-600' : 'text-slate-300'">
                {{ s.counted_total != null ? fmt(s.counted_total) : "—" }}
              </td>
              <td class="px-5 py-3.5 text-sm font-bold tabular-nums"
                :class="s.status !== 'closed' ? 'text-slate-300' : (s.difference === 0 ? 'text-emerald-600' : (s.difference < 0 ? 'text-rose-500' : 'text-amber-600'))">
                {{ s.status !== 'closed' ? "—" : (s.difference > 0 ? "+" : "") + fmt(s.difference) }}
              </td>
              <td class="px-5 py-3.5">
                <span :class="s.status === 'closed'
                  ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'"
                  class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full" :class="s.status === 'closed' ? 'bg-slate-400' : 'bg-emerald-400'"></span>
                  {{ s.status === 'closed' ? "Topshirilgan" : "Ochiq" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast.show"
        class="fixed bottom-6 right-6 left-6 sm:left-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
        :class="toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'">
        {{ toast.message }}
      </div>
    </transition>
  </SuperLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { API, authHeaders } from "@/utils/managerApi";

const jsonHeaders = () => authHeaders({ "Content-Type": "application/json" });

const loading = ref(true);
const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const sessions = ref([]);
const summary = ref({
  expected_total: 0,
  counted_total: 0,
  difference_total: 0,
  sessions_count: 0,
  closed_count: 0,
  open_count: 0,
});
const plan = ref(null);
const settings = ref({ enabled: true, require_counted: true, lock_after_close: true });
const toast = ref({ show: false, message: "", type: "success" });

// Progress chizig'i 100% dan oshmasin (ortiqcha to'lovlarda bo'lishi mumkin)
const percent = computed(() =>
  Math.min(100, Math.max(0, Number(plan.value?.collected_percent) || 0)),
);

const fmt = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";
const initials = (name) =>
  !name ? "?" : name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
};

function showToast(message, type = "success") {
  toast.value = { show: true, message, type };
  setTimeout(() => (toast.value.show = false), 3000);
}

async function loadSettings() {
  try {
    const res = await fetch(`${API}/cash/settings/`, { headers: authHeaders() });
    if (res.ok) settings.value = await res.json();
  } catch { /* jim */ }
}

async function loadSessions() {
  try {
    const res = await fetch(`${API}/cash/sessions/?month=${selectedMonth.value}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    sessions.value = data.sessions || [];
    summary.value = data.summary || summary.value;
    plan.value = data.plan || null;
  } catch {
    sessions.value = [];
    plan.value = null;
    showToast("Smenalarni yuklashda xatolik", "error");
  }
}

async function toggle(key) {
  const next = { ...settings.value, [key]: !settings.value[key] };
  settings.value = next;
  try {
    const res = await fetch(`${API}/cash/settings/update/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ [key]: next[key] }),
    });
    if (!res.ok) throw new Error();
    showToast("Saqlandi");
  } catch {
    settings.value = { ...settings.value, [key]: !next[key] }; // qaytarish
    showToast("Saqlashda xatolik", "error");
  }
}

async function loadAll() {
  loading.value = true;
  await Promise.allSettled([loadSettings(), loadSessions()]);
  loading.value = false;
}

watch(selectedMonth, loadSessions);
onMounted(loadAll);
</script>

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
