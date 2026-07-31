<template>
  <div class="min-h-screen bg-slate-50 app-gradient flex">
    <!-- ══════════ YON PANEL (desktop) ══════════ -->
    <aside
      class="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200 bg-white/70 backdrop-blur sticky top-0 h-screen"
    >
      <div class="p-5 flex items-center gap-2.5">
        <img src="../icon/itline.png" alt="" class="w-9 rounded-full" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 leading-tight">ITLINE</p>
          <p class="text-[11px] text-violet-600 leading-tight">supermenejer</p>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <router-link
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          :class="[
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition',
            isActive(l)
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-50',
          ]"
        >
          <AppIcon :name="l.icon" class="shrink-0" />
          <span class="truncate">{{ l.label }}</span>
          <span
            v-if="l.badge"
            class="ml-auto min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold"
          >
            {{ l.badge }}
          </span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-slate-200 space-y-0.5">
        <button
          @click="toggleTheme"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition"
        >
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
          {{ theme === "dark" ? "Kunduzgi" : "Tungi" }} rejim
        </button>
        <router-link
          to="/excellence"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition"
        >
          <AppIcon name="briefcase" /> Menejer paneli
        </router-link>
        <button
          @click="logout"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition"
        >
          <AppIcon name="logout" /> Chiqish
        </button>
      </div>
    </aside>

    <!-- ══════════ ASOSIY QISM ══════════ -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Mobil sarlavha -->
      <header
        class="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200"
      >
        <div class="flex items-center gap-2 px-4 py-3">
          <img src="../icon/itline.png" alt="" class="w-8 rounded-full" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 leading-tight truncate">
              {{ title }}
            </p>
            <p class="text-[11px] text-violet-600 leading-tight">supermenejer</p>
          </div>
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg text-slate-400 hover:bg-slate-50 transition"
          >
            <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
          </button>
          <button
            @click="logout"
            class="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition"
          >
            <AppIcon name="logout" />
          </button>
        </div>
        <div class="flex gap-1.5 px-3 pb-2.5 overflow-x-auto">
          <router-link
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            :class="[
              'px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0',
              isActive(l)
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-500 hover:bg-slate-50',
            ]"
          >
            <AppIcon :name="l.icon" /> {{ l.label }}
            <span
              v-if="l.badge"
              class="min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold"
            >
              {{ l.badge }}
            </span>
          </router-link>
        </div>
      </header>

      <!-- Sahifa sarlavhasi (desktop) -->
      <div class="hidden lg:block px-6 pt-6">
        <h1 class="text-2xl text-slate-800 tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-slate-400 mt-0.5">{{ subtitle }}</p>
      </div>

      <main class="flex-1 p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";
import { useTheme } from "@/composables/useTheme";

const props = defineProps({
  title: { type: String, default: "Supermenejer" },
  subtitle: { type: String, default: "" },
  // Kutilayotgan to'lov so'rovlari kabi belgilar
  badges: { type: Object, default: () => ({}) },
});

const route = useRoute();
const router = useRouter();
const { theme, toggleTheme } = useTheme();

const links = computed(() => [
  { to: "/super", label: "Bosh sahifa", icon: "chart", exact: true },
  { to: "/super/activity", label: "Harakatlar", icon: "attendance" },
  { to: "/super/managers", label: "Menejerlar", icon: "manager" },
  { to: "/super/salaries", label: "Ustoz oyliklari", icon: "teacher" },
  { to: "/super/finance", label: "Moliya", icon: "money" },
  {
    to: "/super/devices",
    label: "Qurilmalar",
    icon: "monitor",
    badge: props.badges.devices || 0,
  },
]);

// Bosh sahifa faqat aniq mos kelganda yonadi — qolganlari prefiks bo'yicha
function isActive(link) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to);
}

function logout() {
  localStorage.removeItem("user");
  router.push("/login");
}
</script>
