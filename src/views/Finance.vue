<template>
  <SuperLayout title="Moliya" subtitle="To'lovlar va xarajatlar monitoringi">

    <div class="flex justify-end mb-4">
      <input type="month" v-model="selectedMonth"
        class="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 shadow-sm" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-2xl border border-white/20 shadow-sm p-16 text-center">
      <div class="flex flex-col items-center gap-3">
        <AppIcon name="spinner" class="w-8 h-8 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400">Ma'lumotlar yuklanmoqda...</p>
      </div>
    </div>

    <template v-else>
      <!-- ══════════ ASOSIY KARTALAR: Foyda / Zarar / Xarajat ══════════ -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <!-- Yig'ilgan pul -->
        <div
          class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div
            class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity">
          </div>
          <div class="relative">
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200 shrink-0">
                <AppIcon name="money" class="w-4 h-4 text-white" />
              </div>
              <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Yig'ilgan pul</span>
            </div>
            <p class="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums break-words">
              {{ fmt(summary.collected_total) }}
            </p>
            <p class="text-xs text-emerald-500 font-medium mt-1.5 flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {{ summary.paid_count }} student to'ladi
            </p>
          </div>
        </div>

        <!-- Xarajat -->
        <div
          class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div
            class="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity">
          </div>
          <div class="relative">
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center shadow-sm shadow-rose-200 shrink-0">
                <AppIcon name="receipt" class="w-4 h-4 text-white" />
              </div>
              <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Xarajat</span>
            </div>
            <p class="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums break-words">
              {{ fmt(summary.expenses_total) }}
            </p>
            <p class="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              {{ monthExpenses.length }} ta xarajat yozuvi
            </p>
          </div>
        </div>

        <!-- Sof foyda/zarar -->
        <div class="rounded-2xl p-5 relative overflow-hidden shadow-sm" :class="summary.profit >= 0
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-700'
          : 'bg-gradient-to-br from-orange-400 to-rose-500'
          ">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
          <div class="relative">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5"
                  viewBox="0 0 24 24">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <span class="text-xs font-medium text-white/70 uppercase tracking-wider">
                {{ summary.profit >= 0 ? "Sof foyda" : "Sof zarar" }}
              </span>
            </div>
            <p class="text-xl sm:text-2xl font-bold text-white tabular-nums break-words">
              {{ summary.profit >= 0 ? "+" : "" }}{{ fmt(summary.profit) }}
            </p>
            <p class="text-xs text-white/70 font-medium mt-1.5 flex items-center gap-1">
              <span>{{
                summary.profit >= 0 ? "Ijobiy holat" : "Manfiy holat"
              }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- ══════════ STUDENTLAR TO'LOVI STATISTIKASI ══════════ -->
      <div class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 mb-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
          {{ formatMonth(selectedMonth) }} — studentlar to'lov holati
        </h2>
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="bg-slate-100 rounded-xl p-3.5 text-center">
            <p class="text-lg sm:text-xl font-bold text-slate-800 tabular-nums">
              {{ summary.total_students }}
            </p>
            <p class="text-xs text-slate-400 mt-1">Jami studentlar</p>
          </div>
          <div class="bg-emerald-50 rounded-xl p-3.5 text-center">
            <p class="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums">
              {{ summary.paid_count }}
            </p>
            <p class="text-xs text-emerald-500 mt-1">To'lov qilgan</p>
          </div>
          <div class="bg-red-50 rounded-xl p-3.5 text-center">
            <p class="text-lg sm:text-xl font-bold text-red-600 tabular-nums">
              {{ summary.unpaid_count }}
            </p>
            <p class="text-xs text-red-400 mt-1">To'lamagan</p>
          </div>
          <div class="bg-amber-50 rounded-xl p-3.5 text-center">
            <p class="text-lg sm:text-xl font-bold text-amber-600 tabular-nums">
              {{ summary.not_generated_count }}
            </p>
            <p class="text-xs text-amber-500 mt-1">Hisoblanmagan</p>
          </div>
          <div class="bg-indigo-50 rounded-xl p-3.5 text-center col-span-2 lg:col-span-1">
            <p class="text-lg sm:text-xl font-bold text-indigo-600 tabular-nums">
              {{
                summary.total_students
                  ? Math.round(
                    (summary.paid_count / summary.total_students) * 100,
                  )
                  : 0
              }}%
            </p>
            <p class="text-xs text-indigo-400 mt-1">To'lov foizi</p>
          </div>
        </div>

        <!-- ✅ TUZATILGAN: Remaining calculation va conditional coloring -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
          <div>
            <p class="text-xs text-slate-400 mb-1">
              Jami bo'lishi kerak (100% to'lansa)
            </p>
            <p class="text-base font-bold text-slate-700 tabular-nums">
              {{ fmt(summary.expected_total) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-1">Hozircha yig'ilgan</p>
            <p class="text-base font-bold text-emerald-600 tabular-nums">
              {{ fmt(summary.collected_total) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-1">
              {{
                calculatedRemaining > 0
                  ? "Qolgan (kutilayotgan) summa"
                  : "Ortiqcha yig'ilgan"
              }}
            </p>
            <p class="text-base font-bold tabular-nums" :class="calculatedRemaining > 0 ? 'text-red-500' : 'text-emerald-600'
              ">
              {{
                calculatedRemaining > 0
                  ? "-" + fmt(calculatedRemaining)
                  : "+" + fmt(Math.abs(calculatedRemaining))
              }}
            </p>
          </div>
        </div>

        <!-- ✅ TUZATILGAN: Progress bar color oshirmasi -->
        <div class="mt-4">
          <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" :class="calculatedRemaining > 0
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-indigo-400 to-indigo-500'
              " :style="{ width: collectionPercent + '%' }"></div>
          </div>
          <p class="text-xs text-slate-400 mt-1.5 text-right">
            {{
              collectionPercent >= 100
                ? "To'landi"
                : collectionPercent + "% yig'ildi"
            }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div class="flex gap-1 bg-white border border-white/20 shadow-sm rounded-xl p-1">
          <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key" :class="activeTab === tab.key
            ? 'bg-slate-800 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            "
            class="px-4 sm:px-5 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center gap-2">
            <span>{{ tab.label }}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-md" :class="activeTab === tab.key
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-500'
              ">
              {{
                tab.key === "payments"
                  ? monthPayments.length
                  : monthExpenses.length
              }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-3 flex-1 sm:flex-none justify-end">
          <button v-if="activeTab === 'expenses'" @click="showExpenseForm = !showExpenseForm"
            class="px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all active:scale-95 flex items-center gap-1.5 shrink-0">
            <span class="text-base leading-none">{{
              showExpenseForm ? "×" : "+"
            }}</span>
            <span class="hidden sm:inline">{{
              showExpenseForm ? "Yopish" : "Xarajat qo'shish"
            }}</span>
          </button>

          <div class="relative flex-1 sm:flex-none">
            <AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input v-model="search" type="text" placeholder="Qidirish..."
              class="w-full sm:w-52 pl-9 pr-4 py-2 text-sm bg-white border border-white/20 shadow-sm rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all" />
          </div>
        </div>
      </div>

      <!-- Xarajat qo'shish formasi -->
      <div v-if="activeTab === 'expenses' && showExpenseForm"
        class="bg-white rounded-2xl border border-white/20 shadow-sm p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">Yangi xarajat</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Nomi</label>
            <input v-model="expenseForm.title" type="text" placeholder="Masalan: Internet" :class="expenseErrorFields.has('title')
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200'
              " class="w-full px-3 py-2 rounded-xl border outline-none text-sm focus:border-indigo-300 transition" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Summa (so'm)</label>
            <input v-model.number="expenseForm.amount" type="number" min="0" placeholder="0" :class="expenseErrorFields.has('amount')
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200'
              " class="w-full px-3 py-2 rounded-xl border outline-none text-sm focus:border-indigo-300 transition" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Kategoriya</label>
            <select v-model="expenseForm.category"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-300 transition">
              <option v-for="c in categoryOptions" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Sana</label>
            <input v-model="expenseForm.date" type="date"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-300 transition" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Izoh (ixtiyoriy)</label>
            <input v-model="expenseForm.note" type="text" placeholder="Qo'shimcha izoh"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm focus:border-indigo-300 transition" />
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <button @click="submitExpense" :disabled="expenseSaving"
            class="w-full sm:w-auto px-5 py-2 text-sm font-medium rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50">
            {{ expenseSaving ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </div>

      <!-- Payments Table -->
      <div v-if="activeTab === 'payments'"
        class="bg-white rounded-2xl border border-white/20 shadow-sm overflow-x-auto">
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="border-b border-white/20 bg-slate-50/70">
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Talaba
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Oylik to'lov
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                To'langan
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Qolgan
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Holat
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="filteredPayments.length === 0">
              <td colspan="5" class="px-5 py-12 text-center text-sm text-slate-400">
                Bu oy uchun to'lov topilmadi
              </td>
            </tr>
            <tr v-for="p in filteredPayments" :key="p.id" class="hover:bg-white/10 transition-colors group">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                    {{ initials(p.student_name) }}
                  </div>
                  <div>
                    <span class="text-sm font-medium text-slate-700 block">{{
                      p.student_name
                    }}</span>
                    <span class="text-xs text-slate-400">{{
                      p.teacher_name
                    }}</span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5 text-sm font-bold tabular-nums text-slate-700">
                {{ fmt(netDueOf(p)) }}
                <span v-if="p.discount > 0" class="block text-[11px] font-normal text-slate-400 line-through">
                  {{ fmt(p.amount_due) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-sm font-bold tabular-nums" :class="paidAmountOf(p) > 0 ? 'text-emerald-600' : 'text-slate-300'
                ">
                {{ fmt(paidAmountOf(p)) }}
              </td>
              <td class="px-5 py-3.5 text-sm font-bold tabular-nums" :class="remainingOf(p) > 0 ? 'text-red-500' : 'text-emerald-600'
                ">
                {{ remainingOf(p) > 0 ? "-" : ""
                }}{{ fmt(Math.abs(remainingOf(p))) }}
              </td>
              <td class="px-5 py-3.5">
                <span :class="p.is_paid
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
                  " class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full" :class="p.is_paid ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                  {{ p.is_paid ? "To'langan" : "Kutilmoqda" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Expenses Table -->
      <div v-if="activeTab === 'expenses'"
        class="bg-white rounded-2xl border border-white/20 shadow-sm overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead>
            <tr class="border-b border-white/20 bg-slate-50/70">
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Nomi
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Miqdor
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Kategoriya
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Sana
              </th>
              <th class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                Amal
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="filteredExpenses.length === 0">
              <td colspan="5" class="px-5 py-12 text-center text-sm text-slate-400">
                Bu oy uchun xarajat topilmadi
              </td>
            </tr>
            <tr v-for="e in filteredExpenses" :key="e.id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <AppIcon name="receipt" class="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div>
                    <span class="text-sm font-medium text-slate-700 block">{{
                      e.title
                    }}</span>
                    <span v-if="e.note" class="text-xs text-slate-400">{{
                      e.note
                    }}</span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5 text-sm font-bold text-rose-500 tabular-nums">
                −{{ fmt(e.amount) }}
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  {{ e.category_display || e.category }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-sm text-slate-400 tabular-nums">
                {{ formatDate(e.date) }}
              </td>
              <td class="px-5 py-3.5">
                <button @click="removeExpense(e.id)"
                  class="text-xs font-medium text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all active:scale-95 sm:opacity-0 sm:group-hover:opacity-100">
                  O'chirish
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.show"
        class="fixed bottom-6 right-6 left-6 sm:left-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
        :class="toast.type === 'success'
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white'
          ">
        <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor"
          stroke-width="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ toast.message }}
      </div>
    </transition>
  </SuperLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { API, authHeaders } from "@/utils/managerApi";

// Moliya supermenejer bo'limi — so'rovlarga 'X-User-Phone' qo'shilmasa
// backend 403 qaytaradi
const jsonHeaders = () => authHeaders({ "Content-Type": "application/json" });

const payments = ref([]);
const expenses = ref([]);
const loading = ref(true);
const activeTab = ref("payments");
const search = ref("");
const toast = ref({ show: false, message: "", type: "success" });
const selectedMonth = ref(new Date().toISOString().slice(0, 7));

const summary = ref({
  total_students: 0,
  generated_count: 0,
  not_generated_count: 0,
  paid_count: 0,
  unpaid_count: 0,
  expected_total: 0,
  collected_total: 0,
  remaining_total: 0,
  expenses_total: 0,
  profit: 0,
});

const showExpenseForm = ref(false);
const expenseSaving = ref(false);
const expenseErrorFields = ref(new Set());
const expenseForm = ref({
  title: "",
  amount: null,
  category: "other",
  date: new Date().toISOString().slice(0, 10),
  note: "",
});

const categoryOptions = [
  { value: "salary", label: "Maosh" },
  { value: "utility", label: "Kommunal" },
  { value: "equipment", label: "Qurilmalar" },
  { value: "rent", label: "Ijara" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Boshqa" },
];

const tabs = [
  { key: "payments", label: "To'lovlar" },
  { key: "expenses", label: "Xarajatlar" },
];

// ── Formatters ──
const fmt = (n) => (n ?? 0).toLocaleString("uz-UZ") + " so'm";
const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
};
const initials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};
const monthNames = [
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
const formatMonth = (m) => {
  if (!m) return "—";
  const [year, month] = m.split("-");
  const idx = parseInt(month, 10) - 1;
  return monthNames[idx] ? `${monthNames[idx]} ${year}` : m;
};

// ── Joriy oy uchun to'lov va xarajatlar ──
const monthPayments = computed(() => payments.value);
const monthExpenses = computed(() => expenses.value);

const paidAmountOf = (p) => Number(p.paid_amount ?? 0) || 0;
// Chegirmadan keyingi sof summa — markaz qo'liga tushadigan pul shu.
// Chegirma ayrilmasa chegirma berilgan o'quvchi to'liq to'lagan bo'lsa ham
// "qarzdor" bo'lib ko'rinardi.
const netDueOf = (p) =>
  Math.max(0, (Number(p.amount_due) || 0) - (Number(p.discount) || 0));
const remainingOf = (p) => netDueOf(p) - paidAmountOf(p);

// ✅ TUZATILGAN: Remaining qiymatini to'g'ri hisoblash
const calculatedRemaining = computed(() => {
  return Math.max(0, summary.value.remaining_total);
});

const collectionPercent = computed(() => {
  if (!summary.value.expected_total) return 0;
  return Math.min(
    100,
    Math.round(
      (summary.value.collected_total / summary.value.expected_total) * 100,
    ),
  );
});

const filteredPayments = computed(() => {
  if (!search.value) return monthPayments.value;
  const q = search.value.toLowerCase();
  return monthPayments.value.filter(
    (p) =>
      (p.student_name || "").toLowerCase().includes(q) ||
      (p.teacher_name || "").toLowerCase().includes(q),
  );
});
const filteredExpenses = computed(() => {
  if (!search.value) return monthExpenses.value;
  const q = search.value.toLowerCase();
  return monthExpenses.value.filter(
    (e) =>
      (e.title || "").toLowerCase().includes(q) ||
      (e.category_display || e.category || "").toLowerCase().includes(q),
  );
});

// ── Toast helper ──
const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

// ── API calls ──
const loadPayments = async () => {
  try {
    const res = await fetch(`${API}/payments/?month=${selectedMonth.value}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error();
    payments.value = await res.json();
  } catch (err) {
    console.error("payments fetch error:", err);
    payments.value = [];
    showToast("To'lovlarni yuklashda xatolik", "error");
  }
};

const loadExpenses = async () => {
  try {
    const res = await fetch(`${API}/expenses/?month=${selectedMonth.value}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error();
    expenses.value = await res.json();
  } catch (err) {
    console.error("expenses fetch error:", err);
    expenses.value = [];
    showToast("Xarajatlarni yuklashda xatolik", "error");
  }
};

const loadSummary = async () => {
  try {
    const res = await fetch(
      `${API}/finance-summary/?month=${selectedMonth.value}`,
      { headers: authHeaders() },
    );
    if (!res.ok) throw new Error();
    summary.value = await res.json();
  } catch (err) {
    console.error("finance summary fetch error:", err);
    showToast("Hisobotni yuklashda xatolik", "error");
  }
};

async function loadAll() {
  loading.value = true;
  await Promise.allSettled([loadPayments(), loadExpenses(), loadSummary()]);
  loading.value = false;
}

// Oy o'zgarganda hammasi qayta yuklanadi
watch(selectedMonth, () => {
  loadAll();
});

function resetExpenseForm() {
  expenseForm.value = {
    title: "",
    amount: null,
    category: "other",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

async function submitExpense() {
  expenseErrorFields.value.clear();
  const missing = [];
  if (!expenseForm.value.title?.trim()) missing.push("title");
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0)
    missing.push("amount");

  if (missing.length) {
    missing.forEach((f) => expenseErrorFields.value.add(f));
    showToast("Nomi va summani to'g'ri kiriting", "error");
    return;
  }

  expenseSaving.value = true;
  try {
    const res = await fetch(`${API}/expenses/create/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        title: expenseForm.value.title.trim(),
        amount: expenseForm.value.amount,
        category: expenseForm.value.category,
        date: expenseForm.value.date,
        note: expenseForm.value.note?.trim() || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Xatolik yuz berdi", "error");
      return;
    }

    // Faqat tanlangan oyga tegishli bo'lsa jadvalga qo'shamiz
    if (data.date && data.date.startsWith(selectedMonth.value)) {
      expenses.value.unshift(data);
    }

    resetExpenseForm();
    showExpenseForm.value = false;
    showToast("Xarajat qo'shildi");
    await loadSummary(); // real-time: foyda/zarar darhol yangilanadi
  } catch (err) {
    console.error("create expense error:", err);
    showToast("Internet aloqasini tekshiring", "error");
  } finally {
    expenseSaving.value = false;
  }
}

async function removeExpense(id) {
  if (!confirm("Bu xarajatni o'chirmoqchimisiz?")) return;
  try {
    const res = await fetch(`${API}/expenses/${id}/delete/`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error();
    expenses.value = expenses.value.filter((e) => e.id !== id);
    showToast("Xarajat o'chirildi");
    await loadSummary(); // real-time: foyda/zarar darhol yangilanadi
  } catch (err) {
    console.error("delete expense error:", err);
    showToast("O'chirishda xatolik", "error");
  }
}

onMounted(loadAll);
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>
