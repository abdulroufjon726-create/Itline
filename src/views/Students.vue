<script setup>
import Leaderboard from "@/components/Leaderboard.vue";
import Magazine from "./Magazine.vue";
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import LessonsPlans from "./LessonsPlans.vue";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();
const API = "https://itline-django-9s85.onrender.com/api";
const user = JSON.parse(localStorage.getItem("user") || "{}");
if (!user?.id) router.push("/login");

const QUICK_ACTIONS = [
  { reason: "exam_pass", label: "Imtihon", amount: +80, icon: "check-circle" },
  { reason: "homework_done", label: "Vazifa to'liq", amount: +20, icon: "course" },
  {
    reason: "homework_partial",
    label: "Vazifa chala",
    amount: +10,
    icon: "course",
  },
  { reason: "homework_missed", label: "Vazifa yo'q", amount: -20, icon: "x-circle" },
];

const AVATAR_COLORS = [
  { backgroundColor: "#EEEDFE", color: "#3C3489" },
  { backgroundColor: "#E1F5EE", color: "#085041" },
  { backgroundColor: "#FAECE7", color: "#712B13" },
  { backgroundColor: "#E6F1FB", color: "#0C447C" },
  { backgroundColor: "#FAEEDA", color: "#633806" },
];

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

// ─── State ────────────────────────────────────────────────────
const students = ref([]);
const payments = ref([]);
const groups = ref([]);
const myGroup = ref(null);
const activeTab = ref("students");
const selectedGroupId = ref(null);
const expandedStudentId = ref(null);
const givingCoin = ref({});
const manualAmount = ref({});
const bonusUsed = ref({});
const actionFeedback = ref({});
const loadingStudents = ref(true);
const loadingPayments = ref(true);

// ─── Davomat (o'quvchi o'zining) ───
const attMonth = ref(new Date().toISOString().slice(0, 7));
const attendance = ref([]);
const loadingAtt = ref(false);

// ─── Leaderboard ko'lami: 'group' yoki 'center' ───
const leaderScope = ref("group");

async function fetchAttendance() {
  if (user.is_admin || !user.id) return;
  loadingAtt.value = true;
  try {
    const res = await fetch(
      `${API}/student-attendance/${user.id}/?month=${attMonth.value}`,
    );
    attendance.value = res.ok ? await res.json() : [];
  } catch (e) {
    attendance.value = [];
  } finally {
    loadingAtt.value = false;
  }
}
watch(attMonth, fetchAttendance);

const ATT_LABEL = {
  present: "Keldi",
  late: "Kech keldi",
  absent: "Kelmadi",
};
const ATT_STYLE = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-rose-50 text-rose-600",
};

const attStats = computed(() => {
  const total = attendance.value.length;
  const came = attendance.value.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  return { total, came, missed: total - came };
});

// ─── Fetch ────────────────────────────────────────────────────
async function fetchStudents() {
  loadingStudents.value = true;
  try {
    const res = await fetch(`${API}/students/?teacher_id=${user.teacher_id}`);
    const d = await res.json();
    students.value = Array.isArray(d) ? d : [];
  } catch (e) {
    console.error(e);
    students.value = [];
  } finally {
    loadingStudents.value = false;
  }
}

async function fetchPayments() {
  loadingPayments.value = true;
  try {
    const res = await fetch(`${API}/payments/${user.id}/`);
    payments.value = await res.json();
  } catch (e) {
    console.error(e);
  } finally {
    loadingPayments.value = false;
  }
}

async function fetchGroups() {
  try {
    const res = await fetch(`${API}/groups/`);
    const all = await res.json();
    groups.value = all.filter((g) => g.teacher === user.teacher_id || g.teacher?.id === user.teacher_id);
    if (!user.is_admin && user.id) {
      myGroup.value =
        all.find((g) => g.students?.some((s) => s.phone === user.phone)) ||
        null;
    }
  } catch (e) {
    console.error(e);
  }
}

async function fetchBonusStatuses() {
  if (!user.is_admin || !students.value.length) return;
  const month = new Date().toISOString().slice(0, 7);
  await Promise.all(
    students.value.map(async (s) => {
      try {
        const res = await fetch(`${API}/coins/transactions/${s.id}/`);
        const txns = await res.json();
        bonusUsed.value[s.id] = txns.some(
          (t) => t.reason === "manual" && t.created_at?.slice(0, 7) === month,
        );
      } catch {
        bonusUsed.value[s.id] = false;
      }
    }),
  );
}

