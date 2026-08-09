<template>
  <div class="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans pb-28">
    <ManagerNav title="O'quvchilar va ustozlar"
      subtitle="Ustozni tanlab, unga tegishli o'quvchilarni ko'ring va boshqa ustozga o'tkazing" />

    <!-- ══════════ USTOZ TANLASH ══════════ -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button @click="selectTeacher('')" :class="chip(activeTeacher === '')">
        Barchasi
        <span class="opacity-60 tabular-nums">{{ totalStudents }}</span>
      </button>
      <button v-for="t in teachers" :key="t.id" @click="selectTeacher(String(t.id))"
        :class="chip(activeTeacher === String(t.id))">
        {{ t.name }}
        <span class="opacity-60 tabular-nums">{{ t.students_count }}</span>
      </button>
      <button v-if="unassignedCount > 0" @click="selectTeacher('none')" :class="chip(activeTeacher === 'none')">
        Biriktirilmagan
        <span class="opacity-60 tabular-nums">{{ unassignedCount }}</span>
      </button>
    </div>

    <!-- ══════════ DAVR VA HOLAT ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-slate-700">
          Ro'yxatga olingan davr
          <span class="text-xs font-normal text-slate-400">— {{ rangeLabel(range) }}</span>
        </p>
        <button v-if="canManage" @click="openImport"
          class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 hover:text-indigo-500 transition flex items-center gap-1.5">
          <AppIcon name="plus" /> Jadvaldan yuklash
        </button>
      </div>

      <DateRange v-model="range" />

      <!-- Davr kesimidagi sanoq: "30 yozildi, 5 kutilmoqda, 5 ga bog'lanish kerak" -->
      <div class="flex flex-wrap gap-2 pt-1">
        <button @click="statusFilter = ''" :class="chip(statusFilter === '')">
          Hammasi
          <span class="opacity-60 tabular-nums">{{ summary.total || 0 }}</span>
        </button>
        <button v-for="st in STUDENT_STATUSES" :key="st.key" @click="statusFilter = st.key"
          :class="chip(statusFilter === st.key)">
          <span class="w-1.5 h-1.5 rounded-full" :class="st.dot"></span>
          {{ st.label }}
          <span class="opacity-60 tabular-nums">{{ summary[st.key] || 0 }}</span>
        </button>
      </div>
    </div>

    <!-- ══════════ ASOSIY KARTA ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <input v-model="search" type="text" placeholder="Ism yoki telefon bo'yicha qidirish..."
          class="flex-1 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 transition" />
        <label class="flex items-center gap-2 text-xs text-slate-500 shrink-0 cursor-pointer select-none">
          <input type="checkbox" v-model="includeGraduates" class="accent-indigo-500" />
          Bitiruvchilar ham
        </label>
        <p class="text-xs text-slate-400 shrink-0 tabular-nums">
          {{ students.length.toLocaleString() }} ta
        </p>
      </div>

      <div v-if="loading" class="p-16 text-center">
        <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
      </div>

      <div v-else-if="!students.length" class="p-16 text-center">
        <p class="text-sm text-slate-400">Hech narsa topilmadi</p>

        <!-- Ro'yxat ustozning admin profilini, menejer profilini va
             bitiruvchini yashiradi. Login va ro'yxatdan o'tkazish esa
             ularni ko'radi — shuning uchun "topilmadi" bo'lsa ham
             "bu raqam band" degan xato chiqishi mumkin. Sababini
             aytmasak, izlash imkonsiz. -->
        <div v-if="hidden.length"
          class="mt-5 mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
          <p class="text-xs font-medium text-amber-700">
            Bu raqam band, lekin ro'yxatda ko'rsatilmaydi:
          </p>
          <ul class="mt-2 space-y-1">
            <li v-for="h in hidden" :key="h.id" class="text-xs text-amber-600">
              <span class="font-medium">{{ h.name }}</span> — {{ h.kind }}
            </li>
          </ul>
          <p class="text-[11px] text-amber-500 mt-2 leading-relaxed">
            Bitiruvchi bo'lsa «Bitiruvchilar ham» katagini belgilang.
            Ustoz yoki menejer profili bo'lsa u shu ro'yxatga umuman
            tushmaydi — uni «Ustozlar» yoki «Menejerlar» bo'limidan
            qidiring.
          </p>
        </div>
      </div>

      <template v-else>
        <!-- Desktop jadval -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400 select-none">
                <th class="px-3 py-2.5 w-10">
                  <input type="checkbox" class="accent-indigo-500" :checked="allSelected" @change="toggleAll" />
                </th>
                <th class="px-3 py-2.5 font-medium w-10 text-right"></th>
                <th class="px-3 py-2.5 font-medium">Ism familiya</th>
                <th class="px-3 py-2.5 font-medium">Holat</th>
                <th class="px-3 py-2.5 font-medium">Telefon</th>
                <th class="px-3 py-2.5 font-medium">Ustoz</th>
                <th class="px-3 py-2.5 font-medium">Kunlar</th>
                <th class="px-3 py-2.5 font-medium">Karta / Chegirma</th>
                <th v-if="canManage" class="px-3 py-2.5 font-medium w-10 text-right">
                  Amal
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in students" :key="s.id" @click="toggleOne(s.id)" :class="[
                'border-t border-white/20 cursor-pointer transition-colors',
                selected.has(s.id) ? 'bg-white/10' : 'hover:bg-white/10',
              ]">
                <td class="px-3 py-2" @click.stop>
                  <input type="checkbox" class="accent-indigo-500" :checked="selected.has(s.id)"
                    @change="toggleOne(s.id)" />
                </td>
                <td class="px-3 py-2 text-right text-slate-300 tabular-nums text-xs">
                  {{ i + 1 }}
                </td>
                <td class="px-3 py-2 text-slate-700 font-medium">
                  {{ s.name }} {{ s.surname }}
                  <span v-if="s.is_graduate"
                    class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">bitiruvchi</span>
                </td>
                <td class="px-3 py-2" @click.stop>
                  <select v-if="canManage" :value="s.status" @change="changeStatus(s, $event.target.value)"
                    :disabled="statusSavingId === s.id" :class="[
                      'text-[11px] rounded-full px-2 py-1 border-0 outline-none cursor-pointer disabled:opacity-40',
                      statusInfo(s.status).chip,
                    ]">
                    <option v-for="st in STUDENT_STATUSES" :key="st.key" :value="st.key">
                      {{ st.label }}
                    </option>
                  </select>
                  <span v-else class="text-[10px] px-1.5 py-0.5 rounded-full" :class="statusInfo(s.status).chip">
                    {{ statusInfo(s.status).label }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <a v-if="s.phone" :href="'tel:' + tel(s.phone)" @click.stop
                    class="text-indigo-500 hover:underline tabular-nums whitespace-nowrap">{{ s.phone }}</a>
                  <span v-else class="text-slate-200">·</span>
                </td>
                <td class="px-3 py-2 text-slate-500">
                  <span v-if="s.teacher_name">{{ s.teacher_name }}</span>
                  <span v-else class="text-rose-400 text-xs">biriktirilmagan</span>
                </td>
                <td class="px-3 py-2 text-slate-400 text-xs">
                  {{ s.schedule === "odd" ? "Du-Chor-Ju" : s.schedule === "daily" ? "Har kuni" : "Se-Pay-Sha" }}
                </td>
                <td class="px-3 py-2" @click.stop>
                  <!-- Tahrir rejimi -->
                  <div v-if="editingDiscountId === s.id" class="flex items-center gap-1.5">
                    <input type="number" min="0" step="1000" v-model.number="discountDraft"
                      class="w-24 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-300"
                      placeholder="0" />
                    <button @click="saveDiscount(s)" :disabled="savingDiscount"
                      class="px-2 py-1 rounded-lg bg-slate-900 text-white text-xs disabled:opacity-40">
                      Saqlash
                    </button>
                    <button @click="cancelDiscount"
                      class="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs">
                      ×
                    </button>
                  </div>
                  <!-- Ko'rinish rejimi -->
                  <div v-else class="flex flex-wrap items-center gap-1.5">
                    <span v-if="s.wallet_balance > 0"
                      class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium whitespace-nowrap"
                      title="Kartada qolgan pul">+{{ money(s.wallet_balance) }}</span>
                    <span v-if="s.wallet_debt > 0"
                      class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium whitespace-nowrap"
                      title="Qarzdorlik">−{{ money(s.wallet_debt) }}</span>
                    <span v-if="!s.wallet_balance && !s.wallet_debt" class="text-[11px] text-slate-300">—</span>
                    <button v-if="isManager" @click="openDiscount(s)"
                      class="text-[11px] border p-1 text-indigo-400 rounded-2xl"
                      :title="s.monthly_discount ? 'Oylik chegirma: ' + money(s.monthly_discount) : 'Doimiy oylik chegirma qo\'shish'">
                      {{ s.monthly_discount > 0 ? "Chegirma: " + money(s.monthly_discount) : "Chegirma qo'shish" }}
                    </button>
                  </div>
                </td>
                <td v-if="canManage" class="px-3 py-2 text-right" @click.stop>
                  <button @click="deleteStudent(s)" :disabled="deletingId === s.id" title="O'quvchini o'chirish"
                    class="text-slate-300 hover:bg-red-600 cursor-pointer px-2 transition p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                    <AppIcon :name="deletingId === s.id ? 'spinner' : 'trash'" :class="[
                      'w-4 h-4 ',
                      deletingId === s.id ? 'animate-spin' : '',
                    ]" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobil kartalar -->
        <div class="sm:hidden divide-y divide-slate-100">
          <div v-for="s in students" :key="s.id" @click="toggleOne(s.id)" :class="[
            'p-4 flex items-start gap-3',
            selected.has(s.id) ? 'bg-indigo-50/70' : '',
          ]">
            <input type="checkbox" class="accent-indigo-500 mt-1 shrink-0" :checked="selected.has(s.id)" @click.stop
              @change="toggleOne(s.id)" />
            <div class="min-w-0 flex-1 space-y-1">
              <p class="font-semibold text-slate-800 text-sm leading-snug">
                {{ s.name }} {{ s.surname }}
              </p>
              <div class="flex items-center gap-2" @click.stop>
                <select v-if="canManage" :value="s.status" @change="changeStatus(s, $event.target.value)"
                  :disabled="statusSavingId === s.id" :class="[
                    'text-[11px] rounded-full px-2 py-0.5 border-0 outline-none disabled:opacity-40',
                    statusInfo(s.status).chip,
                  ]">
                  <option v-for="st in STUDENT_STATUSES" :key="st.key" :value="st.key">
                    {{ st.label }}
                  </option>
                </select>
                <span v-else class="text-[10px] px-1.5 py-0.5 rounded-full" :class="statusInfo(s.status).chip">
                  {{ statusInfo(s.status).label }}
                </span>
              </div>
              <p class="text-[13px] text-slate-500">
                {{ s.teacher_name || "biriktirilmagan" }}
              </p>
              <a v-if="s.phone" :href="'tel:' + tel(s.phone)" @click.stop
                class="text-indigo-500 tabular-nums text-[13px]">{{ s.phone }}</a>
              <!-- Karta / chegirma -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1" @click.stop>
                <span v-if="s.wallet_balance > 0"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">Karta +{{
                    money(s.wallet_balance) }}</span>
                <span v-if="s.wallet_debt > 0"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">Qarz −{{
                    money(s.wallet_debt) }}</span>
                <template v-if="editingDiscountId === s.id">
                  <input type="number" min="0" step="1000" v-model.number="discountDraft"
                    class="w-20 border border-slate-200 rounded-lg px-2 py-0.5 text-xs outline-none" placeholder="0" />
                  <button @click="saveDiscount(s)" :disabled="savingDiscount"
                    class="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] disabled:opacity-40">Saqlash</button>
                  <button @click="cancelDiscount"
                    class="px-2 py-0.5 rounded-lg border border-slate-200 text-slate-500 text-[11px]">×</button>
                </template>
                <button v-else-if="isManager" @click="openDiscount(s)"
                  class="text-[11px] text-indigo-500 hover:underline">{{
                    s.monthly_discount > 0 ? "Chegirma: " + money(s.monthly_discount) : "Chegirma +" }}</button>
              </div>
            </div>
            <button v-if="canManage" @click.stop="deleteStudent(s)" :disabled="deletingId === s.id"
              title="O'quvchini o'chirish"
              class="shrink-0 text-slate-300 hover:text-rose-500 transition p-2 -m-1 rounded-lg hover:bg-rose-50 disabled:opacity-40">
              <AppIcon :name="deletingId === s.id ? 'spinner' : 'trash'"
                :class="['w-4 h-4', deletingId === s.id ? 'animate-spin' : '']" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ══════════ TANLANGANLARNI O'TKAZISH ══════════ -->
    <div v-if="selected.size"
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl p-4 z-30">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <p class="text-sm text-slate-600 shrink-0">
          <span class="font-semibold tabular-nums">{{ selected.size }}</span>
          ta o'quvchi tanlandi
        </p>
        <select v-model="transferTo"
          class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300">
          <option value="">Qaysi ustozga o'tkazilsin?</option>
          <option v-for="t in teachers" :key="t.id" :value="t.id">
            {{ t.name }} ({{ t.students_count }} ta)
          </option>
        </select>
        <button @click="doTransfer" :disabled="!transferTo || transferring"
          class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition shrink-0">
          {{ transferring ? "O'tkazilmoqda..." : "O'tkazish" }}
        </button>
        <button v-if="canManage" @click="doBulkDelete" :disabled="bulkDeleting"
          class="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-700 transition shrink-0 flex items-center gap-1.5">
          <AppIcon :name="bulkDeleting ? 'spinner' : 'trash'"
            :class="['w-4 h-4', bulkDeleting ? 'animate-spin' : '']" />
          {{ bulkDeleting ? "O'chirilmoqda..." : `O'chirish (${selected.size})` }}
        </button>
        <button @click="selected.clear()"
          class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition shrink-0">
          Bekor
        </button>
      </div>
    </div>

    <!-- ══════════ JADVALDAN YUKLASH ══════════ -->
    <div v-if="importOpen" class="fixed inset-0 bg-slate-900/40 flex items-start justify-center p-4 z-40 overflow-y-auto"
      @click.self="closeImport">
      <div class="bg-white rounded-2xl w-full max-w-3xl shadow-xl my-8">
        <div class="p-5 border-b border-slate-100">
          <p class="font-semibold text-slate-800">O'quvchilarni jadvaldan yuklash</p>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">
            Excel'dan nusxa olib shu yerga qo'ying yoki CSV faylni tanlang.
            Birinchi qator — ustun nomlari. Tan olinadigan ustunlar:
            <span class="font-mono text-slate-500">ism, familiya, telefon, telefon2, ustoz, guruh, holat, izoh</span>
          </p>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <label
              class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 cursor-pointer transition">
              CSV fayl tanlash
              <input type="file" accept=".csv,text/csv,text/plain" class="hidden" @change="onFile" />
            </label>
            <label class="flex items-center gap-2 text-xs text-slate-500">
              Holat (ustun bo'lmasa)
              <select v-model="importStatus"
                class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300">
                <option v-for="st in STUDENT_STATUSES" :key="st.key" :value="st.key">{{ st.label }}</option>
              </select>
            </label>
            <label class="flex items-center gap-2 text-xs text-slate-500">
              Guruh (ustun bo'lmasa)
              <select v-model="importGroupId"
                class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300">
                <option value="">— tanlanmagan —</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </label>
          </div>

          <textarea v-model="importText" rows="8" placeholder="ism	familiya	telefon	guruh
Ali	Valiyev	901234567	PY-1"
            class="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-indigo-300 transition"></textarea>

          <!-- Tekshiruv natijasi -->
          <div v-if="importResult" class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="flex flex-wrap gap-4 px-4 py-3 bg-slate-100 text-xs">
              <span class="text-emerald-600 font-medium">{{ importResult.summary.created }} yaratiladi</span>
              <span class="text-amber-600">{{ importResult.summary.duplicates }} dublikat</span>
              <span class="text-rose-600">{{ importResult.summary.errors }} xato</span>
              <span class="text-slate-400 ml-auto">jami {{ importResult.summary.total }} qator</span>
            </div>
            <div class="max-h-56 overflow-y-auto divide-y divide-slate-100">
              <div v-for="r in importResult.rows" :key="r.line" class="px-4 py-2 text-xs flex items-start gap-2">
                <span class="text-slate-300 tabular-nums w-6 shrink-0">{{ r.line }}</span>
                <span class="w-20 shrink-0" :class="{
                  'text-emerald-600': r.status === 'created',
                  'text-amber-600': r.status === 'duplicate',
                  'text-rose-600': r.status === 'error',
                }">
                  {{ r.status === "created" ? "yaratiladi" : r.status === "duplicate" ? "dublikat" : "xato" }}
                </span>
                <span class="text-slate-600 flex-1 min-w-0">
                  {{ r.name || "—" }}
                  <span v-if="r.group_name" class="text-slate-400">· {{ r.group_name }}</span>
                  <span v-if="r.reason" class="text-slate-400">— {{ r.reason }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
          <button @click="closeImport"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
            Yopish
          </button>
          <button @click="runImport(true)" :disabled="!importText.trim() || importBusy"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40">
            Tekshirish
          </button>
          <button @click="runImport(false)" :disabled="!canWriteImport || importBusy"
            class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40">
            {{ importBusy ? "Yuklanmoqda..." : `Yuklash${importResult ? ` (${importResult.summary.created})` : ""}` }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="toast"
      class="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
      {{ toast }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import ManagerNav from "@/components/ManagerNav.vue";
import DateRange from "@/components/DateRange.vue";
import { apiGet, apiSend, currentUser } from "@/utils/managerApi";
import { emptyRange, rangeLabel, rangeParams } from "@/utils/range";
import { STUDENT_STATUSES, statusInfo } from "@/utils/status";

// Faqat admin yoki menejer o'chira oladi (sahifa allaqachon menejerlarga
// cheklangan, bu qo'shimcha himoya va tugmalarni yashirish uchun)
const user = currentUser();
const canManage = computed(
  () => !!(user && (user.is_admin || user.role === "manager")),
);
// Chegirma berish faqat menejer huquqi (admin/ustoz emas)
const isManager = computed(() => user?.role === "manager");

const teachers = ref([]);
const students = ref([]);
// Qidiruvga mos, lekin ro'yxatda ko'rsatilmaydigan yozuvlar
// (bitiruvchi, ustoz/menejer profili) — "topilmadi" ni tushuntiradi
const hidden = ref([]);
const loading = ref(true);
const activeTeacher = ref("");
const search = ref("");
const includeGraduates = ref(false);
const selected = ref(new Set());
const transferTo = ref("");
const transferring = ref(false);
const toast = ref("");
const unassignedCount = ref(0);
const deletingId = ref(null);
const bulkDeleting = ref(false);

// Davr + holat filtri. Standart — butun davr: menejer sahifani ochganda
// hamma o'quvchisini ko'rishi kerak, davrni o'zi toraytiradi.
const range = ref(emptyRange());
const statusFilter = ref("");
const summary = ref({ pending: 0, contact: 0, active: 0, total: 0 });
const statusSavingId = ref(null);

// Jadvaldan yuklash
const importOpen = ref(false);
const importText = ref("");
const importStatus = ref("pending");
const importGroupId = ref("");
const importResult = ref(null);
const importBusy = ref(false);
const groups = ref([]);

// Doimiy oylik chegirma tahriri
const editingDiscountId = ref(null);
const discountDraft = ref(0);
const savingDiscount = ref(false);

const money = (v) => Number(v || 0).toLocaleString("uz-UZ") + " so'm";

function openDiscount(s) {
  editingDiscountId.value = s.id;
  discountDraft.value = Number(s.monthly_discount) || 0;
}

function cancelDiscount() {
  editingDiscountId.value = null;
  discountDraft.value = 0;
}

async function saveDiscount(s) {
  if (!isManager.value) return;
  let d = Number(discountDraft.value);
  if (isNaN(d) || d < 0) d = 0;
  savingDiscount.value = true;
  try {
    const { ok, data } = await apiSend(`/students/update/${s.id}/`, "PATCH", {
      monthly_discount: d,
    });
    if (!ok) {
      say(data.error || "Chegirma saqlanmadi");
      return;
    }
    s.monthly_discount = data.monthly_discount ?? d;
    if (data.wallet_balance !== undefined) s.wallet_balance = data.wallet_balance;
    if (data.wallet_debt !== undefined) s.wallet_debt = data.wallet_debt;
    editingDiscountId.value = null;
    say("Doimiy oylik chegirma saqlandi");
  } catch (e) {
    console.error("save discount:", e);
    say("Tarmoq xatosi");
  } finally {
    savingDiscount.value = false;
  }
}

const totalStudents = computed(() =>
  teachers.value.reduce((a, t) => a + t.students_count, 0)
);

const allSelected = computed(
  () => students.value.length > 0 && students.value.every((s) => selected.value.has(s.id))
);

const chip = (active) =>
  [
    "px-3.5 py-1.5 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5",
    active
      ? "bg-indigo-500 text-white border-indigo-500"
      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
  ].join(" ");

const tel = (v) => {
  const d = String(v).replace(/\D/g, "");
  return d.length === 9 ? `+998${d}` : `+${d}`;
};

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

function selectTeacher(id) {
  activeTeacher.value = id;
  selected.value = new Set();
}

function toggleOne(id) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}

function toggleAll() {
  selected.value = allSelected.value
    ? new Set()
    : new Set(students.value.map((s) => s.id));
}

async function fetchTeachers() {
  const { data } = await apiGet("/teachers/overview/");
  teachers.value = Array.isArray(data) ? data : [];
  const un = await apiGet("/students/overview/?teacher_id=none");
  unassignedCount.value = un.data.count || 0;
}

async function fetchStudents() {
  loading.value = true;
  try {
    const p = rangeParams(range.value);
    if (activeTeacher.value) p.set("teacher_id", activeTeacher.value);
    if (search.value.trim()) p.set("search", search.value.trim());
    if (includeGraduates.value) p.set("include_graduates", "1");
    if (statusFilter.value) p.set("status", statusFilter.value);
    const { ok, data } = await apiGet(`/students/overview/?${p}`);
    if (!ok) {
      say(data.error || "Ma'lumot yuklanmadi");
      return;
    }
    students.value = data.students || [];
    hidden.value = data.hidden || [];
    // Sanoq qidiruv va holat filtridan oldin olinadi — davr statistikasi
    // ro'yxat toraysa ham o'zgarmaydi
    summary.value = data.summary || { pending: 0, contact: 0, active: 0, total: 0 };
  } catch (e) {
    console.error("students/overview:", e);
    say("Ma'lumot yuklanmadi");
  } finally {
    loading.value = false;
  }
}

async function changeStatus(s, value) {
  if (!canManage.value || value === s.status) return;
  const before = s.status;
  statusSavingId.value = s.id;
  try {
    const { ok, data } = await apiSend(`/students/update/${s.id}/`, "PATCH", {
      status: value,
    });
    if (!ok) {
      s.status = before;
      say(data.error || "Holat saqlanmadi");
      return;
    }
    s.status = data.status || value;
    say(`Holat: ${data.status_label || value}`);
    // Sanoq va ro'yxat filtri holatga bog'liq — qayta o'qiymiz
    fetchStudents();
  } catch (e) {
    s.status = before;
    console.error("status:", e);
    say("Tarmoq xatosi");
  } finally {
    statusSavingId.value = null;
  }
}

// ── Jadvaldan yuklash ──
// Fayl brauzerda o'qiladi: menejer nima yuklanishini avval ekranda
// ko'radi, backendga esa tayyor qatorlar boradi.

const IMPORT_COLUMNS = {
  ism: "name", name: "name", "f.i.sh": "name", fish: "name", "ism familiya": "name",
  familiya: "surname", surname: "surname", familya: "surname",
  telefon: "phone", tel: "phone", phone: "phone", raqam: "phone",
  telefon2: "phone2", "qo'shimcha telefon": "phone2", phone2: "phone2",
  ustoz: "teacher_name", teacher: "teacher_name", "o'qituvchi": "teacher_name",
  guruh: "group_name", group: "group_name",
  holat: "status", status: "status",
  izoh: "note", note: "note",
  etap: "stage", stage: "stage",
};

const STATUS_WORDS = {
  kutilmoqda: "pending", kutmoqda: "pending", pending: "pending",
  "bog'lanish kerak": "contact", "boglanish kerak": "contact", contact: "contact",
  faol: "active", active: "active",
};

const canWriteImport = computed(
  () => !!importResult.value && importResult.value.summary.created > 0
);

function openImport() {
  importOpen.value = true;
  importResult.value = null;
  if (!groups.value.length) loadGroups();
}

function closeImport() {
  importOpen.value = false;
  importText.value = "";
  importResult.value = null;
}

async function loadGroups() {
  try {
    const { data } = await apiGet("/groups/");
    groups.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("groups:", e);
  }
}

function onFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    importText.value = String(reader.result || "");
    importResult.value = null;
  };
  reader.readAsText(file, "utf-8");
  event.target.value = "";
}

/** Excel'dan nusxa (tab bilan) ham, CSV (vergul/nuqta-vergul) ham tushunadi. */
function splitLine(line) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  return line.split(",");
}

function parseRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map((h) =>
    IMPORT_COLUMNS[h.trim().toLowerCase()] || ""
  );
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row = {};
    headers.forEach((key, i) => {
      if (!key) return;
      const value = (cells[i] || "").trim();
      if (!value) return;
      row[key] = key === "status" ? STATUS_WORDS[value.toLowerCase()] || value : value;
    });
    return row;
  });
}

async function runImport(dryRun) {
  const rows = parseRows(importText.value);
  if (!rows.length) {
    say("Qator topilmadi — birinchi qatorda ustun nomlari bo'lishi kerak");
    return;
  }
  importBusy.value = true;
  try {
    const { ok, data } = await apiSend("/students/import/", "POST", {
      rows,
      dry_run: dryRun,
      default_status: importStatus.value,
      default_group_id: importGroupId.value || null,
    });
    if (!ok) {
      say(data.error || "Yuklanmadi");
      return;
    }
    importResult.value = data;
    if (!dryRun) {
      say(`${data.summary.created} ta o'quvchi yuklandi`);
      await Promise.all([fetchTeachers(), fetchStudents()]);
      if (!data.summary.errors && !data.summary.duplicates) closeImport();
    }
  } catch (e) {
    console.error("import:", e);
    say("Tarmoq xatosi");
  } finally {
    importBusy.value = false;
  }
}

