<template>
  <SuperLayout
    title="Yuz tanish"
    subtitle="Terminal o'quvchini taniganda davomat o'zi belgilanadi"
  >
    <!-- ══════════ TERMINALLAR ══════════ -->
    <div class="flex items-center justify-between gap-3 mb-3">
      <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
        Terminallar
      </h2>
      <button
        @click="openDevice(null)"
        class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs hover:bg-slate-50 transition"
      >
        <AppIcon name="plus" /> Terminal qo'shish
      </button>
    </div>

    <div v-if="loading" class="p-16 text-center">
      <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
    </div>

    <div
      v-else-if="!devices.length"
      class="bg-white rounded-2xl border border-slate-200 p-8 text-center mb-5"
    >
      <AppIcon name="monitor" class="w-8 h-8 text-slate-300 mx-auto" />
      <p class="text-sm text-slate-500 mt-3 mb-1">Terminal qo'shilmagan</p>
      <p class="text-xs text-slate-400 max-w-md mx-auto">
        Terminal qo'shsangiz, unga yoziladigan manzil beriladi. O'sha manzilni
        terminal sozlamalariga kiritganingizdan keyin yuz tanilishi bilan
        davomat o'zi belgilanadi.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
      <div
        v-for="d in devices"
        :key="d.id"
        class="bg-white rounded-2xl border border-slate-200 p-4"
      >
        <div class="flex items-start gap-3">
          <span
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :class="d.is_active ? 'bg-emerald-50' : 'bg-slate-100'"
          >
            <AppIcon
              name="monitor"
              :class="d.is_active ? 'text-emerald-600' : 'text-slate-400'"
            />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-slate-800 truncate">{{ d.name }}</p>
              <span
                v-if="!d.is_active"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500"
                >o'chirilgan</span
              >
              <span
                v-if="d.can_push"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                >saytdan yuborish yoqilgan</span
              >
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ d.location || "joyi ko'rsatilmagan" }} ·
              {{ d.last_event_at ? `oxirgi hodisa ${ago(d.last_event_at)}` : "hali hodisa yo'q" }}
            </p>
            <p class="text-xs text-slate-400">
              bugun {{ d.events_today }} ta hodisa
            </p>
          </div>
          <div class="flex gap-1.5 shrink-0">
            <button
              @click="openDevice(d)"
              class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition"
            >
              <AppIcon name="edit" />
            </button>
            <button
              @click="removeDevice(d)"
              class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-rose-50 hover:text-rose-500 transition"
            >
              <AppIcon name="trash" />
            </button>
          </div>
        </div>

        <!-- Terminalga yoziladigan manzil -->
        <div class="mt-3 pt-3 border-t border-slate-200">
          <p class="text-[11px] text-slate-400 mb-1.5">
            Terminal sozlamasiga yoziladigan manzil:
          </p>
          <div class="flex gap-2">
            <code
              class="flex-1 min-w-0 text-[11px] bg-slate-50 rounded-lg px-2.5 py-2 text-slate-600 break-all"
            >
              {{ d.webhook_url }}
            </code>
            <button
              @click="copy(d.webhook_url)"
              :title="'Nusxa olish'"
              class="px-2.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition shrink-0"
            >
              <AppIcon name="check" v-if="copied === d.webhook_url" />
              <AppIcon name="database" v-else />
            </button>
          </div>

          <!-- Terminalsiz sinov: soxta hodisa yuboriladi -->
          <div class="flex items-center gap-2 mt-2">
            <input
              v-model="testId[d.id]"
              placeholder="sinov uchun raqam"
              class="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-300 tabular-nums"
            />
            <button
              @click="sendTest(d)"
              :disabled="testing === d.id"
              class="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition disabled:opacity-40 shrink-0"
            >
              <AppIcon name="send" />
              {{ testing === d.id ? "Yuborilmoqda..." : "Sinov hodisasi" }}
            </button>
          </div>
          <p
            v-if="testResult[d.id]"
            class="text-[11px] mt-1.5"
            :class="testResult[d.id].ok ? 'text-emerald-600' : 'text-rose-500'"
          >
            {{ testResult[d.id].text }}
          </p>
          <p v-else class="text-[11px] text-slate-400 mt-1.5">
            Terminal kelmasidan oldin shu tugma bilan tekshirib ko'ring —
            xuddi terminal yuborgandek hodisa yuboriladi.
          </p>
        </div>
      </div>
    </div>

    <!-- ══════════ SOZLASH YO'RIQNOMASI ══════════ -->
    <details class="bg-white rounded-2xl border border-slate-200 mb-5 group">
      <summary
        class="p-4 cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 select-none"
      >
        <AppIcon name="help" class="text-indigo-400" />
        Terminalni qanday sozlash kerak
        <AppIcon
          name="chevron-down"
          class="ml-auto text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div class="px-4 pb-4 text-sm text-slate-500 space-y-3">
        <div>
          <p class="font-medium text-slate-700 mb-1">1. Yuzlarni terminalga yozing</p>
          <p class="text-xs">
            Terminal ekranida yoki Hik-Connect / iVMS orqali har o'quvchining
            yuzini yozasiz. Har biriga raqam beriladi — Hikvision uni
            <span class="font-mono">employee No</span> deb ataydi. O'sha raqamni
            eslab qoling.
          </p>
        </div>
        <div>
          <p class="font-medium text-slate-700 mb-1">2. Manzilni kiriting</p>
          <p class="text-xs">
            Terminal sozlamalarida
            <span class="font-mono">Network → HTTP Listening</span> (yoki
            <span class="font-mono">Event → Notification</span>) bo'limiga
            yuqoridagi manzilni yozasiz. Protokol —
            <span class="font-mono">HTTP</span>, format —
            <span class="font-mono">JSON</span>.
          </p>
        </div>
        <div>
          <p class="font-medium text-slate-700 mb-1">3. O'quvchilarni bog'lang</p>
          <p class="text-xs">
            Quyidagi ro'yxatdan har o'quvchiga terminaldagi raqamini
            biriktirasiz. Bog'lanmagan raqamlar «Bog'lanmagan» bo'limida
            o'zi chiqib turadi — terminaldan birinchi hodisa kelishi bilan.
          </p>
        </div>
        <p class="text-xs text-slate-400 pt-2 border-t border-slate-200">
          Terminal manzili (host) sozlanmagan bo'lsa ham hammasi ishlaydi —
          terminal serverga o'zi ulanadi. Host faqat saytdan terminalga yuz
          yuborish uchun kerak va u terminalga tashqaridan kirish
          ochilganda ishlaydi.
        </p>
      </div>
    </details>

    <!-- ══════════ BOG'LANMAGAN RAQAMLAR ══════════ -->
    <div
      v-if="unlinked.length"
      class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5"
    >
      <p class="text-sm font-medium text-amber-800 mb-2">
        <AppIcon name="warning" /> Bog'lanmagan raqamlar
      </p>
      <p class="text-xs text-amber-700 mb-3">
        Terminal bu raqamlarni yubordi, lekin ular hech qaysi o'quvchiga
        biriktirilmagan — davomat belgilanmayapti.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="u in unlinked"
          :key="u.person_id"
          @click="startLink(u.person_id)"
          class="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs text-slate-600 hover:bg-amber-100 transition"
        >
          <span class="font-mono">{{ u.person_id }}</span>
          <span v-if="u.person_name" class="text-slate-400"> · {{ u.person_name }}</span>
          <span class="text-amber-600"> ({{ u.n }})</span>
        </button>
      </div>
    </div>

    <!-- ══════════ O'QUVCHILARNI BOG'LASH ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-200 mb-5">
      <div class="p-4 border-b border-slate-200 flex items-center gap-3 flex-wrap">
        <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2 flex-1">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          O'quvchilar
          <span class="text-xs text-slate-400 font-normal">
            {{ linkedCount }} / {{ students.length }} bog'langan
          </span>
        </h2>
        <input
          v-model="search"
          placeholder="Ism yoki raqam..."
          class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-300 w-full sm:w-56"
        />
        <label class="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" v-model="onlyUnlinked" class="accent-indigo-500" />
          Faqat bog'lanmaganlar
        </label>
      </div>

      <div v-if="!filteredStudents.length" class="p-10 text-center text-sm text-slate-400">
        O'quvchi topilmadi
      </div>
      <div v-else class="divide-y divide-slate-100 max-h-[26rem] overflow-y-auto">
        <div
          v-for="s in filteredStudents"
          :key="s.id"
          class="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm text-slate-700 truncate">
              {{ s.name }} {{ s.surname }}
            </p>
            <p class="text-[11px] text-slate-400 truncate">
              {{ s.teacher_name || "ustozsiz" }}
            </p>
          </div>
          <input
            :value="s.face_person_id"
            @change="saveLink(s, $event.target.value)"
            placeholder="raqam"
            class="w-28 border rounded-lg px-2 py-1 text-sm outline-none focus:border-indigo-300 tabular-nums shrink-0"
            :class="s.face_person_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50'"
          />
        </div>
      </div>
    </div>

    <!-- ══════════ HODISALAR ══════════ -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-amber-400"></span>
          Oxirgi hodisalar
        </h2>
        <button
          @click="load"
          class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition"
        >
          <AppIcon name="refresh" /> Yangilash
        </button>
      </div>

      <div v-if="!events.length" class="p-10 text-center text-sm text-slate-400">
        Hali hodisa kelmagan
      </div>
      <div v-else class="divide-y divide-slate-100 max-h-[24rem] overflow-y-auto">
        <div v-for="e in events" :key="e.id" class="px-4 py-2.5 flex items-center gap-3">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="dotOf(e.status)"
          ></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-slate-700 truncate">
              {{ e.student_name || e.person_name || "—" }}
              <span class="text-xs text-slate-400 font-mono">#{{ e.person_id }}</span>
            </p>
            <p class="text-[11px] text-slate-400 truncate">{{ e.note }}</p>
          </div>
          <span class="text-xs text-slate-400 tabular-nums shrink-0">
            {{ time(e.happened_at) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ══════════ TERMINAL MODALI ══════════ -->
    <div
      v-if="editing"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-40"
      @click.self="editing = null"
    >
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-xl p-5 max-h-[88vh] overflow-y-auto">
        <p class="font-semibold text-slate-800 mb-4">
          {{ editing.id ? "Terminalni tahrirlash" : "Yangi terminal" }}
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Nomi</label>
            <input v-model="editing.name" :class="inputCls" placeholder="Kirish eshigi" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">Joyi</label>
              <input v-model="editing.location" :class="inputCls" placeholder="1-qavat" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">Seriya raqami</label>
              <input v-model="editing.serial" :class="inputCls" placeholder="ixtiyoriy" />
            </div>
          </div>

          <div class="pt-3 border-t border-slate-200">
            <p class="text-xs font-medium text-slate-600 mb-1">
              Saytdan terminalga yuborish (ixtiyoriy)
            </p>
            <p class="text-[11px] text-slate-400 mb-2.5">
              Faqat terminalga tashqaridan kirish ochilgan bo'lsa to'ldiring.
              Bo'sh qoldirsangiz ham davomat ishlaydi.
            </p>
            <input
              v-model="editing.host"
              :class="[inputCls, 'mb-2']"
              placeholder="http://192.168.1.64"
            />
            <div class="grid grid-cols-2 gap-2">
              <input v-model="editing.username" :class="inputCls" placeholder="Login" />
              <input
                v-model="editing.password"
                type="password"
                :class="inputCls"
                placeholder="Parol"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" v-model="editing.is_active" class="accent-indigo-500" />
            Faol
          </label>
        </div>

        <div class="flex gap-2 justify-end mt-5">
          <button
            @click="editing = null"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50"
          >
            Bekor
          </button>
          <button
            @click="saveDevice"
            :disabled="busy || !editing.name"
            class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40"
          >
            <AppIcon name="check" /> Saqlash
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
import { ref, computed, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { apiGet, apiSend } from "@/utils/managerApi";

const devices = ref([]);
const events = ref([]);
const unlinked = ref([]);
const students = ref([]);
const loading = ref(true);
const busy = ref(false);
const toast = ref("");
const copied = ref("");
const search = ref("");
const onlyUnlinked = ref(false);
const editing = ref(null);

// Terminalsiz sinov
const testId = ref({});
const testResult = ref({});
const testing = ref(null);

// Hodisa javobiga qarab odam tushunadigan izoh
const TEST_HINT = {
  marked: (n) => `Davomat belgilandi — ${n}`,
  already: (n) => `Zanjir ishlayapti. ${n}`,
  no_lesson: () =>
    "Zanjir ishlayapti. Bu o'quvchining guruhida bugun dars yo'q — " +
    "shuning uchun davomat qo'yilmadi.",
  no_group: () =>
    "Zanjir ishlayapti. Bu o'quvchi hech qaysi guruhga biriktirilmagan.",
  unknown: () =>
    "Zanjir ishlayapti. Bu raqam hech kimga bog'lanmagan — " +
    "pastdagi ro'yxatdan o'quvchiga biriktiring.",
};

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300";

function say(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 3000);
}

const linkedCount = computed(
  () => students.value.filter((s) => s.face_person_id).length,
);

const filteredStudents = computed(() => {
  let list = students.value;
  if (onlyUnlinked.value) list = list.filter((s) => !s.face_person_id);
  const q = search.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        `${s.name} ${s.surname}`.toLowerCase().includes(q) ||
        String(s.face_person_id || "").includes(q),
    );
  }
  return list.slice(0, 200);
});

