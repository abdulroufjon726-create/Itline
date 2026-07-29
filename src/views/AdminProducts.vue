<script setup>
import { ref, onMounted } from "vue";
import AppIcon from "@/components/AppIcon.vue";

const API = "https://itline-django-9s85.onrender.com/api";

const products = ref([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(null);
const toast = ref({ msg: "", type: "success" });
const showModal = ref(false);
const editingProduct = ref(null);
const confirmDeleteProduct = ref(null);

const emptyForm = () => ({
  name: "",
  image: "",
  price_coins: "",
  description: "",
  stock: "",
  is_active: true,
});

const form = ref(emptyForm());

function showToast(msg, type = "success") {
  toast.value = { msg, type };
  setTimeout(() => (toast.value = { msg: "", type: "success" }), 2500);
}

// ─── API calls ───────────────────────────────────────────

async function fetchProducts() {
  loading.value = true;
  try {
    const res = await fetch(`${API}/products/`);
    products.value = await res.json();
  } catch {
    showToast("Mahsulotlarni yuklashda xatolik", "error");
  } finally {
    loading.value = false;
  }
}

async function saveProduct() {
  if (!form.value.name.trim()) {
    showToast("Nom majburiy", "error");
    return;
  }
  if (form.value.price_coins === "" || Number(form.value.price_coins) < 0) {
    showToast("Narx majburiy", "error");
    return;
  }

  saving.value = true;

  const payload = {
    name: form.value.name.trim(),
    image: form.value.image.trim(),
    price_coins: Number(form.value.price_coins),
    description: form.value.description.trim(),
    is_active: form.value.is_active,
    stock: form.value.stock !== "" ? Number(form.value.stock) : null,
  };

  try {
    let res;
    if (editingProduct.value) {
      res = await fetch(
        `${API}/products/update/${editingProduct.value.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } else {
      res = await fetch(`${API}/products/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (res.ok) {
      showToast(editingProduct.value ? "Yangilandi!" : "Mahsulot qo'shildi!");
      showModal.value = false;
      await fetchProducts();
    } else {
      showToast(data.error || "Xatolik yuz berdi", "error");
    }
  } catch {
    showToast("Server bilan bog'lanib bo'lmadi", "error");
  } finally {
    saving.value = false;
  }
}

async function toggleActive(product) {
  try {
    const res = await fetch(`${API}/products/update/${product.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    if (res.ok) {
      product.is_active = !product.is_active;
      showToast(product.is_active ? "Faollashtrildi" : "Nofaol qilindi");
    }
  } catch {
    showToast("Xatolik", "error");
  }
}

async function confirmDelete() {
  const product = confirmDeleteProduct.value;
  if (!product) return;
  deleting.value = product.id;
  try {
    const res = await fetch(`${API}/products/delete/${product.id}/`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("O'chirildi");
      await fetchProducts();
    } else {
      showToast("O'chirishda xatolik", "error");
    }
  } catch {
    showToast("Server bilan bog'lanib bo'lmadi", "error");
  } finally {
    deleting.value = null;
    confirmDeleteProduct.value = null;
  }
}

// ─── Modal helpers ───────────────────────────────────────

function openCreate() {
  editingProduct.value = null;
  form.value = emptyForm();
  showModal.value = true;
}

function openEdit(product) {
  editingProduct.value = product;
  form.value = {
    name: product.name,
    image: product.image || "",
    price_coins: product.price_coins,
    description: product.description || "",
    stock:
      product.stock !== null && product.stock !== undefined
        ? product.stock
        : "",
    is_active: product.is_active,
  };
  showModal.value = true;
}

onMounted(fetchProducts);
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl font-semibold">Mahsulotlar</h1>
        <p class="text-sm text-gray-400">Magazine do'koni boshqaruvi</p>
      </div>
      <button
        @click="openCreate"
        class="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition"
      >
        + Mahsulot qo'shish
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-400 text-sm">
      Yuklanmoqda...
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th class="px-4 py-3 text-left">Rasm</th>
            <th class="px-4 py-3 text-left">Nom</th>
            <th class="px-4 py-3 text-left">Narx</th>
            <th class="px-4 py-3 text-left">Qoldiq</th>
            <th class="px-4 py-3 text-left">Holat</th>
            <th class="px-4 py-3 text-left">Amallar</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="p in products"
            :key="p.id"
            class="hover:bg-gray-50 transition"
          >
            <!-- Rasm -->
            <td class="px-4 py-3">
              <div
                class="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center"
              >
                <img
                  v-if="p.image"
                  :src="p.image"
                  :alt="p.name"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-2xl"><AppIcon name="gift" /></span>
              </div>
            </td>

            <!-- Nom + tavsif -->
            <td class="px-4 py-3">
              <p class="font-medium">{{ p.name }}</p>
              <p
                v-if="p.description"
                class="text-xs text-gray-400 truncate max-w-[200px]"
              >
                {{ p.description }}
              </p>
            </td>

            <!-- Narx -->
            <td class="px-4 py-3 font-semibold text-amber-600">
              <AppIcon name="coin" /> {{ p.price_coins }}
            </td>

            <!-- Qoldiq -->
            <td class="px-4 py-3 text-gray-500">
              {{ p.stock !== null && p.stock !== undefined ? p.stock : "∞" }}
            </td>

            <!-- Holat toggle -->
            <td class="px-4 py-3">
              <button
                @click="toggleActive(p)"
                :class="[
                  'px-2.5 py-1 rounded-full text-xs font-medium transition',
                  p.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                ]"
              >
                {{ p.is_active ? "Faol" : "Nofaol" }}
              </button>
            </td>

            <!-- Amallar -->
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  @click="openEdit(p)"
                  class="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                >
                  Tahrirlash
                </button>
                <button
                  @click="confirmDeleteProduct = p"
                  class="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                >
                  O'chirish
                </button>
              </div>
            </td>
          </tr>

          <!-- Bo'sh holat -->
          <tr v-if="products.length === 0">
            <td colspan="6" class="text-center py-12 text-gray-400">
              Hozircha mahsulot yo'q
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Qo'shish / Tahrirlash Modal ── -->
    <transition name="fade">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
        @click.self="showModal = false"
      >
        <div
          class="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
        >
          <h2 class="font-semibold text-base">
            {{ editingProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot" }}
          </h2>

          <!-- Nom -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Nom *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Mahsulot nomi"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
            />
          </div>

          <!-- Rasm URL + preview -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Rasm URL</label>
            <input
              v-model="form.image"
              type="text"
              placeholder="https://..."
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
            />
            <div
              v-if="form.image"
              class="mt-2 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100"
            >
              <img
                :src="form.image"
                class="w-full h-full object-cover"
                @error="(e) => (e.target.style.display = 'none')"
              />
            </div>
          </div>

          <!-- Narx va Qoldiq -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-500 mb-1 block"
                >Narx (coin) *</label
              >
              <input
                v-model="form.price_coins"
                type="number"
                min="0"
                placeholder="100"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block"
                >Qoldiq (bo'sh = ∞)</label
              >
              <input
                v-model="form.stock"
                type="number"
                min="0"
                placeholder="∞"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 transition"
              />
            </div>
          </div>

          <!-- Tavsif -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Tavsif</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Qisqa tavsif..."
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 transition resize-none"
            />
          </div>

          <!-- Faol toggle -->
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="w-4 h-4 accent-gray-900"
            />
            <span class="text-sm text-gray-600">Faol (do'konda ko'rinsin)</span>
          </label>

          <!-- Tugmalar -->
          <div class="flex gap-2 pt-1">
            <button
              @click="showModal = false"
              class="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50 transition"
            >
              Bekor qilish
            </button>
            <button
              @click="saveProduct"
              :disabled="saving"
              class="flex-1 bg-gray-900 text-white rounded-xl py-2 text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
              {{
                saving
                  ? "Saqlanmoqda..."
                  : editingProduct
                    ? "Saqlash"
                    : "Qo'shish"
              }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── O'chirish tasdiqlash Modal ── -->
    <transition name="fade">
      <div
        v-if="confirmDeleteProduct"
        class="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
        @click.self="confirmDeleteProduct = null"
      >
        <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
          <p class="font-semibold mb-1">Mahsulotni o'chirish</p>
          <p class="text-sm text-gray-500 mb-4">
            <span class="font-medium text-gray-700">{{
              confirmDeleteProduct.name
            }}</span>
            ni o'chirasizmi? Bu amalni bekor qilib bo'lmaydi.
          </p>
          <div class="flex gap-2">
            <button
              @click="confirmDeleteProduct = null"
              class="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
            >
              Bekor qilish
            </button>
            <button
              @click="confirmDelete"
              :disabled="deleting === confirmDeleteProduct?.id"
              class="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm hover:bg-red-600 transition disabled:opacity-50"
            >
              {{
                deleting === confirmDeleteProduct?.id
                  ? "O'chirilmoqda..."
                  : "O'chirish"
              }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Toast ── -->
    <transition name="slide-up">
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

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