onMounted(async () => {
  // Fetch students and groups, then ensure groups have `students` arrays
  await Promise.all([fetchStudents(), fetchPayments(), fetchGroups()]);
  // If groups from backend don't include students list, populate from students we fetched
  if (students.value.length && groups.value.length) {
    groups.value = groups.value.map((g) => ({
      ...g,
      students: g.students?.length
        ? g.students
        : students.value.filter((s) => s.group === g.id || s.group_id === g.id),
    }));
  }
  fetchBonusStatuses();
  fetchAttendance();
});

// ─── Coin actions ─────────────────────────────────────────────
function togglePanel(id) {
  expandedStudentId.value = expandedStudentId.value === id ? null : id;
}

function showFeedback(id, type, text) {
  actionFeedback.value[id] = { type, text };
  setTimeout(() => {
    delete actionFeedback.value[id];
  }, 3000);
}

async function giveCoin(studentId, reason) {
  if (givingCoin.value[studentId]) return;
  givingCoin.value[studentId] = true;
  try {
    const res = await fetch(`${API}/coins/give/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        teacher_id: user.teacher_id,
        reason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(studentId, "error", data.error || "Xatolik");
      return;
    }
    const s = students.value.find((st) => st.id === studentId);
    if (s) s.coin_balance = data.coin_balance;
    showFeedback(studentId, "success", "Coin berildi");
  } catch {
    showFeedback(studentId, "error", "Server xatoligi");
  } finally {
    givingCoin.value[studentId] = false;
  }
}

async function giveManualBonus(studentId) {
  if (bonusUsed.value[studentId] || givingCoin.value[studentId]) return;
  const amount = manualAmount.value[studentId];
  if (!amount) return;
  givingCoin.value[studentId] = true;
  try {
    const res = await fetch(`${API}/coins/give/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        teacher_id: user.teacher_id,
        reason: "manual",
        amount,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(studentId, "error", data.error || "Xatolik");
      return;
    }
    const s = students.value.find((st) => st.id === studentId);
    if (s) s.coin_balance = data.coin_balance;
    bonusUsed.value[studentId] = true;
    manualAmount.value[studentId] = null;
    showFeedback(studentId, "success", "Oylik bonus berildi");
  } catch {
    showFeedback(studentId, "error", "Server xatoligi");
  } finally {
    givingCoin.value[studentId] = false;
  }
}

// ─── Computed ─────────────────────────────────────────────────

// O'quvchining o'z guruhidagi a'zolar id'lari
const myGroupMemberIds = computed(() => {
  const set = new Set();
  (myGroup.value?.students || []).forEach((s) => set.add(s.id ?? s));
  return set;
});

// O'z guruhi a'zolari (coin/etap bilan) — students ro'yxatidan olinadi
const myGroupStudents = computed(() =>
  students.value.filter((s) => myGroupMemberIds.value.has(s.id)),
);

const filteredStudents = computed(() => {
  // Oddiy o'quvchi — faqat o'z guruhi a'zolarini ko'radi
  if (!user.is_admin) {
    return myGroup.value ? myGroupStudents.value : [];
  }
  // Admin/ustoz — guruh filtri bo'yicha
  if (!selectedGroupId.value) return students.value;
  const group = groups.value.find((g) => g.id === selectedGroupId.value);
  if (!group) return students.value;
  const ids = new Set(group.students?.map((s) => s.id ?? s) || []);
  return students.value.filter((s) => ids.has(s.id));
});

// Guruh reytingi — o'z guruhi a'zolari coin bo'yicha tartiblangan
const groupLeaderboard = computed(() =>
  [...myGroupStudents.value].sort(
    (a, b) => (b.coin_balance || 0) - (a.coin_balance || 0),
  ),
);

