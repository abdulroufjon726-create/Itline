import { createRouter, createWebHistory, START_LOCATION } from "vue-router";
import OfflineView from "@/views/OfflineView.vue";

// Serverni uyg'otish ping'i `composables/useKeepAwake` ga ko'chdi:
// u sahifa ochilishida ham uradi, keyin har 10 daqiqada takrorlaydi —
// bir marta uyg'otish yetmasdi, server yana uxlab qolardi.

const lazy = (view: string) => () => import(`@/views/${view}.vue`);

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

const routes = [
  {
    path: "/login",
    component: lazy("register"),
    meta: { requiresGuest: true },
  },
  {
    path: "/",
    component: lazy("home"),
    meta: { requiresAuth: true },
  },
  {
    path: "/rerere",
    component: lazy("r"),
  },
  {
    path: "/students",
    component: lazy("Students"),
    meta: { requiresAuth: true },
  },
  {
    path: "/admin",
    component: lazy("admin"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/attendance",
    component: lazy("AttendanceView"),
    meta: { requiresAuth: true },
  },
  {
    path: "/excellence",
    component: lazy("excellence"),
    meta: { requiresAuth: true },
  },
  {
    path: "/offline",
    component: OfflineView,
    meta: { offline: true },
  },
  // 404
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
  {
    path: "/groups",
    component: lazy("groups"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/excellence/products",
    component: lazy("AdminProducts"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/groups/board",
    component: lazy("LessonsPlans"),
  },
  {
    path: "/excellence/orders",
    component: lazy("Adminorders"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/excellence/CoinSettings",
    component: lazy("coin_settings"),
    meta: { requiresAuth: true, requiresAdmin: true },
  },

  // Moliya supermenejer bo'limiga ko'chdi. Eski havolalar ishlashda
  // davom etsin — /finance yangi manzilga yo'naltiradi.
  { path: "/finance", redirect: "/super/finance" },

  {
    path: "/database",
    component: lazy("DataBase"),
    meta: { requiresAuth: true },
  },

  {
    path: "/profile",
    component: lazy("Profile"),
    meta: { requiresAuth: true },
  },

  // ─── Menejer paneli ───
  {
    path: "/manager/students",
    component: lazy("ManagerStudents"),
    meta: { requiresAuth: true, requiresManager: true },
  },
  {
    path: "/manager/teachers",
    component: lazy("ManagerTeachers"),
    meta: { requiresAuth: true, requiresManager: true },
  },
  {
    path: "/manager/managers",
    component: lazy("ManagerManagers"),
    meta: { requiresAuth: true, requiresManager: true },
  },

  // ─── Supermenejer bo'limi ───
  // Menejer panelidan mustaqil: o'z bosh sahifasi, o'z navigatsiyasi.
  // Hammasi `requiresSuper` ostida — oddiy menejer bu yerga kira olmaydi.
  {
    path: "/super",
    component: lazy("SuperHome"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/activity",
    component: lazy("SuperActivity"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/managers",
    component: lazy("SuperManagers"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/salaries",
    component: lazy("SuperSalaries"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/finance",
    component: lazy("Finance"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/cash",
    component: lazy("SuperCash"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/faceid",
    component: lazy("SuperFaceId"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/devices",
    component: lazy("SuperDevices"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
  {
    path: "/super/profile",
    component: lazy("SuperProfile"),
    meta: { requiresAuth: true, requiresSuper: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// Kirish (entry) sahifalari — URL orqali to'g'ridan-to'g'ri ochsa bo'ladi.
// Qolgan sahifalarga faqat ilova ichidagi RouterLink/tugmalar orqali kiriladi.
// `/super` — supermenejerning bosh sahifasi, u login'dan keyin shu yerga
// tushadi va zakladkadan ham ocha olishi kerak (ichkarisi `requiresSuper`
// bilan qo'riqlanadi, shuning uchun begona baribir kira olmaydi).
const ENTRY_PATHS = ["/", "/login", "/offline", "/groups/board", "/super"];

router.beforeEach((to, from) => {
  const user = getUser();

  if (to.meta.offline) return;

  if (!navigator.onLine) {
    return { path: "/offline" };
  }

  if (to.meta.requiresAuth && !user) {
    return { path: "/login" };
  }

  if (to.meta.requiresGuest && user) {
    return { path: "/" };
  }

  if (to.meta.requiresAdmin && !user?.is_admin) {
    return { path: "/" };
  }

  // Menejer paneli — menejerlar uchun. Ustozlar ham admin hisoblanadi,
  // shuning uchun ular ham kira oladi
  if (to.meta.requiresManager && user?.role !== "manager" && !user?.is_admin) {
    return { path: "/" };
  }

  // Supermenejer bo'limi — moliya, ustoz oyliklari, menejerlar va
  // qurilmalar. Oddiy menejer bu sahifalarga umuman kirmaydi.
  if (to.meta.requiresSuper && !user?.is_super) {
    return { path: "/" };
  }

  // ─── URL'ni qo'lda o'zgartirishdan himoya ───
  // To'liq sahifa yuklanishida (URL qo'lda yozilganda) `from` === START_LOCATION
  // bo'ladi. Bunday holatda faqat kirish sahifalari yoki oxirgi ochilgan
  // sahifa (F5 / refresh) ruxsat etiladi; boshqasiga o'tmaydi — o'sha
  // oxirgi sahifaga qaytariladi. Ilova ichidagi RouterLink/tugma orqali
  // navigatsiyada `from` haqiqiy sahifa bo'lgani uchun bu cheklov ishlamaydi.
  if (from === START_LOCATION) {
    const lastPath = sessionStorage.getItem("lastPath");
    const isEntry = ENTRY_PATHS.includes(to.path);
    const isRefresh = !!lastPath && lastPath === to.path;
    if (!isEntry && !isRefresh) {
      return { path: lastPath || "/" };
    }
  }
});

// Har bir muvaffaqiyatli navigatsiyadan keyin oxirgi sahifani eslab qolamiz —
// refresh o'sha sahifada qolishi uchun.
router.afterEach((to) => {
  if (!to.meta.offline) {
    sessionStorage.setItem("lastPath", to.path);
  }
});

window.addEventListener("online", () => {
  if (router.currentRoute.value.path === "/offline") {
    router.back();
  }
});

window.addEventListener("offline", () => {
  router.push("/offline");
});

export default router;