const DOTS = {
  marked: "bg-emerald-400",
  already: "bg-slate-300",
  no_lesson: "bg-amber-400",
  no_group: "bg-amber-400",
  unknown: "bg-rose-400",
  ignored: "bg-slate-300",
};
const dotOf = (s) => DOTS[s] || "bg-slate-300";

function time(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function ago(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  if (mins < 1440) return `${Math.round(mins / 60)} soat oldin`;
  return `${Math.round(mins / 1440)} kun oldin`;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = text;
    setTimeout(() => (copied.value = ""), 2000);
  } catch {
    say("Nusxa olinmadi — qo'lda belgilab oling");
  }
}

function openDevice(d) {
  editing.value = d
    ? { ...d, password: "" }
    : {
        name: "",
        location: "",
        serial: "",
        host: "",
        username: "",
        password: "",
        is_active: true,
      };
}

async function saveDevice() {
  busy.value = true;
  try {
    const e = editing.value;
    const path = e.id
      ? `/super/faceid/devices/${e.id}/`
      : "/super/faceid/devices/create/";
    const body = {
      name: e.name,
      location: e.location,
      serial: e.serial,
      host: e.host,
      username: e.username,
      is_active: e.is_active,
    };
    // Bo'sh parol yuborilsa mavjudi o'chib ketmasin
    if (e.password) body.password = e.password;

    const { ok, data } = await apiSend(path, e.id ? "PATCH" : "POST", body);
    if (!ok) return say(data.error || "Saqlanmadi");
    say("Saqlandi");
    editing.value = null;
    await load();
  } finally {
    busy.value = false;
  }
}

