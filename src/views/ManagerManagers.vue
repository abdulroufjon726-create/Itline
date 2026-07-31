<template>
  <div class="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans">
    <ManagerNav
      title="Menejerlar"
      subtitle="Telefon raqamni tahrirlash va o'chirish"
    />

    <!--
      Menejer qo'shish bu yerdan olib tashlandi — yangi menejer faqat
      supermenejer bo'limida, vakolatlari bilan birga yaratiladi.
    -->
    <div
      class="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-2.5"
    >
      <span class="text-slate-400 shrink-0"><AppIcon name="info" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-slate-600">
          Yangi menejer qo'shish supermenejer bo'limiga o'tkazildi
        </p>
        <p class="text-xs text-slate-400 mt-0.5">
          U yerda menejer yaratilayotganda unga qanday vakolatlar berilishi
          ham belgilanadi.
        </p>
      </div>
      <router-link
        v-if="isSuperUser"
        to="/super"
        class="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 transition shrink-0"
      >
        O'tish
      </router-link>
    </div>

    <!-- ══════════ RO'YXAT ══════════ -->
    <div
      class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div
        class="p-4 border-b border-slate-100 flex items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500 tabular-nums">
          {{ managers.length }} ta menejer
        </p>
        <label
          class="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none"
        >
          <input type="checkbox" v-model="showInactive" class="accent-indigo-500" />
          O'chirilganlar ham
        </label>
      </div>

      <div v-if="loading" class="p-16 text-center">
        <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
        <p class="text-sm text-slate-400 mt-3">Yuklanmoqda...</p>
      </div>

      <div v-else-if="!managers.length" class="p-16 text-center">
        <p class="text-sm text-slate-400">Menejer yo'q</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="m in managers"
          :key="m.id"
          :class="['p-4', m.is_active ? '' : 'opacity-50']"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-slate-800">
                  {{ m.name }} {{ m.surname }}
                </p>
                <span
                  v-if="m.is_super"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700"
                  >supermenejer</span
                >
                <span
                  v-if="!m.is_active"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500"
                  >o'chirilgan</span
                >
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <template v-if="editing === m.id">
                <input
                  v-model="editPhone"
                  class="w-40 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm outline-none tabular-nums"
                  @keyup.enter="savePhone(m)"
                />
                <button
                  @click="savePhone(m)"
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
                <span class="tabular-nums text-sm text-slate-600">{{ m.phone }}</span>
                <button
                  @click="startEdit(m)"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 hover:text-indigo-500 transition"
                >
                  <AppIcon name="edit" /> Tahrirlash
                </button>
                <button
                  v-if="m.is_active && !m.is_super"
                  @click="deactivate(m)"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition"
                >
                  <AppIcon name="trash" />
                </button>
                <button
                  v-else-if="!m.is_active"
                  @click="reactivate(m)"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-emerald-50 hover:text-emerald-600 transition"
                >
                  <AppIcon name="refresh" /> Tiklash
                </button>
              </template>
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
import { ref, onMounted, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import ManagerNav from "@/components/ManagerNav.vue";
import { apiGet, apiSend, isSuper } from "@/utils/managerApi";

const managers = ref([]);
const loading = ref(true);
const busy = ref(false);
const toast = ref("");
const showInactive = ref(false);
const editing = ref(null);
const editPhone = ref("");

const isSuperUser = isSuper();

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

function startEdit(m) {
  editing.value = m.id;
  editPhone.value = m.phone;
}

async function fetchManagers() {
  loading.value = true;
  try {
    const q = showInactive.value ? "?all=1" : "";
    const { data } = await apiGet(`/managers/${q}`);
    managers.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("managers:", e);
    say("Ma'lumot yuklanmadi");
  } finally {
    loading.value = false;
  }
}

async function patchManager(m, body, okMsg) {
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/manager/${m.id}/update/`, "PATCH", body);
    if (!ok) return say(data.error || "Saqlanmadi");
    say(okMsg);
    editing.value = null;
    await fetchManagers();
  } catch (e) {
    console.error("update manager:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

function savePhone(m) {
  const phone = editPhone.value.trim();
  if (!phone) return say("Telefon bo'sh bo'lishi mumkin emas");
  return patchManager(m, { phone }, `${m.name} raqami yangilandi`);
}

function reactivate(m) {
  return patchManager(m, { is_active: true }, `${m.name} tiklandi`);
}

async function deactivate(m) {
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/manager/${m.id}/delete/`, "DELETE");
    if (!ok) return say(data.error || "O'chirilmadi");
    say(data.message);
    await fetchManagers();
  } catch (e) {
    console.error("delete manager:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

watch(showInactive, fetchManagers);
onMounted(fetchManagers);
</script>
