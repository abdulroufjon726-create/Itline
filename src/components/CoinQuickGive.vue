<script setup>
/**
 * Coin berish paneli — davomat belgilanayotgan joyning o'zida.
 *
 * Ustoz dars belgilab turib, o'sha qatordan imtihon/vazifa uchun coin
 * beradi: alohida "O'quvchilar" bo'limiga o'tish shart emas. Balans
 * doim ko'rinib turadi. Oylik erkin bonus (oyiga 1 marta) sovg'a
 * tugmasi ostida ochiladi — qator baland bo'lib ketmasin.
 *
 * Miqdorlar backenddan (`coin_actions`) keladi; `actions` berilmasa
 * quyidagi zaxira ro'yxat ishlatiladi.
 */
import { ref, computed } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import { API, authHeaders } from "@/utils/managerApi";

const props = defineProps({
  studentId: { type: [Number, String], required: true },
  studentName: { type: String, default: "" },
  teacherId: { type: [Number, String], default: null },
  balance: { type: Number, default: null }, // ma'lum bo'lsa ko'rsatiladi
  bonusUsed: { type: Boolean, default: false }, // shu oy bonus berilganmi
  actions: { type: Array, default: null }, // [{reason, label, amount}]
});

const emit = defineEmits(["given", "bonus-used"]);

// Backend miqdorni o'zi aytadi; ro'yxat kelmasa ham panel ishlasin
const FALLBACK = [
  { reason: "exam_pass", label: "Imtihon", amount: 80 },
  { reason: "homework_done", label: "Vazifa to'liq", amount: 20 },
  { reason: "homework_partial", label: "Vazifa chala", amount: 10 },
  { reason: "homework_missed", label: "Vazifa yo'q", amount: -20 },
];

const ICONS = {
  exam_pass: "check-circle",
  homework_done: "course",
  homework_partial: "course",
  homework_missed: "x-circle",
};

const list = computed(() =>
  (props.actions?.length ? props.actions : FALLBACK).map((a) => ({
    ...a,
    icon: ICONS[a.reason] || "coin",
  })),
);

const balanceTitle = computed(() =>
  props.studentName ? `${props.studentName} — coin balansi` : "Coin balansi",
);

const busy = ref(false);
const bonusOpen = ref(false);
const bonusAmount = ref(null);
const feedback = ref(null); // { text, ok }

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

function flash(text, ok) {
  feedback.value = { text, ok };
  setTimeout(() => (feedback.value = null), 2500);
}

async function post(body) {
  const res = await fetch(`${API}/coins/give/`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      student_id: props.studentId,
      teacher_id: props.teacherId || undefined,
      ...body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function give(action) {
  if (busy.value) return;
  busy.value = true;
  try {
    const { ok, data } = await post({ reason: action.reason });
    if (!ok) {
      flash(data.error || "Xatolik", false);
      return;
    }
    // Balansni backend qaytargan haqiqiy son bilan yangilaymiz
    if (typeof data.coin_balance === "number") emit("given", data.coin_balance);
    flash(`${signed(action.amount)} ✓`, action.amount >= 0);
  } catch {
    flash("Aloqa xatosi", false);
  } finally {
    busy.value = false;
  }
}

async function giveBonus() {
  const amount = Number(bonusAmount.value);
  if (busy.value || props.bonusUsed || !amount) return;
  busy.value = true;
  try {
    const { ok, data } = await post({
      reason: "manual",
      amount,
      note: "Oylik erkin bonus",
    });
    if (!ok) {
      flash(data.error || "Xatolik", false);
      return;
    }
    if (typeof data.coin_balance === "number") emit("given", data.coin_balance);
    emit("bonus-used");
    bonusAmount.value = null;
    bonusOpen.value = false;
    flash(`${signed(amount)} bonus ✓`, true);
  } catch {
    flash("Aloqa xatosi", false);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-1.5 flex-wrap">
      <span v-if="balance !== null"
        class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-full px-2 py-1 tabular-nums shrink-0"
        :title="balanceTitle">
        <AppIcon name="coin" /> {{ balance }}
      </span>

      <button v-for="a in list" :key="a.reason" @click="give(a)" :disabled="busy" :title="`${a.label} ${signed(a.amount)}`"
        :class="[
          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40 cursor-pointer',
          a.amount > 0
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
            : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
        ]">
        <AppIcon :name="a.icon" />
        <span class="hidden md:inline font-medium">{{ a.label }}</span>
        <span class="tabular-nums">{{ signed(a.amount) }}</span>
      </button>

      <!-- Oylik erkin bonus — oyiga 1 marta -->
      <button @click="bonusOpen = !bonusOpen" :disabled="busy || bonusUsed"
        :title="bonusUsed ? 'Bu oy bonus berilgan' : 'Oylik erkin bonus (1 marta)'" :class="[
          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition cursor-pointer',
          bonusUsed
            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
            : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100',
        ]">
        <AppIcon name="gift" />
      </button>

      <span v-if="feedback" class="text-[11px] font-medium shrink-0"
        :class="feedback.ok ? 'text-emerald-600' : 'text-rose-500'">
        {{ feedback.text }}
      </span>
    </div>

    <div v-if="bonusOpen && !bonusUsed" class="mt-2 flex items-center gap-2 flex-wrap">
      <span class="text-[11px] text-gray-400">
        <AppIcon name="gift" /> Oylik erkin bonus (1 marta)
      </span>
      <input v-model.number="bonusAmount" type="number" min="1" placeholder="Miqdor" :disabled="busy"
        @keyup.enter="giveBonus"
        class="w-24 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-indigo-300 transition disabled:opacity-40" />
      <button @click="giveBonus" :disabled="busy || !bonusAmount"
        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
        Bonus berish
      </button>
    </div>
  </div>
</template>
