<template>
  <SuperLayout
    title="Ustoz oyliklari"
    subtitle="Oylik avtomatik hisoblanadi. To'landi bosilganda moliyadagi chiqimlarga o'zi yoziladi"
  >
    <!-- ══════════ OY + JAMI ══════════ -->
    <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
      <div>
        <label class="block text-xs text-slate-400 mb-1">Oy</label>
        <input
          type="month"
          v-model="month"
          class="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
      </div>
      <div class="flex-1"></div>
      <button
        @click="showBulk = !showBulk"
        class="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 transition shrink-0"
      >
        <AppIcon name="users" /> Hammasiga birdan
      </button>
      <button
        @click="load"
        class="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 transition shrink-0"
      >
        <AppIcon name="refresh" /> Yangilash
      </button>
    </div>

    <!-- ══════════ SOZLANMAGANLAR OGOHLANTIRISHI ══════════ -->
    <div
      v-if="!loading && unconfigured.length"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-sm font-medium text-amber-800 mb-1">
        <AppIcon name="warning" />
        {{ unconfigured.length }} ta ustozning oyligi sozlanmagan
      </p>
      <p class="text-xs text-amber-700">
        Oylik o'zi hisoblanishi uchun har ustozga stavka (1 o'quvchi uchun
        summa) yoki foiz kiritilishi kerak. Kiritilmaguncha oylik 0 bo'lib
        turadi. Hammasiga bir xil qiymat berish uchun yuqoridagi
        <span class="font-medium">«Hammasiga birdan»</span> tugmasidan
        foydalaning.
      </p>
    </div>

    <!-- ══════════ HAMMASIGA BIRDAN ══════════ -->
    <div
      v-if="showBulk"
      class="bg-white rounded-2xl border border-slate-200 p-4 mb-4"
    >
      <p class="text-sm font-medium text-slate-700 mb-3">
        Barcha {{ rows.length }} ta ustozga bir xil sozlama
      </p>

      <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div>
          <label class="block text-xs text-slate-400 mb-1.5">Usul</label>
          <div class="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              v-for="m in MODES"
              :key="m.value"
              @click="bulk.mode = m.value"
              :class="[
                'px-3 py-2 text-xs transition',
                bulk.mode === m.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50',
              ]"
            >
              {{ m.short }}
            </button>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <label class="block text-xs text-slate-400 mb-1.5">
            {{ bulk.mode === "percent" ? "Foiz (%)" : "1 o'quvchi uchun (so'm)" }}
          </label>
          <input
            v-model.number="bulk.value"
            type="number"
            min="0"
            :max="bulk.mode === 'percent' ? 100 : undefined"
            :placeholder="bulk.mode === 'percent' ? '30' : '15000'"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 tabular-nums"
          />
        </div>

        <button
          @click="applyBulk"
          :disabled="busy || !bulk.value"
          class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40 shrink-0"
        >
          <AppIcon name="check" /> Qo'llash
        </button>
      </div>

      <p class="text-[11px] text-slate-400 mt-2">
        Bu barcha ustozlarga qo'llanadi. Keyin ayrimlarini jadvalda
        alohida o'zgartirsangiz bo'ladi. To'langan oyliklar tegilmaydi.
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs text-slate-400 mb-1">Jami oylik</p>
        <p class="text-lg sm:text-xl font-bold text-slate-800 tabular-nums break-words">
          {{ money(summary.total_amount) }}
        </p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs text-slate-400 mb-1">To'langan</p>
        <p class="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums break-words">
          {{ money(summary.total_paid) }}
        </p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs text-slate-400 mb-1">Avans berilgan</p>
        <p class="text-lg sm:text-xl font-bold text-amber-600 tabular-nums break-words">
          {{ money(summary.total_advance) }}
        </p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs text-slate-400 mb-1">To'lanishi kerak</p>
        <p class="text-lg sm:text-xl font-bold text-rose-500 tabular-nums break-words">
          {{ money(summary.total_remaining) }}
        </p>
      </div>
    </div>

    <!-- ══════════ JADVAL ══════════ -->
    <div
      class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto"
    >
      <div v-if="loading" class="p-16 text-center">
        <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
      </div>

      <table v-else class="w-full text-sm min-w-[1040px]">
        <thead>
          <tr class="bg-slate-50/70 border-b border-slate-100">
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">Ustoz</th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">
              Hisoblash usuli
            </th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">
              Asos
            </th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">
              Oylik
            </th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">
              Avans
            </th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">
              Qolgan
            </th>
            <th class="text-left px-4 py-3 text-xs text-slate-400 font-medium">Amal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="!rows.length">
            <td colspan="7" class="px-4 py-12 text-center text-sm text-slate-400">
              Ustoz topilmadi
            </td>
          </tr>

          <template v-for="r in rows" :key="r.teacher_id">
            <tr :class="r.is_paid ? 'bg-emerald-50/40' : ''">
              <!-- Ustoz -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-700">{{ r.teacher_name }}</span>
                  <span
                    v-if="r.is_paid"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0"
                    >to'landi</span
                  >
                </div>
              </td>

              <!-- Hisoblash usuli: summa yoki foiz -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div
                    class="flex rounded-lg border border-slate-200 overflow-hidden shrink-0"
                  >
                    <button
                      v-for="m in MODES"
                      :key="m.value"
                      @click="saveSettings(r, { salary_mode: m.value })"
                      :disabled="r.is_paid"
                      :title="m.label"
                      :class="[
                        'px-2 py-1 text-xs transition disabled:opacity-40',
                        r.salary_mode === m.value
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-50',
                      ]"
                    >
                      {{ m.short }}
                    </button>
                  </div>

                  <input
                    v-if="r.salary_mode === 'percent'"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    :value="r.salary_percent"
                    @change="
                      saveSettings(r, { salary_percent: $event.target.value })
                    "
                    :disabled="r.is_paid"
                    placeholder="30"
                    class="w-20 border rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-300 tabular-nums disabled:bg-slate-50 disabled:text-slate-400"
                    :class="r.is_configured ? 'border-slate-200' : 'border-amber-300 bg-amber-50'"
                  />
                  <input
                    v-else
                    type="number"
                    min="0"
                    :value="r.salary_per_student"
                    @change="
                      saveSettings(r, { salary_per_student: $event.target.value })
                    "
                    :disabled="r.is_paid"
                    placeholder="15000"
                    class="w-28 border rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-300 tabular-nums disabled:bg-slate-50 disabled:text-slate-400"
                    :class="r.is_configured ? 'border-slate-200' : 'border-amber-300 bg-amber-50'"
                  />
                </div>
              </td>

              <!-- Nimadan hisoblanayotgani -->
              <td class="px-4 py-3">
                <p class="tabular-nums text-slate-600">
                  {{
                    r.salary_mode === "percent"
                      ? money(r.collected)
                      : r.students_count + " o'quvchi"
                  }}
                </p>
                <p class="text-[11px] text-slate-400">
                  {{
                    r.salary_mode === "percent"
                      ? "shu oy yig'ilgan"
                      : "biriktirilgan"
                  }}
                </p>
              </td>

              <!-- Oylik: default yoki qo'lda -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    :value="r.amount"
                    @change="saveAmount(r, $event.target.value)"
                    :disabled="r.is_paid"
                    class="w-36 border rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-300 tabular-nums disabled:bg-slate-50 disabled:text-slate-400"
                    :class="
                      r.manual_amount === null
                        ? 'border-slate-200'
                        : 'border-amber-300 bg-amber-50'
                    "
                  />
                  <button
                    v-if="r.manual_amount !== null && !r.is_paid"
                    @click="saveAmount(r, '')"
                    title="Default oylikka qaytarish"
                    class="text-slate-300 hover:text-slate-500 shrink-0"
                  >
                    <AppIcon name="refresh" />
                  </button>
                </div>
                <p
                  v-if="r.manual_amount !== null"
                  class="text-[11px] text-amber-600 mt-0.5"
                >
                  qo'lda · default {{ money(r.default_amount) }}
                </p>
              </td>

              <!-- Avans -->
              <td class="px-4 py-3">
                <button
                  @click="toggleRow(r.teacher_id)"
                  class="text-sm tabular-nums flex items-center gap-1"
                  :class="r.advance_total ? 'text-amber-600' : 'text-slate-300'"
                >
                  {{ money(r.advance_total) }}
                  <AppIcon
                    name="chevron-down"
                    class="transition-transform"
                    :class="expanded.has(r.teacher_id) ? 'rotate-180' : ''"
                  />
                </button>
              </td>

              <!-- Qolgan -->
              <td
                class="px-4 py-3 font-semibold tabular-nums"
                :class="r.is_paid ? 'text-emerald-600' : 'text-slate-700'"
              >
                {{ money(r.is_paid ? r.paid_amount : r.remaining) }}
              </td>

              <!-- Amal -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="!r.is_paid"
                    @click="pay(r)"
                    :disabled="busy || r.remaining <= 0"
                    class="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600 disabled:opacity-40 transition whitespace-nowrap"
                  >
                    <AppIcon name="check" /> Oylik to'landi
                  </button>
                  <button
                    v-else
                    @click="unpay(r)"
                    :disabled="busy"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40 transition whitespace-nowrap"
                  >
                    Bekor qilish
                  </button>
                  <button
                    v-if="!r.is_paid"
                    @click="openAdvance(r)"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition whitespace-nowrap"
                  >
                    <AppIcon name="plus" /> Avans
                  </button>
                </div>
              </td>
            </tr>

            <!-- Avanslar ro'yxati -->
            <tr v-if="expanded.has(r.teacher_id)" class="bg-slate-50/60">
              <td colspan="7" class="px-4 py-3">
                <p v-if="!r.advances.length" class="text-xs text-slate-400">
                  Bu oy avans olinmagan
                </p>
                <div v-else class="space-y-1.5">
                  <div
                    v-for="a in r.advances"
                    :key="a.id"
                    class="flex items-center gap-3 text-xs"
                  >
                    <span class="tabular-nums text-slate-400 w-24 shrink-0">{{
                      fmtDate(a.date)
                    }}</span>
                    <span class="tabular-nums font-medium text-amber-700 w-32 shrink-0">
                      {{ money(a.amount) }}
                    </span>
                    <span class="text-slate-500 flex-1 min-w-0 truncate">{{
                      a.note || "—"
                    }}</span>
                    <button
                      v-if="!r.is_paid"
                      @click="removeAdvance(a.id)"
                      class="text-rose-400 hover:text-rose-600 shrink-0"
                    >
                      <AppIcon name="trash" />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- ══════════ AVANS MODALI ══════════ -->
    <div
      v-if="advanceFor"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-40"
      @click.self="advanceFor = null"
    >
      <div class="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl">
        <p class="font-semibold text-slate-800 mb-1">
          {{ advanceFor.teacher_name }} — avans
        </p>
        <p class="text-sm text-slate-500 mb-4">
          Oylikdan oldindan olingan pul. Darhol moliyadagi chiqimlarga yoziladi
          va oy oxirida qoladigan oylikdan ayiriladi.
        </p>

        <label class="block text-xs text-slate-400 mb-1">Summa (so'm)</label>
        <input
          v-model.number="advanceForm.amount"
          type="number"
          min="0"
          placeholder="0"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 tabular-nums mb-3"
        />

        <label class="block text-xs text-slate-400 mb-1">Izoh (ixtiyoriy)</label>
        <input
          v-model="advanceForm.note"
          placeholder="Masalan: shoshilinch ehtiyoj"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 mb-4"
        />

        <div class="flex gap-2 justify-end">
          <button
            @click="advanceFor = null"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50"
          >
            Bekor
          </button>
          <button
            @click="saveAdvance"
            :disabled="busy || !advanceForm.amount"
            class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            Saqlash
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
import { ref, reactive, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { apiGet, apiSend } from "@/utils/managerApi";

const month = ref(new Date().toISOString().slice(0, 7));
const rows = ref([]);
const summary = ref({
  total_amount: 0,
  total_paid: 0,
  total_advance: 0,
  total_remaining: 0,
});
const loading = ref(true);
const busy = ref(false);
const toast = ref("");
const expanded = ref(new Set());

// Oylik ikki xil hisoblanadi: har o'quvchi uchun qat'iy summa, yoki
// o'sha ustozning o'quvchilaridan shu oy yig'ilgan puldan foiz
const MODES = [
  { value: "per_student", short: "so'm", label: "O'quvchi soniga qarab" },
  { value: "percent", short: "%", label: "Yig'ilgan puldan foiz" },
];

const showBulk = ref(false);
const bulk = reactive({ mode: "per_student", value: null });

// Stavkasi ham, foizi ham qo'yilmagan ustozlar — oyligi 0 bo'lib turadi
const unconfigured = computed(() => rows.value.filter((r) => !r.is_configured));

const advanceFor = ref(null);
const advanceForm = reactive({ amount: null, note: "" });

const money = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";

function fmtDate(d) {
  if (!d) return "—";
  const parts = String(d).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : d;
}

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

function toggleRow(id) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

/** Serverdan kelgan bitta ustoz qatorini joyiga qo'yadi. */
function replaceRow(row) {
  const i = rows.value.findIndex((r) => r.teacher_id === row.teacher_id);
  if (i !== -1) rows.value[i] = row;
  recomputeSummary();
}

/** Yig'indilarni qayta hisoblaydi — har amaldan keyin qayta yuklamaslik uchun. */
function recomputeSummary() {
  summary.value = {
    total_amount: rows.value.reduce((a, r) => a + (r.amount || 0), 0),
    total_paid: rows.value.reduce((a, r) => a + (r.paid_amount || 0), 0),
    total_advance: rows.value.reduce((a, r) => a + (r.advance_total || 0), 0),
    total_remaining: rows.value.reduce(
      (a, r) => a + (r.is_paid ? 0 : r.remaining || 0),
      0,
    ),
  };
}

async function load() {
  loading.value = true;
  try {
    const { ok, data } = await apiGet(`/super/salaries/?month=${month.value}`);
    if (!ok) {
      say(data.error || "Ma'lumot yuklanmadi");
      rows.value = [];
      return;
    }
    rows.value = data.rows || [];
    summary.value = {
      total_amount: data.total_amount || 0,
      total_paid: data.total_paid || 0,
      total_advance: data.total_advance || 0,
      total_remaining: data.total_remaining || 0,
    };
  } catch (e) {
    console.error("salaries:", e);
    say("Tarmoq xatosi");
  } finally {
    loading.value = false;
  }
}

/** Usul / stavka / foizni saqlaydi va qatorni serverdan yangilaydi. */
async function saveSettings(row, patch) {
  // Bir xil qiymat qayta yuborilmasin
  const key = Object.keys(patch)[0];
  const next = key === "salary_mode" ? patch[key] : Number(patch[key]) || 0;
  if (next === row[key]) return;

  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/salaries/${row.teacher_id}/rate/`,
      "PATCH",
      { ...patch, month: month.value },
    );
    if (!ok) return say(data.error || "Saqlanmadi");
    // Sozlama o'zgargani uchun default oylik ham o'zgaradi — butun
    // ro'yxatni serverdan qayta olamiz (jami summalar ham yangilansin)
    await load();
    say(`${row.teacher_name} oyligi qayta hisoblandi`);
  } finally {
    busy.value = false;
  }
}

/** Bir xil sozlamani barcha ustozlarga qo'yadi. */
async function applyBulk() {
  const value = Number(bulk.value) || 0;
  if (!value) return;
  if (
    !confirm(
      `Barcha ${rows.value.length} ta ustozga ` +
        (bulk.mode === "percent"
          ? `${value}% qo'yilsinmi?`
          : `har o'quvchi uchun ${money(value)} qo'yilsinmi?`),
    )
  )
    return;

  busy.value = true;
  try {
    const body = { salary_mode: bulk.mode };
    if (bulk.mode === "percent") body.salary_percent = value;
    else body.salary_per_student = value;

    const { ok, data } = await apiSend("/super/salaries/bulk/", "PATCH", body);
    if (!ok) return say(data.error || "Saqlanmadi");
    say(`${data.updated} ta ustozga qo'llandi`);
    showBulk.value = false;
    bulk.value = null;
    await load();
  } finally {
    busy.value = false;
  }
}

