<template>
  <SuperLayout
    title="Menejerlar"
    subtitle="Menejer qo'shish, vakolat berish va parolini tiklash"
  >
    <!-- ══════════ YANGI MENEJER ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      <div class="flex items-center justify-between gap-3 mb-3">
        <p class="text-sm font-medium text-slate-700">Yangi menejer qo'shish</p>
        <button
          @click="showCreate = !showCreate"
          class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs  transition"
        >
          <AppIcon :name="showCreate ? 'x' : 'plus'" />
          {{ showCreate ? "Yopish" : "Qo'shish" }}
        </button>
      </div>

      <template v-if="showCreate">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            v-model="form.name"
            placeholder="Ism"
            class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          />
          <input
            v-model="form.surname"
            placeholder="Familiya"
            class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          />
          <input
            v-model="form.phone"
            placeholder="Telefon"
            class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 tabular-nums"
          />
          <input
            v-model="form.password"
            type="password"
            placeholder="Parol"
            class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
          />
        </div>

        <!-- Vakolatlar — Telegramdagi admin qo'shish kabi -->
        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm font-medium text-slate-700">
              Vakolatlar
              <span class="text-xs text-slate-400 font-normal"
                >({{ form.permissions.length }} ta tanlangan)</span
              >
            </p>
            <div class="flex gap-2 shrink-0">
              <button
                @click="selectAllCreate"
                class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs "
              >
                Hammasi
              </button>
              <button
                @click="form.permissions = []"
                class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs "
              >
                Tozalash
              </button>
            </div>
          </div>
          <PermissionPicker :sections="sections" v-model="form.permissions" />
        </div>

        <div class="flex justify-end mt-4">
          <button
            @click="createManager"
            :disabled="!canSubmit || busy"
            class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-40 hover:bg-slate-800 transition"
          >
            <AppIcon name="plus" /> Menejer yaratish
          </button>
        </div>
      </template>
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
              <p class="text-xs text-slate-400 mt-0.5 tabular-nums">
                {{ m.phone }} ·
                <span v-if="m.is_super">barcha vakolatlar</span>
                <span v-else>{{ m.permissions.length }} ta vakolat</span>
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="!m.is_super"
                @click="openPerms(m)"
                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs  hover:text-indigo-500 transition"
              >
                <AppIcon name="key" /> Vakolatlar
              </button>
              <button
                v-if="!m.is_super"
                @click="openPassword(m)"
                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs  hover:text-amber-500 transition"
              >
                <AppIcon name="lock" /> Parol
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ VAKOLATLAR MODALI ══════════ -->
    <div
      v-if="editing"
      class="fixed inset-0 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-40"
      @click.self="editing = null"
    >
      <div
        class="bg-black/80 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl shadow-xl max-h-[88vh] flex flex-col"
      >
        <div class="p-4 border-b border-slate-100 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 truncate">
              {{ editing.name }} {{ editing.surname }}
            </p>
            <p class="text-xs text-slate-400">
              {{ editPerms.length }} ta vakolat tanlangan
            </p>
          </div>
          <button
            @click="selectAllEdit"
            class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs  shrink-0"
          >
            Hammasi
          </button>
          <button
            @click="editPerms = []"
            class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs  shrink-0"
          >
            Tozalash
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <PermissionPicker :sections="sections" v-model="editPerms" />
        </div>

        <div class="p-4 border-t border-slate-100 flex gap-2 justify-end">
          <button
            @click="editing = null"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm "
          >
            Bekor
          </button>
          <button
            @click="savePerms"
            :disabled="busy"
            class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            <AppIcon name="check" /> Saqlash
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ PAROL MODALI ══════════ -->
    <div
      v-if="pwTarget"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-40"
      @click.self="pwTarget = null"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5">
        <p class="font-semibold text-slate-800">
          {{ pwTarget.name }} {{ pwTarget.surname }}
        </p>
        <p class="text-xs text-slate-400 mt-0.5 mb-4">
          Yangi parol o'rnatiladi. Eski parol so'ralmaydi — menejer
          bundan keyin faqat yangisi bilan kira oladi.
        </p>

        <input
          v-model="pwValue"
          type="text"
          placeholder="Yangi parol"
          autocomplete="off"
          @keyup.enter="savePassword"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
        <p v-if="pwValue && pwValue.length < 4" class="text-xs text-rose-500 mt-1.5">
          Kamida 4 belgi bo'lishi kerak
        </p>

        <div class="flex gap-2 justify-end mt-4">
          <button
            @click="pwTarget = null"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm "
          >
            Bekor
          </button>
          <button
            @click="savePassword"
            :disabled="busy || pwValue.length < 4"
            class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            <AppIcon name="check" /> O'rnatish
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
import PermissionPicker from "@/components/PermissionPicker.vue";
import { apiGet, apiSend } from "@/utils/managerApi";

