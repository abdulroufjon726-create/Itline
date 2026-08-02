<script setup>
import { ref, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import AttendanceBoard from "@/components/AttendanceBoard.vue";
import { authHeaders, logout } from "@/utils/managerApi";

const API = "https://itline-django-9s85.onrender.com/api";
const user = JSON.parse(localStorage.getItem("user") || "null");

const groups = ref([]);
const loading = ref(true);


// Ustozning o'z guruhlari
async function fetchGroups() {
  if (!user?.teacher_id) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    // Server ustozga faqat o'z guruhlarini qaytaradi; quyidagi filtr
    // eski javoblar uchun qo'shimcha himoya
    const res = await fetch(`${API}/groups/`, { headers: authHeaders() });
    const all = await res.json();
    groups.value = (Array.isArray(all) ? all : []).filter(
      (g) => g.teacher === user.teacher_id || g.teacher?.id === user.teacher_id,
    );
  } catch (e) {
    console.error("Guruhlar yuklanmadi:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchGroups);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Header -->
      <div class="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 class="text-xl font-semibold">Davomat</h1>
          <p class="text-sm text-gray-400">{{ user?.name }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="$router.push('/admin')"
            class="px-4 py-2 rounded-full border border-gray-200 text-sm bg-white hover:bg-gray-50 transition">
            <AppIcon name="arrow-left" /> Admin
          </button>
          <button @click="logout"
            class="px-4 py-2 rounded-full border border-gray-200 text-sm bg-white hover:bg-gray-50 transition">
            Chiqish
          </button>
        </div>
      </div>

      <!-- Teacher emas -->
      <div v-if="!user?.teacher_id" class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
        <p class="text-sm font-medium text-yellow-700 mb-1">Davomat teacher uchun</p>
        <p class="text-xs text-yellow-500">
          Bu akkauntda teacher_id yo'q — davomat uchun teacher akkauntiga kiring
        </p>
      </div>

      <div v-else class="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
        <div v-if="loading" class="text-center py-10 text-gray-400 text-sm">
          Yuklanmoqda...
        </div>
        <AttendanceBoard v-else :groups="groups" />
      </div>
    </div>
  </div>
</template>
