<template>
  <SuperLayout
    title="Qurilmalar"
    subtitle="Panelga qaysi qurilmalardan kirilayotgani. Shubhali qurilmani bloklab qo'ysa bo'ladi"
  >

    <!-- ══════════ FILTR ══════════ -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button
        v-for="f in filters"
        :key="f.value"
        @click="role = f.value"
        :class="[
          'px-4 py-2 rounded-full text-sm border transition whitespace-nowrap',
          role === f.value
            ? 'bg-slate-900 text-white border-slate-900'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
        ]"
      >
        {{ f.label }}
      </button>

      <div class="flex-1"></div>

      <div class="relative">
        <AppIcon
          name="search"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
        />
        <input
          v-model="search"
          placeholder="Ism yoki telefon..."
          class="w-full sm:w-56 pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
        />
      </div>

      <button
        @click="load"
        class="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 transition shrink-0"
      >
        <AppIcon name="refresh" /> Yangilash
      </button>
    </div>

    <!-- ══════════ RO'YXAT ══════════ -->
    <div v-if="loading" class="bg-white rounded-2xl border border-slate-100 p-16 text-center">
      <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
      <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
    </div>

    <div
      v-else-if="!visible.length"
      class="bg-white rounded-2xl border border-slate-100 p-16 text-center"
    >
      <p class="text-sm text-slate-400">Qurilma topilmadi</p>
      <p class="text-xs text-slate-300 mt-1">
        Kirishlar yangi versiyaga o'tgandan keyin yozila boshlaydi
      </p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div
        v-for="d in visible"
        :key="d.id"
        :class="[
          'bg-white rounded-2xl border shadow-sm p-4',
          d.is_blocked ? 'border-rose-200 bg-rose-50/40' : 'border-slate-100',
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            :class="d.is_blocked ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'"
          >
            <AppIcon :name="isMobile(d.user_agent) ? 'mobile' : 'monitor'" class="w-5 h-5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-slate-800 truncate">
                {{ d.user_name || d.phone }}
              </p>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                :class="roleStyle(d.role)"
                >{{ roleLabel(d.role) }}</span
              >
              <span
                v-if="d.is_blocked"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 shrink-0"
                >bloklangan</span
              >
            </div>

            <p class="text-xs text-slate-400 mt-0.5 tabular-nums">{{ d.phone }}</p>

            <p class="text-xs text-slate-500 mt-2 break-words">
              {{ describe(d.user_agent) }}
            </p>

            <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
              <span>IP: <span class="tabular-nums">{{ d.ip || "—" }}</span></span>
              <span class="tabular-nums">{{ d.login_count }} marta kirgan</span>
              <span>Oxirgi: {{ fmtWhen(d.last_seen) }}</span>
            </div>
          </div>

          <button
            @click="toggleBlock(d)"
            :disabled="busy"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs border transition shrink-0 disabled:opacity-40',
              d.is_blocked
                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                : 'border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200',
            ]"
          >
            <AppIcon :name="d.is_blocked ? 'unlock' : 'ban'" />
            {{ d.is_blocked ? "Ochish" : "Bloklash" }}
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="toast"
      class="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50"
    >
      {{ toast }}
    </p>
  </SuperLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { apiGet, apiSend } from "@/utils/managerApi";

const devices = ref([]);
const loading = ref(true);
const busy = ref(false);
const toast = ref("");
const role = ref("manager");
const search = ref("");

const filters = [
  { value: "manager", label: "Menejer paneli" },
  { value: "teacher", label: "Ustozlar" },
  { value: "student", label: "O'quvchilar" },
  { value: "", label: "Barchasi" },
];

const ROLE_LABEL = {
  super: "supermenejer",
  manager: "menejer",
  teacher: "ustoz",
  student: "o'quvchi",
};

const ROLE_STYLE = {
  super: "bg-violet-100 text-violet-700",
  manager: "bg-indigo-100 text-indigo-700",
  teacher: "bg-amber-100 text-amber-700",
  student: "bg-slate-100 text-slate-600",
};

const roleLabel = (r) => ROLE_LABEL[r] || r;
const roleStyle = (r) => ROLE_STYLE[r] || ROLE_STYLE.student;

const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return devices.value;
  const qd = q.replace(/\D/g, "");
  return devices.value.filter(
    (d) =>
      (d.user_name || "").toLowerCase().includes(q) ||
      (qd.length >= 3 && String(d.phone || "").replace(/\D/g, "").includes(qd)),
  );
});

const isMobile = (ua) => /android|iphone|ipad|mobile/i.test(ua || "");

/** User-Agent'dan odam o'qiy oladigan qurilma/brauzer nomini yasaydi. */
function describe(ua) {
  if (!ua) return "Noma'lum qurilma";

  let os = "Noma'lum tizim";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iPhone / iPad";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "brauzer";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua)) browser = "Safari";

  return `${os} · ${browser}`;
}

function fmtWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} soat oldin`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

async function load() {
  loading.value = true;
  try {
    const q = role.value ? `?role=${role.value}` : "";
    const { ok, data } = await apiGet(`/super/devices/${q}`);
    if (!ok) {
      say(data.error || "Ma'lumot yuklanmadi");
      devices.value = [];
      return;
    }
    devices.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("devices:", e);
    say("Tarmoq xatosi");
  } finally {
    loading.value = false;
  }
}

async function toggleBlock(d) {
  const next = !d.is_blocked;
  if (
    next &&
    !confirm(
      `${d.user_name || d.phone} shu qurilmadan kira olmaydigan bo'ladi. Davom etasizmi?`,
    )
  )
    return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/super/devices/${d.id}/block/`, "PATCH", {
      is_blocked: next,
    });
    if (!ok) return say(data.error || "Bajarilmadi");
    d.is_blocked = data.is_blocked;
    say(next ? "Qurilma bloklandi" : "Blok olib tashlandi");
  } finally {
    busy.value = false;
  }
}

watch(role, load);
onMounted(load);
</script>
