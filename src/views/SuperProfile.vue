<template>
  <SuperLayout title="Profil" subtitle="Ma'lumotlaringiz va parol">
    <div class="max-w-2xl space-y-4">
      <!-- ══════════ KIM ══════════ -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center gap-3.5">
          <span
            class="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 shrink-0">
            {{ initials }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-slate-800 truncate">
                {{ form.name }} {{ form.surname }}
              </p>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                supermenejer
              </span>
            </div>
            <p class="text-sm text-slate-400 tabular-nums mt-0.5">
              {{ user?.phone }}
            </p>
          </div>
        </div>

        <p class="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-200">
          Supermenejer vakolatlari cheklanmaydi — moliya, ustoz oyliklari,
          menejerlar va qurilmalar bo'limlari doimo ochiq.
        </p>
      </div>

      <!-- ══════════ MA'LUMOTLAR ══════════ -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
          Shaxsiy ma'lumotlar
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Ism</label>
            <input v-model="form.name" :class="inputCls" placeholder="Ism" />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Familiya</label>
            <input v-model="form.surname" :class="inputCls" placeholder="Familiya" />
          </div>
        </div>

        <div class="mt-3">
          <label class="block text-xs text-slate-400 mb-1.5">Telefon</label>
          <input :value="user?.phone" disabled :class="[inputCls, 'opacity-60 cursor-not-allowed']" />
          <p class="text-[11px] text-slate-400 mt-1.5">
            Telefon raqam login uchun ishlatiladi — uni o'zgartirish uchun
            bazaga kirish kerak.
          </p>
        </div>

        <div class="flex items-center gap-3 justify-end mt-4">
          <p v-if="info.msg" :class="info.ok ? 'text-emerald-600' : 'text-rose-500'" class="text-xs flex-1">
            {{ info.msg }}
          </p>
          <button @click="saveInfo" :disabled="info.saving || !form.name.trim()"
            class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40 transition">
            <AppIcon name="check" />
            {{ info.saving ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </div>

      <!-- ══════════ PAROL ══════════ -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-amber-400"></span>
          Parolni o'zgartirish
        </h2>
        <p class="text-xs text-slate-400 mb-4">
          Supermenejer paroli boshqa hech kim tomonidan tiklanmaydi —
          uni yo'qotmang.
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">Joriy parol</label>
            <input v-model="pwd.old" :type="pwd.show ? 'text' : 'password'" :class="inputCls"
              autocomplete="current-password" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">Yangi parol</label>
              <input v-model="pwd.new1" :type="pwd.show ? 'text' : 'password'" :class="inputCls"
                autocomplete="new-password" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">
                Yangi parol (takror)
              </label>
              <input v-model="pwd.new2" :type="pwd.show ? 'text' : 'password'" :class="inputCls"
                autocomplete="new-password" @keyup.enter="savePassword" />
            </div>
          </div>
        </div>

        <label class="flex items-center gap-2 text-xs text-slate-500 mt-3 cursor-pointer select-none">
          <input type="checkbox" v-model="pwd.show" class="accent-indigo-500" />
          Parolni ko'rsatish
        </label>

        <div class="flex items-center gap-3 justify-end mt-4">
          <p v-if="pwd.msg" :class="pwd.ok ? 'text-emerald-600' : 'text-rose-500'" class="text-xs flex-1">
            {{ pwd.msg }}
          </p>
          <button @click="savePassword" :disabled="pwd.saving"
            class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-40 transition">
            <AppIcon name="lock" />
            {{ pwd.saving ? "Saqlanmoqda..." : "O'zgartirish" }}
          </button>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <button @click="toggleTheme" :title="collapsed ? (theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim') : ''"
          :class="navBtn">
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" class="shrink-0" />
          <span v-if="!collapsed">
            {{ theme === "dark" ? "Kunduzgi" : "Tungi" }} rejim
          </span>
        </button>

        <button @click="logout" :title="collapsed ? 'Chiqish' : ''" :class="[navBtn, 'hover:text-rose-500']">
          <AppIcon name="logout" class="shrink-0" />
          <span v-if="!collapsed">Chiqish</span>
        </button>
      </div>
    </div>
  </SuperLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import SuperLayout from "@/components/SuperLayout.vue";
import { API, apiSend, currentUser, logout } from "@/utils/managerApi";
import { useTheme } from "@/composables/useTheme";


const { theme, toggleTheme } = useTheme();


const user = ref(currentUser());

const form = reactive({
  name: user.value?.name || "",
  surname: user.value?.surname || "",
});

const info = reactive({ saving: false, msg: "", ok: false });
const pwd = reactive({
  old: "",
  new1: "",
  new2: "",
  show: false,
  saving: false,
  msg: "",
  ok: false,
});

const initials = computed(() =>
  `${form.name} ${form.surname}`
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?",
);

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm " +
  "outline-none transition focus:border-indigo-400";

function flash(target, msg, ok) {
  target.msg = msg;
  target.ok = ok;
  setTimeout(() => (target.msg = ""), 4000);
}

const collapsed = ref(localStorage.getItem("super_nav_collapsed") === "1");
function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  localStorage.setItem("super_nav_collapsed", collapsed.value ? "1" : "0");
}

// Pastki tugmalar bir xil ko'rinishda — takrorlanmasin
const navBtn = computed(() => [
  "w-full cursor-pointer flex items-center gap-2.5 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition",
  collapsed.value ? "px-0 justify-center" : "px-3",
]);

async function saveInfo() {
  info.saving = true;
  try {
    const { ok, data } = await apiSend("/profile/update/", "PATCH", {
      phone: user.value.phone,
      name: form.name.trim(),
      surname: form.surname.trim(),
    });
    if (!ok) return flash(info, data.error || "Saqlanmadi", false);

    // localStorage'dagi nom ham yangilansin — panel sarlavhasida
    // eski ism qolib ketmasligi uchun
    const next = { ...user.value, name: data.name, surname: data.surname };
    localStorage.setItem("user", JSON.stringify(next));
    user.value = next;
    flash(info, "Saqlandi", true);
  } catch {
    flash(info, "Internet aloqasi yo'q", false);
  } finally {
    info.saving = false;
  }
}

async function savePassword() {
  if (!pwd.old || !pwd.new1 || !pwd.new2) {
    return flash(pwd, "Barcha maydonlarni to'ldiring", false);
  }
  if (pwd.new1 !== pwd.new2) {
    return flash(pwd, "Yangi parollar mos kelmadi", false);
  }
  if (pwd.new1.length < 6) {
    return flash(pwd, "Parol kamida 6 ta belgidan iborat bo'lsin", false);
  }
  if (pwd.new1 === pwd.old) {
    return flash(pwd, "Yangi parol eskisidan farq qilsin", false);
  }

  pwd.saving = true;
  try {
    const res = await fetch(`${API}/change-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: user.value.phone,
        old_password: pwd.old,
        new_password: pwd.new1,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return flash(pwd, data.error || "Xatolik yuz berdi", false);

    pwd.old = pwd.new1 = pwd.new2 = "";
    localStorage.removeItem("used_default_password");
    flash(pwd, "Parol o'zgartirildi", true);
  } catch {
    flash(pwd, "Internet aloqasi yo'q", false);
  } finally {
    pwd.saving = false;
  }
}

onMounted(() => {
  user.value = currentUser();
  form.name = user.value?.name || "";
  form.surname = user.value?.surname || "";
});


</script>
