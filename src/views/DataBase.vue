<template>
  <div class="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans">
    <!-- ══════════ HEADER ══════════ -->
    <div
      class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div class="pl-1">
            <img
              src="../icon/itline.png"
              alt=""
              class="w-10 rounded-full animate-spin"
              style="animation-duration: 5s"
            />
          </div>
          <h1
            class="text-xl sm:text-2xl font-sans text-slate-800 tracking-tight"
          >
            Baza — Leadlar
          </h1>
        </div>
        <p class="text-sm text-slate-400 ml-1">
          Potensial mijozlar, bitiruvchilar va reklama kanallari
        </p>
      </div>
      <router-link
        to="/excellence"
        class="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-rose-500 text-sm font-medium rounded-lg border border-slate-100 shadow-sm transition-all duration-150 shrink-0"
      >
        <AppIcon name="logout" class="w-4 h-4" />
        <span>Orqaga</span>
      </router-link>
    </div>

    <!-- ══════════ STAT KARTALAR ══════════ -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
      <div
        v-for="s in statCards"
        :key="s.key"
        @click="activeTab = s.key"
        :class="[
          'cursor-pointer rounded-2xl border shadow-sm p-4 sm:p-5 relative overflow-hidden group transition-all',
          activeTab === s.key
            ? 'bg-white border-indigo-200 ring-2 ring-indigo-100'
            : 'bg-white border-slate-100 hover:shadow-md',
        ]"
      >
        <div
          :class="[
            'absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity',
            s.bg,
          ]"
        ></div>
        <div class="relative">
          <div class="flex items-center gap-2 mb-3">
            <div
              :class="[
                'w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 text-white text-sm',
                s.iconBg,
              ]"
            >
              <AppIcon :name="s.icon" />
            </div>
            <span
              class="text-[11px] font-medium text-slate-400 uppercase tracking-wider hidden sm:inline"
              >{{ s.label }}</span
            >
          </div>
          <p class="text-lg sm:text-2xl font-bold text-slate-800 tabular-nums">
            {{ s.value.toLocaleString() }}
          </p>
          <p class="text-[11px] text-slate-400 sm:hidden">{{ s.label }}</p>
        </div>
      </div>
    </div>

    <!-- ══════════ ASOSIY KARTA ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <!-- Qidiruv -->
      <div
        v-if="activeTab !== 'ads'"
        class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div class="relative flex-1">
          <svg
            class="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            class="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-300 transition"
          />
        </div>
        <p class="text-xs text-slate-400 shrink-0 tabular-nums">
          {{ filtered.length.toLocaleString() }} ta
          <span v-if="search">topildi</span>
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="p-16 text-center">
        <div class="flex flex-col items-center gap-3">
          <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
          <p class="text-sm text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>

      <template v-else>
        <div v-if="!filtered.length" class="p-16 text-center">
          <p class="text-3xl mb-2"><AppIcon name="search" /></p>
          <p class="text-sm text-slate-400">Hech narsa topilmadi</p>
        </div>

        <!-- ══ REKLAMA ══ -->
        <div v-else-if="activeTab === 'ads'" class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            v-for="c in filtered"
            :key="c.id"
            :href="'https://t.me/' + c.username.replace('@', '')"
            target="_blank"
            rel="noopener"
            class="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/40 transition group"
          >
            <div class="w-9 h-9 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 text-sm shadow-sm shadow-sky-200">
              <AppIcon name="send" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-sky-600 group-hover:underline truncate">{{ c.username }}</p>
              <p v-if="c.title" class="text-xs text-slate-500 truncate">{{ c.title }}</p>
              <p v-if="c.note" class="text-[11px] text-slate-400 line-clamp-2">{{ c.note }}</p>
            </div>
          </a>
        </div>

        <!-- ══ LEADLAR / BITIRUVCHILAR ══ -->
        <template v-else>
          <!-- Desktop jadval -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400 select-none">
                  <th class="px-3 py-2.5 font-medium w-10 text-right">#</th>
                  <th class="px-3 py-2.5 font-medium">Ism</th>
                  <th class="px-3 py-2.5 font-medium">Telefon</th>
                  <th class="px-3 py-2.5 font-medium">Qo'shimcha</th>
                  <th v-if="activeTab === 'leads'" class="px-3 py-2.5 font-medium">Holat</th>
                  <th v-if="activeTab === 'leads'" class="px-3 py-2.5 font-medium">Qiziqish</th>
                  <th v-if="activeTab === 'grads'" class="px-3 py-2.5 font-medium">O'qituvchi</th>
                  <th class="px-3 py-2.5 font-medium">Izoh</th>
                  <th v-if="canDeleteLead" class="px-3 py-2.5 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, ri) in paged"
                  :key="row.id"
                  class="border-t border-slate-50 hover:bg-indigo-50/40 transition-colors"
                >
                  <td class="px-3 py-2 text-right text-slate-300 tabular-nums text-xs">
                    {{ (page - 1) * pageSize + ri + 1 }}
                  </td>
                  <td class="px-3 py-2 text-slate-700 font-medium max-w-[220px] truncate" :title="row.name">
                    {{ row.name }}
                  </td>
                  <td class="px-3 py-2">
                    <a v-if="row.phone" :href="'tel:' + tel(row.phone)" class="text-indigo-500 hover:underline tabular-nums whitespace-nowrap">{{ row.phone }}</a>
                    <span v-else class="text-slate-200">·</span>
                  </td>
                  <td class="px-3 py-2">
                    <a v-if="row.phone2" :href="'tel:' + tel(row.phone2)" class="text-indigo-400 hover:underline tabular-nums whitespace-nowrap">{{ row.phone2 }}</a>
                    <span v-else class="text-slate-200">·</span>
                  </td>
                  <td v-if="activeTab === 'leads'" class="px-3 py-2 text-slate-500 max-w-[200px] truncate" :title="row.status">{{ row.status || '·' }}</td>
                  <td v-if="activeTab === 'leads'" class="px-3 py-2">
                    <span v-if="row.interest" class="inline-block text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 truncate max-w-[140px]">{{ row.interest }}</span>
                    <span v-else class="text-slate-200">·</span>
                  </td>
                  <td v-if="activeTab === 'grads'" class="px-3 py-2 text-slate-500">{{ row.teacher_name || '·' }}</td>
                  <td class="px-3 py-2 text-slate-400 max-w-[240px] truncate" :title="row.note">{{ row.note || '·' }}</td>
                  <td v-if="canDeleteLead" class="px-3 py-2 text-right">
                    <button
                      v-if="activeTab === 'leads'"
                      @click="removeLead(row)"
                      :disabled="deleting === row.id"
                      title="Leadni o'chirish"
                      class="text-slate-300 hover:text-rose-500 transition disabled:opacity-40"
                    >
                      <AppIcon name="trash" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobil kartalar -->
          <div class="sm:hidden divide-y divide-slate-100">
            <div v-for="(row, ri) in paged" :key="row.id" class="p-4 space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <p class="font-semibold text-slate-800 text-sm leading-snug">{{ row.name }}</p>
                <span class="text-[10px] text-slate-300 tabular-nums shrink-0">#{{ (page - 1) * pageSize + ri + 1 }}</span>
              </div>
              <div v-if="row.phone" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Telefon</span>
                <a :href="'tel:' + tel(row.phone)" class="text-indigo-500 tabular-nums">{{ row.phone }}</a>
              </div>
              <div v-if="row.phone2" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Qo'shimcha</span>
                <a :href="'tel:' + tel(row.phone2)" class="text-indigo-400 tabular-nums">{{ row.phone2 }}</a>
              </div>
              <div v-if="row.status" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Holat</span>
                <span class="text-slate-600 break-words min-w-0">{{ row.status }}</span>
              </div>
              <div v-if="row.interest" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Qiziqish</span>
                <span class="inline-block text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{{ row.interest }}</span>
              </div>
              <div v-if="row.teacher_name" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Ustoz</span>
                <span class="text-slate-600">{{ row.teacher_name }}</span>
              </div>
              <div v-if="row.note" class="flex items-baseline gap-2 text-[13px]">
                <span class="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">Izoh</span>
                <span class="text-slate-500 break-words min-w-0">{{ row.note }}</span>
              </div>
            </div>
          </div>

          <!-- Paginatsiya -->
          <div v-if="totalPages > 1" class="flex items-center justify-between gap-3 p-4 border-t border-slate-100">
            <button @click="page--" :disabled="page <= 1" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"><AppIcon name="arrow-left" /> Oldingi</button>
            <p class="text-xs text-slate-400 tabular-nums">{{ page }} / {{ totalPages }}</p>
            <button @click="page++" :disabled="page >= totalPages" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Keyingi <AppIcon name="arrow-right" /></button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { API_BASE } from "@/config";
