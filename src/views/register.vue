<script setup>
import { reactive, ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useUiStore } from "../stores/uiStore";
import { normalizePhone } from "../utils/phone";
import AppIcon from "@/components/AppIcon.vue";
import { authHeaders } from "@/utils/managerApi";

const API = "https://itline-django-9s85.onrender.com/api";
const router = useRouter();
const ui = useUiStore();

const phoneChecked = ref(false);
const wrongPass = ref(false);
const notFound = ref(false);
const errorFields = ref(new Set());
const networkError = ref(false);
// Supermenejer bu qurilmani bloklagan bo'lsa ko'rsatiladigan xabar
const blockedMsg = ref("");

const form = reactive({
  phone: "",
  password: "",
});

function redirectUser(user) {
  // Supermenejer o'z bo'limiga — bosh sahifada markaz holati,
  // menejerlar faolligi va e'tibor talab qiladigan narsalar chiqadi
  if (user.is_super) router.push("/super");
  // Menejer ham asosiy panelga tushadi — payments, kurslar, guruhlar
  // va qolgan hamma narsa o'sha yerda
  else if (user.is_excellence) router.push("/excellence");
  else if (user.is_admin) router.push("/admin");
  else router.push("/students");
}

function buildUserPayload(result) {
  const isManager = result.role === "manager";
  return {
    id: result.id,
    name: result.name,
    surname: result.surname,
    phone: result.phone,
    teacher_id: result.teacher_id ?? null,
    // Menejer — eng yuqori daraja, panelning barcha bo'limlari ochiq
    is_admin: isManager ? true : result.is_admin ?? false,
    is_excellence: isManager ? true : result.is_excellence ?? false,
    role: result.role ?? "student",
    // Vakolatlar: supermenejerda cheklov yo'q, oddiy menejerda
    // supermenejer bergan ro'yxat bo'yicha panel bo'limlari ochiladi
    is_super: isManager ? !!result.is_super : false,
    permissions: isManager ? result.permissions ?? [] : [],
  };
}

function markError(...fields) {
  fields.forEach((f) => errorFields.value.add(f));
  setTimeout(() => fields.forEach((f) => errorFields.value.delete(f)), 1500);
}

function hasError(field) {
  return errorFields.value.has(field);
}

async function apiFetch(path, options = {}) {
  try {
    // Qurilma ID ham yuboriladi — kirish supermenejer ko'radigan
    // qurilmalar ro'yxatiga yoziladi va bloklangani rad etiladi
    const res = await fetch(`${API}${path}`, {
      headers: authHeaders({ "Content-Type": "application/json" }),
      ...options,
    });
    const data = await res.json();
    networkError.value = false;
    return { ok: res.ok, data, status: res.status };
  } catch {
    networkError.value = true;
    throw new Error("network");
  }
}

// ─── Telefon tekshirish ───────────────────────────────────────
let debounceTimer = null;

function onPhoneInput() {
  clearTimeout(debounceTimer);
  phoneChecked.value = false;
  notFound.value = false;
  wrongPass.value = false;
  form.password = "";
  errorFields.value.clear();

  const digits = form.phone.replace(/\D/g, "");
  // 9 yoki 12 raqam odatiy (901234567 / 998901234567), lekin jadvaldan
  // chala kelgan 8 xonali raqamlar ham tekshirilishi kerak — aks holda
  // parol maydoni ochilmay, egasi tizimga kira olmaydi
  if (digits.length >= 7) {
    debounceTimer = setTimeout(checkPhone, 500);
  }
}

async function checkPhone() {
  let normalized;
  try {
    normalized = normalizePhone(form.phone);
  } catch {
    notFound.value = true;
    phoneChecked.value = false;
    return;
  }

  ui.start();
  try {
    const { ok, data } = await apiFetch("/login/", {
      method: "POST",
      body: JSON.stringify({ phone: normalized, password: null }),
    });
    if (!ok) return;
    if (!data.exists) {
      // Menejerlar alohida jadvalda — u yerdan ham qidiramiz
      const mgr = await apiFetch("/manager/login/", {
        method: "POST",
        body: JSON.stringify({ phone: normalized, password: null }),
      });
      if (mgr.ok && mgr.data.exists) {
        notFound.value = false;
        phoneChecked.value = true;
        return;
      }
    }
    if (!data.exists) {
      notFound.value = true;
      phoneChecked.value = false;
    } else {
      notFound.value = false;
      phoneChecked.value = true;
    }
  } catch {
    // networkError ko'rsatiladi
  } finally {
    ui.stop();
  }
}