function getStudentGroup(studentId) {
  const student = students.value.find((s) => s.id === studentId);
  if (!student) return null;
  return (
    groups.value.find((g) =>
      g.students?.some((s) => s.phone === student.phone),
    ) || null
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const logout = () => {
  localStorage.removeItem("user");
  router.push("/login");
};
const initials = (s) =>
  ((s.name?.[0] || "") + (s.surname?.[0] || "")).toUpperCase();
const formatSigned = (v) => (v > 0 ? `+${v}` : `${v}`);
const formatMoney = (v) => Number(v || 0).toLocaleString("uz-UZ") + " so'm";
const formatMonth = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${MONTHS[+mo - 1]} ${y}`;
};
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date.replace(" ", "T"));
  if (isNaN(d)) return date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const stageStyle = (stage) => {
  if (stage <= 2) return { backgroundColor: "#E1F5EE", color: "#085041" };
  if (stage <= 4) return { backgroundColor: "#E6F1FB", color: "#0C447C" };
  return { backgroundColor: "#FAEEDA", color: "#633806" };
};
</script>

<template>
  <div class="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
    <!-- HEADER -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3 min-w-0">
        <RouterLink v-if="user.is_admin" to="/admin" class="text-gray-400 hover:text-gray-700 transition shrink-0">
          <AppIcon name="arrow-left" class="w-4 h-4" />
        </RouterLink>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-semibold truncate">Kabinet</h1>
          <p class="text-xs text-gray-400">Xush kelibsiz, {{ user.name }}</p>
        </div>
      </div>
      <button @click="$router.push('/profile')"
        class="shrink-0 border cursor-pointer border-gray-200 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm hover:bg-gray-50 transition">
        <AppIcon name="settings" /> Profil
      </button>
    </div>

    <!-- PROFILE CARD -->
    <div class="bg-white border border-gray-100 rounded-2xl p-4 mb-5 flex items-center gap-3 shadow-sm">
      <div
        class="w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
        :style="AVATAR_COLORS[0]">
        {{ (user.name?.[0] || "").toUpperCase() }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm sm:text-base truncate">
          {{ user.name }} {{ user.surname }}
          <span v-if="user.is_admin" class="text-yellow-500 ml-1"><AppIcon name="star" /></span>
        </p>
        <p class="text-xs text-gray-400 truncate">{{ user.phone }}</p>
        <div class="mt-1.5">
          <span v-if="!user.is_admin && myGroup"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            <AppIcon name="groups" /> {{ myGroup.name }}
          </span>
          <span v-else-if="!user.is_admin && !myGroup" class="text-xs text-gray-300">Guruhga biriktirilmagan</span>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex gap-1.5 mb-5 overflow-x-auto pb-1 no-scrollbar">
      <button @click="activeTab = 'students'" :class="[
        'shrink-0 px-3.5 sm:px-4 py-2 rounded-full border text-xs sm:text-sm transition',
        activeTab === 'students'
          ? 'bg-black text-white border-black'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50',
      ]">
        <AppIcon name="users" /> Guruh
      </button>

      <template v-if="!user.is_admin">
        <button @click="activeTab = 'attendance'" :class="[
          'shrink-0 px-3.5 sm:px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          activeTab === 'attendance'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="attendance" /> Davomat
        </button>
        <button @click="activeTab = 'payments'" :class="[
          'shrink-0 px-3.5 sm:px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          activeTab === 'payments'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="payment" /> To'lovlar
        </button>
        <button @click="activeTab = 'leader'" :class="[
          'shrink-0 px-3.5 sm:px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          activeTab === 'leader'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="trophy" /> Leaderboard
        </button>
        <button @click="activeTab = 'market'" :class="[
          'shrink-0 px-3.5 sm:px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          activeTab === 'market'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="shop" /> Magazine
        </button>
      </template>
    </div>

    <!-- ═══════════════════════════════════════
         STUDENTS TAB — card-based, no table
    ═══════════════════════════════════════ -->
    <div v-if="activeTab === 'students'">
      <!-- Guruh filtri -->
      <div v-if="user.is_admin && groups.length > 0" class="mb-4 flex gap-1.5 flex-wrap">
        <button @click="selectedGroupId = null" :class="[
          'px-3 py-1.5 rounded-full text-xs border transition',
          selectedGroupId === null
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        ]">
          Barchasi ({{ students.length }})
        </button>
        <button v-for="g in groups" :key="g.id" @click="selectedGroupId = g.id" :class="[
          'px-3 py-1.5 rounded-full text-xs border transition',
          selectedGroupId === g.id
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        ]">
          <AppIcon name="groups" /> {{ g.name }}
          <span class="opacity-50 ml-0.5">({{
            g.students?.filter((s) => students.some((st) => st.id === (s.id ?? s)))
              .length || 0
          }})</span>
        </button>
      </div>

      <p class="text-xs text-gray-400 mb-3">
        {{ filteredStudents.length }} ta o'quvchi
        <span v-if="selectedGroupId" class="text-gray-500">—
          {{groups.find((g) => g.id === selectedGroupId)?.name}}</span>
      </p>

      <!-- Loading -->
      <div v-if="loadingStudents" class="text-center py-10 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>

      <!-- Empty -->
      <div v-else-if="!filteredStudents.length" class="text-center py-10 text-gray-400 text-sm">
        O'quvchilar yo'q
      </div>

      <!-- Card list -->
      <div v-else class="space-y-2">
        <div v-for="(student, index) in filteredStudents" :key="student.id"
          class=" border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <!-- Student row -->
          <div class="flex items-center gap-3 px-4 py-3.5">
            <!-- Avatar -->
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              :style="AVATAR_COLORS[index % AVATAR_COLORS.length]">
              {{ initials(student) }}
            </div>

            <!-- Name + meta -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">
                {{ student.name }} {{ student.surname }}
              </p>
              <span v-if="user.is_admin" class="text-xs text-gray-400 truncate">{{ student.phone }}</span>
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" :style="stageStyle(student.stage)">
                  {{ student.stage }}-etap
                </span>
                <span v-if="getStudentGroup(student.id)"
                  class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  <AppIcon name="groups" /> {{ getStudentGroup(student.id).name }}
                </span>
              </div>
            </div>

            <!-- Coin + action -->
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 font-medium whitespace-nowrap">
                <AppIcon name="coin" /> {{ student.coin_balance || 0 }}
              </span>
              <button v-if="user.is_admin" @click="togglePanel(student.id)"
                class="cursor-pointer w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition text-sm">
                <AppIcon :name="expandedStudentId === student.id ? 'x' : 'settings'" />
              </button>
            </div>
          </div>

          <div v-if="user.is_admin && expandedStudentId === student.id"
            class="border-t  px-4 py-4">
            <p class="text-xs font-medium text-gray-500 mb-3">
              {{ student.name }} {{ student.surname }} uchun coin bering
            </p>

            <!-- Quick actions — 2x2 grid on mobile, 4 columns on sm+ -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button v-for="action in QUICK_ACTIONS" :key="action.reason" @click="giveCoin(student.id, action.reason)"
                :disabled="givingCoin[student.id]" :class="[
                  'flex flex-col cursor-pointer items-center justify-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition disabled:opacity-40',
                  action.amount > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
                ]">
                <span class="text-base leading-none"><AppIcon :name="action.icon" /></span>
                <span class="leading-tight text-center">{{
                  action.label
                }}</span>
                <span class="font-bold tabular-nums">{{
                  formatSigned(action.amount)
                }}</span>
              </button>
            </div>

            <!-- Oylik bonus -->
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500 mb-2">
                <AppIcon name="gift" /> Oylik erkin bonus
                <span class="text-gray-400">(1 marta)</span>
              </p>
              <div class="flex items-center gap-2 flex-wrap">
                <input v-model.number="manualAmount[student.id]" type="number" placeholder="Miqdor"
                  :disabled="bonusUsed[student.id] || givingCoin[student.id]"
                  class="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-300 transition" />
                <button @click="giveManualBonus(student.id)" :disabled="bonusUsed[student.id] ||
                  !manualAmount[student.id] ||
                  givingCoin[student.id]
                  " :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer',
                    bonusUsed[student.id]
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white',
                  ]">
                  {{
                    bonusUsed[student.id] ? "Bu oy ishlatilgan" : "Bonus berish"
                  }}
                </button>
              </div>
            </div>

            <!-- Feedback -->
            <p v-if="actionFeedback[student.id]" :class="[
              'text-xs mt-2.5 font-medium',
              actionFeedback[student.id].type === 'success'
                ? 'text-emerald-600'
                : 'text-rose-600',
            ]">
              {{ actionFeedback[student.id].text }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════
         DAVOMAT TAB — o'quvchi o'z davomati (oy bo'yicha)
    ═══════════════════════════════════════ -->
    <div v-if="activeTab === 'attendance'">
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input type="month" v-model="attMonth"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
            Keldi: {{ attStats.came }}
          </span>
          <span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-medium">
            Kelmadi: {{ attStats.missed }}
          </span>
          <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            Jami: {{ attStats.total }}
          </span>
        </div>
      </div>

      <div v-if="loadingAtt" class="text-center py-10 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>
      <div v-else-if="!attendance.length" class="text-center py-10 text-gray-400 text-sm">
        Bu oyda davomat yozuvi yo'q
      </div>
      <div v-else class="space-y-2">
        <div v-for="a in attendance" :key="a.id"
          class="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-gray-50 flex flex-col items-center justify-center shrink-0">
            <span class="text-sm font-bold leading-none text-gray-700">{{ a.lesson_date?.slice(8, 10) }}</span>
            <span class="text-[9px] uppercase text-gray-400">
              {{ MONTHS[+a.lesson_date?.slice(5, 7) - 1]?.slice(0, 3) }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ a.lesson_title || "Dars" }}</p>
            <p class="text-xs text-gray-400">{{ a.lesson_date }}</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
            :class="ATT_STYLE[a.status] || 'bg-gray-100 text-gray-500'">
            {{ ATT_LABEL[a.status] || a.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════
         PAYMENTS TAB
    ═══════════════════════════════════════ -->
    <div v-if="activeTab === 'payments'">
      <div v-if="loadingPayments" class="text-center py-10 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>
      <div v-else-if="payments.length" class="space-y-3">
        <div v-for="payment in payments" :key="payment.id"
          class="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div>
              <p class="font-semibold text-base">
                {{ formatMonth(payment.month) }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ payment.stage }}-etap
              </p>
            </div>
            <div class="text-right shrink-0">
              <span :class="[
                'px-2.5 py-1 rounded-full text-xs font-medium',
                payment.is_paid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600',
              ]">{{
                payment.is_paid ? "To'lov qilingan" : "To'lov qilinmagan"
              }}</span>
              <p v-if="payment.paid_at" class="text-xs text-gray-400 mt-1.5">
                {{ formatDate(payment.paid_at) }}
              </p>
            </div>
          </div>
          <p class="text-xs text-gray-400 mb-1">To'lov summasi</p>
          <p class="text-2xl sm:text-3xl font-bold">
            {{ formatMoney(payment.amount_due) }}
          </p>
        </div>
      </div>
      <div v-else class="text-center py-10 text-gray-400 text-sm">
        Hozircha to'lovlar mavjud emas
      </div>
    </div>

    <div class="mt-4" v-if="activeTab === 'leader'">
      <!-- Reyting ko'lami: guruh / o'quv markaz -->
      <div class="flex gap-1.5 mb-4">
        <button @click="leaderScope = 'group'" :class="[
          'flex-1 sm:flex-none px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          leaderScope === 'group'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="groups" /> Mening guruhim
        </button>
        <button @click="leaderScope = 'center'" :class="[
          'flex-1 sm:flex-none px-4 py-2 rounded-full border text-xs sm:text-sm transition',
          leaderScope === 'center'
            ? 'bg-black text-white border-black'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        ]">
          <AppIcon name="trophy" /> O'quv markaz
        </button>
      </div>

      <!-- Guruh reytingi -->
      <template v-if="leaderScope === 'group'">
        <div v-if="!myGroup" class="text-center py-10 text-gray-400 text-sm">
          Siz guruhga biriktirilmagansiz
        </div>
        <ul v-else-if="groupLeaderboard.length" class="space-y-2">
          <li v-for="(s, i) in groupLeaderboard" :key="s.id"
            class="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
            :class="s.id === user.id ? 'ring-2 ring-indigo-200' : ''">
            <span class="w-7 text-center font-bold shrink-0"
              :class="i < 3 ? 'text-amber-500' : 'text-gray-400'">{{ i + 1 }}</span>
            <span class="flex-1 min-w-0 truncate text-sm font-medium">
              {{ s.name }} {{ s.surname }}
              <span v-if="s.id === user.id" class="text-xs text-indigo-500">(siz)</span>
            </span>
            <span class="text-sm font-bold text-yellow-600 whitespace-nowrap">
              <AppIcon name="coin" /> {{ s.coin_balance || 0 }}
            </span>
          </li>
        </ul>
        <div v-else class="text-center py-10 text-gray-400 text-sm">
          Guruhda o'quvchi yo'q
        </div>
      </template>

      <!-- O'quv markaz reytingi -->
      <Leaderboard v-else />
    </div>
    <div class="mt-4" v-if="activeTab === 'market'">
      <Magazine />
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
