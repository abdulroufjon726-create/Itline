<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import AppIcon from "@/components/AppIcon.vue";

/**
 * Manager: to'lov kartasini sozlaydi, studentlar yuborgan chek so'rovlarini
 * ko'radi. Qabul qilganda miqdor + oy + sana kiritadi -> to'lov yoziladi,
 * chek rasmi o'chadi. Rad etsa ham rasm o'chadi.
 */
const emit = defineEmits(["accepted"]);
const API = "https://itline-django-9s85.onrender.com/api";

const today = new Date().toISOString().slice(0, 10);
const thisMonth = new Date().toISOString().slice(0, 7);

const card = ref({ card_number: "", card_holder: "", note: "" });
const savingCard = ref(false);
const cardMsg = ref("");

const tab = ref("pending"); // 'pending' | 'history'
const list = ref([]);
const loading = ref(false);
const viewImg = ref(""); // katta ko'rish uchun
const acceptForm = ref({}); // {reqId: {amount, month, paid_at}}
const busyId = ref(null);
const toast = ref("");

const STATUS = {
  pending: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600" },
  accepted: { label: "Qabul qilindi", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rad etildi", cls: "bg-rose-50 text-rose-600" },
};
const fmtMoney = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";

function say(m) {
  toast.value = m;
  setTimeout(() => (toast.value = ""), 3000);
}

async function loadCard() {
  try {
    const res = await fetch(`${API}/payment-settings/`);
    if (res.ok) card.value = await res.json();
  } catch (e) {
    console.error(e);
  }
}

async function saveCard() {
  savingCard.value = true;
  cardMsg.value = "";
  try {
    const res = await fetch(`${API}/payment-settings/update/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card.value),
    });
    const data = await res.json().catch(() => ({}));
    cardMsg.value = res.ok ? "Saqlandi ✓" : data.error || "Xatolik";
  } catch (e) {
    cardMsg.value = "Tarmoq xatosi";
  } finally {
    savingCard.value = false;
    setTimeout(() => (cardMsg.value = ""), 2000);
  }
}

async function loadList(silent = false) {
  if (!silent) loading.value = true;
  try {
    const status = tab.value === "pending" ? "pending" : "all";
    const res = await fetch(`${API}/payment-requests/?status=${status}`);
    let rows = res.ok ? await res.json() : [];
    if (tab.value === "history") rows = rows.filter((r) => r.status !== "pending");
    list.value = rows;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openAccept(r) {
  acceptForm.value = {
    ...acceptForm.value,
    [r.id]: { amount: null, month: thisMonth, paid_at: today },
  };
}
function cancelAccept(id) {
  const f = { ...acceptForm.value };
  delete f[id];
  acceptForm.value = f;
}

async function confirmAccept(r) {
  const f = acceptForm.value[r.id];
  if (!f || !f.amount || f.amount <= 0) {
    say("Miqdorni kiriting");
    return;
  }
  busyId.value = r.id;
  try {
    const res = await fetch(`${API}/payment-requests/${r.id}/accept/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: f.amount, month: f.month, paid_at: f.paid_at }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      say(data.error || "Xatolik");
      return;
    }
    say("To'lov qabul qilindi");
    cancelAccept(r.id);
    await loadList(true);
    // Manager panelidagi To'lovlar ro'yxatini yangilaymiz
    emit("accepted", { student_id: r.student_id, month: f.month });
  } catch (e) {
    say("Tarmoq xatosi");
  } finally {
    busyId.value = null;
  }
}

