<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import AppIcon from "@/components/AppIcon.vue";

/**
 * Soddalashtirilgan davomat: guruh tanla → sana (yoki oy) → belgila.
 * Qo'lda "dars yaratish" yo'q — backend guruh+sana bo'yicha darsni o'zi ochadi.
 * Teacher (o'z guruhlari) va manager (tanlangan ustoz guruhlari) ishlatadi.
 * Real vaqt uchun ochiq turgan ko'rinish har 8 soniyada yangilanadi (polling).
 */
const props = defineProps({
  groups: { type: Array, default: () => [] },
  // Belgilash mumkinmi (teacher/manager — ha; kelajakda faqat ko'rish uchun false)
  canMark: { type: Boolean, default: true },
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
const loading = ref(false);
const savingId = ref(null);

const STATUSES = ["present", "late", "absent"];
const statusLabel = { present: "Keldi", late: "Kech", absent: "Kelmadi" };
const statusStyle = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-600",
};
const cellStyle = {
  present: "bg-green-500",
  late: "bg-yellow-400",
  absent: "bg-red-500",
};

const selectedGroup = computed(
  () => props.groups.find((g) => g.id === selectedGroupId.value) || null,
);

const dayStats = computed(() => ({
  present: dayRows.value.filter((r) => r.status === "present").length,
  late: dayRows.value.filter((r) => r.status === "late").length,
  absent: dayRows.value.filter((r) => r.status === "absent").length,
}));

// ─── Yuklash ──────────────────────────────────────────────────
async function loadDay(silent = false) {
  if (!selectedGroupId.value) return;
  if (!silent) loading.value = true;
  try {
    const res = await fetch(
      `${API}/attendance/group-day/?group_id=${selectedGroupId.value}&date=${date.value}`,
    );
    const data = await res.json();
    if (res.ok) dayRows.value = data.students || [];
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
  try {
    const res = await fetch(`${API}/attendance/update/${row.attendance_id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) row.status = status;
  } catch (e) {
    console.error("update attendance:", e);
  } finally {
    savingId.value = null;
  }
}

// Oy ko'rinishida bir katakka bosilsa — o'sha kunni tahrirlashga o'tadi
function goToDate(d) {
  date.value = d;
  mode.value = "day";
}

function selectGroup(id) {
  selectedGroupId.value = id;
  reload();
}

// Oylik jadvalda o'quvchining ma'lum kundagi statusini topadi
function recStatus(row, d) {
  const rec = (row.records || []).find((r) => r.date === d);
  return rec ? rec.status : null;
}

// ─── Real vaqt: ochiq ko'rinishni har 8s yangilaymiz ──────────
let timer = null;
function startPolling() {
  stopPolling();
  timer = setInterval(() => {
    if (document.visibilityState === "visible" && selectedGroupId.value) {
      reload(true); // silent — spinner ko'rsatmaydi
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
    // Ustoz almashtirilganda tanlovni tozalaymiz
    if (!g.some((x) => x.id === selectedGroupId.value)) {
      selectedGroupId.value = null;
      dayRows.value = [];
      monthRows.value = [];
    }
  },
);

onMounted(startPolling);
onBeforeUnmount(stopPolling);
</script>

<template>
  <div>
    <!-- Guruhlar -->
    <div v-if="groups.length" class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="g in groups"
        :key="g.id"
        @click="selectGroup(g.id)"
        :class="[
          'px-3.5 py-1.5 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5',
          selectedGroupId === g.id
            ? 'bg-gray-900 text-white border-gray-900'
            : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50',
        ]"
      >
        <AppIcon name="groups" /> {{ g.name }}
      </button>
    </div>
    <p v-else class="text-sm text-gray-400 py-6 text-center">Guruh yo'q</p>

    <template v-if="selectedGroupId">
      <!-- Rejim + sana/oy -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <div class="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          <button
            @click="mode = 'day'"
            :class="mode === 'day' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'"
            class="px-4 py-2 transition"
          >
            Kunlik
          </button>
          <button
            @click="mode = 'month'"
            :class="mode === 'month' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'"
            class="px-4 py-2 border-l border-gray-200 transition"
          >
            Oylik
          </button>
        </div>

        <input
          v-if="mode === 'day'"
          type="date"
          v-model="date"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
        <input
          v-else
          type="month"
          v-model="month"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400"
        />

        <span class="text-xs text-gray-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Real vaqtda
        </span>
      </div>

      <div v-if="loading" class="text-center py-10 text-gray-400 text-sm">Yuklanmoqda...</div>

      <!-- ══════════ KUNLIK ══════════ -->
      <template v-else-if="mode === 'day'">
        <div class="flex gap-2 text-xs mb-3">
          <span class="px-3 py-1 rounded-full bg-green-100 text-green-700">Keldi: {{ dayStats.present }}</span>
          <span class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Kech: {{ dayStats.late }}</span>
          <span class="px-3 py-1 rounded-full bg-red-100 text-red-600">Kelmadi: {{ dayStats.absent }}</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="row in dayRows"
            :key="row.attendance_id"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100 rounded-xl px-4 py-3"
          >
            <p class="text-sm font-medium truncate">{{ row.name }}</p>
            <div class="flex gap-1.5 shrink-0">
              <button
                v-for="s in STATUSES"
                :key="s"
                @click="setStatus(row, s)"
                :disabled="!canMark || savingId === row.attendance_id"
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium transition',
                  row.status === s ? statusStyle[s] : 'border border-gray-200 text-gray-400 hover:bg-gray-50',
                  savingId === row.attendance_id ? 'opacity-50 cursor-not-allowed' : '',
                ]"
              >
                {{ statusLabel[s] }}
              </button>
            </div>
          </div>
          <p v-if="!dayRows.length" class="text-center py-6 text-gray-400 text-sm">
            Bu guruhda o'quvchi yo'q
          </p>
        </div>
      </template>

      <!-- ══════════ OYLIK ══════════ -->
      <template v-else>
        <div v-if="!monthDates.length" class="text-center py-8 text-gray-400 text-sm">
          Bu oyda dars belgilanmagan
        </div>
        <div v-else class="overflow-x-auto border border-gray-100 rounded-2xl">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th class="px-3 py-2.5 font-medium sticky left-0 bg-gray-50">O'quvchi</th>
                <th v-for="d in monthDates" :key="d" class="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                  {{ d.slice(8, 10) }}.{{ d.slice(5, 7) }}
                </th>
                <th class="px-3 py-2.5 font-medium text-center">Jami</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in monthRows" :key="row.student_id" class="border-t border-gray-50">
                <td class="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white whitespace-nowrap">
                  {{ row.name }}
                </td>
                <td v-for="d in monthDates" :key="d" class="px-2 py-2 text-center">
                  <button
                    @click="goToDate(d)"
                    :title="d"
                    class="w-4 h-4 rounded-full inline-block align-middle hover:ring-2 hover:ring-gray-300 transition"
                    :class="cellStyle[recStatus(row, d)] || 'bg-gray-200'"
                  ></button>
                </td>
                <td class="px-3 py-2 text-center text-xs whitespace-nowrap">
                  <span class="text-green-600 font-semibold">{{ row.present }}</span>
                  /
                  <span class="text-yellow-600 font-semibold">{{ row.late }}</span>
                  /
                  <span class="text-red-600 font-semibold">{{ row.absent }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-gray-400 mt-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-green-500 align-middle"></span> keldi
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 align-middle ml-2"></span> kech
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 align-middle ml-2"></span> kelmadi
          — kunni tahrirlash uchun nuqtaga bosing
        </p>
      </template>
    </template>
    <p v-else class="text-sm text-gray-400 py-8 text-center">Davomat uchun guruhni tanlang</p>
  </div>
</template>
