<template>
  <div class="min-h-screen  flex flex-col pb-28 font-nunito">
    <!-- Header -->
    <div class="px-5 pt-12 pb-4">
      <h1 class="text-2xl font-black text-[#1e1040] tracking-tight">
        Leaderboard
      </h1>
      <p class="text-gray-400 text-sm font-semibold mt-0.5">Coin reytingi <AppIcon name="coin" /></p>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center flex-1 gap-3 py-20">
      <div
        class="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-500 animate-spin"></div>
      <p class="text-gray-400 text-sm font-semibold">Yuklanmoqda...</p>
    </div>

    <div v-else class="px-4 flex flex-col gap-3">
      <!-- Top 3 Podium -->
      <div
        v-if="users.length >= 1"
        class="flex items-end justify-center gap-3 py-6">
        <!-- 2nd -->
        <div class="flex flex-col items-center gap-2">
          <div class="relative">
            <div
              class="w-16 h-16 rounded-full bg-[#1e2130] ring-4 ring-gray-300 flex items-center justify-center text-xl font-black text-white shadow-md">
              {{ topThree[1] ? initials(topThree[1]) : "?" }}
            </div>
            <span
              class="absolute -bottom-1 -right-1 bg-gray-400 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow">
              2
            </span>
          </div>
          <p
            class="text-xs font-bold text-gray-500 max-w-[72px] truncate text-center">
            {{ topThree[1] ? firstName(topThree[1]) : "—" }}
          </p>
          <div class="bg-white rounded-xl px-3 py-1 shadow-sm">
            <span class="text-gray-500 text-xs font-black">
              {{ topThree[1]?.coin_balance ?? 0 }} <AppIcon name="coin" />
            </span>
          </div>
          <div
            class="w-20 h-16 bg-white rounded-t-2xl flex items-center justify-center shadow-sm">
            <span class="text-gray-400 text-2xl font-black">2</span>
          </div>
        </div>

        <!-- 1st -->
        <div class="flex flex-col items-center gap-2 -mb-2">
          <span class="text-2xl"><AppIcon name="manager" /></span>
          <div class="relative">
            <div
              class="w-20 h-20 rounded-full bg-[#1a2a3a] ring-4 ring-cyan-400 flex items-center justify-center text-2xl font-black text-white shadow-lg">
              {{ topThree[0] ? initials(topThree[0]) : "?" }}
            </div>
            <span
              class="absolute -bottom-1 -right-1 bg-cyan-400 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow">
              1
            </span>
          </div>
          <p
            class="text-sm font-black text-[#1e1040] max-w-[80px] truncate text-center">
            {{ topThree[0] ? firstName(topThree[0]) : "—" }}
          </p>
          <div class="bg-cyan-50 rounded-xl px-3 py-1 shadow-sm">
            <span class="text-cyan-500 text-xs font-black">
              {{ topThree[0]?.coin_balance ?? 0 }} <AppIcon name="coin" />
            </span>
          </div>
          <div
            class="w-20 h-24 bg-gradient-to-b from-cyan-100 to-white rounded-t-2xl flex items-center justify-center shadow-sm">
            <span class="text-cyan-400 text-3xl font-black">1</span>
          </div>
        </div>

        <!-- 3rd -->
        <div class="flex flex-col items-center gap-2">
          <div class="relative">
            <div
              class="w-16 h-16 rounded-full bg-[#2a1a10] ring-4 ring-orange-300 flex items-center justify-center text-xl font-black text-white shadow-md">
              {{ topThree[2] ? initials(topThree[2]) : "?" }}
            </div>
            <span
              class="absolute -bottom-1 -right-1 bg-orange-400 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow">
              3
            </span>
          </div>
          <p
            class="text-xs font-bold text-gray-500 max-w-[72px] truncate text-center">
            {{ topThree[2] ? firstName(topThree[2]) : "—" }}
          </p>
          <div class="bg-orange-50 rounded-xl px-3 py-1 shadow-sm">
            <span class="text-orange-400 text-xs font-black">
              {{ topThree[2]?.coin_balance ?? 0 }} <AppIcon name="coin" />
            </span>
          </div>
          <div
            class="w-20 h-10 bg-white rounded-t-2xl flex items-center justify-center shadow-sm">
            <span class="text-orange-400 text-2xl font-black">3</span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-purple-100 mb-1"></div>

      <!-- 4+ o'rinlar -->
      <div
        v-for="(item, index) in restUsers"
        :key="item.student_id"
        :class="[
          'flex items-center gap-4 rounded-2xl px-4 py-3 shadow-sm',
          item.student_id === user?.id
            ? 'bg-purple-50 shadow-purple-100 ring-1 ring-purple-200'
            : 'bg-white shadow-purple-50',
        ]">
        <span class="text-gray-400 text-sm font-black w-5 text-center">
          {{ index + 4 }}
        </span>

        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-sm font-black text-purple-400 flex-shrink-0">
          {{ initials(item) }}
        </div>

        <!-- Ism -->
        <div class="flex-1 min-w-0">
          <p class="text-[#1e1040] font-bold text-sm truncate">
            {{ item.name }} {{ item.surname }}
            <span
              v-if="item.student_id === user?.id"
              class="text-purple-400 text-xs font-semibold ml-1"
              >(Sen)</span
            >
          </p>
          <p class="text-gray-400 text-xs font-semibold">
            {{ item.teacher_name || "Biriktirilmagan" }}
          </p>
        </div>

        <!-- Coin -->
        <div class="bg-purple-50 rounded-xl px-3 py-1">
          <span class="text-purple-500 text-xs font-black">
            {{ item.coin_balance }} <AppIcon name="coin" />
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="users.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-3">
        <span class="text-5xl"><AppIcon name="trophy" /></span>
        <p class="text-gray-400 font-semibold text-sm">Hali hech kim yo'q</p>
      </div>

      <!-- Foydalanuvchi o'rni (pastki sticky banner) -->
      <div
        v-if="myRank && myRank > 3"
        class="fixed bottom-20 left-4 right-4 bg-[#1e1040] text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl z-10">
        <div
          class="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-sm font-black flex-shrink-0">
          {{ myData ? initials(myData) : "?" }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-bold text-sm truncate">Sening o'rning</p>
          <p class="text-purple-300 text-xs font-semibold">
            {{ myData?.coin_balance ?? 0 }} coin
          </p>
        </div>
        <div class="bg-purple-500 rounded-xl px-3 py-1 flex-shrink-0">
          <span class="text-white text-sm font-black"># {{ myRank }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { API } from "@/config";
import { useRouter } from "vue-router";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("user") || "null");
if (!user) router.push("/login");