import AppIcon from "@/components/AppIcon.vue";
import { apiSend, isSuper } from "@/utils/managerApi";

const API = `${API_BASE}/api`;

const leads = ref([]);
const grads = ref([]);
const ads = ref([]);
const loadingAll = ref(true);

const activeTab = ref("leads");
const search = ref("");
const page = ref(1);
const pageSize = 50;

const loading = computed(() => loadingAll.value);

const statCards = computed(() => [
  { key: "leads", label: "Leadlar", value: leads.value.length, icon: "phone", bg: "bg-indigo-50", iconBg: "bg-indigo-500 shadow-indigo-200" },
  { key: "grads", label: "Bitiruvchilar", value: grads.value.length, icon: "student", bg: "bg-amber-50", iconBg: "bg-amber-500 shadow-amber-200" },
  { key: "ads", label: "Reklama", value: ads.value.length, icon: "megaphone", bg: "bg-sky-50", iconBg: "bg-sky-500 shadow-sky-200" },
]);

const source = computed(() => {
  if (activeTab.value === "leads") return leads.value;
  if (activeTab.value === "grads") return grads.value;
  return ads.value;
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q || activeTab.value === "ads") return source.value;
  const qDigits = q.replace(/\D/g, "");
  return source.value.filter((r) => {
    const hay = `${r.name || ""} ${r.status || ""} ${r.interest || ""} ${r.note || ""} ${r.teacher_name || ""}`.toLowerCase();
    if (hay.includes(q)) return true;
    if (qDigits.length >= 3) {
      const p = `${r.phone || ""}${r.phone2 || ""}`.replace(/\D/g, "");
      return p.includes(qDigits);
    }
    return false;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));

const tel = (v) => {
  const d = String(v).replace(/\D/g, "");
  return d.length === 9 ? `+998${d}` : `+${d}`;
};

watch([search, activeTab], () => (page.value = 1));

// Lead o'chirish faqat supermenejerda — import qilingan ro'yxatni
// tozalash uchun
const canDeleteLead = isSuper();
const deleting = ref(null);

async function removeLead(row) {
  if (!confirm(`${row.name} (${row.phone}) o'chirilsinmi?`)) return;
  deleting.value = row.id;
  try {
    const { ok, data } = await apiSend(`/leads/${row.id}/delete/`, "DELETE");
    if (!ok) {
      alert(data.error || "O'chirilmadi");
      return;
    }
    leads.value = leads.value.filter((l) => l.id !== row.id);
  } finally {
    deleting.value = null;
  }
}

async function fetchAll() {
  loadingAll.value = true;
  try {
    const [lr, gr, ar] = await Promise.all([
      fetch(`${API}/leads/`).then((r) => r.json()),
      fetch(`${API}/graduates/`).then((r) => r.json()),
      fetch(`${API}/ad-channels/`).then((r) => r.json()),
    ]);
    leads.value = lr.leads || [];
    grads.value = gr.graduates || [];
    ads.value = ar.channels || [];
  } catch (e) {
    console.error("baza fetch error:", e);
  } finally {
    loadingAll.value = false;
  }
}

onMounted(fetchAll);
</script>