async function saveAmount(row, value) {
  // Bo'sh qiymat — default oylikka qaytarish
  const manual = value === "" || value === null ? null : Number(value) || 0;
  if (manual !== null && manual === row.amount && row.manual_amount !== null) return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/salaries/${row.teacher_id}/amount/`,
      "PATCH",
      { month: month.value, manual_amount: manual },
    );
    if (!ok) {
      say(data.error || "Saqlanmadi");
      await load();
      return;
    }
    replaceRow(data);
  } finally {
    busy.value = false;
  }
}

async function pay(row) {
  if (
    !confirm(
      `${row.teacher_name} uchun ${money(row.remaining)} to'landi deb belgilansinmi?\n\nBu summa moliyadagi chiqimlarga "Maosh" kategoriyasida yoziladi.`,
    )
  )
    return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/salaries/${row.teacher_id}/pay/`,
      "POST",
      { month: month.value },
    );
    if (!ok) return say(data.error || "To'lanmadi");
    replaceRow(data);
    say(`${row.teacher_name} oyligi chiqimlarga yozildi`);
  } finally {
    busy.value = false;
  }
}

async function unpay(row) {
  if (!confirm(`${row.teacher_name} oyligi bekor qilinsinmi? Chiqim ham o'chadi.`))
    return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/salaries/${row.teacher_id}/unpay/`,
      "POST",
      { month: month.value },
    );
    if (!ok) return say(data.error || "Bekor qilinmadi");
    replaceRow(data);
    say("To'lov bekor qilindi");
  } finally {
    busy.value = false;
  }
}

function openAdvance(row) {
  advanceFor.value = row;
  advanceForm.amount = null;
  advanceForm.note = "";
}

async function saveAdvance() {
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/salaries/${advanceFor.value.teacher_id}/advance/`,
      "POST",
      { month: month.value, amount: advanceForm.amount, note: advanceForm.note },
    );
    if (!ok) return say(data.error || "Saqlanmadi");
    replaceRow(data);
    expanded.value = new Set([...expanded.value, data.teacher_id]);
    advanceFor.value = null;
    say("Avans chiqimlarga yozildi");
  } finally {
    busy.value = false;
  }
}

async function removeAdvance(id) {
  if (!confirm("Avans o'chirilsinmi? Chiqim ham o'chadi.")) return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/super/advances/${id}/delete/`, "DELETE");
    if (!ok) return say(data.error || "O'chirilmadi");
    replaceRow(data);
    say("Avans o'chirildi");
  } finally {
    busy.value = false;
  }
}

watch(month, load);
onMounted(load);
</script>