async function deleteStudent(s) {
  if (!canManage.value) return;
  if (
    !confirm(
      `${s.name} ${s.surname || ""} butunlay o'chiriladi (to'lovlari va davomati bilan). Davom etasizmi?`,
    )
  )
    return;
  deletingId.value = s.id;
  try {
    const { ok, data } = await apiSend("/students/bulk-delete/", "POST", {
      student_ids: [s.id],
    });
    if (!ok) {
      say(data.error || "O'chirishda xato");
      return;
    }
    students.value = students.value.filter((x) => x.id !== s.id);
    // Set'ni qayta yaratamiz — pastdagi panel reaktiv yangilanishi uchun
    if (selected.value.has(s.id)) {
      const next = new Set(selected.value);
      next.delete(s.id);
      selected.value = next;
    }
    say("O'quvchi o'chirildi");
    fetchTeachers(); // ustozlar sonini yangilaymiz
  } catch (e) {
    console.error("delete student:", e);
    say("Tarmoq xatosi");
  } finally {
    deletingId.value = null;
  }
}

async function doBulkDelete() {
  if (!canManage.value) return;
  const ids = [...selected.value];
  if (!ids.length) return;
  if (
    !confirm(
      `${ids.length} ta o'quvchi butunlay o'chiriladi (to'lovlari va davomati bilan). Bu amalni ortga qaytarib bo'lmaydi. Davom etasizmi?`,
    )
  )
    return;
  bulkDeleting.value = true;
  try {
    const { ok, data } = await apiSend("/students/bulk-delete/", "POST", {
      student_ids: ids,
    });
    if (!ok) {
      say(data.error || "O'chirishda xato");
      return;
    }
    const removed = new Set(ids);
    students.value = students.value.filter((s) => !removed.has(s.id));
    selected.value = new Set();
    say(`${data.deleted ?? ids.length} ta o'quvchi o'chirildi`);
    fetchTeachers();
  } catch (e) {
    console.error("bulk delete:", e);
    say("Tarmoq xatosi");
  } finally {
    bulkDeleting.value = false;
  }
}

async function doTransfer() {
  if (!transferTo.value || !selected.value.size) return;
  transferring.value = true;
  try {
    const { ok, data } = await apiSend("/students/transfer/", "POST", {
      student_ids: [...selected.value],
      to_teacher_id: transferTo.value,
    });
    if (!ok) {
      say(data.error || "O'tkazishda xato");
      return;
    }
    say(data.message);
    selected.value = new Set();
    transferTo.value = "";
    await Promise.all([fetchTeachers(), fetchStudents()]);
  } catch (e) {
    console.error("transfer:", e);
    say("Tarmoq xatosi");
  } finally {
    transferring.value = false;
  }
}

let timer = null;
watch([search, activeTeacher, includeGraduates, statusFilter, range], () => {
  clearTimeout(timer);
  timer = setTimeout(fetchStudents, 300);
}, { deep: true });

onMounted(async () => {
  await fetchTeachers();
  await fetchStudents();
});
</script>
