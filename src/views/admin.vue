<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";

// ─── Constants ───────────────────────────────────────────────
const API = "https://itline-django-9s85.onrender.com/api";

// ─── Router & Auth ───────────────────────────────────────────
const router = useRouter();

const user = JSON.parse(localStorage.getItem("user") || "null");
if (!user) router.push("/login");
else if (!user.is_admin) router.push("/");

// ─── Standart parol eslatmasi ────────────────────────────────
const usingDefaultPassword = ref(
  localStorage.getItem("used_default_password") === "1",
);

// ─── State ───────────────────────────────────────────────────
const students = ref([]);
const payments = ref([]);
const leaders = ref([]);

const loadingStudents = ref(false);
const loadingPayments = ref(false);
const loadingLeaders = ref(false);

// O'quvchilar ro'yxati yig'ilgan holatda ochiladi
const studentlarim = ref(false);

// Reyting: o'z o'quvchilarim / barcha o'quvchilar
const leaderScope = ref("mine");

// Admin o'zining o'quvchilarini ko'radi
const myTeacherId = computed(() => user?.teacher_id ?? null);

// ─── Tezkor navigatsiya ──────────────────────────────────────
const quickNav = [
  { to: "/students", icon: "users", label: "O'quvchilar", color: "bg-indigo-500" },
  { to: "/Attendance", icon: "attendance", label: "Davomat", color: "bg-emerald-500" },
  { to: "/groups", icon: "groups", label: "Guruhlar", color: "bg-amber-500" },
];

// ─── Helpers ─────────────────────────────────────────────────
function formatMoney(value) {
  return Number(value || 0).toLocaleString("uz-UZ") + " so'm";
}