const managers = ref([]);
const sections = ref([]);
const defaults = ref([]);
const loading = ref(true);
const busy = ref(false);
const toast = ref("");
const showInactive = ref(false);
const showCreate = ref(false);

const editing = ref(null);
const editPerms = ref([]);

const pwTarget = ref(null);
const pwValue = ref("");

const form = reactive({
  name: "",
  surname: "",
  phone: "",
  password: "",
  permissions: [],
});

const canSubmit = computed(
  () => !!form.name.trim() && !!form.phone.trim() && !!form.password,
);

// Barcha bo'limlardagi kalitlar — "Hammasi" tugmasi uchun
const allKeys = computed(() =>
  sections.value.flatMap((s) => s.items.map((i) => i.key)),
);

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

function selectAllCreate() {
  form.permissions = [...allKeys.value];
}

function selectAllEdit() {
  editPerms.value = [...allKeys.value];
}

async function fetchCatalog() {
  const { ok, data } = await apiGet("/super/permissions/");
  if (!ok) return say(data.error || "Vakolatlar yuklanmadi");
  sections.value = data.sections || [];
  defaults.value = data.defaults || [];
  form.permissions = [...defaults.value];
}

async function fetchManagers() {
  loading.value = true;
  try {
    const q = showInactive.value ? "?all=1" : "";
    const { ok, data } = await apiGet(`/super/managers/${q}`);
    if (!ok) {
      say(data.error || "Ma'lumot yuklanmadi");
      managers.value = [];
      return;
    }
    managers.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("super managers:", e);
    say("Tarmoq xatosi");
  } finally {
    loading.value = false;
  }
}

async function createManager() {
  busy.value = true;
  try {
    const { ok, data } = await apiSend("/super/managers/create/", "POST", {
      name: form.name.trim(),
      surname: form.surname.trim(),
      phone: form.phone.trim(),
      password: form.password,
      permissions: form.permissions,
    });
    if (!ok) return say(data.error || "Qo'shilmadi");
    say(`${data.name} qo'shildi`);
    Object.assign(form, {
      name: "",
      surname: "",
      phone: "",
      password: "",
      permissions: [...defaults.value],
    });
    showCreate.value = false;
    await fetchManagers();
  } catch (e) {
    console.error("create manager:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

function openPerms(m) {
  editing.value = m;
  editPerms.value = [...(m.permissions || [])];
}

async function savePerms() {
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/managers/${editing.value.id}/permissions/`,
      "PATCH",
      { permissions: editPerms.value },
    );
    if (!ok) return say(data.error || "Saqlanmadi");
    say(`${data.name} vakolatlari yangilandi`);
    editing.value = null;
    await fetchManagers();
  } catch (e) {
    console.error("save permissions:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

function openPassword(m) {
  pwTarget.value = m;
  pwValue.value = "";
}

async function savePassword() {
  if (pwValue.value.length < 4) return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(
      `/super/managers/${pwTarget.value.id}/password/`,
      "PATCH",
      { password: pwValue.value },
    );
    if (!ok) return say(data.error || "Parol o'zgartirilmadi");
    say(`${pwTarget.value.name} paroli yangilandi`);
    pwTarget.value = null;
    pwValue.value = "";
  } catch (e) {
    console.error("set password:", e);
    say("Tarmoq xatosi");
  } finally {
    busy.value = false;
  }
}

async function deactivate(m) {
  if (!confirm(`${m.name} o'chirilsinmi?`)) return;
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/manager/${m.id}/delete/`, "DELETE");
    if (!ok) return say(data.error || "O'chirilmadi");
    say(data.message);
    await fetchManagers();
  } finally {
    busy.value = false;
  }
}

async function reactivate(m) {
  busy.value = true;
  try {
    const { ok, data } = await apiSend(`/manager/${m.id}/update/`, "PATCH", {
      is_active: true,
    });
    if (!ok) return say(data.error || "Tiklanmadi");
    say(`${m.name} tiklandi`);
    await fetchManagers();
  } finally {
    busy.value = false;
  }
}

watch(showInactive, fetchManagers);
onMounted(async () => {
  await fetchCatalog();
  await fetchManagers();
});
</script>
