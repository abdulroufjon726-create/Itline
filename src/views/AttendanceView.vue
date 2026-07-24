<script setup>
import { ref, onMounted, computed } from "vue";
import AppIcon from "@/components/AppIcon.vue";

const API = "https://itline-django-9s85.onrender.com/api";

// ─── Auth ─────────────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem("user") || "null");

// ─── Constants ────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const ODD_DAYS = new Set([1, 3, 5]);
const EVEN_DAYS = new Set([2, 4, 6]);

const scheduleLabel = { odd: "Du / Chor / Juma", even: "Se / Pay / Shan", daily: "Har kuni" };
const statusStyle = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-600",
};
const statusLabel = { present: "Keldi", late: "Kech", absent: "Kelmadi" };

// ─── State ────────────────────────────────────────────────────
const lessons = ref([]);
const attendances = ref([]);
const groups = ref([]);
const selectedLesson = ref(null);
const loadingLessons = ref(true);
const loadingAttendance = ref(false);
const savingId = ref(null);
const absenceMap = ref({});
const absenceCache = ref({});
const selectedGroupId = ref(null);
const showCreateLesson = ref(false);
const newLesson = ref({ title: "", date: today, group_id: null });

// ─── Helpers ──────────────────────────────────────────────────
function getScheduleForDate(dateStr) {
  const wd = new Date(dateStr).getDay();
  if (ODD_DAYS.has(wd)) return "odd";
  if (EVEN_DAYS.has(wd)) return "even";
  return null;
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "/login";
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* HTML error page */ }
  return { ok: res.ok, status: res.status, data };
}

// ─── Fetch: Darslar ───────────────────────────────────────────
async function fetchLessons() {
  if (!user?.teacher_id) { loadingLessons.value = false; return; }
  loadingLessons.value = true;
  try {
    const res = await fetch(`${API}/lessons/?teacher_id=${user.teacher_id}`);
    lessons.value = await res.json();
    const todayLesson = lessons.value.find((l) => l.date === today);
    if (todayLesson) await selectLesson(todayLesson);
  } catch (e) {
    console.error("Darslar yuklanmadi:", e);
  } finally {
    loadingLessons.value = false;
  }
}

// ─── Fetch: Guruhlar ──────────────────────────────────────────
async function fetchGroups() {
  try {
    const res = await fetch(`${API}/groups/`);
    const all = await res.json();
    groups.value = all.filter((g) => g.teacher === user.teacher_id);
  } catch (e) {
    console.error("Guruhlar yuklanmadi:", e);
  }
}

// ─── Fetch: Oylik davomat (cache bilan) ───────────────────────
async function fetchMonthlyAbsences(studentIds) {
  const uncached = studentIds.filter(
    (id) => absenceCache.value[`${id}_${currentMonth}`] === undefined,
  );

  if (uncached.length > 0) {
    await Promise.all(
      uncached.map(async (id) => {
        try {
          const { data } = await apiFetch(
            `/student-attendance/${id}/?month=${currentMonth}`,
          );
          absenceCache.value[`${id}_${currentMonth}`] = Array.isArray(data)
            ? data.filter((a) => a.status === "absent").length
            : 0;
        } catch {
          absenceCache.value[`${id}_${currentMonth}`] = 0;
        }
      }),
    );
  }

  const map = {};
  for (const id of studentIds) {
    map[id] = absenceCache.value[`${id}_${currentMonth}`] ?? 0;
  }
  absenceMap.value = map;
}

// ─── Darsni tanlash ───────────────────────────────────────────
async function selectLesson(lesson) {
  selectedLesson.value = lesson;
  loadingAttendance.value = true;
  try {
    const { ok, data } = await apiFetch(`/attendance/${lesson.id}/`);
    if (!ok || !Array.isArray(data)) return;
    attendances.value = data;
    const ids = data.map((a) => a.student_id);
    if (ids.length) await fetchMonthlyAbsences(ids);
  } catch (e) {
    console.error("Davomat yuklanmadi:", e);
  } finally {
    loadingAttendance.value = false;
  }
}

