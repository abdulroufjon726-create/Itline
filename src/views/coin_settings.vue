<script setup>
import { ref, onMounted, computed } from "vue";
import AppIcon from "@/components/AppIcon.vue";

const API = "https://itline-django-9s85.onrender.com/api";

const coinSettings = ref({
  present: 5,
  late: 2,
  absent: -5,
  payment_ontime: 120,
  payment_grace_days: 5,
});
const loading = ref(true);
const saving = ref(false);
const feedback = ref(""); // "success:..." yoki "error:..."

// Maydonlar ishorali — menejer qiymatning ta'sirini ekranda ko'rib tursin
const signed = (n) => `${Number(n || 0) > 0 ? "+" : ""}${Number(n || 0)}`;
const effectClass = (n) =>
  Number(n || 0) < 0 ? "text-rose-600" : Number(n || 0) > 0 ? "text-emerald-600" : "text-gray-400";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* HTML error page */
  }
  return { ok: res.ok, status: res.status, data };
}

async function fetchSettings() {
  loading.value = true;
  try {
    const { ok, data } = await apiFetch(`/attendance-coin-settings/`);
    if (ok && data) coinSettings.value = data;
  } catch (e) {
    console.error("Coin sozlamalari yuklanmadi:", e);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  feedback.value = "";
  try {
    const { ok, data } = await apiFetch(`/attendance-coin-settings/update/`, {
      method: "PATCH",
      body: JSON.stringify({
        present: coinSettings.value.present,
        late: coinSettings.value.late,
        absent: coinSettings.value.absent,
        payment_ontime: coinSettings.value.payment_ontime,
        payment_grace_days: coinSettings.value.payment_grace_days,
      }),
    });
    if (ok) {
      coinSettings.value = {
        present: data.present,
        late: data.late,
        absent: data.absent,
        payment_ontime: data.payment_ontime,
        payment_grace_days: data.payment_grace_days,
      };
      feedback.value = "success:Saqlandi";
    } else {
      feedback.value = `error:${data?.error || "Xatolik yuz berdi"}`;
    }
  } catch (e) {
    console.error(e);
    feedback.value = "error:Server bilan bog'lanishda xatolik";
  } finally {
    saving.value = false;
    setTimeout(() => (feedback.value = ""), 3000);
  }
}

const feedbackType = computed(() =>
  feedback.value.startsWith("success") ? "success" : "error",
);
const feedbackText = computed(() =>
  feedback.value.split(":").slice(1).join(":"),
);

onMounted(fetchSettings);
</script>

<template>
  <div class="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-lg"><AppIcon name="coin" /></span>
      <h2 class="text-sm font-semibold text-gray-800">
        Davomat uchun coin sozlamalari
      </h2>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      Bu yerda o'zgartirilgan qiymatlar barcha teacherlar uchun, davomat
      belgilanganda avtomatik qo'llanadi.
    </p>

    <div v-if="loading" class="text-sm text-gray-400 py-2">Yuklanmoqda...</div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <AppIcon name="check-circle" /> Keldi
          </label>
          <input
            type="number"
            v-model.number="coinSettings.present"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <AppIcon name="clock" /> Kech keldi
          </label>
          <input
            type="number"
            v-model.number="coinSettings.late"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <AppIcon name="x" /> Kelmadi
          </label>
          <input
            type="number"
            v-model.number="coinSettings.absent"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
          />
        </div>
      </div>

      <!-- Maydonlar ishorali: musbat qiymat coin QO'SHADI, manfiy AYIRADI.
           "Kelmadi" ga musbat son yozilsa darsga kelmagan o'quvchi
           mukofot olib qolardi — buni ekranda ochiq aytamiz. -->
      <div class="mt-3 space-y-1">
        <p class="text-xs text-gray-400">
          Har bir belgilash shu qadar o'zgartiradi:
          <span class="font-medium" :class="effectClass(coinSettings.present)">Keldi {{ signed(coinSettings.present) }}</span>,
          <span class="font-medium" :class="effectClass(coinSettings.late)">Kech {{ signed(coinSettings.late) }}</span>,
          <span class="font-medium" :class="effectClass(coinSettings.absent)">Kelmadi {{ signed(coinSettings.absent) }}</span>
        </p>
        <p v-if="coinSettings.absent > 0" class="text-xs text-amber-600">
          Diqqat: «Kelmadi» musbat turibdi — darsga kelmagan o'quvchiga
          {{ coinSettings.absent }} coin <b>qo'shiladi</b>. Jarima bo'lishi
          uchun manfiy yozing (masalan −{{ coinSettings.absent }}).
        </p>
      </div>

      <!-- ── Oylik to'lov mukofoti ── -->
      <div class="mt-5 pt-5 border-t border-gray-100">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg"><AppIcon name="wallet" /></span>
          <h3 class="text-sm font-semibold text-gray-800">
            Vaqtida to'lov mukofoti
          </h3>
        </div>
        <p class="text-xs text-gray-400 mb-3">
          O'quvchi oylik to'lovni muddatida (guruh ochilgan kun) yoki
          belgilangan kunlar ichida olib kelsa, unga avtomatik shu miqdorda
          coin beriladi.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <AppIcon name="coin" /> Beriladigan coin
            </label>
            <input
              type="number"
              v-model.number="coinSettings.payment_ontime"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <AppIcon name="clock" /> Kechikishga ruxsat (kun)
            </label>
            <input
              type="number"
              min="0"
              v-model.number="coinSettings.payment_grace_days"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-4">
        <button
          @click="saveSettings"
          :disabled="saving"
          class="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
        >
          {{ saving ? "Saqlanmoqda..." : "Saqlash" }}
        </button>
        <span
          v-if="feedback"
          class="text-xs font-medium"
          :class="
            feedbackType === 'success' ? 'text-emerald-600' : 'text-rose-600'
          "
        >
          {{ feedbackText }}
        </span>
      </div>
    </div>
  </div>
</template>
