<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import CoinQuickGive from "@/components/CoinQuickGive.vue";

// Coin berish ustoz/adminda — dars belgilangan joyning o'zida.
// Balans esa hammaga ko'rinadi: ustoz o'quvchining coinini shu ro'yxatda
// ko'rib turishi kerak, coin bermasa ham.
const user = JSON.parse(localStorage.getItem("user") || "null");
const canGiveCoins = !!user?.is_admin;
const teacherId = user?.teacher_id || null;

/**
 * Soddalashtirilgan davomat: guruh tanla → sana (yoki oy) → belgila.
 * Qo'lda "dars yaratish" yo'q — backend guruh+sana bo'yicha darsni o'zi ochadi.
 * Teacher (o'z guruhlari) va manager (tanlangan ustoz guruhlari) ishlatadi.
 * Har o'quvchining oylik kelmaganlari ko'rinadi (to'lov shunga bog'liq).
 * Real vaqt: ochiq ko'rinish har 8 soniyada yangilanadi (polling).
 */
const props = defineProps({
  groups: { type: Array, default: () => [] },
  canMark: { type: Boolean, default: true },
  // Kelmaganlar shu sondan oshsa qizil (ogohlantirish)
  absentWarn: { type: Number, default: 3 },
});

const API = "https://itline-django-9s85.onrender.com/api";
const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().toISOString().slice(0, 7);

const selectedGroupId = ref(null);
const mode = ref("day"); // 'day' | 'month'
const date = ref(today);
const month = ref(thisMonth);

const dayRows = ref([]);
const monthDates = ref([]);
const monthRows = ref([]);
// {student_id: {present, late, absent}} — kunlik ko'rinishda oylik sanoq uchun
const monthCounts = ref({});
const loading = ref(false);
const savingId = ref(null);
// Coin tugmalari miqdori backenddan keladi (qotirib yozilmagan)
const coinActions = ref(null);

const STATUSES = [
  { key: "present", label: "Keldi", active: "bg-emerald-500 text-white" },
  { key: "late", label: "Kech", active: "bg-amber-400 text-white" },
  { key: "absent", label: "Kelmadi", active: "bg-rose-500 text-white" },
];
const cellStyle = { present: "bg-emerald-500", late: "bg-amber-400", absent: "bg-rose-500" };

