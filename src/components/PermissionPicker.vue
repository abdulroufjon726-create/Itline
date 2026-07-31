<template>
  <!--
    Vakolatlar ro'yxati — Telegramda admin qo'shilganda chiqadigan
    ro'yxat kabi: har bir funksiya alohida yoqiladi/o'chiriladi.
    Bo'lim sarlavhasiga bosilsa o'sha bo'limdagi hammasi belgilanadi.
  -->
  <div class="space-y-4">
    <div
      v-for="section in sections"
      :key="section.section"
      class="rounded-xl border border-slate-100 overflow-hidden"
    >
      <button
        type="button"
        @click="toggleSection(section)"
        class="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <span class="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {{ section.section }}
        </span>
        <span class="text-[11px] text-slate-400 tabular-nums shrink-0">
          {{ countIn(section) }}/{{ section.items.length }}
        </span>
      </button>

      <div class="divide-y divide-slate-50">
        <label
          v-for="item in section.items"
          :key="item.key"
          class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/10 transition select-none"
        >
          <input
            type="checkbox"
            class="accent-indigo-500 w-4 h-4 shrink-0"
            :checked="modelValue.includes(item.key)"
            @change="toggle(item.key)"
          />
          <span class="text-sm text-slate-700 flex-1 min-w-0">{{ item.label }}</span>
          <code class="text-[10px] text-slate-300 shrink-0 hidden sm:inline">{{
            item.key
          }}</code>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  // [{ section: "To'lovlar", items: [{ key, label }] }]
  sections: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue"]);

function countIn(section) {
  return section.items.filter((i) => props.modelValue.includes(i.key)).length;
}

function toggle(key) {
  const next = props.modelValue.includes(key)
    ? props.modelValue.filter((k) => k !== key)
    : [...props.modelValue, key];
  emit("update:modelValue", next);
}

function toggleSection(section) {
  const keys = section.items.map((i) => i.key);
  const allOn = countIn(section) === keys.length;
  const next = allOn
    ? props.modelValue.filter((k) => !keys.includes(k))
    : [...new Set([...props.modelValue, ...keys])];
  emit("update:modelValue", next);
}
</script>