// ─── Dars yaratish ────────────────────────────────────────────
async function createLesson() {
  if (!newLesson.value.title || !newLesson.value.date) return;
  try {
    const res = await fetch(`${API}/lessons/create/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newLesson.value.title,
        date: newLesson.value.date,
        teacher_id: user.teacher_id,
        group_id: newLesson.value.group_id || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const createdGroupId = newLesson.value.group_id;
      newLesson.value = { title: "", date: today, group_id: null };
      showCreateLesson.value = false;
      await fetchLessons();
      const created = lessons.value.find((l) => l.id === data.id);
      if (created) {
        await selectLesson(created);
        if (createdGroupId) selectedGroupId.value = createdGroupId;
      }
    } else {
      alert(data.error || "Xatolik");
    }
  } catch (e) {
    console.error("Dars yaratilmadi:", e);
  }
}

// ─── Davomat statusini yangilash ──────────────────────────────
async function setStatus(att, newStatus) {
  const attId = Number(att.id);
  if (savingId.value === attId || att.status === newStatus) return;
  savingId.value = attId;
  const prev = att.status;
  try {
    const res = await fetch(`${API}/attendance/update/${attId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Status yangilanmadi:", res.status, errText);
      return;
    }

    // Reaktivlik uchun indeks orqali yangilaymiz
    const idx = attendances.value.findIndex((a) => Number(a.id) === attId);
    if (idx !== -1) attendances.value[idx] = { ...attendances.value[idx], status: newStatus };

    const sid = att.student_id;
    const cacheKey = `${sid}_${currentMonth}`;
    if (prev === "absent" && newStatus !== "absent") {
      const v = Math.max(0, (absenceMap.value[sid] || 0) - 1);
      absenceMap.value[sid] = absenceCache.value[cacheKey] = v;
    } else if (prev !== "absent" && newStatus === "absent") {
      const v = (absenceMap.value[sid] || 0) + 1;
      absenceMap.value[sid] = absenceCache.value[cacheKey] = v;
    }
  } catch (e) {
    console.error("Status yangilanmadi:", e);
  } finally {
    savingId.value = null;
  }
}

// ─── Computed ─────────────────────────────────────────────────
const selectedSchedule = computed(() =>
  selectedLesson.value ? getScheduleForDate(selectedLesson.value.date) : null,
);

const selectedGroupStudentIds = computed(() => {
  if (!selectedGroupId.value) return null;
  const group = groups.value.find((g) => g.id === selectedGroupId.value);
  return group ? new Set(group.students?.map((s) => s.id ?? s) || []) : null;
});

const filteredAttendances = computed(() =>
  selectedGroupStudentIds.value
    ? attendances.value.filter((a) => selectedGroupStudentIds.value.has(a.student_id))
    : attendances.value,
);

const presentCount = computed(
  () => filteredAttendances.value.filter((a) => a.status === "present").length,
);
const lateCount = computed(
  () => filteredAttendances.value.filter((a) => a.status === "late").length,
);
const absentCount = computed(
  () => filteredAttendances.value.filter((a) => a.status === "absent").length,
);

function groupAttendanceCount(group) {
  const ids = new Set(group.students?.map((s) => s.id ?? s) || []);
  return attendances.value.filter((a) => ids.has(a.student_id)).length;
}

// ─── Mount ────────────────────────────────────────────────────
onMounted(() => {
  fetchLessons();
  fetchGroups();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-5xl mx-auto px-4 py-6">
      <!-- Header -->
      <div class="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 class="text-xl font-semibold">Davomat</h1>
          <p class="text-sm text-gray-400">{{ user?.name }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="$router.push('/admin')"
            class="px-4 py-2 rounded-full border border-gray-200 text-sm bg-white hover:bg-gray-50 transition">
            <AppIcon name="arrow-left" /> Admin
          </button>
          <button @click="logout"
            class="px-4 py-2 rounded-full border border-gray-200 text-sm bg-white hover:bg-gray-50 transition">
            Chiqish
          </button>
        </div>
      </div>

      <div v-if="!user?.teacher_id" class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
        <p class="text-sm font-medium text-yellow-700 mb-1">Davomat teacher uchun</p>
        <p class="text-xs text-yellow-500">
          Admin akkauntida teacher_id yo'q — davomat ko'rish uchun teacher akkauntiga kiring
        </p>
      </div>

      <div v-else class="flex flex-col lg:grid lg:grid-cols-3 gap-4">
        <!-- Darslar paneli -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <div class="flex justify-between items-center mb-3">
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Darslar</h2>
              <button @click="showCreateLesson = !showCreateLesson"
                class="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition">
                + Dars
              </button>
            </div>

            <!-- Yangi dars formasi -->
            <div v-if="showCreateLesson" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
              <input v-model="newLesson.title" placeholder="Dars nomi"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              <input type="date" v-model="newLesson.date"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              <select v-model.number="newLesson.group_id"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white">
                <option :value="null"><AppIcon name="groups" /> Guruh tanlang (ixtiyoriy)</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">
                  {{ g.name }}<template v-if="g.teacher"> — {{ g.teacher.name }}</template>
                </option>
              </select>
              <p v-if="newLesson.date" class="text-xs text-gray-400 px-1">
                Bu kun:
                <span class="font-medium text-gray-600">
                  {{ scheduleLabel[getScheduleForDate(newLesson.date)] || "Dam olish kuni" }}
                </span>
                guruhi
              </p>
              <button @click="createLesson"
                class="w-full bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700 transition">
                Yaratish
              </button>
            </div>

            <!-- Darslar ro'yxati -->
            <div v-if="loadingLessons" class="text-center py-6 text-gray-400 text-sm">
              Yuklanmoqda...
            </div>
            <div v-else class="space-y-1.5 max-h-[40vh] lg:max-h-[60vh] overflow-y-auto">
              <div v-for="lesson in lessons" :key="lesson.id" @click="selectLesson(lesson)" :class="[
                'px-3 py-2.5 rounded-xl cursor-pointer transition text-sm',
                selectedLesson?.id === lesson.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-100 hover:bg-gray-50',
              ]">
                <p class="font-medium">{{ lesson.title }}</p>
                <p :class="selectedLesson?.id === lesson.id ? 'text-gray-300' : 'text-gray-400'"
                  class="text-xs mt-0.5 flex gap-2">
                  <span>{{ lesson.date }}</span>
                  <span v-if="lesson.date === today" class="text-green-400">Bugun</span>
                </p>
              </div>
              <p v-if="lessons.length === 0" class="text-center py-4 text-gray-400 text-sm">
                Hozircha dars yo'q
              </p>
            </div>
          </div>
        </div>

        <!-- Davomat paneli -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <div v-if="!selectedLesson"
              class="flex items-center justify-center h-32 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              Darsni tanlang
            </div>

            <div v-else>
              <!-- Dars sarlavhasi + statistika -->
              <div class="flex flex-wrap gap-3 justify-between items-start mb-4">
                <div>
                  <h2 class="font-semibold">{{ selectedLesson.title }}</h2>
                  <p class="text-sm text-gray-400 mt-0.5">
                    {{ selectedLesson.date }}
                    <span v-if="selectedSchedule"
                      class="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {{ scheduleLabel[selectedSchedule] }}
                    </span>
                  </p>
                </div>
                <div class="flex gap-2 text-xs">
                  <span class="px-3 py-1 rounded-full bg-green-100 text-green-700"><AppIcon name="check" /> {{ presentCount }}</span>
                  <span class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700"><AppIcon name="clock" /> {{ lateCount }}</span>
                  <span class="px-3 py-1 rounded-full bg-red-100 text-red-600"><AppIcon name="x" /> {{ absentCount }}</span>
                </div>
              </div>

              <!-- Guruh filter -->
              <div v-if="groups.length > 0" class="flex gap-2 flex-wrap mb-4">
                <button @click="selectedGroupId = null" :class="[
                  'px-3 py-1.5 rounded-full text-xs border transition',
                  selectedGroupId === null
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50',
                ]">
                  Barchasi ({{ attendances.length }})
                </button>
                <button v-for="g in groups" :key="g.id" @click="selectedGroupId = g.id" :class="[
                  'px-3 py-1.5 rounded-full text-xs border transition',
                  selectedGroupId === g.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50',
                ]">
                  <AppIcon name="groups" /> {{ g.name }}
                  <span class="opacity-60 ml-0.5">({{ groupAttendanceCount(g) }})</span>
                </button>
              </div>

              <!-- Davomat ro'yxati -->
              <div v-if="loadingAttendance" class="text-center py-8 text-gray-400">
                Yuklanmoqda...
              </div>
              <div v-else class="space-y-2">
                <div v-for="att in filteredAttendances" :key="att.id"
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100 rounded-xl px-4 py-3">
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ att.student_name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">
                      Bu oy:
                      <span :class="(absenceMap[att.student_id] || 0) >= 3
                        ? 'text-red-500 font-semibold'
                        : 'text-gray-500'">
                        {{ absenceMap[att.student_id] || 0 }} kun kelmagan
                      </span>
                    </p>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button v-for="status in ['present', 'late', 'absent']" :key="status"
                      @click="setStatus(att, status)" :disabled="savingId === att.id" :class="[
                        'px-3 py-1 rounded-full text-xs font-medium transition',
                        att.status === status
                          ? statusStyle[status]
                          : 'border border-gray-200 text-gray-400 hover:bg-gray-50',
                        savingId === att.id ? 'opacity-50 cursor-not-allowed' : '',
                      ]">
                      {{ statusLabel[status] }}
                    </button>
                  </div>
                </div>
                <p v-if="filteredAttendances.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  Bu guruhda davomat yo'q
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>