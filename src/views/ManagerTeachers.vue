<template>
  <div class="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans">
    <ManagerNav
      title="Ustozlar"
      subtitle="Telefon raqamni tahrirlash, o'quvchilarni ko'chirish va ustozni o'chirish"
    />

    <!-- ══════════ OGOHLANTIRISH ══════════ -->
    <div
      v-if="problem.length"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-sm font-medium text-amber-800 mb-1">
        <AppIcon name="warning" /> {{ problem.length }} ta ustozning raqami
        muammoli
      </p>
      <p class="text-xs text-amber-700">
        Raqami to'liq bo'lmagan ustoz tizimga kira olmaydi — quyidagi
        ro'yxatdan to'g'rilab qo'ying:
        <span class="font-medium">{{ problem.map((t) => t.name).join(", ") }}</span>
      </p>
    </div>

    <!-- ══════════ YANGI USTOZ ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
      <p class="text-sm font-medium text-slate-700 mb-3">Yangi ustoz qo'shish</p>
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          v-model="newTeacher.name"
          placeholder="Ism familiya"
          class="flex-1 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
        <input
          v-model="newTeacher.phone"
          placeholder="Telefon (90 123 45 67)"
          class="flex-1 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 tabular-nums"
        />
        <button
          @click="createTeacher"
          :disabled="!newTeacher.name || !newTeacher.phone || busy"
          class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-40 hover:bg-slate-800 transition shrink-0"
        >
          <AppIcon name="plus" /> Qo'shish
        </button>
      </div>
      <p class="text-[11px] text-slate-400 mt-2">
        Boshlang'ich parol: <span class="font-mono">excel2024</span>
      </p>
    </div>

    <!-- ══════════ DAVR ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-slate-700">
          To'lov davri
          <span class="text-xs font-normal text-slate-400">— {{ rangeLabel(range) }}</span>
        </p>
        <p class="text-xs text-slate-400">
          Kun oralig'i tegib o'tgan to'lov oylari hisobga olinadi
        </p>
      </div>

      <DateRange v-model="range" />

      <div v-if="totals" class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div class="rounded-xl bg-slate-100 px-3 py-2">
          <p class="text-[11px] text-slate-400">O'quvchi</p>
          <p class="text-sm font-semibold text-slate-700 tabular-nums">{{ totals.students }}</p>
        </div>
        <div class="rounded-xl bg-slate-100 px-3 py-2">
          <p class="text-[11px] text-slate-400">To'lov qilgan</p>
          <p class="text-sm font-semibold text-emerald-600 tabular-nums">{{ totals.paid_students }}</p>
        </div>
        <div class="rounded-xl bg-slate-100 px-3 py-2">
          <p class="text-[11px] text-slate-400">Yig'ildi</p>
          <p class="text-sm font-semibold text-slate-700 tabular-nums">{{ money(totals.collected) }}</p>
        </div>
        <div class="rounded-xl bg-slate-100 px-3 py-2">
          <p class="text-[11px] text-slate-400">Qoldi</p>
          <p class="text-sm font-semibold text-rose-500 tabular-nums">{{ money(totals.remaining) }}</p>
        </div>
      </div>
    </div>

    <!-- ══════════ RO'YXAT ══════════ -->
    <div
      class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div v-if="loading" class="p-16 text-center">
        <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="t in teachers" :key="t.id" class="p-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <!-- Ism -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-slate-800">{{ t.name }}</p>
                <span
                  v-if="t.is_senior"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600"
                  >katta ustoz</span
                >
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ t.students_count }} o'quvchi · {{ t.groups_count }} guruh
                <span v-if="t.pending_count" class="text-amber-600">· {{ t.pending_count }} kutilmoqda</span>
                <span v-if="t.contact_count" class="text-rose-500">· {{ t.contact_count }} bog'lanish kerak</span>
              </p>

              <!-- Davr bo'yicha to'lov holati -->
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                  {{ t.paid_students }} ta to'ladi
                </span>
                <span v-if="t.unpaid_students"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium">
                  {{ t.unpaid_students }} ta to'lamadi
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium tabular-nums">
                  {{ money(t.collected) }}
                </span>
                <span v-if="t.expected" class="text-[10px] text-slate-400 tabular-nums">
                  / {{ money(t.expected) }} ({{ t.collected_percent }}%)
                </span>
                <button @click="openHistory(t)"
                  class="text-[11px] text-indigo-500 hover:underline ml-1">
                  Tarix
                </button>
              </div>
            </div>

            <!-- Telefon: tahrir -->
            <div class="flex items-center gap-2 shrink-0">
              <template v-if="editing === t.id">
                <input
                  v-model="editPhone"
                  class="w-40 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm outline-none tabular-nums"
                  @keyup.enter="savePhone(t)"
                />
                <button
                  @click="savePhone(t)"
                  :disabled="busy"
                  class="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-40"
                >
                  <AppIcon name="check" /> Saqlash
                </button>
                <button
                  @click="editing = null"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-slate-50"
                >
                  <AppIcon name="x" />
                </button>
              </template>
              <template v-else>
                <span
                  :class="[
                    'tabular-nums text-sm',
                    t.phone_complete ? 'text-slate-600' : 'text-rose-500',
                  ]"
                  >{{ t.phone }}</span
                >
                <button
                  @click="startEdit(t)"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 hover:text-indigo-500 transition"
                >
                  <AppIcon name="edit" /> Tahrirlash
                </button>
                <button
                  @click="askDelete(t)"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition"
                >
                  <AppIcon name="trash" />
                </button>
              </template>
            </div>
          </div>

          <p v-if="t.phone_note" class="text-[11px] text-rose-500 mt-1.5">
            <AppIcon name="warning" /> {{ t.phone_note }}
          </p>
        </div>
      </div>
    </div>

    <!-- ══════════ O'CHIRISH MODALI ══════════ -->
    <div
      v-if="deleting"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-40"
      @click.self="deleting = null"
    >
      <div class="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl">
        <p class="font-semibold text-slate-800 mb-1">
          {{ deleting.name }} o'chirilsinmi?
        </p>
        <p class="text-sm text-slate-500 mb-4">
          Unda <span class="font-medium">{{ deleting.students_count }}</span> ta
          o'quvchi va
          <span class="font-medium">{{ deleting.groups_count }}</span> ta guruh
          bor. Ular kimga o'tsin?
        </p>

        <select
          v-model="deleteTo"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 mb-4"
        >
          <option value="">Hech kimga — biriktirilmagan holga tushsin</option>
          <option
            v-for="t in teachers.filter((x) => x.id !== deleting.id)"
            :key="t.id"
            :value="t.id"
          >
            {{ t.name }}
          </option>
        </select>

        <div class="flex gap-2 justify-end">
          <button
            @click="deleting = null"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50"
          >
            Bekor
          </button>
          <button
            @click="doDelete"
            :disabled="busy"
            class="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600 disabled:opacity-40"
          >
            O'chirish
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ USTOZ TARIXI ══════════ -->
    <div v-if="historyFor" class="fixed inset-0 bg-slate-900/40 flex items-start justify-center p-4 z-40 overflow-y-auto"
      @click.self="historyFor = null">
      <div class="bg-white rounded-2xl w-full max-w-4xl shadow-xl my-8">
        <div class="p-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-slate-800">{{ historyFor.name }} — tarix</p>
            <p class="text-xs text-slate-400 mt-0.5">{{ rangeLabel(range) }}</p>
          </div>
          <button @click="historyFor = null"
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-slate-50">
            <AppIcon name="x" /> Yopish
          </button>
        </div>

        <div v-if="historyLoading" class="p-16 text-center">
          <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        </div>

        <div v-else-if="history" class="p-5 space-y-5">
          <!-- Jami -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="rounded-xl bg-slate-100 px-3 py-2">
              <p class="text-[11px] text-slate-400">O'quvchi</p>
              <p class="text-sm font-semibold text-slate-700 tabular-nums">
                {{ history.totals.students }}
                <span class="text-[11px] font-normal text-slate-400">
                  ({{ history.totals.active_students }} faol)
                </span>
              </p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2">
              <p class="text-[11px] text-slate-400">To'lov qilgan</p>
              <p class="text-sm font-semibold text-emerald-600 tabular-nums">
                {{ history.totals.paid_students }} / {{ history.totals.students }}
              </p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2">
              <p class="text-[11px] text-slate-400">Yig'ildi</p>
              <p class="text-sm font-semibold text-slate-700 tabular-nums">{{ money(history.totals.collected) }}</p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2">
              <p class="text-[11px] text-slate-400">Qoldi</p>
              <p class="text-sm font-semibold text-rose-500 tabular-nums">{{ money(history.totals.remaining) }}</p>
            </div>
          </div>

          <!-- Oylar kesimi -->
          <div>
            <p class="text-xs font-medium text-slate-500 mb-2">Oylar bo'yicha</p>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th class="px-3 py-2 font-medium">Oy</th>
                    <th class="px-3 py-2 font-medium text-right">To'ladi</th>
                    <th class="px-3 py-2 font-medium text-right">Yig'ildi</th>
                    <th class="px-3 py-2 font-medium text-right">Kutilgan</th>
                    <th class="px-3 py-2 font-medium text-right">Qoldi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in history.months" :key="m.month" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-600 tabular-nums">{{ m.month }}</td>
                    <td class="px-3 py-2 text-right text-slate-500 tabular-nums">
                      {{ m.paid_students }} / {{ m.students }}
                    </td>
                    <td class="px-3 py-2 text-right text-slate-700 tabular-nums">{{ money(m.collected) }}</td>
                    <td class="px-3 py-2 text-right text-slate-400 tabular-nums">{{ money(m.expected) }}</td>
                    <td class="px-3 py-2 text-right tabular-nums"
                      :class="m.remaining ? 'text-rose-500' : 'text-slate-300'">
                      {{ money(m.remaining) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- O'quvchilar -->
          <div>
            <p class="text-xs font-medium text-slate-500 mb-2">
              O'quvchilari ({{ history.students.length }})
            </p>
            <div class="overflow-x-auto rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0">
                  <tr class="bg-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th class="px-3 py-2 font-medium">Ism</th>
                    <th class="px-3 py-2 font-medium">Holat</th>
                    <th class="px-3 py-2 font-medium">Guruh</th>
                    <th class="px-3 py-2 font-medium text-right">To'ladi</th>
                    <th class="px-3 py-2 font-medium text-right">Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in history.students" :key="s.id" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-600">{{ s.name }} {{ s.surname }}</td>
                    <td class="px-3 py-2">
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full" :class="statusInfo(s.status).chip">
                        {{ s.status_label }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-slate-400 text-xs">{{ s.group_name || "—" }}</td>
                    <td class="px-3 py-2 text-right tabular-nums"
                      :class="s.has_paid ? 'text-emerald-600' : 'text-slate-300'">
                      {{ money(s.collected) }}
                    </td>
                    <td class="px-3 py-2 text-right tabular-nums"
                      :class="s.remaining ? 'text-rose-500' : 'text-slate-300'">
                      {{ money(s.remaining) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Kassa jurnali -->
          <div v-if="history.entries.length">
            <p class="text-xs font-medium text-slate-500 mb-2">
              Pul harakati ({{ money(history.totals.received_in_range) }})
            </p>
            <div class="rounded-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
              <div v-for="e in history.entries" :key="e.id"
                class="px-3 py-2 text-xs flex items-center gap-3">
                <span class="text-slate-400 tabular-nums shrink-0">{{ e.created_at }}</span>
                <span class="text-slate-600 flex-1 min-w-0 truncate">{{ e.student_name }}</span>
                <span class="text-slate-300 tabular-nums shrink-0">{{ e.month }}</span>
                <span class="tabular-nums font-medium shrink-0"
                  :class="e.amount >= 0 ? 'text-emerald-600' : 'text-rose-500'">
                  {{ e.amount >= 0 ? "+" : "" }}{{ money(e.amount) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="toast"
      class="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50"
    >
      {{ toast }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import ManagerNav from "@/components/ManagerNav.vue";
import DateRange from "@/components/DateRange.vue";
import { apiGet, apiSend } from "@/utils/managerApi";
import { currentMonthRange, rangeLabel, rangeParams } from "@/utils/range";
import { statusInfo } from "@/utils/status";

const teachers = ref([]);
const loading = ref(true);
const busy = ref(false);
const toast = ref("");

// Pul hisoblari doim biror davrga tegishli — standart joriy oy
const range = ref(currentMonthRange());
const totals = ref(null);

const historyFor = ref(null);
const history = ref(null);
const historyLoading = ref(false);

const money = (v) => Number(v || 0).toLocaleString("uz-UZ");

const editing = ref(null);
const editPhone = ref("");
const deleting = ref(null);
const deleteTo = ref("");
const newTeacher = reactive({ name: "", phone: "" });

const problem = computed(() => teachers.value.filter((t) => !t.phone_complete));

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

function startEdit(t) {
  editing.value = t.id;
  editPhone.value = t.phone;
}

function askDelete(t) {
  deleting.value = t;
  deleteTo.value = "";
}

async function fetchTeachers() {
  loading.value = true;
  try {
    // ?format=full — davr, jami ko'rsatkichlar bilan birga
    const p = rangeParams(range.value);
    p.set("format", "full");
    const { ok, data } = await apiGet(`/teachers/overview/?${p}`);
    if (!ok) {
      say(data.error || "Ma'lumot yuklanmadi");
      return;
    }
    teachers.value = data.teachers || [];
    totals.value = data.totals || null;
  } catch (e) {
    console.error("teachers/overview:", e);
    say("Ma'lumot yuklanmadi");
  } finally {
    loading.value = false;
  }
}

async function openHistory(t) {
  historyFor.value = t;
  history.value = null;
  historyLoading.value = true;
  try {
    const { ok, data } = await apiGet(
      `/teachers/${t.id}/history/?${rangeParams(range.value)}`
    );
    if (!ok) {
      say(data.error || "Tarix yuklanmadi");
      historyFor.value = null;
      return;
    }
    history.value = data;
  } catch (e) {
    console.error("teacher history:", e);
    say("Tarmoq xatosi");
    historyFor.value = null;
  } finally {
    historyLoading.value = false;
  }
}

let rangeTimer = null;
watch(range, () => {
  clearTimeout(rangeTimer);
  rangeTimer = setTimeout(async () => {
    await fetchTeachers();
    // Tarix ochiq bo'lsa u ham yangi davrga o'tsin
    if (historyFor.value) openHistory(historyFor.value);
  }, 300);
}, { deep: true });

async function savePhone(t) {
  const phone = editPhone.value.trim();
  if (!phone) return say("Telefon bo'sh bo'lishi mumkin emas");
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/teachers/update/${t.id}/`, "PATCH", {
      phone,
    });
    if (!ok) return say(data.error || "Saqlanmadi");
    say(`${t.name} raqami yangilandi`);
    editing.value = null;
    await fetchTeachers();
  } catch (e) {
    console.error("update teacher:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

async function createTeacher() {
  busy.value = true;
  try {
    const { ok, data } = await apiSend("/teachers/create/", "POST", {
      name: newTeacher.name.trim(),
      phone: newTeacher.phone.trim(),
    });
    if (!ok) return say(data.error || "Qo'shilmadi");
    say(`${data.name} qo'shildi`);
    newTeacher.name = "";
    newTeacher.phone = "";
    await fetchTeachers();
  } catch (e) {
    console.error("create teacher:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

async function doDelete() {
  busy.value = true;
  try {
    const q = deleteTo.value ? `?to_teacher_id=${deleteTo.value}` : "";
    const { ok, data } = await apiSend(
      `/teachers/delete/${deleting.value.id}/${q}`,
      "DELETE"
    );
    if (!ok) return say(data.error || "O'chirilmadi");
    say(data.message);
    deleting.value = null;
    await fetchTeachers();
  } catch (e) {
    console.error("delete teacher:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

onMounted(fetchTeachers);
</script>
