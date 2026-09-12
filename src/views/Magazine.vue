<script setup>
import { ref, onMounted, computed } from "vue";
import { API } from "@/config";
import { useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("user") || "null");
if (!user) router.push("/login");

const coins = ref(user?.coin_balance ?? 0);
const products = ref([]);
const orders = ref([]);
const loadingProducts = ref(true);
const loadingOrders = ref(true);
const buyingId = ref(null);
const toast = ref({ msg: "", type: "success" });
const confirmProduct = ref(null);

function showToast(msg, type = "success") {
  toast.value = { msg, type };
  setTimeout(() => (toast.value = { msg: "", type: "success" }), 2200);
}

async function fetchCoins() {
  try {
    const res = await fetch(`${API}/coins/student/${user.id}/`);
    const data = await res.json();
    coins.value = data.coin_balance;
  } catch {
    showToast("Coin ma'lumotini yuklashda xatolik", "error");
  }
}

async function fetchProducts() {
  loadingProducts.value = true;
  try {
    const res = await fetch(`${API}/products/`);
    const data = await res.json();
    products.value = Array.isArray(data) ? data : [];
  } catch {
    showToast("Mahsulotlarni yuklashda xatolik", "error");
  } finally {
    loadingProducts.value = false;
  }
}

async function fetchOrders() {
  loadingOrders.value = true;
  try {
    const res = await fetch(`${API}/orders/student/${user.id}/`);
    const data = await res.json();
    orders.value = Array.isArray(data) ? data : [];
  } catch {
    showToast("Buyurtmalarni yuklashda xatolik", "error");
  } finally {
    loadingOrders.value = false;
  }
}

function openConfirm(product) {
  if (coins.value < product.price_coins) {
    showToast("Coin yetarli emas", "error");
    return;
  }
  if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
    showToast("Mahsulot tugagan", "error");
    return;
  }
  confirmProduct.value = product;
}

async function confirmPurchase() {
  const product = confirmProduct.value;
  if (!product || buyingId.value) return;
  buyingId.value = product.id;
  try {
    const res = await fetch(`${API}/orders/create/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: user.id, product_id: product.id }),
    });
    const data = await res.json();
    if (res.ok) {
      coins.value = data.coin_balance;
      showToast("Buyurtma yuborildi!");
      await Promise.all([fetchProducts(), fetchOrders()]);
    } else {
      showToast(data.error || "Xatolik yuz berdi", "error");
    }
  } catch {
    showToast("Server bilan bog'lanib bo'lmadi", "error");
  } finally {
    buyingId.value = null;
    confirmProduct.value = null;
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

const affordable = computed(() => (price) => coins.value >= price);

onMounted(async () => {
  await Promise.all([fetchCoins(), fetchProducts(), fetchOrders()]);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Header -->
      <div class="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 class="text-xl font-semibold">Magazine</h1>
          <p class="text-sm text-gray-400">
            Coinlaringizni sovrinlarga ayirboshlang
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">
            <AppIcon name="coin" /> {{ coins }}
          </span>
        </div>
      </div>

      <!-- Mahsulotlar -->
      <div v-if="loadingProducts" class="text-center py-10 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div
          v-for="p in products"
          :key="p.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
        >
          <div class="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              v-if="p.image"
              :src="p.image"
              :alt="p.name"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-4xl"><AppIcon name="gift" /></span>
          </div>
          <div class="p-4 flex flex-col flex-1">
            <p class="font-medium text-sm">{{ p.name }}</p>
            <p v-if="p.description" class="text-xs text-gray-400 mt-1 line-clamp-2">
              {{ p.description }}
            </p>
            <div class="mt-auto pt-3 flex items-center justify-between gap-2">
              <span class="text-sm font-semibold text-amber-600"><AppIcon name="coin" /> {{ p.price_coins }}</span>
              <button
                @click="openConfirm(p)"
                :disabled="!affordable(p.price_coins) || buyingId === p.id || (p.stock !== null && p.stock !== undefined && p.stock <= 0)"
                :class="[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition',
                  affordable(p.price_coins) && !(p.stock !== null && p.stock !== undefined && p.stock <= 0)
                    ? 'bg-gray-900 text-white hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ]"
              >
                {{ buyingId === p.id ? "..." : "Sotib olish" }}
              </button>
            </div>
            <p v-if="p.stock !== null && p.stock !== undefined" class="text-xs mt-1"
              :class="p.stock <= 0 ? 'text-red-400' : 'text-gray-400'"
            >
              {{ p.stock <= 0 ? "Tugagan" : `Qolgan: ${p.stock}` }}
            </p>
          </div>
        </div>

        <p
          v-if="products.length === 0"
          class="col-span-full text-center py-10 text-gray-400 text-sm"
        >
          Hozircha mahsulot yo'q
        </p>
      </div>

      <!-- Mening buyurtmalarim -->
      <div class="bg-white rounded-2xl p-4 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Mening buyurtmalarim
        </h2>
        <div v-if="loadingOrders" class="text-center py-6 text-gray-400 text-sm">
          Yuklanmoqda...
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="o in orders"
            :key="o.id"
            class="flex justify-between items-center border border-gray-100 rounded-xl px-3 py-2.5"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ o.product_name }}</p>
              <p class="text-xs text-gray-400">
                {{ o.created_at }} · <AppIcon name="coin" /> {{ o.price_coins }}
              </p>
            </div>
            <span
              :class="[
                'shrink-0 text-xs px-2.5 py-1 rounded-full font-medium',
                statusStyle[o.status] || 'bg-gray-100 text-gray-500',
              ]"
            >
              {{ statusLabel[o.status] || o.status }}
            </span>
          </div>
          <p
            v-if="orders.length === 0"
            class="text-center py-4 text-gray-400 text-sm"
          >
            Hozircha buyurtma yo'q
          </p>
        </div>
      </div>
    </div>

    <!-- Tasdiqlash modal -->
    <transition name="fade">
      <div
        v-if="confirmProduct"
        class="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
        @click.self="confirmProduct = null"
      >
        <div class="bg-white rounded-2xl p-5 max-w-sm w-full">
          <p class="font-semibold mb-1">{{ confirmProduct.name }}</p>
          <p class="text-sm text-gray-400 mb-4">
            <AppIcon name="coin" /> {{ confirmProduct.price_coins }} coin sarflanadi. Davom etasizmi?
          </p>
          <div class="flex gap-2">
            <button
              @click="confirmProduct = null"
              class="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
            >
              Bekor qilish
            </button>
            <button
              @click="confirmPurchase"
              :disabled="buyingId === confirmProduct.id"
              class="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
              {{ buyingId === confirmProduct.id ? "Yuborilmoqda..." : "Tasdiqlash" }}
            </button>
          </div>
        </div>
      </div>
    </transition>

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