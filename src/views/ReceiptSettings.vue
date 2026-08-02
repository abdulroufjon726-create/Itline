<template>
  <div class="max-w-4xl">
    <div class="mb-4">
      <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
        To'lov cheki
      </h2>
      <p class="text-xs text-slate-400 mt-1">
        To'lov qilindi tugmasi bosilganda o'quvchiga telegram orqali shu
        matn yuboriladi. Faqat botga ulangan o'quvchilar oladi.
      </p>
    </div>

    <div v-if="loading" class="p-16 text-center">
      <AppIcon name="spinner" class="w-7 h-7 text-indigo-400 animate-spin" />
    </div>

    <template v-else>
      <!-- Yoqish / o'chirish -->
      <div
        class="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex items-center gap-3"
      >
        <label class="flex items-center gap-2.5 cursor-pointer select-none flex-1">
          <input type="checkbox" v-model="form.enabled" class="accent-indigo-500 w-4 h-4" />
          <span class="text-sm text-slate-700">
            To'lov tasdiqlanganda chek yuborilsin
          </span>
        </label>
        <span
          class="text-[10px] px-2 py-0.5 rounded-full shrink-0"
          :class="form.enabled
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-500'"
        >
          {{ form.enabled ? "yoqilgan" : "o'chirilgan" }}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Tahrirlash -->
        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <label class="block text-xs text-slate-400 mb-1.5">Markaz nomi</label>
          <input
            v-model="form.center_name"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 mb-3"
          />

          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-slate-400">Chek matni</label>
            <button
              @click="resetTemplate"
              class="text-[11px] text-slate-400 hover:text-indigo-500 transition"
            >
              Standart matnga qaytarish
            </button>
          </div>
          <textarea
            v-model="form.template"
            rows="14"
            class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300 font-mono resize-y"
          ></textarea>

          <p class="text-[11px] text-slate-400 mt-2 leading-relaxed">
            <b>&lt;b&gt;matn&lt;/b&gt;</b> qalin,
            <i>&lt;i&gt;matn&lt;/i&gt;</i> qiya,
            <u>&lt;u&gt;matn&lt;/u&gt;</u> tagi chizilgan,
            <code class="font-mono">&lt;code&gt;matn&lt;/code&gt;</code>
            bir xil kenglikdagi shrift bilan yozadi — raqamlar ustma-ust
            tik tursin desangiz shuni ishlating.
          </p>

          <!-- O'rniga qo'yiladiganlar -->
          <div class="mt-3 pt-3 border-t border-slate-200">
            <p class="text-xs text-slate-500 mb-2">
              Quyidagilarni bosib matnga qo'shasiz:
            </p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="p in placeholders"
                :key="p.key"
                @click="insert(p.key)"
                :title="p.label"
                class="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 hover:bg-slate-50 hover:border-indigo-300 transition"
              >
                {{ p.key }}
              </button>
            </div>
          </div>
        </div>

        <!-- Jonli ko'rinish -->
        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <p class="text-xs text-slate-400 mb-2">
            O'quvchi shunday ko'radi (namuna ma'lumot bilan):
          </p>
          <div
            class="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap break-words min-h-[16rem]"
            v-html="previewHtml"
          ></div>
        </div>
      </div>

      <div class="flex items-center gap-3 justify-end mt-4">
        <p v-if="msg" :class="ok ? 'text-emerald-600' : 'text-rose-500'"
          class="text-xs flex-1">
          {{ msg }}
        </p>
        <button
          @click="save"
          :disabled="busy || !form.template.trim()"
          class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40 transition"
        >
          <AppIcon name="check" /> {{ busy ? "Saqlanmoqda..." : "Saqlash" }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import { apiGet, apiSend } from "@/utils/managerApi";

const loading = ref(true);
const busy = ref(false);
const msg = ref("");
const ok = ref(false);

const placeholders = ref([]);
const defaultTemplate = ref("");

const form = reactive({ enabled: true, template: "", center_name: "" });

// Namuna qiymatlar — serverdagi bilan bir xil, shunda ko'rinish
// haqiqiy chekdan farq qilmaydi
const SAMPLE = {
  "{ism}": "Aliyev Vali",
  "{oy}": "Iyul 2026",
  "{summa}": "500 000 so'm",
  "{jami}": "600 000 so'm",
  "{qolgan}": "100 000 so'm",
  "{sana}": new Date().toLocaleDateString("uz-UZ"),
  "{guruh}": "Frontend-1",
};

// Telegram HTML rejimida tushunadigan teglar — serverdagi ro'yxat
// bilan bir xil (register_withvue/telegram.py, _ALLOWED_TAGS)
const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "s", "code", "pre"];
const TAG_RE = new RegExp(`&lt;(/?)(${ALLOWED_TAGS.join("|")})&gt;`, "gi");

const previewHtml = computed(() => {
  let t = form.template || "";
  for (const [k, v] of Object.entries(SAMPLE)) t = t.split(k).join(v);
  t = t.split("{markaz}").join(form.center_name || "");
  // Server bilan bir xil tartib: avval hammasi qochiriladi, keyin
  // faqat ruxsat etilgan teglar qaytariladi. Shunda namuna o'quvchi
  // ko'radigan chekdan farq qilmaydi.
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(TAG_RE, (_, slash, tag) => `<${slash}${tag.toLowerCase()}>`);
});

function say(text, good) {
  msg.value = text;
  ok.value = good;
  setTimeout(() => (msg.value = ""), 4000);
}

function insert(key) {
  form.template += key;
}

function resetTemplate() {
  form.template = defaultTemplate.value;
}

async function load() {
  loading.value = true;
  try {
    const { ok: good, data } = await apiGet("/receipt-settings/");
    if (!good) return say(data.error || "Yuklanmadi", false);
    form.enabled = data.enabled;
    form.template = data.template;
    form.center_name = data.center_name;
    placeholders.value = data.placeholders || [];
    defaultTemplate.value = data.default_template || "";
  } finally {
    loading.value = false;
  }
}

async function save() {
  busy.value = true;
  try {
    const { ok: good, data } = await apiSend(
      "/receipt-settings/update/",
      "PATCH",
      { ...form },
    );
    say(good ? "Saqlandi" : data.error || "Saqlanmadi", good);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>
