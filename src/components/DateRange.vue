<!--
  Sana oralig'i tanlagich — barcha tarix bo'limlari uchun bitta komponent.

  Backend uch xil so'rovni ham bir xil tushunadi (?from=&to=, ?month=,
  ?year=), shuning uchun bu yerda hammasi oxir-oqibat {from, to} juftligiga
  aylantiriladi: qaysi tugma bosilganidan qat'i nazar ro'yxat bitta
  qoidaga bo'ysunadi.

  Ishlatilishi:
      <DateRange v-model="range" />
      const params = rangeParams(range)   // { from, to }
-->
<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Tez tanlash -->
    <button v-for="p in presets" :key="p.key" type="button" @click="applyPreset(p)" :class="chip(activePreset === p.key)">
      {{ p.label }}
    </button>

    <!-- Yil -->
    <select v-model="year" @change="applyYear"
      class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-300 transition tabular-nums">
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>

    <!-- Oy -->
    <select v-model="month" @change="applyMonth"
      class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-300 transition">
      <option value="">Butun yil</option>
      <option v-for="(name, i) in MONTHS" :key="i" :value="String(i + 1).padStart(2, '0')">
        {{ name }}
      </option>
    </select>

    <!-- Aniq kunlar -->
    <div class="flex items-center gap-1.5">
      <input type="date" :value="modelValue.from" @change="setEdge('from', $event.target.value)"
        class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-300 transition tabular-nums" />
      <span class="text-slate-300 text-sm">—</span>
      <input type="date" :value="modelValue.to" @change="setEdge('to', $event.target.value)"
        class="border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-300 transition tabular-nums" />
    </div>

    <button v-if="modelValue.from || modelValue.to" type="button" @click="clear"
      class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-xs hover:bg-slate-50 transition">
      Tozalash
    </button>

    <p v-if="invalid" class="text-xs text-rose-500 w-full">
      Boshlanish sanasi tugash sanasidan keyin bo'lmasin
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const props = defineProps({
  modelValue: { type: Object, default: () => ({ from: "", to: "" }) },
  // Markaz ochilgan yil — undan oldingi yillarni ko'rsatishning ma'nosi yo'q
  firstYear: { type: Number, default: 2024 },
});
const emit = defineEmits(["update:modelValue"]);

const now = new Date();
const thisYear = now.getFullYear();

const years = computed(() => {
  const out = [];
  for (let y = thisYear + 1; y >= props.firstYear; y--) out.push(y);
  return out;
});

// Yil/oy tanlagichlar joriy oraliqdan kelib chiqadi — oraliq tashqaridan
// o'zgarsa (masalan "Bu oy" bosilsa) ular ham ergashadi
const year = ref(Number((props.modelValue.from || "").slice(0, 4)) || thisYear);
const month = ref((props.modelValue.from || "").slice(5, 7) || "");

const invalid = computed(
  () => !!(props.modelValue.from && props.modelValue.to && props.modelValue.from > props.modelValue.to)
);

const iso = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const lastDay = (y, m) => new Date(y, m, 0).getDate();

const presets = [
  { key: "month", label: "Bu oy" },
  { key: "prev", label: "O'tgan oy" },
  { key: "days30", label: "30 kun" },
  { key: "year", label: "Bu yil" },
  { key: "all", label: "Hammasi" },
];

const activePreset = computed(() => {
  const { from, to } = props.modelValue;
  if (!from && !to) return "all";
  for (const p of presets) {
    if (p.key === "all") continue;
    const r = rangeFor(p.key);
    if (r.from === from && r.to === to) return p.key;
  }
  return "";
});

function rangeFor(key) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (key === "month") {
    return { from: `${y}-${String(m).padStart(2, "0")}-01`,
             to: `${y}-${String(m).padStart(2, "0")}-${lastDay(y, m)}` };
  }
  if (key === "prev") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { from: `${py}-${String(pm).padStart(2, "0")}-01`,
             to: `${py}-${String(pm).padStart(2, "0")}-${lastDay(py, pm)}` };
  }
  if (key === "days30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { from: iso(start), to: iso(now) };
  }
  if (key === "year") return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: "", to: "" };
}

function push(range) {
  year.value = Number((range.from || "").slice(0, 4)) || thisYear;
  month.value = (range.from || "").slice(5, 7) || "";
  // Oraliq bir oyning ichida bo'lmasa oy tanlagichi bo'sh tursin —
  // aks holda "10–20 avgust" da "Avgust" tanlangandek ko'rinardi
  if (range.from.slice(0, 7) !== range.to.slice(0, 7)) month.value = "";
  emit("update:modelValue", range);
}

function applyPreset(p) {
  push(rangeFor(p.key));
}

function applyYear() {
  month.value ? applyMonth() : push({ from: `${year.value}-01-01`, to: `${year.value}-12-31` });
}

function applyMonth() {
  if (!month.value) return applyYear();
  const m = Number(month.value);
  push({
    from: `${year.value}-${month.value}-01`,
    to: `${year.value}-${month.value}-${lastDay(year.value, m)}`,
  });
}

function setEdge(edge, value) {
  push({ ...props.modelValue, [edge]: value });
}

function clear() {
  push({ from: "", to: "" });
}

const chip = (active) =>
  [
    "px-3 py-1.5 rounded-full text-xs border transition whitespace-nowrap",
    active
      ? "bg-indigo-500 text-white border-indigo-500"
      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50",
  ].join(" ");
</script>
