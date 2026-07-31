<template>
  <div class="mb-6">
    <div class="flex items-center gap-2 mb-3">
      <img src="../icon/itline.png" alt="" class="w-10 rounded-full " />
      <div class="flex-1 min-w-0">
        <h1 class="text-xl sm:text-2xl text-slate-800 tracking-tight">
          {{ title }}
        </h1>
        <p class="text-sm text-slate-400">{{ subtitle }}</p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <router-link v-if="isSuperUser" to="/super"
          class="px-3 py-1.5 rounded-full text-xs bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5">
          <AppIcon name="key" />
          <span class="hidden sm:inline">Supermenejer</span>
        </router-link>
        <router-link to="/excellence"
          class="px-3 py-1.5 rounded-full text-xs border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-500 transition flex items-center gap-1.5">
          <AppIcon name="arrow-left" />
          <span class="hidden sm:inline">Asosiy panel</span>
        </router-link>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <router-link v-for="l in links" :key="l.to" :to="l.to" :class="[
        'px-4 py-2 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5',
        $route.path === l.to
          ? 'bg-slate-900 text-white border-slate-900'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
      ]">
        <AppIcon :name="l.icon" /> {{ l.label }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import { can, isSuper } from "@/utils/managerApi";

defineProps({
  title: { type: String, default: "Menejer paneli" },
  subtitle: { type: String, default: "" },
});

// Supermenejer bu sahifalarga tushganda o'z bo'limiga qayta olsin
const isSuperUser = isSuper();

// Supermenejer bermagan bo'limlar menejerga umuman ko'rinmaydi
const ALL_LINKS = [
  { to: "/manager/students", label: "O'quvchilar", icon: "student", perm: "students.view" },
  { to: "/manager/teachers", label: "Ustozlar", icon: "teacher", perm: "teachers.view" },
  { to: "/manager/managers", label: "Menejerlar", icon: "manager", perm: "managers.view" },
];

const links = computed(() => ALL_LINKS.filter((l) => can(l.perm)));
</script>
