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

    <p v-if="toast"
      class="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-40">
      {{ toast }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import ManagerNav from "@/components/ManagerNav.vue";
import { apiGet, apiSend, currentUser } from "@/utils/managerApi";

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
    const p = new URLSearchParams();
    if (activeTeacher.value) p.set("teacher_id", activeTeacher.value);
    if (search.value.trim()) p.set("search", search.value.trim());
    if (includeGraduates.value) p.set("include_graduates", "1");
    const { data } = await apiGet(`/students/overview/?${p}`);
    students.value = data.students || [];
    hidden.value = data.hidden || [];
  } catch (e) {
    console.error("students/overview:", e);
    say("Ma'lumot yuklanmadi");
  } finally {
    loading.value = false;
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
watch([search, activeTeacher, includeGraduates], () => {
  clearTimeout(timer);
  timer = setTimeout(fetchStudents, 300);
});

onMounted(async () => {
  await fetchTeachers();
  await fetchStudents();
});
</script>
