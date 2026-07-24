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

      <router-link to="/excellence"
        class="px-3 py-1.5 rounded-full text-xs border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-500 transition shrink-0 flex items-center gap-1.5">
        <AppIcon name="arrow-left" /> Asosiy panel
      </router-link>
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
import { useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();

function logout() {
  localStorage.removeItem("user");
  router.push("/login");
}

defineProps({
  title: { type: String, default: "Menejer paneli" },
  subtitle: { type: String, default: "" },
});

const links = [
  { to: "/manager/students", label: "O'quvchilar", icon: "student" },
  { to: "/manager/teachers", label: "Ustozlar", icon: "teacher" },
  { to: "/manager/managers", label: "Menejerlar", icon: "manager" },
];
</script>
