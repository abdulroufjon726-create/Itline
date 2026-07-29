<script setup>
import { ref, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";

const API = "https://itline-django-9s85.onrender.com/api";

const orders = ref([]);
const loading = ref(true);
const resolvingId = ref(null);
const toast = ref({ msg: "", type: "success" });
const activeFilter = ref("pending");

function showToast(msg, type = "success") {
  toast.value = { msg, type };
  setTimeout(() => (toast.value = { msg: "", type: "success" }), 2500);
}

async function fetchOrders() {
  loading.value = true;
  try {
    const res = await fetch(`${API}/orders/?status=${activeFilter.value}`);
    const data = await res.json();
    orders.value = Array.isArray(data) ? data : [];
  } catch {
    showToast("Buyurtmalarni yuklashda xatolik", "error");
  } finally {
    loading.value = false;
  }
}

async function resolveOrder(orderId, status) {
  resolvingId.value = orderId;
  try {
    const res = await fetch(`${API}/orders/resolve/${orderId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(status === "approved" ? "Tasdiqlandi!" : "Rad etildi!");
      await fetchOrders();
    } else {
      showToast(data.error || "Xatolik", "error");
    }
  } catch {
    showToast("Server bilan bog'lanib bo'lmadi", "error");
  } finally {
    resolvingId.value = null;
  }
}

const statusLabel = {
  pending: "Kutilmoqda",
  approved: "Berildi",
  rejected: "Bekor qilindi",
};

const statusStyle = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

onMounted(fetchOrders);
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-semibold">Buyurtmalar</h1>
      <p class="text-sm text-gray-400">Studentlarning magazin so'rovlari</p>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-5 overflow-x-auto">
      <button
        v-for="f in [
          { key: 'pending', icon: 'clock', label: 'Kutilmoqda' },
          { key: 'approved', icon: 'check-circle', label: 'Tasdiqlangan' },
          { key: 'rejected', icon: 'x-circle', label: 'Rad etilgan' },
        ]"
        :key="f.key"
        @click="activeFilter = f.key; fetchOrders()"
        :class="[
          'px-4 py-2 rounded-full text-sm border transition flex items-center gap-1.5',
          activeFilter === f.key
            ? 'bg-gray-900 text-white border-gray-900'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        ]"
      >
        <AppIcon :name="f.icon" />
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-400 text-sm">
      Yuklanmoqda...
    </div>

    <!-- Orders list -->
    <div v-else class="space-y-3">
      <div
        v-for="o in orders"
        :key="o.id"
        class="bg-white rounded-2xl p-4 shadow-sm"
      >
        <!-- Student info -->
        <div class="flex justify-between items-start gap-3 mb-3">
          <div>
            <p class="font-semibold text-sm">{{ o.student_name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              <AppIcon name="schedule" /> {{ o.created_at }}
            </p>
          </div>
          <span
            :class="[
              'text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
              statusStyle[o.status],
            ]"
          >
            {{ statusLabel[o.status] }}
          </span>
        </div>

        <!-- Product info -->
        <div class="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 flex justify-between items-center">
          <div>
            <p class="text-sm font-medium">{{ o.product_name }}</p>
            <p class="text-xs text-amber-600 font-semibold mt-0.5">
              <AppIcon name="coin" /> {{ o.price_coins }} coin
            </p>
          </div>
          <span class="text-2xl"><AppIcon name="gift" /></span>
        </div>

        <!-- Actions (faqat pending uchun) -->
        <div v-if="o.status === 'pending'" class="flex gap-2">
          <button
            @click="resolveOrder(o.id, 'rejected')"
            :disabled="resolvingId === o.id"
            class="flex-1 border border-red-200 text-red-500 rounded-xl py-2 text-sm hover:bg-red-50 transition disabled:opacity-50"
          >
            {{ resolvingId === o.id ? "..." : "Rad etish" }}
          </button>
          <button
            @click="resolveOrder(o.id, 'approved')"
            :disabled="resolvingId === o.id"
            class="flex-1 bg-gray-900 text-white rounded-xl py-2 text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {{ resolvingId === o.id ? "..." : "Tasdiqlash" }}
          </button>
        </div>
      </div>

      <!-- Bo'sh holat -->
      <div
        v-if="orders.length === 0"
        class="text-center py-16 text-gray-400 text-sm"
      >
        {{ activeFilter === 'pending' ? "Kutilayotgan buyurtma yo'q" : "Buyurtma yo'q" }}
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.msg"
        :class="[
          'fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2.5 rounded-full shadow-lg',
          toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900',
        ]"
      >
        {{ toast.msg }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>