async function removeDevice(d) {
  if (!confirm(`«${d.name}» terminali o'chirilsinmi?`)) return;
  const { ok, data } = await apiSend(
    `/super/faceid/devices/${d.id}/delete/`,
    "DELETE",
  );
  if (!ok) return say(data.error || "O'chirilmadi");
  say("O'chirildi");
  await load();
}

/**
 * Terminal yuboradigan hodisani aynan takrorlaydi.
 *
 * Shu tugma butun zanjirni tekshiradi: manzil to'g'rimi, server
 * hodisani o'qiydimi, o'quvchi topiladimi, davomat qo'yiladimi.
 * Terminal kelmasdan oldin hammasini shu yerda ko'rib olish mumkin.
 */
async function sendTest(device) {
  const personId = String(testId.value[device.id] || "").trim();
  if (!personId) {
    testResult.value = {
      ...testResult.value,
      [device.id]: { ok: false, text: "Avval sinov uchun raqam yozing" },
    };
    return;
  }

  testing.value = device.id;
  try {
    const res = await fetch(device.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateTime: new Date().toISOString(),
        AccessControllerEvent: {
          majorEventType: 5,
          subEventType: 75,
          employeeNoString: personId,
          name: "Sinov",
          currentVerifyMode: "face",
        },
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      testResult.value = {
        ...testResult.value,
        [device.id]: {
          ok: false,
          text: data.error || `Server ${res.status} qaytardi`,
        },
      };
      return;
    }

    const hint = TEST_HINT[data.status];
    testResult.value = {
      ...testResult.value,
      [device.id]: {
        ok: true,
        text: hint ? hint(data.note) : `Javob: ${data.status || "ok"}`,
      },
    };
    await loadEvents();
  } catch {
    testResult.value = {
      ...testResult.value,
      [device.id]: { ok: false, text: "Serverga ulanib bo'lmadi" },
    };
  } finally {
    testing.value = null;
  }
}

