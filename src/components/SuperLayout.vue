<template>
  <div class="min-h-screen bg-slate-50 app-gradient flex py-4">
    <!-- ══════════ YON PANEL (desktop) ══════════ -->
    <!-- Yig'ilganda faqat ikonkalar qoladi; tanlov localStorage'da
         saqlanadi, shuning uchun sahifa almashganda ham o'sha holatda
         qoladi -->
    <aside :class="[
      'hidden lg:flex flex-col shrink-0 border-r rounded-2xl border-slate-200 bg-white sticky top-0 h-screen transition-[width] duration-200',
      collapsed ? 'w-[68px]' : 'w-60',
    ]">
      <div class="p-4 flex items-center gap-2.5" :class="collapsed ? 'justify-center' : ''">
        <img src="../icon/itline.png" alt="" class="w-9 rounded-full shrink-0" />
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-800 leading-tight">ITLINE</p>
          <p class="text-[11px] text-indigo-500 leading-tight">supermenejer</p>
        </div>
      </div>


      <nav class="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        <button @click="toggleCollapsed" :title="collapsed ? 'Menyuni ochish' : 'Menyuni yig\'ish'"
          :class="[navBtn, 'mt-1 border-t border-slate-200 pt-3 rounded-none']">
          <AppIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" class="shrink-0" />
          <span v-if="!collapsed">Yig'ish</span>
        </button>
        <router-link v-for="l in links" :key="l.to" :to="l.to" :title="collapsed ? l.label : ''" :class="[
          'flex items-center gap-2.5 py-2.5 rounded-xl text-sm transition relative',
          collapsed ? 'px-0 justify-center' : 'px-3',
          isActive(l)
            ? 'bg-slate-900 text-white'
            : 'text-slate-500 hover:bg-slate-50',
        ]">
          <AppIcon :name="l.icon" class="shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ l.label }}</span>
          <span v-if="l.badge" :class="[
            'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold',
            collapsed ? 'absolute top-1 right-1' : 'ml-auto',
          ]">
            {{ l.badge }}
          </span>
        </router-link>
      </nav>

      <div class="p-2.5 border-t border-slate-200 space-y-0.5">
        <router-link to="/excellence" :title="collapsed ? 'Menejer paneli' : ''" :class="navBtn">
          <AppIcon name="briefcase" class="shrink-0" />
          <span v-if="!collapsed">Menejer paneli</span>
        </router-link>
        <router-link to="/super/profile" :title="collapsed ? 'profile' : ''" :class="navBtn">
          <AppIcon name="user" class="shrink-0" />
          <span v-if="!collapsed">Profile</span>
        </router-link>
      </div>
    </aside>

    <!-- ══════════ ASOSIY QISM ══════════ -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Mobil sarlavha -->
      <header class="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div class="flex items-center gap-2 px-4 py-3">
          <img src="../icon/itline.png" alt="" class="w-8 rounded-full" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 leading-tight truncate">
              {{ title }}
            </p>
            <p class="text-[11px] text-violet-600 leading-tight">supermenejer</p>
          </div>
          <router-link to="/super/profile" class="p-2 rounded-lg text-slate-400 hover:bg-slate-50 transition">
            <AppIcon name="settings" />
          </router-link>
          <button @click="toggleTheme" class="p-2 rounded-lg text-slate-400 hover:bg-slate-50 transition">
            <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
          </button>
          <button @click="logout"
            class="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition">
            <AppIcon name="logout" />
          </button>
        </div>
        <div class="flex gap-1.5 px-3 pb-2.5 overflow-x-auto">
          <router-link v-for="l in links" :key="l.to" :to="l.to" :class="[
            'px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0',
            isActive(l)
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 text-slate-500 hover:bg-slate-50',
          ]">
            <AppIcon :name="l.icon" /> {{ l.label }}
            <span v-if="l.badge"
              class="min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
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
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { logout } from "@/utils/managerApi";

const props = defineProps({
  title: { type: String, default: "Supermenejer" },
  subtitle: { type: String, default: "" },
  // Kutilayotgan to'lov so'rovlari kabi belgilar
  badges: { type: Object, default: () => ({}) },
});

const route = useRoute();
const { theme, toggleTheme } = useTheme();

// Yon menyu yig'ilgan holati sahifalar orasida saqlanadi
const collapsed = ref(localStorage.getItem("super_nav_collapsed") === "1");
function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  localStorage.setItem("super_nav_collapsed", collapsed.value ? "1" : "0");
}

// Pastki tugmalar bir xil ko'rinishda — takrorlanmasin
const navBtn = computed(() => [
  "w-full flex items-center gap-2.5 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition",
  collapsed.value ? "px-0 justify-center" : "px-3",
]);

const links = computed(() => [
  { to: "/super", label: "Bosh sahifa", icon: "chart", exact: true },
  { to: "/super/activity", label: "Harakatlar", icon: "attendance" },
  { to: "/super/managers", label: "Menejerlar", icon: "manager" },
  { to: "/super/salaries", label: "Ustoz oyliklari", icon: "teacher" },
  { to: "/super/finance", label: "Moliya", icon: "money" },
  { to: "/super/cash", label: "Kassa", icon: "wallet" },
  { to: "/super/faceid", label: "Yuz tanish", icon: "user" },
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
</script>