function getStudentPayment(studentId) {
  return payments.value.find((p) => p.student_id === studentId);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = "Xatolik yuz berdi";
    try {
      msg = JSON.parse(text)?.error ?? msg;
    } catch {
      /* plain text */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Fetch ───────────────────────────────────────────────────
async function fetchStudents(teacherId) {
  if (!teacherId) {
    students.value = [];
    return;
  }
  loadingStudents.value = true;
  try {
    students.value = await apiFetch(`/students/?teacher_id=${teacherId}`);
  } catch (e) {
    alert(e.message);
  } finally {
    loadingStudents.value = false;
  }
}

async function fetchPayments(teacherId) {
  loadingPayments.value = true;
  try {
    payments.value = await apiFetch(`/payments/?teacher_id=${teacherId}`);
  } catch (e) {
    alert(e.message);
  } finally {
    loadingPayments.value = false;
  }
}

// ─── Student Actions ─────────────────────────────────────────

async function updateSchedule(student, schedule) {
  try {
    await apiFetch(`/students/update/${student.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ schedule }),
    });
    student.schedule = schedule;
  } catch (e) {
    alert(e.message);
  }
}

// ─── Mount ───────────────────────────────────────────────────
// ─── Reyting (leaderboard) ───────────────────────────────────
async function fetchLeaders() {
  loadingLeaders.value = true;
  try {
    const q =
      leaderScope.value === "mine" && myTeacherId.value
        ? `?teacher_id=${myTeacherId.value}`
        : "";
    leaders.value = await apiFetch(`/leaderboard/${q}`);
  } catch (e) {
    console.error("Leaderboard error:", e);
    leaders.value = [];
  } finally {
    loadingLeaders.value = false;
  }
}

function setLeaderScope(scope) {
  if (leaderScope.value === scope) return;
  leaderScope.value = scope;
  fetchLeaders();
}

// Top 3 uchun medal, qolganlar uchun oddiy raqam
function rankBadge(rank) {
  return rank <= 3;   // top 3 ga medal ikonkasi
}

onMounted(async () => {
  if (!myTeacherId.value) return;
  await Promise.all([
    fetchStudents(myTeacherId.value),
    fetchPayments(myTeacherId.value),
    fetchLeaders(),
  ]);
});

function open_students() {
  studentlarim.value = !studentlarim.value;
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4">
    <!-- HEADER -->
    <div class="flex justify-between items-center mb-8 pt-4">
      <div>
        <h1 class="text-2xl font-medium">Admin panel</h1>
        <p class="text-gray-400 text-sm mt-1">
          Xush kelibsiz, {{ user.name }}!
        </p>
      </div>
      <button
        @click="$router.push('/profile')"
        class="px-4 py-2 rounded-full text-sm border border-gray-200 hover:bg-gray-50"
      >
        <AppIcon name="settings" /> Profil
      </button>
    </div>

    <!-- Default parol ogohlantirishi -->
    <div
      v-if="usingDefaultPassword"
      class="mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3"
    >
      <span class="text-amber-500 shrink-0"><AppIcon name="warning" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-amber-800">
          Siz hali standart parolda ishlayapsiz
        </p>
        <p class="text-xs text-amber-600 mt-0.5">
          Bu parol barcha ustozlarda bir xil. Xavfsizlik uchun o'zingizniki
          bilan almashtiring.
        </p>
      </div>
      <button
        @click="$router.push('/profile')"
        class="px-3 py-1.5 rounded-full text-xs bg-amber-500 text-white hover:bg-amber-600 transition shrink-0"
      >
        O'zgartirish
      </button>
    </div>

    <!-- QUICK NAV -->
    <div class="grid grid-cols-3 gap-3 mb-8">
      <button
        v-for="item in quickNav"
        :key="item.to"
        @click="$router.push(item.to)"
        class="flex flex-col items-center gap-2 p-4 sm:p-5 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-gray-200 transition text-center"
      >
        <span
          class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
          :class="item.color"
        >
          <AppIcon :name="item.icon" />
        </span>
        <span class="text-xs sm:text-sm font-medium text-gray-700">{{ item.label }}</span>
      </button>
    </div>

    <!-- STUDENTS -->
    <div class="rounded-2xl p-4 sm:p-6">
      <button
        @click="open_students()"
        class="w-full flex items-center gap-2 mb-4 font-medium text-left"
      >
        <span>Mening o'quvchilarim ({{ students.length }})</span>
        <AppIcon name="chevron-down" class="w-4 h-4 shrink-0 text-gray-400 transition-transform" />
      </button>

      <div
        v-if="loadingStudents"
        class="text-center py-4 text-gray-400 text-sm"
      >
        Yuklanmoqda...
      </div>

      <!-- v-if va v-for bitta elementda bo'lmasligi uchun template ichida -->
      <template v-else-if="studentlarim">
      <div
        v-for="s in students"
        :key="s.id"
        class="flex flex-wrap gap-2 justify-between items-center p-3 rounded mb-2"
      >
        <div>
          <p class="font-medium">{{ s.name }} {{ s.surname }}</p>
          <p class="text-xs text-gray-400">{{ s.phone }}</p>
          <div
            v-if="getStudentPayment(s.id)"
            class="mt-2 flex flex-wrap items-center gap-2"
          >
            <span
              :class="
                getStudentPayment(s.id).is_paid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              "
              class="text-xs px-2 py-1 rounded-full"
            >
              {{
                getStudentPayment(s.id).is_paid ? "To‘langan" : "To‘lanmagan"
              }}
            </span>
            <span class="text-xs text-gray-500">
              {{ formatMoney(getStudentPayment(s.id).amount_due) }}
            </span>
          </div>
        </div>
      </div>
      </template>
    </div>

    <!-- ══════════ REYTING ══════════ -->
    <div
      class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 mt-6 mb-8"
    >
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br from-amber-400 to-orange-500"
          >
            <AppIcon name="trophy" />
          </div>
          <div>
            <h2 class="font-medium">Reyting</h2>
            <p class="text-xs text-gray-400">Coin bo'yicha eng faollar</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="setLeaderScope('mine')"
            :class="[
              'px-3 py-1.5 rounded-full text-xs sm:text-sm border transition',
              leaderScope === 'mine'
                ? 'bg-black text-white border-black'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50',
            ]"
          >
            <AppIcon name="user" /> Mening o'quvchilarim
          </button>
          <button
            @click="setLeaderScope('all')"
            :class="[
              'px-3 py-1.5 rounded-full text-xs sm:text-sm border transition',
              leaderScope === 'all'
                ? 'bg-black text-white border-black'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50',
            ]"
          >
            <AppIcon name="globe" /> Barchasi
          </button>
        </div>
      </div>

      <div v-if="loadingLeaders" class="text-center py-8 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>

      <div
        v-else-if="leaders.length === 0"
        class="text-center py-8 text-gray-400 text-sm"
      >
        <p class="text-3xl mb-2"><AppIcon name="trophy" /></p>
        <p>Hozircha coin to'plagan o'quvchi yo'q</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="l in leaders.slice(0, 20)"
          :key="l.id"
          class="flex items-center gap-3 py-2.5"
        >
          <!-- O'rin -->
          <span
            v-if="rankBadge(l.rank)"
            class="w-8 text-center text-lg shrink-0"
            :class="{
              'text-amber-400': l.rank === 1,
              'text-slate-400': l.rank === 2,
              'text-orange-400': l.rank === 3,
            }"
            ><AppIcon name="medal"
          /></span>
          <span
            v-else
            class="w-8 text-center text-xs text-gray-400 tabular-nums shrink-0"
            >{{ l.rank }}</span
          >

          <!-- Ism -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">
              {{ l.name }} {{ l.surname }}
            </p>
            <p
              v-if="leaderScope === 'all' && l.teacher_name"
              class="text-xs text-gray-400 truncate"
            >
              {{ l.teacher_name }}
            </p>
          </div>

          <!-- Coin -->
          <span
            class="text-sm font-semibold tabular-nums shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"
          >
            <AppIcon name="coin" /> {{ l.coin_balance }}
          </span>
        </div>
      </div>

      <p
        v-if="leaders.length > 20"
        class="text-xs text-gray-400 text-center mt-3"
      >
        Yuqoridagi 20 tasi ko'rsatilmoqda ({{ leaders.length }} tadan)
      </p>
    </div>
  </div>
</template>
