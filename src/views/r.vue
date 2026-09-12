<script setup>
import { ref, computed } from "vue";
import { API } from "@/config";
import { useRouter } from "vue-router";
import { normalizePhone } from "../utils/phone.js";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();
const ROLE_PASSWORDS = {
  excellence: "excellence2024",
  admin: "excel2024",
};

const form = ref({
  name: "",
  surname: "",
  phone: "",
  password: "",
  teacher_id: "",
  schedule: "odd",
});

const teachers = ref([]);
const loading = ref(false);
const errorFields = ref(new Set());
const networkError = ref(false);
const successMsg = ref("");

const detectedRole = computed(() => {
  const pwd = form.value.password;
  if (!pwd) return null;
  if (pwd === ROLE_PASSWORDS.excellence) return "excellence";
  if (pwd === ROLE_PASSWORDS.admin) return "admin";
  return "student";
});

const roleLabel = computed(() => {
  switch (detectedRole.value) {
    case "excellence":
      return "Manager";
    case "admin":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return null;
  }
});

async function fetchTeachers() {
  try {
    const res = await fetch(`${API}/teachers/`);
    teachers.value = res.ok ? await res.json() : [];
  } catch {
    teachers.value = [];
  }
}
fetchTeachers();

function markError(...fields) {
  fields.forEach((f) => errorFields.value.add(f));
  setTimeout(() => fields.forEach((f) => errorFields.value.delete(f)), 1500);
}
function hasError(field) {
  return errorFields.value.has(field);
}
function resetForm() {
  form.value = {
    name: "",
    surname: "",
    phone: "",
    password: "",
    teacher_id: "",
    schedule: "odd",
  };
}

async function submit() {
  const role = detectedRole.value;
  if (!role) {
    markError("password");
    return;
  }

  const required =
    role === "student"
      ? ["name", "surname", "phone", "password", "teacher_id"]
      : ["name", "phone", "password"];

  const missing = required.filter((f) => !form.value[f]);
  if (missing.length) {
    markError(...missing);
    return;
  }

  let normalizedPhone;
  try {
    normalizedPhone = normalizePhone(form.value.phone);
  } catch {
    markError("phone");
    return;
  }

  loading.value = true;
  try {
    const payload = {
      name: form.value.name,
      surname: form.value.surname,
      phone: normalizedPhone,
      password: form.value.password,
      admin_password: form.value.password,
      excellence_password: form.value.password,
    };

    if (role === "student") {
      payload.teacher_id = Number(form.value.teacher_id);
      payload.schedule = form.value.schedule;
      payload.is_paid = false;
      payload.is_checked = false;
    }

    const res = await fetch(`${API}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    networkError.value = false;

    if (!res.ok) {
      alert(data.error || "Xatolik yuz berdi");
      return;
    }

    const roleText =
      role === "excellence"
        ? "Excellence"
        : role === "admin"
          ? "Admin"
          : "Student";
    successMsg.value = `${form.value.name} ${form.value.surname} ${roleText} sifatida muvaffaqiyatli ro'yxatdan o'tdi`;
    resetForm();
    setTimeout(() => (successMsg.value = ""), 3000);

    // Ro'yxatdan o'tgach login sahifasiga yo'naltirish (xohlasangiz)
    // setTimeout(() => router.push("/login"), 1500);
  } catch {
    networkError.value = true;
  } finally {
    loading.value = false;
  }
}

const inputClass = (field) => [
  "w-full px-3 py-2.5 rounded-xl border outline-none transition text-sm",
  hasError(field)
    ? "border-red-300 bg-red-50"
    : "border-gray-200 focus:border-gray-400",
];
</script>

<template>
  <div class="max-w-[420px] mx-auto p-6">
    <h1 class="text-xl font-semibold mb-6 text-center">Ro'yxatdan o'tish</h1>

    <div
      v-if="networkError"
      class="mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2"
    >
      <span class="text-red-400"><AppIcon name="warning" /></span>
      <div>
        <p class="text-xs font-medium text-red-600">Internet aloqasi yo'q</p>
        <p class="text-xs text-red-400">
          Tarmoqni tekshirib qayta urinib ko'ring
        </p>
      </div>
      <button
        @click="networkError = false"
        class="ml-auto text-red-300 hover:text-red-500 text-lg leading-none cursor-pointer"
      >
        ×
      </button>
    </div>

    <div
      v-if="successMsg"
      class="mb-4 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2"
    >
      <span class="text-green-500"><AppIcon name="check" /></span>
      <p class="text-xs font-medium text-green-700">{{ successMsg }}</p>
    </div>

    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Ism</label>
        <input
          type="text"
          v-model="form.name"
          placeholder="Ism"
          :class="inputClass('name')"
        />
      </div>

      <div v-if="detectedRole === 'student' || !detectedRole">
        <label class="block text-xs text-gray-400 mb-1.5">Familiya</label>
        <input
          type="text"
          v-model="form.surname"
          placeholder="Familiyangiz"
          :class="inputClass('surname')"
        />
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Telefon</label>
        <input
          type="tel"
          v-model="form.phone"
          placeholder="+998 90 000 00 00"
          :class="inputClass('phone')"
        />
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1.5">Parol</label>
        <input
          type="password"
          v-model="form.password"
          @keyup.enter="submit"
          placeholder="••••••••"
          :class="inputClass('password')"
        />
        <p v-if="roleLabel" class="text-xs text-gray-400 mt-1.5">
          Aniqlangan rol:
          <span class="font-medium text-gray-600">{{ roleLabel }}</span>
        </p>
      </div>

      <template v-if="detectedRole === 'student'">
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">O'qituvchi</label>
          <select v-model="form.teacher_id" :class="inputClass('teacher_id')">
            <option value="">Tanlang</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Dars kuni</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="form.schedule = 'odd'"
              :class="[
                'flex-1 py-2 rounded-xl text-sm border transition cursor-pointer',
                form.schedule === 'odd'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ]"
            >
              Du / Chor / Juma
            </button>
            <button
              type="button"
              @click="form.schedule = 'even'"
              :class="[
                'flex-1 py-2 rounded-xl text-sm border transition cursor-pointer',
                form.schedule === 'even'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ]"
            >
              Se / Pay / Shan
            </button>
          </div>
        </div>
      </template>

      <button
        @click="submit"
        :disabled="loading"
        class="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition cursor-pointer disabled:opacity-50"
      >
        {{ loading ? "Saqlanmoqda..." : "Ro'yxatdan o'tish" }}
      </button>

      <router-link
        to="/login"
        class="text-center text-xs text-gray-400 hover:text-gray-600"
      >
        Hisobingiz bormi? Kirish
      </router-link>
    </div>
  </div>
</template>
