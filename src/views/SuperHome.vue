<template>
  <SuperLayout
    title="Bosh sahifa"
    :subtitle="`${formatMonth(month)} — markaz holati bir qarashda`"
    :badges="{ devices: blockedDevices }"
  >
    <!-- Oy tanlash -->
    <div class="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <p class="text-sm text-slate-400">
        Xush kelibsiz, <span class="text-slate-600">{{ user?.name }}</span>
      </p>
      <input
        type="month"
        v-model="month"
        class="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
      />
    </div>

    <div v-if="loading" class="p-16 text-center">
      <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
      <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
    </div>

    <template v-else>
      <!-- ══════════ PUL ══════════ -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <span
              class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0"
            >
              <AppIcon name="money" class="w-4 h-4 text-white" />
            </span>
            <span class="text-xs text-slate-400 uppercase tracking-wider">
              Yig'ilgan
            </span>
          </div>
          <p class="text-xl font-bold text-slate-800 tabular-nums break-words">
            {{ money(o.collected) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            kutilgan {{ money(o.expected) }}
          </p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center gap-2 mb-3">
            <span
              class="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center shrink-0"
            >
              <AppIcon name="receipt" class="w-4 h-4 text-white" />
            </span>
            <span class="text-xs text-slate-400 uppercase tracking-wider">
              Xarajat
            </span>
          </div>
          <p class="text-xl font-bold text-slate-800 tabular-nums break-words">
            {{ money(o.spent) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">shu oy uchun</p>
        </div>

        <div
          class="rounded-2xl p-5 text-white"
          :class="
            o.profit >= 0
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700'
              : 'bg-gradient-to-br from-orange-400 to-rose-500'
          "
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0"
            >
              <AppIcon name="chart" class="w-4 h-4 text-white" />
            </span>
            <span class="text-xs text-white/70 uppercase tracking-wider">
              {{ o.profit >= 0 ? "Sof foyda" : "Sof zarar" }}
            </span>
          </div>
          <p class="text-xl font-bold tabular-nums break-words">
            {{ o.profit >= 0 ? "+" : "" }}{{ money(o.profit) }}
          </p>
          <p class="text-xs text-white/70 mt-1">yig'ilgan − xarajat</p>
        </div>

        <router-link
          to="/super/salaries"
          class="bg-white rounded-2xl border border-slate-200 p-5 hover:bg-slate-50 transition block"
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0"
            >
              <AppIcon name="teacher" class="w-4 h-4 text-white" />
            </span>
            <span class="text-xs text-slate-400 uppercase tracking-wider">
              To'lanmagan oylik
            </span>
          </div>
          <p class="text-xl font-bold text-slate-800 tabular-nums break-words">
            {{ money(o.unpaid_salaries) }}
          </p>
          <p class="text-xs text-amber-600 mt-1">ustozlarga to'lanishi kerak</p>
        </router-link>
      </div>

      <!-- ══════════ SANOQLAR ══════════ -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div
          v-for="c in counters"
          :key="c.label"
          class="bg-white rounded-2xl border border-slate-200 p-4 text-center"
        >
          <p class="text-2xl font-bold text-slate-800 tabular-nums">
            {{ c.value }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ c.label }}</p>
        </div>
      </div>

      <!-- ══════════ E'TIBOR TALAB QILADI ══════════ -->
      <div v-if="alerts.length" class="space-y-2 mb-5">
        <router-link
          v-for="a in alerts"
          :key="a.text"
          :to="a.to"
          class="flex items-center gap-3 px-4 py-3 rounded-xl border transition"
          :class="a.tone === 'warn'
            ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
            : 'bg-rose-50 border-rose-200 hover:bg-rose-100'"
        >
          <AppIcon
            name="warning"
            :class="a.tone === 'warn' ? 'text-amber-500' : 'text-rose-500'"
          />
          <span class="text-sm flex-1" :class="a.tone === 'warn' ? 'text-amber-800' : 'text-rose-700'">
            {{ a.text }}
          </span>
          <AppIcon name="chevron-right" class="text-slate-400 shrink-0" />
        </router-link>
      </div>

      <!-- ══════════ HOZIR SAYTDA ══════════ -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span class="relative flex w-2 h-2">
              <span
                v-if="online.count"
                class="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex w-2 h-2 rounded-full"
                :class="online.count ? 'bg-emerald-500' : 'bg-slate-300'"
              ></span>
            </span>
            Hozir saytda
            <span class="text-xs text-slate-400 font-normal">
              {{ online.count || 0 }} kishi
            </span>
          </h2>
          <span class="text-[11px] text-slate-400">
            oxirgi {{ online.minutes || 5 }} daqiqada
          </span>
        </div>

        <p v-if="!online.rows?.length" class="text-sm text-slate-400 py-4 text-center">
          Hozir hech kim saytda emas
        </p>
        <div v-else class="flex flex-wrap gap-2">
          <div
            v-for="p in online.rows"
            :key="p.phone"
            class="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200"
          >
            <span
              class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0"
            >
              {{ initials(p.name) }}
            </span>
            <span class="text-sm text-slate-700">{{ p.name }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full"
              :class="roleClass(p.role)"
            >
              {{ roleLabel(p.role) }}
            </span>
            <span v-if="p.devices > 1" class="text-[10px] text-slate-400">
              {{ p.devices }} qurilma
            </span>
          </div>
        </div>
      </div>

      <!-- ══════════ MENEJERLAR FAOLLIGI ══════════ -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
              Kim eng faol (7 kun)
            </h2>
            <router-link
              to="/super/activity"
              class="text-xs text-indigo-500 hover:underline"
            >
              Hammasi
            </router-link>
          </div>

          <p v-if="!summary.by_actor?.length" class="text-sm text-slate-400 py-6 text-center">
            Hozircha harakat yo'q
          </p>
          <div v-else class="space-y-2.5">
            <div
              v-for="a in summary.by_actor"
              :key="a.name + a.role"
              class="flex items-center gap-3"
            >
              <span
                class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0"
              >
                {{ initials(a.name) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-slate-700 truncate">{{ a.name }}</p>
                <p class="text-[11px] text-slate-400">{{ roleLabel(a.role) }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 w-28">
                <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-indigo-400 rounded-full"
                    :style="{ width: barWidth(a.count) + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-slate-500 tabular-nums w-7 text-right">
                  {{ a.count }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            Nima ko'p qilingan (7 kun)
          </h2>

          <p v-if="!summary.by_action?.length" class="text-sm text-slate-400 py-6 text-center">
            Hozircha harakat yo'q
          </p>
          <div v-else class="space-y-2">
            <div
              v-for="a in summary.by_action"
              :key="a.action"
              class="flex items-center gap-3"
            >
              <span class="text-sm text-slate-600 flex-1 truncate">{{ a.label }}</span>
              <span
                class="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0"
              >
                {{ a.count }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SuperLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { apiGet, currentUser } from "@/utils/managerApi";

const user = currentUser();
const loading = ref(true);
const month = ref(new Date().toISOString().slice(0, 7));
const o = ref({});
const summary = ref({});
const online = ref({ count: 0, rows: [], minutes: 5 });

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const money = (n) => (Number(n) || 0).toLocaleString("uz-UZ") + " so'm";

function formatMonth(m) {
  if (!m) return "";
  const [y, mm] = m.split("-");
  return `${UZ_MONTHS[parseInt(mm, 10) - 1] || m} ${y}`;
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const ROLE_LABEL = {
  super: "supermenejer",
  manager: "menejer",
  teacher: "ustoz",
  student: "o'quvchi",
};
const roleLabel = (r) => ROLE_LABEL[r] || r || "—";

function roleClass(role) {
  if (role === "super") return "bg-indigo-100 text-indigo-700";
  if (role === "manager") return "bg-indigo-100 text-indigo-700";
  if (role === "teacher") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-500";
}

const blockedDevices = computed(() => o.value.devices_blocked || 0);

const counters = computed(() => [
  { label: "O'quvchi", value: o.value.students ?? 0 },
  { label: "Ustoz", value: o.value.teachers ?? 0 },
  { label: "Guruh", value: o.value.groups ?? 0 },
  { label: "Menejer", value: o.value.managers ?? 0 },
  { label: "Bugungi amal", value: o.value.activity_today ?? 0 },
]);

// Eng faol menejerning ustuni to'liq bo'ladi, qolganlari unga nisbatan
const maxCount = computed(() =>
  Math.max(1, ...(summary.value.by_actor || []).map((a) => a.count)),
);
const barWidth = (n) => Math.round((n / maxCount.value) * 100);

const alerts = computed(() => {
  const list = [];
  if (o.value.pending_requests > 0) {
    list.push({
      text: `${o.value.pending_requests} ta to'lov so'rovi kutmoqda`,
      to: "/excellence",
      tone: "warn",
    });
  }
  if (o.value.unpaid_salaries > 0) {
    list.push({
      text: `${money(o.value.unpaid_salaries)} ustoz oyligi hali to'lanmagan`,
      to: "/super/salaries",
      tone: "warn",
    });
  }
  if (o.value.devices_blocked > 0) {
    list.push({
      text: `${o.value.devices_blocked} ta qurilma bloklangan`,
      to: "/super/devices",
      tone: "danger",
    });
  }
  return list;
});

async function loadOnline() {
  const { ok, data } = await apiGet("/super/online/");
  if (ok) online.value = data;
}

async function load() {
  loading.value = true;
  try {
    const [ov, sm] = await Promise.all([
      apiGet(`/super/overview/?month=${month.value}`),
      apiGet("/super/activity/summary/?days=7"),
      loadOnline(),
    ]);
    o.value = ov.ok ? ov.data : {};
    summary.value = sm.ok ? sm.data : {};
  } finally {
    loading.value = false;
  }
}

// Onlayn ro'yxati tez eskiradi — sahifa ochiq turganda yangilab boramiz
let onlineTimer = null;

watch(month, load);
onMounted(() => {
  load();
  onlineTimer = setInterval(() => {
    if (document.visibilityState === "visible") loadOnline();
  }, 30_000);
});
onUnmounted(() => clearInterval(onlineTimer));
</script>