async function submitLogin() {
  if (!form.password) {
    markError("password");
    return;
  }

  let normalized;
  try {
    normalized = normalizePhone(form.phone);
  } catch {
    markError("phone");
    return;
  }

  ui.start();
  blockedMsg.value = "";
  try {
    let { ok, data, status } = await apiFetch("/login/", {
      method: "POST",
      body: JSON.stringify({ phone: normalized, password: form.password }),
    });

    // Menejerlar alohida jadvalda — o'quvchi/ustoz sifatida topilmasa
    // menejer sifatida ham urinib ko'ramiz
    if (!(ok && data.exists)) {
      const mgr = await apiFetch("/manager/login/", {
        method: "POST",
        body: JSON.stringify({ phone: normalized, password: form.password }),
      });
      if (mgr.ok && mgr.data.role === "manager") {
        ok = true;
        data = { ...mgr.data, exists: true };
      } else if (mgr.status === 403) {
        status = 403;
        data = mgr.data;
      }
    }

    // Qurilma bloklangan — parol to'g'ri bo'lsa ham kiritilmaydi
    if (status === 403 && data?.error) {
      blockedMsg.value = data.error;
      return;
    }

    if (ok && data.exists) {
      // Yo'naltirish ham shu payload bo'yicha bo'lishi kerak: xom javobda
      // menejerning is_admin/is_excellence maydonlari yo'q, shu sababli
      // u o'quvchilar sahifasiga tushib qolardi
      const payload = buildUserPayload(data);
      localStorage.setItem("user", JSON.stringify(payload));
      // Standart parol bilan kirgan admin/ustozga panelda eslatma chiqadi
      if (form.password === "excel2024") {
        localStorage.setItem("used_default_password", "1");
      } else {
        localStorage.removeItem("used_default_password");
      }
      redirectUser(payload);
    } else {
      wrongPass.value = true;
      setTimeout(() => (wrongPass.value = false), 2000);
    }
  } catch {
    // networkError ko'rsatiladi
  } finally {
    ui.stop();
  }
}

onMounted(async () => {
  const stored = localStorage.getItem("user");
  if (stored) {
    redirectUser(JSON.parse(stored));
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div
      class="w-full max-w-[360px] bg-white border border-gray-100 rounded-2xl overflow-hidden mx-4"
    >
      <!-- HEADER -->
      <div class="p-8 pb-6">
        <div
          class="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-5"
        >
          <span class="text-white text-sm font-medium">IT</span>
        </div>
        <h1 class="text-xl font-semibold text-gray-900 mb-1">Kirish</h1>
        <p class="text-sm text-gray-400">Telefon raqamingizni kiriting</p>
      </div>

      <!-- NETWORK ERROR -->
      <div
        v-if="networkError"
        class="mx-8 mb-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2"
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

      <!-- QURILMA BLOKLANGAN -->
      <div
        v-if="blockedMsg"
        class="mx-8 mb-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2"
      >
        <span class="text-rose-400 shrink-0"><AppIcon name="warning" /></span>
        <div class="min-w-0">
          <p class="text-xs font-medium text-rose-600">Qurilma bloklangan</p>
          <p class="text-xs text-rose-400">{{ blockedMsg }}</p>
        </div>
      </div>

      <!-- BODY -->
      <div class="px-8 pb-8 flex flex-col gap-4">
        <!-- TELEFON -->
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Telefon</label>
          <input
            type="tel"
            v-model="form.phone"
            @input="onPhoneInput"
            @keyup.enter="phoneChecked ? submitLogin() : checkPhone()"
            placeholder="+998 90 000 00 00"
            :class="[
              'w-full px-3 py-2.5 rounded-xl border outline-none transition text-sm',
              hasError('phone') || notFound
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 focus:border-gray-400',
            ]"
          />
          <p v-if="notFound" class="text-xs text-red-400 mt-1.5">
            Bu raqam tizimda topilmadi
          </p>
        </div>

        <!-- PAROL (foydalanuvchi topilgandan keyin) -->
        <template v-if="phoneChecked">
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Parol</label>
            <input
              type="password"
              v-model="form.password"
              @keyup.enter="submitLogin"
              placeholder="••••••••"
              autofocus
              :class="[
                'w-full px-3 py-2.5 rounded-xl border outline-none transition text-sm',
                wrongPass || hasError('password')
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 focus:border-gray-400',
              ]"
            />
            <p v-if="wrongPass" class="text-xs text-red-400 mt-1.5">
              Parol noto'g'ri
            </p>
          </div>
          <button
            @click="submitLogin"
            class="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition cursor-pointer"
          >
            Kirish
          </button>
        </template>

        <!-- DAVOM ETISH tugmasi (telefon kiritilgan, hali tekshirilmagan) -->
        <template v-if="!phoneChecked">
          <button
            @click="checkPhone"
            class="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition cursor-pointer"
          >
            Davom etish
          </button>
        </template>
      </div>
    </div>
  </div>
</template>