// ─────────────────────────────
// STATE
// ─────────────────────────────

const users = ref([]);
const loading = ref(true);

// ─────────────────────────────
// FETCH
// ─────────────────────────────

async function fetchLeaderboard() {
  loading.value = true;
  try {
    const teacherParam =
      user?.teacher_id && !user?.is_admin
        ? `?teacher_id=${user.teacher_id}`
        : "";

    const res = await fetch(`${API}/coins/${teacherParam}`);
    const data = await res.json();

    // Backend allaqachon -coin_balance bo'yicha tartiblab beradi
    // Frontend da ham kafolatlaymiz
    users.value = data.sort((a, b) => b.coin_balance - a.coin_balance);
  } catch (e) {
    users.value = [];
  } finally {
    loading.value = false;
  }
}

// ─────────────────────────────
// COMPUTED
// ─────────────────────────────

const topThree = computed(() => users.value.slice(0, 3));
const restUsers = computed(() => users.value.slice(3));

const myRank = computed(() => {
  if (!user) return null;
  const idx = users.value.findIndex((u) => u.student_id === user.id);
  return idx >= 0 ? idx + 1 : null;
});

const myData = computed(
  () => users.value.find((u) => u.student_id === user?.id) ?? null,
);

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function initials(item) {
  const n = (item.name || "").charAt(0);
  const s = (item.surname || "").charAt(0);
  return (n + s).toUpperCase() || "?";
}

function firstName(item) {
  return item.name || "—";
}

onMounted(fetchLeaderboard);
</script>
