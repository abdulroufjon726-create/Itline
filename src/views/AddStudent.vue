<template>
  <div class="p-6 max-w-xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">O'quvchi qo'shish</h1>
      <p class="text-gray-400 mt-1">Saytdan kelayotgan murojaatni bazaga o'tkazish</p>
    </div>

    <!-- Sayt leadidan kelgani ko'rinib tursin -->
    <div v-if="fromLead" class="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      🎯 Saytdan kelgan murojaat ma'lumotlari avtomatik to'ldirildi — tekshirib, to'ldiring.
    </div>

    <!-- ─── Muvaffaqiyat ─── -->
    <div v-if="created" class="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div class="text-4xl mb-3">✅</div>
      <h2 class="text-lg font-bold text-gray-900">{{ created.name }} bazaga qo'shildi</h2>
      <p class="text-gray-400 text-sm mt-1">Holati: {{ statusLabel(created.status) }}</p>
      <div class="flex items-center justify-center gap-3 mt-6">
        <RouterLink to="/manager/students"
          class="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-medium transition">
          O'quvchilar ro'yxati
        </RouterLink>
        <button @click="resetForm"
          class="border border-gray-200 text-gray-600 rounded-xl px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer transition">
          Yana qo'shish
        </button>
      </div>
    </div>

    <!-- ─── Forma ─── -->
    <form v-else class="bg-white rounded-2xl border border-gray-100 p-6 space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
        <input v-model="form.name" type="text" required
          class="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="Masalan: Aziza" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
        <input v-model="form.surname" type="text"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="Masalan: Rahimova" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
        <input v-model="form.phone" type="tel" required inputmode="tel"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="+998 90 123 45 67" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Qabul holati</label>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="s in STATUSES" :key="s.value" type="button" @click="form.status = s.value"
            class="rounded-xl border px-2 py-2 text-xs font-semibold cursor-pointer transition"
            :class="form.status === s.value
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
            {{ s.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
        <textarea v-model="form.note" rows="3"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="Qiziqish, manba va boshqa ma'lumotlar" />
      </div>

      <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{{ error }}</p>

      <button type="submit" :disabled="busy"
        class="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold transition cursor-pointer">
        {{ busy ? "Saqlanmoqda..." : "Bazaga qo'shish" }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { RouterLink } from "vue-router";
import { apiSend } from "@/utils/managerApi";

const STATUSES = [
  { value: "pending", label: "Kutilmoqda" },
  { value: "contact", label: "Bog'lanish kerak" },
  { value: "active", label: "Faol" },
];

const route = useRoute();
const form = reactive({ name: "", surname: "", phone: "", note: "", status: "pending" });
const fromLead = ref(false);
const busy = ref(false);
const error = ref("");
const created = ref(null);

function statusLabel(v) {
  return STATUSES.find((s) => s.value === v)?.label || v;
}

/** Lead ismi "Aziza Rahimova" ko'rinishida kelishi mumkin — bo'lib yuboramiz */
function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/);
  if (parts.length < 2) return { name: parts[0] || "", surname: "" };
  return { name: parts[0], surname: parts.slice(1).join(" ") };
}

onMounted(() => {
  const q = route.query;
  if (q.lead || q.name || q.phone) fromLead.value = true;
  if (q.name) {
    // Familiya qo'lda to'ldirilmagan bo'lsa ism-familiyani bo'lamiz
    const { name, surname } = splitName(q.name);
    form.name = name;
    if (!q.surname) form.surname = surname;
  }
  if (q.surname) form.surname = String(q.surname);
  if (q.phone) form.phone = String(q.phone);
  const noteBits = [];
  if (q.interest) noteBits.push(`Qiziqish: ${q.interest}`);
  if (q.note) noteBits.push(String(q.note));
  form.note = noteBits.join("\n");
  leadId.value = q.lead ? Number(q.lead) : null;
});

const leadId = ref(null);

async function submit() {
  error.value = "";
  busy.value = true;
  const res = await apiSend("/students/create/", "POST", {
    name: form.name,
    surname: form.surname,
    phone: form.phone,
    note: form.note,
    status: form.status,
    lead_id: leadId.value,
  });
  busy.value = false;

  if (res.ok) {
    created.value = { name: res.data.name || form.name, status: res.data.status || form.status };
  } else {
    error.value = res.data?.error || "Saqlashda xatolik — qayta urinib ko'ring";
  }
}

function resetForm() {
  created.value = null;
  fromLead.value = false;
  leadId.value = null;
  form.name = "";
  form.surname = "";
  form.phone = "";
  form.note = "";
  form.status = "pending";
}
</script>