function startLink(personId) {
  onlyUnlinked.value = true;
  search.value = "";
  say(`«${personId}» raqamini kerakli o'quvchiga yozing`);
}

async function saveLink(student, value) {
  const next = String(value || "").trim();
  if (next === (student.face_person_id || "")) return;
  const { ok, data } = await apiSend(
    `/super/faceid/link/${student.id}/`,
    "PATCH",
    { face_person_id: next },
  );
  if (!ok) {
    say(data.error || "Saqlanmadi");
    await loadStudents();
    return;
  }
  student.face_person_id = data.face_person_id;
  say(next ? `${student.name} bog'landi` : `${student.name} uzildi`);
  await loadEvents();
}

async function loadStudents() {
  const { ok, data } = await apiGet("/students/overview/");
  if (ok) students.value = Array.isArray(data) ? data : data.students || [];
}

async function loadEvents() {
  const { ok, data } = await apiGet("/super/faceid/events/");
  if (ok) {
    events.value = data.rows || [];
    unlinked.value = data.unlinked || [];
  }
}

async function load() {
  loading.value = true;
  try {
    const { ok, data } = await apiGet("/super/faceid/devices/");
    if (ok) devices.value = Array.isArray(data) ? data : [];
    await Promise.all([loadEvents(), loadStudents()]);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