async function reject(r) {
  if (!confirm(`${r.student_name} — so'rovni rad etasizmi?`)) return;
  busyId.value = r.id;
  try {
    const res = await fetch(`${API}/payment-requests/${r.id}/reject/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      say("Rad etildi");
      await loadList(true);
    }
  } catch (e) {
    say("Tarmoq xatosi");
  } finally {
    busyId.value = null;
  }
}

let timer = null;
onMounted(() => {
  loadCard();
  loadList();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") loadList(true);
  }, 10000);
});
onBeforeUnmount(() => timer && clearInterval(timer));
</script>

<template>
  <div class="space-y-5">
    <!-- ══════════ Qabul qiluvchi karta ══════════ -->
    <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-indigo-400"></span> Qabul qiluvchi karta
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Karta raqami</label>
          <input v-model="card.card_number" placeholder="8600 xxxx xxxx xxxx"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Karta egasi</label>
          <input v-model="card.card_holder" placeholder="Ism Familiya"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-gray-400 mb-1.5">Izoh (ixtiyoriy)</label>
          <input v-model="card.note" placeholder="Masalan: to'lovdan keyin chek yuboring"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300" />
        </div>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <button @click="saveCard" :disabled="savingCard"
          class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition disabled:opacity-50">
          {{ savingCard ? "Saqlanmoqda..." : "Saqlash" }}
        </button>
        <span v-if="cardMsg" class="text-xs text-emerald-600">{{ cardMsg }}</span>
      </div>
    </div>

    <!-- ══════════ So'rovlar ══════════ -->
    <div>
      <div class="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1 w-fit mb-3">
        <button @click="tab = 'pending'; loadList()" :class="tab === 'pending' ? 'bg-gray-900 text-white' : 'text-gray-500'"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition">
          Kutilmoqda
        </button>
        <button @click="tab = 'history'; loadList()" :class="tab === 'history' ? 'bg-gray-900 text-white' : 'text-gray-500'"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition">
          Tarix
        </button>
      </div>

      <div v-if="loading" class="text-center py-8 text-gray-400 text-sm">Yuklanmoqda...</div>
      <div v-else-if="!list.length" class="text-center py-10 text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
        {{ tab === 'pending' ? "Kutayotgan so'rov yo'q" : "Tarix bo'sh" }}
      </div>

      <div v-else class="space-y-3">
        <div v-for="r in list" :key="r.id" class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-sm text-gray-800">{{ r.student_name }}</p>
              <p class="text-xs text-gray-400">{{ r.student_phone }}</p>
              <p class="text-xs text-gray-400 mt-0.5">Yuborilgan: {{ r.created_at }}</p>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full shrink-0" :class="STATUS[r.status]?.cls">
              {{ STATUS[r.status]?.label }}
            </span>
          </div>

          <!-- Chek rasmi (faqat pending) -->
          <div v-if="r.receipt_b64" class="mt-3">
            <img :src="r.receipt_b64" alt="chek" @click="viewImg = r.receipt_b64"
              class="max-h-40 rounded-xl border border-gray-100 cursor-zoom-in" />
          </div>

          <!-- Qabul qilingan ma'lumot -->
          <div v-if="r.status === 'accepted'" class="mt-2 text-sm text-gray-600">
            <span class="font-semibold text-emerald-600">{{ fmtMoney(r.amount) }}</span>
            <span v-if="r.month" class="text-gray-400"> · {{ r.month }}</span>
            <span v-if="r.paid_at" class="text-gray-400"> · {{ r.paid_at }}</span>
          </div>

          <!-- Pending amallar -->
          <template v-if="r.status === 'pending'">
            <!-- Accept formasi -->
            <div v-if="acceptForm[r.id]" class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">Miqdor (so'm)</label>
                <input type="number" min="0" v-model.number="acceptForm[r.id].amount" placeholder="0"
                  class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-300" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">Oy</label>
                <input type="month" v-model="acceptForm[r.id].month"
                  class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-300" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">To'langan sana</label>
                <input type="date" v-model="acceptForm[r.id].paid_at"
                  class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-300" />
              </div>
              <div class="sm:col-span-3 flex gap-2 justify-end">
                <button @click="cancelAccept(r.id)" class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-sm">
                  Bekor
                </button>
                <button @click="confirmAccept(r)" :disabled="busyId === r.id"
                  class="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 disabled:opacity-50">
                  {{ busyId === r.id ? "..." : "Tasdiqlash" }}
                </button>
              </div>
            </div>

            <div v-else class="mt-3 flex gap-2">
              <button @click="openAccept(r)"
                class="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
                Qabul qilish
              </button>
              <button @click="reject(r)" :disabled="busyId === r.id"
                class="px-4 py-2 rounded-xl border border-rose-200 text-rose-500 text-sm hover:bg-rose-50 transition disabled:opacity-50">
                Rad etish
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Rasmni katta ko'rish -->
    <div v-if="viewImg" @click="viewImg = ''"
      class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 cursor-zoom-out">
      <img :src="viewImg" alt="chek" class="max-w-full max-h-full rounded-xl" />
    </div>

    <p v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
      {{ toast }}
    </p>
  </div>
</template>
