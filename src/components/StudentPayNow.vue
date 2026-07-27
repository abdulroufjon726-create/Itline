<script setup>
import { ref, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";

/**
 * Student to'lov qilish: markaz kartasini ko'rsatadi, chek rasmini
 * (siqilgan holda) yuklaydi va managerga so'rov yuboradi. O'z so'rovlari
 * holatini ko'radi.
 */
const props = defineProps({
  studentId: { type: [Number, String], required: true },
});
const emit = defineEmits(["submitted"]);

const API = "https://itline-django-9s85.onrender.com/api";

const open = ref(false);
const card = ref({ card_number: "", card_holder: "", note: "" });
const requests = ref([]);
const receipt = ref(""); // base64 data URL
const preview = ref("");
const submitting = ref(false);
const copied = ref(false);
const msg = ref("");
const fileError = ref("");

const STATUS = {
  pending: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600" },
  accepted: { label: "Qabul qilindi", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rad etildi", cls: "bg-rose-50 text-rose-600" },
};

async function loadCard() {
  try {
    const res = await fetch(`${API}/payment-settings/`);
    if (res.ok) card.value = await res.json();
  } catch (e) {
    console.error("card:", e);
  }
}

async function loadRequests() {
  try {
    const res = await fetch(`${API}/payment-requests/student/${props.studentId}/`);
    if (res.ok) requests.value = await res.json();
  } catch (e) {
    console.error("requests:", e);
  }
}

function copyCard() {
  const num = (card.value.card_number || "").replace(/\s/g, "");
  if (!num) return;
  navigator.clipboard?.writeText(num).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  });
}

// Rasmni canvas orqali kichraytirib, siqilgan JPEG (base64) ga aylantiramiz
function onFile(e) {
  fileError.value = "";
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    fileError.value = "Faqat rasm yuklang";
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1000;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.55);
      if (data.length > 700000) {
        // Juda katta bo'lsa yana bir marta qattiqroq siqamiz
        receipt.value = canvas.toDataURL("image/jpeg", 0.4);
      } else {
        receipt.value = data;
      }
      preview.value = receipt.value;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function clearReceipt() {
  receipt.value = "";
  preview.value = "";
}

async function submit() {
  if (!receipt.value || submitting.value) return;
  submitting.value = true;
  msg.value = "";
  try {
    const res = await fetch(`${API}/payment-requests/create/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: props.studentId, receipt_b64: receipt.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      msg.value = data.error || "Xatolik";
      return;
    }
    clearReceipt();
    msg.value = "To'lov so'rovi yuborildi! Manager tasdiqlashini kuting.";
    await loadRequests();
    emit("submitted");
  } catch (e) {
    msg.value = "Internet aloqasini tekshiring";
  } finally {
    submitting.value = false;
  }
}

const fmtMoney = (n) => Number(n || 0).toLocaleString("uz-UZ") + " so'm";

onMounted(() => {
  loadCard();
  loadRequests();
});
</script>

<template>
  <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4">
    <!-- Sarlavha / ochish -->
    <button
      @click="open = !open"
      class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
    >
      <span class="flex items-center gap-2 font-semibold text-gray-800 text-sm">
        <span class="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
          <AppIcon name="payment" />
        </span>
        To'lov qilish
      </span>
      <AppIcon name="chevron-down" class="text-gray-400 transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <div v-if="open" class="px-4 pb-4 space-y-4 border-t border-gray-50 pt-4">
      <!-- Karta -->
      <div v-if="card.card_number" class="rounded-2xl p-4 bg-gradient-to-br from-indigo-500 to-violet-600 text-white relative overflow-hidden">
        <div class="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full"></div>
        <p class="text-xs text-white/70 mb-1">Karta raqami</p>
        <div class="flex items-center justify-between gap-2">
          <p class="text-lg sm:text-xl font-bold tracking-wide tabular-nums">{{ card.card_number }}</p>
          <button
            @click="copyCard"
            class="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1.5 transition shrink-0"
          >
            {{ copied ? "Nusxalandi ✓" : "Nusxa olish" }}
          </button>
        </div>
        <p class="text-sm text-white/90 mt-2">{{ card.card_holder }}</p>
        <p v-if="card.note" class="text-xs text-white/70 mt-1">{{ card.note }}</p>
      </div>
      <div v-else class="rounded-xl p-3 bg-amber-50 text-amber-700 text-xs">
        Karta hali sozlanmagan — manager bilan bog'laning.
      </div>

      <!-- Chek yuklash -->
      <div>
        <p class="text-xs text-gray-500 mb-2">
          To'lovni yuqoridagi kartaga o'tkazing, so'ng chek (screenshot) rasmini yuklang:
        </p>

        <div v-if="!preview">
          <label
            class="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-2xl py-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition"
          >
            <AppIcon name="receipt" class="text-gray-400 text-xl" />
            <span class="text-xs text-gray-400">Chek rasmini tanlang</span>
            <input type="file" accept="image/*" class="hidden" @change="onFile" />
          </label>
          <p v-if="fileError" class="text-xs text-rose-500 mt-1.5">{{ fileError }}</p>
        </div>

        <div v-else class="relative">
          <img :src="preview" alt="chek" class="w-full max-h-64 object-contain rounded-2xl border border-gray-100" />
          <button
            @click="clearReceipt"
            class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/70"
          >
            ×
          </button>
        </div>

        <button
          v-if="preview"
          @click="submit"
          :disabled="submitting"
          class="w-full mt-3 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50"
        >
          {{ submitting ? "Yuborilmoqda..." : "So'rov yuborish" }}
        </button>

        <p v-if="msg" class="text-xs mt-2" :class="msg.includes('yuborildi') ? 'text-emerald-600' : 'text-rose-500'">
          {{ msg }}
        </p>
      </div>

      <!-- Mening so'rovlarim -->
      <div v-if="requests.length">
        <p class="text-xs font-medium text-gray-400 mb-2">Mening so'rovlarim</p>
        <div class="space-y-1.5">
          <div
            v-for="r in requests"
            :key="r.id"
            class="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2"
          >
            <div class="min-w-0">
              <p class="text-xs text-gray-500">{{ r.created_at }}</p>
              <p v-if="r.status === 'accepted'" class="text-sm font-medium text-gray-700">
                {{ fmtMoney(r.amount) }}<span v-if="r.month" class="text-gray-400"> · {{ r.month }}</span>
              </p>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full shrink-0" :class="STATUS[r.status]?.cls">
              {{ STATUS[r.status]?.label || r.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