const AVATARS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];
const initials = (name) =>
  (name || "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
const avatarClass = (id) => AVATARS[Math.abs(Number(id) || 0) % AVATARS.length];
const dayMonth = computed(() => date.value.slice(0, 7));

const dayStats = computed(() => ({
  present: dayRows.value.filter((r) => r.status === "present").length,
  late: dayRows.value.filter((r) => r.status === "late").length,
  absent: dayRows.value.filter((r) => r.status === "absent").length,
}));

const absentOf = (studentId) => monthCounts.value[studentId]?.absent ?? 0;

// ─── Yuklash ──────────────────────────────────────────────────
async function loadDay(silent = false) {
  if (!selectedGroupId.value) return;
  if (!silent) loading.value = true;
  try {
    const [dRes, mRes] = await Promise.all([
      fetch(`${API}/attendance/group-day/?group_id=${selectedGroupId.value}&date=${date.value}`),
      fetch(`${API}/attendance/group-month/?group_id=${selectedGroupId.value}&month=${dayMonth.value}`),
    ]);
    const dData = await dRes.json();
    if (dRes.ok) {
      dayRows.value = dData.students || [];
      if (dData.coin_actions) coinActions.value = dData.coin_actions;
    }
    const mData = await mRes.json();
    if (mRes.ok) {
      const map = {};
      for (const s of mData.students || []) {
        map[s.student_id] = { present: s.present, late: s.late, absent: s.absent };
      }
      monthCounts.value = map;
    }
  } catch (e) {
    console.error("group-day:", e);
  } finally {
    loading.value = false;
  }
}

async function loadMonth(silent = false) {
  if (!selectedGroupId.value) return;
  if (!silent) loading.value = true;
  try {
    const res = await fetch(
      `${API}/attendance/group-month/?group_id=${selectedGroupId.value}&month=${month.value}`,
    );
    const data = await res.json();
    if (res.ok) {
      monthDates.value = data.dates || [];
      monthRows.value = data.students || [];
    }
  } catch (e) {
    console.error("group-month:", e);
  } finally {
    loading.value = false;
  }
}

function reload(silent = false) {
  return mode.value === "day" ? loadDay(silent) : loadMonth(silent);
}

// ─── Belgilash ────────────────────────────────────────────────
async function setStatus(row, status) {
  if (!props.canMark) return;
  if (savingId.value === row.attendance_id || row.status === status) return;
  savingId.value = row.attendance_id;
  const prev = row.status;
  try {
    const res = await fetch(`${API}/attendance/update/${row.attendance_id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      row.status = status;
      // Oylik "kelmadi" sanog'ini darhol moslaymiz (poll ham tuzatadi)
      const c = monthCounts.value[row.student_id];
      if (c) {
        if (prev === "absent" && status !== "absent") c.absent = Math.max(0, c.absent - 1);
        else if (prev !== "absent" && status === "absent") c.absent += 1;
      }
    }
  } catch (e) {
    console.error("update attendance:", e);
  } finally {
    savingId.value = null;
  }
}

function goToDate(d) {
  date.value = d;
  mode.value = "day";
}

function recStatus(row, d) {
  const rec = (row.records || []).find((r) => r.date === d);
  return rec ? rec.status : null;
}

function fmtDay(d) {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
}

// ─── Real vaqt: ochiq ko'rinishni har 8s yangilaymiz ──────────
let timer = null;
function startPolling() {
  stopPolling();
  timer = setInterval(() => {
    if (document.visibilityState === "visible" && selectedGroupId.value) {
      reload(true);
    }
  }, 8000);
}
function stopPolling() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch([mode, date, month, selectedGroupId], () => reload());
watch(
  () => props.groups,
  (g) => {
    if (!g.some((x) => x.id === selectedGroupId.value)) {
      selectedGroupId.value = null;
      dayRows.value = [];
      monthRows.value = [];
      monthCounts.value = {};
    }
  },
);

onMounted(startPolling);
onBeforeUnmount(stopPolling);
</script>

<template>
  <div>
    <!-- Filtrlar: (manager'da ustoz slot orqali) + guruh — yonma-yon -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <slot name="filters" />
      <div class="w-full sm:w-64">
        <label class="block text-xs font-medium text-gray-400 mb-1.5">Guruh</label>
        <div class="relative">
          <select
            v-model="selectedGroupId"
            :disabled="!groups.length"
            class="w-full appearance-none border border-gray-200 bg-white rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-indigo-300 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option :value="null" disabled>
              {{ groups.length ? "Guruhni tanlang…" : "—" }}
            </option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <AppIcon
            name="chevron-down"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>
    </div>

    <template v-if="selectedGroupId">
      <!-- ══════════ Boshqaruv paneli (2 input: rejim + sana/oy) ══════════ -->
      <div class="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 mb-4 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <!-- Rejim segmenti -->
          <div class="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
            <button @click="mode = 'day'"
              :class="mode === 'day' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              class="flex-1 sm:flex-none px-4 py-1 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5">
              <AppIcon name="attendance" /> Kunlik
            </button>
            <button @click="mode = 'month'"
              :class="mode === 'month' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              class="flex-1 sm:flex-none px-4 py-1 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5">
              <AppIcon name="chart" /> Oylik
            </button>
          </div>

          <!-- Sana yoki oy -->
          <input v-if="mode === 'day'" type="date" v-model="date"
            class="w-full sm:w-auto border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300 transition" />
          <input v-else type="month" v-model="month"
            class="w-full sm:w-auto border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300 transition" />

          <span class="text-xs text-gray-400 flex items-center gap-1.5 sm:ml-auto">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real vaqtda
          </span>
        </div>
      </div>

      <div v-if="loading" class="text-center py-10 text-gray-400 text-sm">Yuklanmoqda...</div>

      <!-- ══════════ KUNLIK ══════════ -->
      <template v-else-if="mode === 'day'">
        <!-- Statistika -->
        <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div class="bg-emerald-50 rounded-xl p-3 text-center">
            <p class="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums">{{ dayStats.present }}</p>
            <p class="text-[11px] sm:text-xs text-emerald-500 mt-0.5">Keldi</p>
          </div>
          <div class="bg-amber-50 rounded-xl p-3 text-center">
            <p class="text-lg sm:text-xl font-bold text-amber-600 tabular-nums">{{ dayStats.late }}</p>
            <p class="text-[11px] sm:text-xs text-amber-500 mt-0.5">Kech</p>
          </div>
          <div class="bg-rose-50 rounded-xl p-3 text-center">
            <p class="text-lg sm:text-xl font-bold text-rose-600 tabular-nums">{{ dayStats.absent }}</p>
            <p class="text-[11px] sm:text-xs text-rose-400 mt-0.5">Kelmadi</p>
          </div>
        </div>

        <!-- O'quvchilar -->
        <div class="space-y-2">
          <div v-for="row in dayRows" :key="row.attendance_id"
            class="bg-white border border-gray-100 rounded-2xl p-3 sm:p-3.5 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  :class="avatarClass(row.student_id)">
                  {{ initials(row.name) }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                    <span class="truncate">{{ row.name }}</span>
                    <!-- Coin balansi ustozga doim ko'rinib tursin -->
                    <span v-if="typeof row.coin_balance === 'number'"
                      class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5 tabular-nums shrink-0">
                      <AppIcon name="coin" /> {{ row.coin_balance }}
                    </span>
                  </p>
                  <p class="text-xs mt-0.5 flex items-center gap-1">
                    <span
                      :class="absentOf(row.student_id) >= absentWarn ? 'text-rose-600 font-semibold' : 'text-gray-400'">
                      Bu oy: {{ absentOf(row.student_id) }} marta kelmagan
                    </span>
                  </p>
                </div>
              </div>

              <!-- Status segmenti -->
              <div class="flex gap-1 bg-gray-100 rounded-full p-1 shrink-0 w-full sm:w-auto">
                <button v-for="s in STATUSES" :key="s.key" @click="setStatus(row, s.key)"
                  :disabled="!canMark || savingId === row.attendance_id" :class="[
                    'flex-1 sm:flex-none px-3 py-1.5 rounded-full text-xs font-medium transition',
                    row.status === s.key ? s.active : 'text-gray-400 hover:text-gray-600',
                    savingId === row.attendance_id ? 'opacity-50 cursor-not-allowed' : '',
                  ]">
                  {{ s.label }}
                </button>
              </div>
            </div>

            <!-- Coin berish (imtihon / vazifa / oylik bonus) — davomat
                 belgilanayotgan joyning o'zida, alohida bo'limga o'tmasdan -->
            <div v-if="canGiveCoins" class="mt-2.5 pt-2.5 border-t border-gray-50">
              <CoinQuickGive :student-id="row.student_id" :student-name="row.name" :teacher-id="teacherId"
                :balance="typeof row.coin_balance === 'number' ? row.coin_balance : null"
                :bonus-used="!!row.bonus_used" :actions="coinActions"
                @given="row.coin_balance = $event" @bonus-used="row.bonus_used = true" />
            </div>
          </div>
          <p v-if="!dayRows.length" class="text-center py-8 text-gray-400 text-sm">
            Bu guruhda o'quvchi yo'q
          </p>
        </div>
      </template>

      <!-- ══════════ OYLIK ══════════ -->
      <template v-else>
        <div v-if="!monthDates.length"
          class="text-center py-10 text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
          Bu oyda dars belgilanmagan
        </div>
        <div v-else class="bg-white border border-gray-100 rounded-2xl  overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <!-- sticky ustun foni SHAFFOF bo'lmasligi kerak: tungi
                       rejimda bg-gray-50 shaffofga o'tadi va ostidan
                       surilayotgan sana ustunlari ko'rinib ketardi -->
                  <th class="px-3 py-3 font-medium sticky left-0 bg-gray-100 z-10">O'quvchi</th>
                  <th v-for="d in monthDates" :key="d" class="px-2 py-3 font-medium text-center whitespace-nowrap">
                    {{ fmtDay(d) }}
                  </th>
                  <th class="px-3 py-3 font-medium text-center whitespace-nowrap">Kelmagan</th>
                  <th class="px-3 py-3 font-medium text-center whitespace-nowrap">Coin</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in monthRows" :key="row.student_id"
                  class="border-t border-white/10 transition">
                  <td class="px-3 py-2.5 font-medium text-gray-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="avatarClass(row.student_id)">
                        {{ initials(row.name) }}
                      </div>
                      <span class="truncate max-w-[140px]">{{ row.name }}</span>
                    </div>
                  </td>
                  <td v-for="d in monthDates" :key="d" class="px-2 py-2.5 text-center">
                    <button @click="goToDate(d)" :title="d"
                      class="w-3.5 h-3.5 rounded-full inline-block align-middle hover:ring-2 transition"
                      :class="cellStyle[recStatus(row, d)] || 'bg-gray-200'"></button>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span
                      class="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
                      :class="row.absent >= absentWarn ? ' text-rose-600' : ' text-gray-500'">
                      {{ row.absent }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span
                      class="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 tabular-nums">
                      <AppIcon name="coin" /> {{ row.coin_balance ?? 0 }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            keldi</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> kech</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            kelmadi</span>
          <span class="text-gray-300">— kunni tahrirlash uchun nuqtaga bosing</span>
        </p>
      </template>
    </template>
    <p v-else class="text-sm text-gray-400 py-8 text-center">Davomat uchun guruhni tanlang</p>
  </div>
</template>
