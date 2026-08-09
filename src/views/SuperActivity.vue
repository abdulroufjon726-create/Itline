<template>
  <SuperLayout
    title="Harakatlar"
    subtitle="Panelda kim nima qilgani — barcha o'zgarishlar shu yerda"
  >
    <!-- ══════════ FILTRLAR ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1.5">Kim</label>
          <select
            v-model="filters.manager_id"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          >
            <option value="">Barchasi</option>
            <option v-for="m in managers" :key="m.id" :value="m.id">
              {{ m.name }} {{ m.surname }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1.5">Amal</label>
          <select
            v-model="filters.action"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          >
            <option value="">Barchasi</option>
            <optgroup
              v-for="grp in actionGroups"
              :key="grp.name"
              :label="grp.name"
            >
              <option :value="grp.prefix">— butun bo'lim —</option>
              <option v-for="a in grp.items" :key="a.key" :value="a.key">
                {{ a.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1.5">Davr</label>
          <select
            v-model="filters.days"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          >
            <option value="1">Bugun</option>
            <option value="7">7 kun</option>
            <option value="30">30 kun</option>
            <option value="">Butun tarix</option>
          </select>
        </div>

        <!-- Aniq kunlar/oy/yil — "Davr" tanlovidan ustun turadi -->
        <div class="sm:col-span-2 lg:col-span-4">
          <label class="block text-xs text-slate-400 mb-1.5">Yoki aniq sana oralig'i</label>
          <DateRange v-model="range" />
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1.5">Qidirish</label>
          <input
            v-model="filters.search"
            placeholder="Ism yoki tavsif..."
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          />
        </div>
      </div>

      <div
        v-if="isFiltered"
        class="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3"
      >
        <p class="text-xs text-slate-400">
          {{ rows.length }} ta yozuv topildi
        </p>
        <button
          @click="resetFilters"
          class="text-xs text-slate-500 hover:text-rose-500 transition flex items-center gap-1"
        >
          <AppIcon name="x" /> Filtrni tozalash
        </button>
      </div>
    </div>

    <!-- ══════════ RO'YXAT ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div v-if="loading" class="p-16 text-center">
        <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
      </div>

      <div v-else-if="!rows.length" class="p-16 text-center">
        <AppIcon name="attendance" class="w-8 h-8 text-slate-300 mx-auto" />
        <p class="text-sm text-slate-400 mt-3">
          {{ isFiltered ? "Bu shartlarga mos yozuv yo'q" : "Hozircha harakat yo'q" }}
        </p>
      </div>

      <template v-else>
        <div
          v-for="(group, gi) in grouped"
          :key="group.day"
          :class="gi ? 'border-t border-slate-200' : ''"
        >
          <p
            class="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 sticky top-0"
          >
            {{ group.day }}
          </p>

          <div class="divide-y divide-slate-100">
            <div
              v-for="a in group.items"
              :key="a.id"
              class="px-4 py-3 hover:bg-slate-50 transition flex gap-3"
            >
              <span
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                :class="toneOf(a.action).bg"
              >
                <AppIcon
                  :name="toneOf(a.action).icon"
                  class="w-4 h-4"
                  :class="toneOf(a.action).text"
                />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-sm text-slate-700 leading-snug">
                    {{ a.description }}
                  </p>
                  <span
                    class="text-xs text-slate-400 tabular-nums shrink-0"
                    :title="fullTime(a.created_at)"
                  >
                    {{ time(a.created_at) }}
                  </span>
                </div>

                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="text-xs text-slate-500">{{ a.actor_name || "—" }}</span>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded-full"
                    :class="roleClass(a.actor_role)"
                  >
                    {{ roleLabel(a.actor_role) }}
                  </span>
                  <span class="text-[11px] text-slate-300">{{ a.action_label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMore" class="p-3 border-t border-slate-200">
          <button
            @click="loadMore"
            :disabled="loadingMore"
            class="w-full py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition disabled:opacity-40"
          >
            {{ loadingMore ? "Yuklanmoqda..." : "Yana yuklash" }}
          </button>
        </div>
      </template>
    </div>
  </SuperLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { apiGet } from "@/utils/managerApi";
import DateRange from "@/components/DateRange.vue";
import { emptyRange, rangeParams } from "@/utils/range";

const range = ref(emptyRange());
const rows = ref([]);
const actions = ref([]);
const managers = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(false);

const filters = ref({ manager_id: "", action: "", days: "7", search: "" });

const isFiltered = computed(
  () =>
    !!filters.value.manager_id ||
    !!filters.value.action ||
    filters.value.days !== "7" ||
    !!filters.value.search,
);

function resetFilters() {
  filters.value = { manager_id: "", action: "", days: "7", search: "" };
}

// ── Amallarni bo'limlarga ajratamiz (payment.* → "To'lovlar") ──
const SECTION_NAMES = {
  payment: "To'lovlar",
  student: "O'quvchilar",
  teacher: "Ustozlar",
  group: "Guruhlar",
  course: "Kurslar",
  attendance: "Davomat",
  coins: "Coinlar",
  message: "Xabarlar",
  news: "Yangiliklar",
  order: "Buyurtmalar",
  expense: "Xarajatlar",
  manager: "Menejerlar",
  salary: "Oyliklar",
  device: "Qurilmalar",
};

const actionGroups = computed(() => {
  const map = new Map();
  for (const a of actions.value) {
    const prefix = a.key.split(".")[0];
    if (!map.has(prefix)) {
      map.set(prefix, {
        prefix,
        name: SECTION_NAMES[prefix] || prefix,
        items: [],
      });
    }
    map.get(prefix).items.push(a);
  }
  return [...map.values()];
});

// ── Ikonka va rang: amal turiga qarab ──
// Tartib muhim: birinchi mos kelgani ishlatiladi. Qaytarib bo'lmaydigan
// amallar (o'chirish, rad etish, bloklash) qaysi bo'limda bo'lishidan
// qat'i nazar qizil ko'rinishi kerak — shuning uchun ular birinchi.
const TONES = [
  { match: /delete|reject|block|unpay/, icon: "trash", bg: "bg-rose-50", text: "text-rose-600" },
  { match: /^payment|^expense|^salary/, icon: "money", bg: "bg-emerald-50", text: "text-emerald-600" },
  { match: /^student/, icon: "student", bg: "bg-indigo-50", text: "text-indigo-600" },
  { match: /^teacher/, icon: "teacher", bg: "bg-violet-50", text: "text-violet-600" },
  { match: /^group|^course/, icon: "groups", bg: "bg-sky-50", text: "text-sky-600" },
  { match: /^message|^news/, icon: "send", bg: "bg-blue-50", text: "text-blue-600" },
  { match: /^coins/, icon: "coin", bg: "bg-amber-50", text: "text-amber-600" },
  { match: /^manager|^device/, icon: "key", bg: "bg-amber-50", text: "text-amber-600" },
];

function toneOf(action) {
  for (const t of TONES) {
    if (t.match.test(action)) return t;
  }
  return { icon: "info", bg: "bg-slate-100", text: "text-slate-500" };
}

const ROLE_LABEL = {
  super: "supermenejer",
  manager: "menejer",
  teacher: "ustoz",
  student: "o'quvchi",
};
const roleLabel = (r) => ROLE_LABEL[r] || "noma'lum";

function roleClass(role) {
  if (role === "super") return "bg-violet-100 text-violet-700";
  if (role === "manager") return "bg-indigo-100 text-indigo-700";
  if (role === "teacher") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-500";
}

// ── Sana / vaqt ──
function time(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}
function fullTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("uz-UZ");
}

function dayLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Bugun";
  if (same(d, yesterday)) return "Kecha";
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Yozuvlarni kun bo'yicha guruhlaymiz — uzun ro'yxat o'qishga qulay bo'ladi
const grouped = computed(() => {
  const out = [];
  for (const a of rows.value) {
    const day = dayLabel(a.created_at);
    if (!out.length || out[out.length - 1].day !== day) {
      out.push({ day, items: [] });
    }
    out[out.length - 1].items.push(a);
  }
  return out;
});

function query(extra = {}) {
  const p = new URLSearchParams();
  const f = { ...filters.value, ...extra };
  if (f.manager_id) p.set("manager_id", f.manager_id);
  if (f.action) p.set("action", f.action);
  // Aniq oraliq tanlansa "oxirgi N kun" ustidan o'tadi — ikkalasi
  // birga yuborilsa natija chalkash bo'lardi
  const hasRange = !!(range.value.from || range.value.to);
  if (f.days && !hasRange) p.set("days", f.days);
  rangeParams(range.value, p);
  if (f.search) p.set("search", f.search);
  if (f.before_id) p.set("before_id", f.before_id);
  return p.toString();
}

async function load() {
  loading.value = true;
  try {
    const { ok, data } = await apiGet(`/super/activity/?${query()}`);
    if (ok) {
      rows.value = data.rows || [];
      actions.value = data.actions || [];
      hasMore.value = !!data.has_more;
    }
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  const last = rows.value[rows.value.length - 1];
  if (!last) return;
  loadingMore.value = true;
  try {
    const { ok, data } = await apiGet(
      `/super/activity/?${query({ before_id: last.id })}`,
    );
    if (ok) {
      rows.value = [...rows.value, ...(data.rows || [])];
      hasMore.value = !!data.has_more;
    }
  } finally {
    loadingMore.value = false;
  }
}

async function loadManagers() {
  const { ok, data } = await apiGet("/super/managers/?all=1");
  if (ok) managers.value = Array.isArray(data) ? data : [];
}

// Qidiruv har harfda so'rov yubormasin
let timer = null;
watch(
  [filters, range],
  () => {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  },
  { deep: true },
);

onMounted(() => {
  load();
  loadManagers();
});
</script>
