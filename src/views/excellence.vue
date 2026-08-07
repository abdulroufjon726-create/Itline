<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import AdminProducts from "./AdminProducts.vue";
import Adminorders from "./Adminorders.vue";
import Coin_settings from "./coin_settings.vue";
import DefaultFee from "./DefaultFee.vue";
import { normalizePhone } from "../utils/phone.js";
import Groups from "./groups.vue";
import LessonsPlans from "./LessonsPlans.vue";
import NewsManager from "./NewsManager.vue";
import ReceiptSettings from "./ReceiptSettings.vue";
import AppIcon from "@/components/AppIcon.vue";
import AttendanceBoard from "@/components/AttendanceBoard.vue";
import PaymentRequests from "@/components/PaymentRequests.vue";
import CashRegister from "@/components/CashRegister.vue";
import { authHeaders, can, isSuper } from "@/utils/managerApi";
import { readCache, writeCache } from "@/utils/cache";

const router = useRouter();
const API = "https://itline-django-9s85.onrender.com/api";

const user = JSON.parse(localStorage.getItem("user") || "null");
// Menejer ham shu panelga kiradi (u eng yuqori daraja)
if (!user || !(user.is_excellence || user.role === "manager")) {
  router.push("/login");
}

// Chegirma berish faqat menejer huquqi — boshqalar faqat ko'radi.
// Menejerlar orasida ham supermenejer bergan vakolatga qarab
// ('payments.discount') chegirma ustuni ko'rinadi.
const isManager = user?.role === "manager" && can("payments.discount", user);
// Supermenejer — moliya va oyliklar bo'limi faqat unda ko'rinadi
const isSuperUser = isSuper(user);

// To'lovlarni ko'rish vakolati bo'lmagan menejerga bo'sh sahifa
// chiqmasligi uchun boshlang'ich tab keyinroq (tablar hisoblangach)
// tanlanadi
const activeTab = ref("payments");
// Kunlik kassa widgeti — to'lov saqlangach jonli yig'indini yangilash uchun
const cashRegisterRef = ref(null);

// Panel bo'limlari (ikonka nomlari AppIcon.vue dagi ro'yxatdan)
// Asosiy (eng ko'p ishlatiladigan) tablar — doim ko'rinadi
// `perm` — shu bo'limni ko'rish uchun kerakli vakolat. Supermenejer
// bergan vakolatlar ro'yxatida bo'lmasa, tab menejerga umuman
// ko'rinmaydi (ustoz/admin o'quvchida cheklov yo'q).
const ALL_PRIMARY_TABS = [
  { key: "payments", icon: "payment", label: "To'lovlar", perm: "payments.view" },
  { key: "payreq", icon: "receipt", label: "So'rovlar", perm: "payments.requests" },
  { key: "attendance", icon: "attendance", label: "Davomat", perm: "attendance.view" },
  { key: "groups", icon: "groups", label: "Guruhlar", perm: "groups.view" },
  { key: "add", icon: "user-plus", label: "Qo'shish", perm: "students.add" },
];

const PRIMARY_TABS = computed(() =>
  ALL_PRIMARY_TABS.filter((t) => can(t.perm, user)),
);

// Kutayotgan to'lov so'rovlari soni (badge)
const pendingReqCount = ref(0);
async function loadPendingReqCount() {
  try {
    const res = await fetch(`${API}/payment-requests/pending-count/`);
    if (res.ok) pendingReqCount.value = (await res.json()).count || 0;
  } catch (e) {
    /* jim */
  }
}

// Manager to'lov so'rovini qabul qilgach — To'lovlar ro'yxatini yangilaymiz
async function onPaymentAccepted(payload) {
  if (payload?.month) selectedMonth.value = payload.month;
  await fetchPayments();
  loadPendingReqCount();
}
// Qolganlari "Ko'proq" menyusida — navigatsiya toza bo'lishi uchun
const ALL_MORE_TABS = [
  { key: "fee", icon: "briefcase", label: "Kurslar", perm: "courses.view" },
  { key: "history", icon: "chart", label: "Tarix", perm: "history.view" },
  { key: "mahsulotlar", icon: "shop", label: "Mahsulotlar", perm: "shop.products" },
  { key: "orders", icon: "orders", label: "Buyurtmalar", perm: "shop.orders" },
  { key: "settings", icon: "coin", label: "Coin sozlamalari", perm: "coins.settings" },
  { key: "news", icon: "news", label: "Yangiliklar", perm: "news.manage" },
  { key: "receipt", icon: "receipt", label: "To'lov cheki", perm: "receipt.settings" },
];

const MORE_TABS = computed(() => ALL_MORE_TABS.filter((t) => can(t.perm, user)));

// Boshqa sahifalarga havolalar (tab emas).
// Moliya bu yerdan olib tashlandi — u supermenejer bo'limiga o'tdi.
const ALL_MORE_LINKS = [
  { to: "/database", icon: "database", label: "Baza", perm: "database.view" },
  {
    to: "/manager/students",
    icon: "manager",
    label: "Menejer paneli",
    perm: "students.view",
  },
];

const MORE_LINKS = computed(() => {
  const links = ALL_MORE_LINKS.filter((l) => can(l.perm, user));
  // Supermenejer uchun o'z bo'limiga o'tish havolasi
  if (isSuperUser) {
    links.push({
      to: "/super",
      icon: "key",
      label: "Supermenejer bo'limi",
    });
  }
  return links;
});
// "Ko'proq" menyusi ochiqmi
const showMore = ref(false);
// Menyudagi tablardan biri tanlanganmi (Ko'proq tugmasini yoritish uchun)
const isMoreActive = computed(() =>
  MORE_TABS.value.some((t) => t.key === activeTab.value),
);
function pickTab(key) {
  activeTab.value = key;
  showMore.value = false;
}

// Ochilishda: joriy tab ruxsat etilganlar orasida bo'lmasa, birinchi
// mavjudiga o'tamiz — aks holda menejer bo'sh panel ko'rardi
const availableTabKeys = computed(() => [
  ...PRIMARY_TABS.value.map((t) => t.key),
  ...MORE_TABS.value.map((t) => t.key),
]);

if (availableTabKeys.value.length && !availableTabKeys.value.includes(activeTab.value)) {
  activeTab.value = availableTabKeys.value[0];
}

// Oxirgi ko'rilgan ro'yxatlar darhol chiziladi, so'rov fonda ketadi.
// Server uxlab qolgan bo'lsa (bepul plan) sahifa bo'sh turmaydi.
const teachers = ref(readCache("teachers", []));
const payments = ref([]);
const groups = ref(readCache("groups", []));
const courses = ref(readCache("courses", []));
const loading = ref(false);
// Server uyg'onishini kutayotganimizni aytadigan belgi — "Yuklanmoqda"
// uzoq davom etsa odam nima bo'layotganini bilsin
const slowServer = ref(false);
const generating = ref(false);

const selectedTeacherForAtt = ref(null);
const attStudents = ref([]);
const selectedStudent = ref(null);
const studentMonthAttendance = ref([]);
const selectedAttMonth = ref(new Date().toISOString().slice(0, 7));
const loadingAtt = ref(false);
const attPayments = ref([]);

// Tanlangan ustozning guruhlari — davomat board'iga beriladi
const attTeacherGroups = computed(() =>
  groups.value.filter(
    (g) =>
      g.teacher?.id === selectedTeacherForAtt.value?.id ||
      g.teacher === selectedTeacherForAtt.value?.id,
  ),
);

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const selectedTeacherId = ref("");

const historyTeacherId = ref("");
const historyMonth = ref(new Date().toISOString().slice(0, 7));
const historyPayments = ref([]);
const loadingHistory = ref(false);

// ══════════ QO'SHISH (bitta forma, parolga qarab rol avto aniqlanadi) ══════════
const ROLE_PASSWORDS = {
  excellence: "excellence2024",
  admin: "excel2024",
};

const addErrorFields = ref(new Set());
const addNetworkError = ref(false);
const addSuccessMsg = ref("");
const addLoading = ref(false);

const addForm = ref({
  name: "",
  surname: "",
  phone: "",
  password: "",
  teacher_id: "",
  schedule: "odd",
});

// Parolga qarab avto aniqlanadigan rol
const detectedRole = computed(() => {
  const pwd = addForm.value.password;
  if (!pwd) return null;
  if (pwd === ROLE_PASSWORDS.excellence) return "excellence";
  if (pwd === ROLE_PASSWORDS.admin) return "admin";
  return "student";
});

const roleLabel = computed(() => {
  switch (detectedRole.value) {
    case "excellence":
      return "Manager";
    case "admin":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return null;
  }
});

async function fetchTeachers() {
  try {
    const res = await fetch(`${API}/teachers/`);
    if (!res.ok) {
      const res2 = await fetch(`${API}/teachers/create/`);
      if (res2.ok) {
        teachers.value = await res2.json();
        writeCache("teachers", teachers.value);
      }
      return;
    }
    teachers.value = await res.json();
    writeCache("teachers", teachers.value);
  } catch (e) {
    console.error("Fetch Teachers Error:", e);
    // Keshdagi ro'yxat qoladi — xato tufayli ekranni bo'shatmaymiz
  }
}

async function fetchCourses() {
  try {
    const res = await fetch(`${API}/courses/`);
    if (!res.ok) throw new Error("Kurslarni yuklashda xatolik");
    courses.value = await res.json();
    writeCache("courses", courses.value);
  } catch (e) {
    console.error("Fetch Courses Error:", e);
  }
}

async function fetchGroups() {
  try {
    const res = await fetch(`${API}/groups/`);
    if (!res.ok) throw new Error("Guruhlarni yuklashda xatolik");
    groups.value = await res.json();
    writeCache("groups", groups.value);
  } catch (e) {
    console.error("Fetch Groups Error:", e);
  }
}

function paymentsCacheKey() {
  return `payments:${selectedMonth.value}:${selectedTeacherId.value || "all"}`;
}

async function fetchPayments() {
  const cacheKey = paymentsCacheKey();
  const cached = readCache(cacheKey);
  if (cached) {
    // Eski ro'yxat darhol ko'rinadi, yangisi kelganda almashadi —
    // "Yuklanmoqda..." yozuvi umuman chiqmaydi
    payments.value = cached;
  } else {
    loading.value = true;
  }
  try {
    let url = `${API}/payments/?month=${selectedMonth.value}`;
    if (selectedTeacherId.value) {
      url += `&teacher_id=${selectedTeacherId.value}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("To'lovlarni yuklashda xatolik");
    const data = await res.json();
    payments.value = (Array.isArray(data) ? data : []).map((payment) => ({
      ...payment,
      is_checked: Boolean(
        payment.is_checked ??
        payment.is_selected ??
        payment.checked ??
        payment.is_paid,
      ),
      is_paid: Boolean(
        payment.is_paid ??
        payment.is_checked ??
        payment.is_selected ??
        payment.checked,
      ),
    }));
    writeCache(cacheKey, payments.value);
  } catch (e) {
    console.error("Fetch Payments Error:", e);
    // Kesh bo'lsa o'sha ko'rinib tursin — bo'sh jadval xatoni
    // "to'lov yo'q" deb ko'rsatib qo'yardi
    if (!cached) payments.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchAttPayments() {
  try {
    const res = await fetch(`${API}/payments/?month=${selectedAttMonth.value}`);
    if (!res.ok) throw new Error("Davomat to'lovlarini yuklashda xatolik");
    attPayments.value = await res.json();
  } catch (e) {
    console.error("Fetch Attendance Payments Error:", e);
    attPayments.value = [];
  }
}

async function fetchHistoryPayments() {
  if (!historyTeacherId.value) return;
  loadingHistory.value = true;
  try {
    const url = `${API}/payments/?month=${historyMonth.value}&teacher_id=${historyTeacherId.value}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Tarix to'lovlarini yuklashda xatolik");
    historyPayments.value = await res.json();
  } catch (e) {
    console.error("Fetch History Payments Error:", e);
    historyPayments.value = [];
  } finally {
    loadingHistory.value = false;
  }
}

let reqCountTimer = null;
let slowTimer = null;

onUnmounted(() => {
  clearTimeout(slowTimer);
  clearInterval(reqCountTimer);
});

onMounted(() => {
  // Hammasi BARAVARIGA ketadi. Ilgari to'lovlar ro'yxati ustozlar/
  // kurslar/guruhlar kelguncha kutib turardi — ya'ni sahifa ochilishi
  // ikki marta serverga borib kelish vaqtini olardi. Server uxlab
  // qolgan bo'lsa bu farq bir necha o'n soniya edi.
  fetchTeachers();
  fetchCourses();
  fetchGroups();
  fetchPayments();
  fetchTgStatus();
  loadPendingReqCount();

  // Kutish cho'zilsa sababini aytamiz (bepul planda server uxlaydi)
  slowTimer = setTimeout(() => {
    if (loading.value) slowServer.value = true;
  }, 4000);

  reqCountTimer = setInterval(() => {
    if (document.visibilityState === "visible") loadPendingReqCount();
  }, 15000);
});

watch(activeTab, (tab) => {
  if (tab === "history" && historyTeacherId.value) {
    fetchHistoryPayments();
  }
  // Davomat to'lovlari faqat kerak bo'lganda yuklanadi (sahifa tez ochilishi uchun)
  if (tab === "attendance" && !attPayments.value.length) {
    fetchAttPayments();
  }
  // To'lovlar tabiga qaytganda qayta yuklaymiz — kurs narxi boshqa tabda
  // o'zgargan bo'lsa yangi narx (amount_due) shu yerda ko'rinsin
  if (tab === "payments") {
    fetchPayments();
  }
});

// ══════════ PAYMENTS: QIDIRUV + PAGINATION (sekinlik/oq ekran fix) ══════════
const paySearch = ref("");
const payPage = ref(1);
const PAY_PAGE_SIZE = 50;

// ── Guruhni tez topish uchun: student_id -> guruh (bir marta tuziladi) ──
const groupByStudentId = computed(() => {
  const m = new Map();
  for (const g of groups.value) {
    if (!Array.isArray(g.students)) continue;
    for (const s of g.students) {
      const sid = typeof s === "object" ? s?.id : s;
      if (sid != null && !m.has(sid)) m.set(sid, g);
    }
  }
  return m;
});

function paymentGroup(payment) {
  if (!payment) return null;
  return (
    groupByStudentId.value.get(payment.student_id) || findPaymentGroup(payment)
  );
}
function paymentGroupName(payment) {
  return paymentGroup(payment)?.name || "";
}

const filteredPayments = computed(() => {
  const q = paySearch.value.trim().toLowerCase();
  if (!q) return payments.value;
  const qd = q.replace(/\D/g, "");
  return payments.value.filter((p) => {
    const name = String(p.student_name || "").toLowerCase();
    if (name.includes(q)) return true;
    // ✅ Guruh nomi bo'yicha ham qidiriladi
    if (paymentGroupName(p).toLowerCase().includes(q)) return true;
    if (qd.length >= 3) {
      return String(p.student_phone || "").replace(/\D/g, "").includes(qd);
    }
    return false;
  });
});

const payTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredPayments.value.length / PAY_PAGE_SIZE)),
);
const pagedPayments = computed(() =>
  filteredPayments.value.slice(
    (payPage.value - 1) * PAY_PAGE_SIZE,
    payPage.value * PAY_PAGE_SIZE,
  ),
);
watch([paySearch, selectedMonth, selectedTeacherId], () => {
  payPage.value = 1;
});

// ── To'lovlarni guruhlarga bo'lib ko'rsatish ──
const groupByGroup = ref(true);

const groupedPayments = computed(() => {
  const map = new Map();
  for (const p of filteredPayments.value) {
    const g = paymentGroup(p);
    const name = g?.name || "Guruhsiz";
    if (!map.has(name)) {
      map.set(name, {
        key: name,
        name,
        teacher: g?.teacher?.name || p.teacher_name || "",
        payments: [],
        totalDue: 0,
        totalPaid: 0,
        outstanding: 0,
      });
    }
    const sec = map.get(name);
    sec.payments.push(p);
    sec.totalDue += paymentNetDue(p);
    sec.totalPaid += paymentPaidAmount(p);
    // Qolgan — faqat to'lanmagan qism (ortiqcha to'lov manfiy qilmaydi)
    sec.outstanding += Math.max(0, remainingAmount(p));
  }
  const arr = [...map.values()].map((s) => ({
    ...s,
    remaining: s.outstanding,
  }));
  arr.sort((a, b) => {
    if (a.name === "Guruhsiz") return 1;
    if (b.name === "Guruhsiz") return -1;
    return a.name.localeCompare(b.name);
  });
  return arr;
});

// Jadval uchun bo'limlar: guruh rejimида guruhlar, aks holda bitta bo'lim
// (sahifalangan). Bitta v-for shabloni ikkala holatda ishlaydi.
const displaySections = computed(() => {
  if (groupByGroup.value) return groupedPayments.value;
  return [{ key: "__all__", name: null, teacher: "", payments: pagedPayments.value }];
});

// ── Guruhlar akkordeon: dastlab yopiq, sarlavhaga bosilganда ochiladi ──
const expandedGroups = ref(new Set());
function toggleGroup(key) {
  const next = new Set(expandedGroups.value);
  next.has(key) ? next.delete(key) : next.add(key);
  expandedGroups.value = next;
}
function isSectionOpen(section) {
  if (!section.name) return true; // oddiy ro'yxat rejimi — doim ochiq
  if (paySearch.value.trim()) return true; // qidiruvда natijalar ko'rinsin
  return expandedGroups.value.has(section.key);
}

// ══════════ TELEGRAM XABAR YUBORISH ══════════
const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const monthLabel = computed(() => {
  const [y, m] = selectedMonth.value.split("-");
  return `${UZ_MONTHS[parseInt(m) - 1]} ${y}`;
});

const tgLinkedIds = ref(new Set());
async function fetchTgStatus() {
  try {
    const res = await fetch(`${API}/tg/status/`);
    if (!res.ok) return;
    const data = await res.json();
    tgLinkedIds.value = new Set(data.student_ids || []);
  } catch {
    /* indikator ishlamasa ham sahifa ishlashda davom etadi */
  }
}

const msgModal = ref({
  open: false,
  mode: "single", // single | all
  target: "all", // "all" rejимида: all | unpaid (to'lov qilmaganlar)
  student: null,
  sending: false,
  text: "",
});
const msgResult = ref(null);

// Joriy oy uchun to'lov qilmagan o'quvchilar id'lari
const unpaidStudentIds = computed(() =>
  payments.value
    .filter((p) => !(p.is_checked || p.is_paid))
    .map((p) => p.student_id),
);

function defaultReminderText() {
  return (
    "Assalomu alaykum, {ism}!\n" +
    "ITLINE o'quv markazida {oy} oyi uchun to'lov muddati yaqinlashmoqda. " +
    "Iltimos, to'lovni o'z vaqtida amalga oshiring. Rahmat! 🙏"
  );
}

function openMsgModal(mode, payment = null) {
  msgResult.value = null;
  msgModal.value = {
    open: true,
    mode,
    // Vakolatiga qarab birinchi mavjud qabul qiluvchi tanlanadi —
    // aks holda "Barchaga" yopiq bo'lgan menejerga bo'sh oyna ochilardi
    target: msgTargets.value[0]?.key || "all",
    student: payment
      ? { id: payment.student_id, name: payment.student_name }
      : null,
    sending: false,
    text: defaultReminderText(),
  };
}

async function deleteStudentRow(payment) {
  if (
    !confirm(
      `${payment.student_name} butunlay o'chiriladi (to'lovlari va davomati bilan). Davom etasizmi?`,
    )
  )
    return;
  try {
    const res = await fetch(`${API}/students/delete/${payment.student_id}/`, {
      method: "POST",
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "O'chirishda xatolik");
      return;
    }
    payments.value = payments.value.filter(
      (p) => p.student_id !== payment.student_id,
    );
  } catch (e) {
    alert("Server bilan aloqa yo'q");
  }
}

// Kimga yuborish mumkin — har biri o'z vakolatiga bog'liq.
// Supermenejer olib tashlasa, tugma menejerга umuman ko'rinmaydi.
const MSG_TARGETS = [
  { key: "all", label: "Barchaga", icon: "users", perm: "messages.send" },
  { key: "unpaid", label: "To'lov qilmaganlar", icon: "payment", perm: "messages.send" },
  { key: "teachers", label: "Ustozlar", icon: "teacher", perm: "messages.teachers" },
  { key: "leads", label: "Leadlar", icon: "megaphone", perm: "messages.leads" },
];

const msgTargets = computed(() => MSG_TARGETS.filter((t) => can(t.perm, user)));

const msgTitle = computed(() => {
  const m = msgModal.value;
  if (m.mode === "single") return `${m.student?.name}ga xabar`;
  return (
    {
      all: "Barcha o'quvchilarga xabar",
      unpaid: "To'lov qilmaganlarga xabar",
      teachers: "Ustozlarga xabar",
      leads: "Leadlarga reklama",
    }[m.target] || "Xabar"
  );
});

// Faqat o'quvchilarga yuborilganda {ism}/{oy} almashtiriladi
const msgHasPlaceholders = computed(
  () => msgModal.value.mode === "single" ||
    ["all", "unpaid"].includes(msgModal.value.target),
);

async function sendMsg() {
  const m = msgModal.value;
  if (!m.text.trim() || m.sending) return;
  m.sending = true;
  msgResult.value = null;
  try {
    let url = `${API}/messages/send-all/`;
    const body = { text: m.text, month: monthLabel.value };
    if (m.mode === "single" && m.student) {
      url = `${API}/messages/send/`;
      body.student_id = m.student.id;
    } else if (m.target === "unpaid") {
      const ids = unpaidStudentIds.value;
      if (!ids.length) {
        msgResult.value = { error: "To'lov qilmagan o'quvchi topilmadi" };
        return;
      }
      url = `${API}/messages/send-students/`;
      body.student_ids = ids;
    } else if (m.target === "teachers") {
      url = `${API}/messages/send-teachers/`;
    } else if (m.target === "leads") {
      url = `${API}/messages/send-leads/`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
    msgResult.value = data;
  } catch (e) {
    msgResult.value = { error: e.message };
  } finally {
    msgModal.value.sending = false;
  }
}

watch([historyTeacherId, historyMonth], () => {
  if (activeTab.value === "history" && historyTeacherId.value) {
    fetchHistoryPayments();
  }
});

watch(selectedAttMonth, async () => {
  await fetchAttPayments();
  if (selectedStudent.value) {
    selectStudentForAtt(selectedStudent.value);
  }
});

async function generatePayments() {
  if (!confirm(`${selectedMonth.value} uchun to'lovlarni yaratish?`)) return;
  generating.value = true;
  try {
    const res = await fetch(`${API}/payments/generate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: selectedMonth.value }),
    });
    const data = await res.json();
    alert(data.message);
    await fetchPayments();
  } finally {
    generating.value = false;
  }
}

// ══════════ TUZATILDI: status FAQAT checkbox holatiga bog'liq ══════════
async function togglePaid(payment) {
  const shouldBePaid = !payment.is_paid;
  const res = await fetch(`${API}/payments/confirm/${payment.id}/`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      is_paid: shouldBePaid,
      is_checked: shouldBePaid,
      amount_due: payment.amount_due ?? paymentAmountDue(payment),
    }),
  });
  const data = await res.json();
  payment.is_paid = data.is_paid ?? shouldBePaid;
  payment.is_checked = data.is_checked ?? payment.is_paid;
  if (data.amount_due !== undefined) {
    payment.amount_due = data.amount_due;
  }
}

async function updateAmount(payment) {
  await fetch(`${API}/payments/${payment.id}/update/`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      amount_due: payment.amount_due ?? paymentAmountDue(payment),
    }),
  });
}

// Jami = CHEGIRMADAN KEYIN yig'ilishi kerak bo'lgan pul. Ilgari bu yerda
// chegirmasiz summa turardi: guruh sarlavhalari va "Qolgan" sof summadan
// hisoblangani uchun "Jami − To'langan ≠ Qolgan" bo'lib chiqardi.
const totalAmount = computed(() =>
  payments.value.reduce((a, b) => a + paymentNetDue(b), 0),
);
// ══════════ TUZATILDI: paidAmount endi bitta manbadan (paymentPaidAmount) hisoblanadi ══════════
const paidAmount = computed(() =>
  payments.value.reduce((a, b) => a + paymentPaidAmount(b), 0),
);
// Qolgan = faqat to'lanmagan qismlar yig'indisi (ortiqcha to'lov 0, manfiy bo'lmaydi)
const unpaidAmount = computed(() =>
  payments.value.reduce((a, b) => a + Math.max(0, remainingAmount(b)), 0),
);

const historyTotalAmount = computed(() =>
  historyPayments.value.reduce((a, b) => a + paymentNetDue(b), 0),
);
const historyPaidAmount = computed(() =>
  historyPayments.value.reduce((a, b) => a + paymentPaidAmount(b), 0),
);
const historyUnpaidAmount = computed(() =>
  historyPayments.value.reduce((a, b) => a + Math.max(0, remainingAmount(b)), 0),
);

function selectTeacherForAtt(teacher) {
  selectedTeacherForAtt.value = teacher;
}

// Ustoz dropdown'idan tanlanganda
function onAttTeacherChange(e) {
  const id = Number(e.target.value);
  const t = teachers.value.find((x) => x.id === id);
  if (t) selectTeacherForAtt(t);
}

async function selectStudentForAtt(student) {
  selectedStudent.value = student;
  loadingAtt.value = true;
  try {
    const res = await fetch(
      `${API}/student-attendance/${student.id}/?month=${selectedAttMonth.value}`,
    );
    studentMonthAttendance.value = await res.json();
  } finally {
    loadingAtt.value = false;
  }
}

function getStudentPaymentForAtt(studentId) {
  return attPayments.value.find(
    (p) => p.student_id === studentId && p.month === selectedAttMonth.value,
  );
}

const statusStyle = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-600",
};

const statusLabel = {
  present: "Keldi",
  late: "Kech",
  absent: "Kelmadi",
};

function money(val) {
  return Number(val).toLocaleString("uz-UZ") + " so'm";
}

// ✅ FIX: normalizePhone xato otsa butun sahifa render buzilardi (oq ekran).
// Noto'g'ri/bo'sh telefon uchun exception o'rniga bo'sh qiymat qaytaramiz.
function safeNormalizePhone(raw) {
  try {
    return normalizePhone(String(raw || ""));
  } catch {
    return "";
  }
}

function findPaymentGroup(payment) {
  if (!payment) return null;
  if (payment.group && typeof payment.group === "object") return payment.group;
  if (payment.group_id != null) {
    return (
      groups.value.find(
        (g) => g.id === payment.group_id || g.group_id === payment.group_id,
      ) || null
    );
  }

  const phone = safeNormalizePhone(payment.student_phone);
  const name = String(payment.student_name || "")
    .trim()
    .toLowerCase();

  return (
    groups.value.find(
      (g) =>
        Array.isArray(g.students) &&
        g.students.some((s) => {
          if (!s) return false;
          if (s.id != null && s.id === payment.student_id) return true;
          if (phone && safeNormalizePhone(s.phone) === phone) return true;
          if (
            name &&
            `${s.name || ""} ${s.surname || ""}`.trim().toLowerCase() === name
          )
            return true;
          return false;
        }),
    ) || null
  );
}

function getPaymentCourse(payment) {
  if (!payment) return null;
  if (payment.course && typeof payment.course === "object")
    return payment.course;
  if (payment.group?.course && typeof payment.group.course === "object") {
    return payment.group.course;
  }

  const group = findPaymentGroup(payment);
  if (group) {
    if (group.course && typeof group.course === "object") return group.course;
    const courseId =
      group.course || payment.course_id || payment.group?.course_id;
    const courseObj = courses.value.find((c) => c.id === courseId);
    if (courseObj) return courseObj;
    return {
      name: group.course_name || group.name,
      monthly_fee: group.monthly_fee,
      fee: group.monthly_fee,
    };
  }

  const courseId =
    payment.course_id || payment.group?.course_id || payment.group?.course?.id;
  return courses.value.find((c) => c.id === courseId) || null;
}

function courseLabel(payment) {
  const course = getPaymentCourse(payment);
  return (
    payment.course_name ||
    payment.group?.course_name ||
    payment.group_name ||
    course?.name ||
    course?.title ||
    course?.course_name ||
    payment.group?.name ||
    "—"
  );
}

function paymentCourseFee(payment) {
  const course = getPaymentCourse(payment);
  return (
    Number(course?.monthly_fee || course?.price || course?.fee) ||
    payment.monthly_fee ||
    payment.group?.monthly_fee ||
    payment.group?.course?.monthly_fee ||
    payment.group?.course?.fee ||
    0
  );
}

// ══════════ TUZATILDI: 0 qiymatni ham to'g'ri hisoblaydi, is_paid'ga qarab "soxta" summa qo'shmaydi ══════════
function paymentPaidAmount(payment) {
  return (
    Number(
      payment.paid_amount ??
      payment.amount_paid ??
      payment.amount_received ??
      0,
    ) || 0
  );
}

function paymentAmountDue(payment) {
  const course = getPaymentCourse(payment);
  const courseFee =
    Number(course?.monthly_fee ?? course?.price ?? course?.fee) || 0;
  const explicitDue = payment.amount_due;

  if (explicitDue != null && explicitDue !== 0) {
    return explicitDue;
  }
  if (courseFee) {
    return courseFee;
  }
  return (
    payment.monthly_fee ??
    payment.monthly_price ??
    payment.price ??
    payment.amount ??
    payment.group?.monthly_fee ??
    payment.group?.price ??
    payment.group?.amount ??
    payment.group?.course_monthly_fee ??
    payment.group?.course?.monthly_fee ??
    payment.group?.course?.monthly_price ??
    payment.group?.course?.price ??
    payment.group?.course?.fee ??
    payment.course_monthly_fee ??
    payment.course?.monthly_fee ??
    payment.course?.monthly_price ??
    payment.course?.price ??
    payment.course?.fee ??
    (course && typeof course === "object"
      ? (course.monthly_fee ?? course.price ?? course.fee)
      : null) ??
    0
  );
}

// Shu oyga berilgan chegirma
function paymentDiscount(payment) {
  return Number(payment.discount) || 0;
}

// Chegirmadan keyingi sof to'lov (0 dan past bo'lmaydi)
function paymentNetDue(payment) {
  return Math.max(0, (Number(paymentAmountDue(payment)) || 0) - paymentDiscount(payment));
}

// Qolgan = sof to'lov (chegirmadan keyin) - hozirgacha to'langan summa
function remainingAmount(payment) {
  const due = paymentNetDue(payment);
  const paid = Number(paymentPaidAmount(payment)) || 0;
  return due - paid;
}

// To'lov muddati (guruh ochilgan kunga qarab) — "DD.MM" ko'rinishida
function formatDue(payment) {
  if (!payment.due_date) return "—";
  const parts = String(payment.due_date).slice(0, 10).split("-");
  if (parts.length !== 3) return "—";
  return `${parts[2]}.${parts[1]}`;
}

// Davomatga qarab hisoblangan to'lovni "Oylik to'lov" summasiga qo'yadi
// (kelgan darslar uchun) — shunda "Qolgan" ham to'g'ri hisoblanadi
function applyAttendanceDue(payment) {
  if (payment.attendance_due == null) return;
  payment.amount_due = payment.attendance_due;
  savePaymentRow(payment);
}

// Vaqtida to'lov coin mukofoti berilganda ko'rsatiladigan xabar
const coinToast = ref("");
let coinToastTimer = null;
function showCoinToast(msg) {
  coinToast.value = msg;
  clearTimeout(coinToastTimer);
  coinToastTimer = setTimeout(() => (coinToast.value = ""), 4000);
}
// ✅ YANGI: minus tugmasini bosishni to'sib qo'yadi (klaviaturadan "-" kiritilmasin)
function blockNegativeKey(e) {
  if (e.key === "-" || e.key === "Subtract" || e.key === "NumpadSubtract") {
    e.preventDefault();
  }
}

// ✅ YANGI: agar biror yo'l bilan (masalan, paste orqali) manfiy son kirsa, uni 0 ga tuzatadi
function sanitizePaidAmount(payment) {
  const val = Number(payment.paid_amount);
  if (isNaN(val) || val < 0) {
    payment.paid_amount = 0;
  }
}

// ══════════ BO'LIB TO'LASH ══════════
// "To'langan" ustuni endi jamini ko'rsatadi, lekin unga qo'lda yozilmaydi.
// Kassir "+ To'lov" orqali SHU SAFAR qo'lga tushgan summani kiritadi —
// jamini tizim qo'shadi. Ilgari maydonga jami yozilishi kerak edi:
// 400 000 lik oyga kecha 200 000 olib, bugun yana 200 000 olgan kassir
// odatdagidek "200 000" yozsa, farq 0 chiqib bugungi kassa 200 000 kam
// ko'rsatardi. Endi bunday xato bo'lishi mumkin emas.

const payOpenId = ref(null); // qaysi qatorda to'lov kiritilyapti
const payAmount = ref(null); // shu safar tushgan summa
const paySaving = ref(false);
const payError = ref("");

// Jamini to'g'ridan-to'g'ri tahrirlash — faqat tuzatish uchun
const editTotalId = ref(null);

// To'lov tarixi (qaysi kuni qancha tushgan)
const payHistoryId = ref(null);
const payHistoryRows = ref([]);
const payHistoryLoading = ref(false);

function openInstallment(payment) {
  payOpenId.value = payOpenId.value === payment.id ? null : payment.id;
  payAmount.value = null;
  payError.value = "";
  editTotalId.value = null;
}

// Qolgan summani tugma bilan to'ldirish — eng ko'p uchraydigan holat
function fillRemaining(payment) {
  payAmount.value = Math.max(0, remainingAmount(payment)) || null;
}

async function submitInstallment(payment) {
  const amount = Number(payAmount.value);
  if (!amount || amount <= 0) {
    payError.value = "Summani kiriting";
    return;
  }
  paySaving.value = true;
  payError.value = "";
  try {
    const res = await fetch(`${API}/payments/${payment.id}/pay/`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ amount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      payError.value = data.error || "Saqlanmadi";
      return;
    }
    payment.paid_amount = data.paid_amount;
    payment.is_paid = data.is_paid;
    payment.is_checked = data.is_paid;
    payment.paid_today = (Number(payment.paid_today) || 0) + amount;
    if (data.wallet_balance !== undefined) {
      syncWallet(payment.student_id, data.wallet_balance, data.wallet_debt);
    }
    if (Number(data.coin_awarded) > 0) {
      showCoinToast(
        `${payment.student_name} — vaqtida to'lov uchun +${data.coin_awarded} coin 🎉`,
      );
    }
    payOpenId.value = null;
    payAmount.value = null;
  } catch (e) {
    console.error("submitInstallment:", e);
    payError.value = "Server bilan aloqa yo'q";
  } finally {
    paySaving.value = false;
    // Kunlik kassa yig'indisi darhol yangilansin
    cashRegisterRef.value?.reload();
  }
}

// Jamini tuzatish — kamayish ataylab qilinayotganini tasdiqlatamiz
async function saveTotalCorrection(payment) {
  sanitizePaidAmount(payment);
  const before = Number(payment._paid_before ?? 0);
  if (Number(payment.paid_amount) < before) {
    const ok = window.confirm(
      `To'langan jami ${money(before)} dan ${money(payment.paid_amount)} ga ` +
      "kamayadi. Farq bugungi kassadan yechiladi. Davom etamizmi?",
    );
    if (!ok) {
      payment.paid_amount = before;
      return;
    }
  }
  editTotalId.value = null;
  await savePaymentRow(payment, { allowDecrease: true });
}

function startTotalCorrection(payment) {
  editTotalId.value = editTotalId.value === payment.id ? null : payment.id;
  payment._paid_before = payment.paid_amount;
  payOpenId.value = null;
}

async function openHistory(payment) {
  if (payHistoryId.value === payment.id) {
    payHistoryId.value = null;
    return;
  }
  payHistoryId.value = payment.id;
  payHistoryRows.value = [];
  payHistoryLoading.value = true;
  try {
    const res = await fetch(`${API}/payments/${payment.id}/history/`, {
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) payHistoryRows.value = data.installments || [];
  } catch (e) {
    console.error("openHistory:", e);
  } finally {
    payHistoryLoading.value = false;
  }
}

const shortDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : "—");
// ══════════ TUZATILDI: status FAQAT checkbox (is_checked) holatiga qarab belgilanadi ══════════
// `allowDecrease` — jamini kamaytirish ataylab qilinayotganini bildiradi.
// Backend usiz kamayishni rad etadi: bo'lib to'lashda "bugun tushgan"ni
// jami o'rniga yozib yuborish eng ko'p uchraydigan xato edi.
async function savePaymentRow(payment, { allowDecrease = false } = {}) {
  const shouldBePaid = Boolean(payment.is_checked);

  try {
    const res = await fetch(`${API}/payments/confirm/${payment.id}/`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        is_paid: shouldBePaid,
        is_checked: shouldBePaid,
        amount_due: payment.amount_due ?? paymentAmountDue(payment),
        paid_amount: payment.paid_amount ?? 0,
        discount: Number(payment.discount) || 0,
        allow_decrease: allowDecrease,
      }),
    });

    const data = await res.json().catch(() => ({}));
    // Kamayish to'sildi — serverdagi haqiqiy jamini qaytarib qo'yamiz
    if (!res.ok && data.code === "paid_amount_decrease") {
      payment.paid_amount = data.paid_amount;
      showCoinToast(data.error);
      return;
    }
    payment.is_paid = data.is_paid ?? shouldBePaid;
    payment.is_checked = data.is_checked ?? shouldBePaid;
    payment.paid_amount = data.paid_amount ?? payment.paid_amount;
    if (data.discount !== undefined) payment.discount = data.discount;
    // Kartani (barcha oylar bo'yicha) — o'sha o'quvchining hamma qatorlarida yangilaymiz
    if (data.wallet_balance !== undefined) {
      syncWallet(payment.student_id, data.wallet_balance, data.wallet_debt);
    }

    if (!res.ok) {
      throw new Error("Confirm endpoint failed");
    }

    // Vaqtida to'lov uchun coin berilgan bo'lsa — menejerga bildiramiz
    if (Number(data.coin_awarded) > 0) {
      showCoinToast(
        `${payment.student_name} — vaqtida to'lov uchun +${data.coin_awarded} coin 🎉`,
      );
    }
  } catch (e) {
    try {
      const fallbackRes = await fetch(`${API}/payments/update/${payment.id}/`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          amount_due: payment.amount_due ?? paymentAmountDue(payment),
          paid_amount: payment.paid_amount,
          discount: Number(payment.discount) || 0,
          is_checked: shouldBePaid,
          is_paid: shouldBePaid,
          allow_decrease: allowDecrease,
        }),
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      payment.is_paid = fallbackData.is_paid ?? shouldBePaid;
      payment.is_checked = fallbackData.is_checked ?? shouldBePaid;
      if (fallbackData.discount !== undefined) payment.discount = fallbackData.discount;
      if (fallbackData.wallet_balance !== undefined) {
        syncWallet(payment.student_id, fallbackData.wallet_balance, fallbackData.wallet_debt);
      }
    } catch (fallbackError) {
      console.error("To'lovni saqlashda xatolik:", fallbackError);
    }
  } finally {
    // Kunlik kassa yig'indisini yangilaymiz (to'lov summasi o'zgargan bo'lishi mumkin)
    cashRegisterRef.value?.reload();
  }
}

// Bir o'quvchining kartasi o'zgarganda — uning barcha to'lov qatorlarida
// (turli oylar) wallet_balance/wallet_debt ni yangilab qo'yamiz
function syncWallet(studentId, balance, debt) {
  for (const p of payments.value) {
    if (p.student_id === studentId) {
      p.wallet_balance = balance;
      p.wallet_debt = debt;
    }
  }
}

// Chegirma summasini xavfsiz oraliqqa keltiradi (0 .. oylik summa)
function sanitizeDiscount(payment) {
  let d = Number(payment.discount);
  if (isNaN(d) || d < 0) d = 0;
  const max = Number(paymentAmountDue(payment)) || 0;
  if (d > max) d = max;
  payment.discount = d;
  return d;
}

// Doimiy oylik chegirmani o'rnatadi (barcha to'lanmagan oylarga qo'llanadi)
async function setMonthlyDiscount(studentId, amount) {
  try {
    const res = await fetch(`${API}/students/update/${studentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_discount: amount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "monthly_discount saqlanmadi");
    const md = data.monthly_discount ?? amount;
    // Shu o'quvchining barcha qatorlarini yangilaymiz: to'lanmagan oylarga
    // chegirma qo'llanadi, to'langan oylar tegilmaydi
    for (const p of payments.value) {
      if (p.student_id !== studentId) continue;
      p.monthly_discount = md;
      if (!p.is_paid && !p.is_checked) {
        p.discount = Math.min(md, Number(paymentAmountDue(p)) || 0);
      }
      if (data.wallet_balance !== undefined) {
        p.wallet_balance = data.wallet_balance;
        p.wallet_debt = data.wallet_debt;
      }
    }
    showCoinToast(`Doimiy oylik chegirma o'rnatildi: ${money(md)}`);
  } catch (e) {
    console.error("setMonthlyDiscount:", e);
  }
}

// Chegirmani qo'llash: mode 'month' — faqat shu oy, 'standing' — doimiy
function applyDiscount(payment, mode) {
  const amount = sanitizeDiscount(payment);
  if (mode === "standing") {
    setMonthlyDiscount(payment.student_id, amount);
  } else {
    savePaymentRow(payment);
  }
}
function addMarkError(...fields) {
  fields.forEach((f) => addErrorFields.value.add(f));
  setTimeout(() => fields.forEach((f) => addErrorFields.value.delete(f)), 1500);
}

function addHasError(field) {
  return addErrorFields.value.has(field);
}

function resetAddForm() {
  addForm.value = {
    name: "",
    surname: "",
    phone: "",
    password: "",
    teacher_id: "",
    schedule: "odd",
  };
}

async function addApiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json();
    addNetworkError.value = false;
    return { ok: res.ok, data };
  } catch {
    addNetworkError.value = true;
    throw new Error("network");
  }
}

async function submitAdd() {
  const role = detectedRole.value;

  if (!role) {
    addMarkError("password");
    return;
  }

  const required =
    role === "student"
      ? ["name", "surname", "phone", "password", "teacher_id"]
      : ["name", "phone", "password"];

  const missing = required.filter((f) => !addForm.value[f]);
  if (missing.length) {
    addMarkError(...missing);
    return;
  }

  let normalizedPhone;
  try {
    normalizedPhone = normalizePhone(addForm.value.phone);
  } catch {
    addMarkError("phone");
    return;
  }

  addLoading.value = true;
  try {
    const payload = {
      name: addForm.value.name,
      surname: addForm.value.surname,
      phone: normalizedPhone,
      password: addForm.value.password,
      admin_password: addForm.value.password,
      excellence_password: addForm.value.password,
    };

    if (role === "student") {
      payload.teacher_id = Number(addForm.value.teacher_id);
      payload.schedule = addForm.value.schedule;
      // ══════════ TUZATILDI: yangi student uchun to'lov statusini eksplisit false qilib yuboramiz ══════════
      payload.is_paid = false;
      payload.is_checked = false;
    }

    const { ok, data } = await addApiFetch("/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!ok) {
      alert(data.error || "Xatolik yuz berdi");
      return;
    }

    const roleText =
      role === "excellence"
        ? "Excellence"
        : role === "admin"
          ? "Admin"
          : "Student";
    addSuccessMsg.value = `${addForm.value.name} ${addForm.value.surname} ${roleText} sifatida muvaffaqiyatli qo'shildi`;
    resetAddForm();
    if (role !== "student") await fetchTeachers();
    setTimeout(() => (addSuccessMsg.value = ""), 3000);
  } catch {
    // addNetworkError ko'rsatiladi
  } finally {
    addLoading.value = false;
  }
}

const inputClass = (field) => [
  "w-full px-3 py-2.5 rounded-xl border outline-none transition text-sm",
  addHasError(field)
    ? "border-red-300 bg-red-50"
    : "border-gray-200 focus:border-gray-400",
];
</script>
<template>
  <div class="max-w-6xl py-4 mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div class="space-y-2">
        <h1 class="flex gap-3 text-xl sm:text-2xl font-sans">
          <span><img src="../icon/itline.png" alt="" class="w-10 animate-spin"
              style="animation-duration: 5s" /></span>Itline Panel
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          Xush kelibsiz, {{ user.name }}!
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <!-- Supermenejer bu panelga o'tganda qaytish yo'li ko'rinib
             tursin — aks holda faqat brauzer tugmasi qoladi -->
        <router-link v-if="isSuperUser" to="/super"
          class="px-3 sm:px-4 py-2 rounded-full bg-gray-900 text-white text-sm hover:bg-gray-800 transition flex items-center gap-1.5">
          <AppIcon name="arrow-left" />
          <span class="hidden sm:inline">Supermenejer</span>
        </router-link>
        <button @click="$router.push('/profile')"
          class="px-3 sm:px-4 py-2 rounded-full border border-gray-200 text-sm hover:bg-gray-50 transition flex items-center gap-1.5">
          <AppIcon name="settings" />
          <span class="hidden sm:inline">Profil</span>
        </button>
      </div>
    </div>

    <!-- Tablar: asosiylari ko'rinadi, qolganlari "Ko'proq" menyusida -->
    <div class="flex gap-2 mb-6 pb-1 flex-wrap items-center">
      <button v-for="tab in PRIMARY_TABS" :key="tab.key" @click="activeTab = tab.key" :class="[
        'cursor-pointer px-4 py-2 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5 relative',
        activeTab === tab.key
          ? 'bg-gray-900 text-white border-gray-900'
          : 'border-gray-200 text-gray-500 hover:bg-gray-50',
      ]">
        <AppIcon :name="tab.icon" />
        {{ tab.label }}
        <span v-if="tab.key === 'payreq' && pendingReqCount > 0"
          class="ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold">
          {{ pendingReqCount }}
        </span>
      </button>

      <!-- Ko'proq menyusi -->
      <div class="relative">
        <button @click="showMore = !showMore" :class="[
          'cursor-pointer px-4 py-2 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5',
          isMoreActive || showMore
            ? 'bg-gray-900 text-white border-gray-900'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50',
        ]">
          <AppIcon name="settings" /> Ko'proq
          <AppIcon name="chevron-down" class="transition-transform" :class="showMore ? 'rotate-180' : ''" />
        </button>

        <!-- Menyu ochilganda fon (tashqariga bosilsa yopiladi) -->
        <div v-if="showMore" class="fixed inset-0 z-20" @click="showMore = false"></div>

        <div v-if="showMore"
          class="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-lg z-30 p-1.5">
          <button v-for="tab in MORE_TABS" :key="tab.key" @click="pickTab(tab.key)" :class="[
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition',
            activeTab === tab.key
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50',
          ]">
            <AppIcon :name="tab.icon" /> {{ tab.label }}
          </button>
          <div class="my-1.5 border-t border-gray-100"></div>
          <router-link v-for="l in MORE_LINKS" :key="l.to" :to="l.to" @click="showMore = false"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left text-gray-600 hover:bg-gray-50 transition">
            <AppIcon :name="l.icon" /> {{ l.label }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- ══════════ TO'LOVLAR ══════════ -->
    <div v-if="activeTab === 'payments'">
      <!-- Kunlik kassa (kassir) — supermenejer o'chirsa ko'rinmaydi.
           Oylik yig'im pastdagi jadval bilan bir oyni ko'rsatadi. -->
      <CashRegister ref="cashRegisterRef" :month="selectedMonth" />

      <div class="flex flex-wrap gap-3 mb-5">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Oy</label>
          <input type="month" v-model="selectedMonth" @change="fetchPayments"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>

        <div>
          <label class="block text-xs text-gray-400 mb-1">O'qituvchi</label>
          <select v-model="selectedTeacherId" @change="fetchPayments"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">Barchasi</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <div class="flex-1 min-w-[180px]">
          <label class="block text-xs text-gray-400 mb-1">Qidiruv</label>
          <input v-model="paySearch" type="text" placeholder="Ism, telefon yoki guruh nomi..."
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
        </div>

        <div class="flex items-end">
          <button @click="groupByGroup = !groupByGroup" :class="[
            'px-4 py-2 rounded-xl text-sm font-medium transition border flex items-center gap-1.5 whitespace-nowrap',
            groupByGroup
              ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
          ]" :title="groupByGroup ? 'Oddiy ro\'yxatga o\'tish' : 'Guruhlarga bo\'lib ko\'rsatish'">
            <AppIcon name="groups" />
            {{ groupByGroup ? "Guruhlar bo'yicha" : "Oddiy ro'yxat" }}
          </button>
        </div>


        <div v-if="msgTargets.length" class="flex items-end">
          <button @click="openMsgModal('all')"
            class="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-sky-600 transition">
            <AppIcon name="send" /> Xabar yuborish
          </button>
        </div>


        <div class="flex items-end">
          <button @click="generatePayments" :disabled="generating"
            class="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-50">
            {{ generating ? "Hisoblanmoqda..." : "To'lovlarni yaratish" }}
          </button>
        </div>
      </div>


      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div class="bg-gray-100 rounded-xl p-4">
          <p class="text-xs text-gray-500 mb-1">Jami</p>
          <p class="text-xl font-semibold">{{ money(totalAmount) }}</p>
        </div>
        <div class="bg-green-50 rounded-xl p-4">
          <p class="text-xs text-green-600 mb-1">To'langan</p>
          <p class="text-xl font-semibold text-green-700">
            {{ money(paidAmount) }}
          </p>
        </div>
        <div class="bg-red-50 rounded-xl p-4">
          <p class="text-xs text-red-500 mb-1">Qolgan</p>
          <p class="text-xl font-semibold text-red-600">
            {{ money(unpaidAmount) }}
          </p>
        </div>
      </div>

      <div v-if="loading" class="text-center py-8 text-gray-400">
        Yuklanmoqda...
        <p v-if="slowServer" class="text-xs text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
          Server uyqudan uyg'onmoqda — birinchi ochilish yarim
          daqiqagacha cho'zilishi mumkin. Sahifani yopmang.
        </p>
      </div>
      <div v-else class=" border border-white/20 rounded-2xl overflow-x-auto">
        <table class="pay-nowrap w-full text-sm min-w-[1260px]">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Student
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Telefon
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                O'qituvchi
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Kurs
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Oylik to'lov
              </th>
              <th v-if="isManager" class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Chegirma
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Davomat to'lovi
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Muddat
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium" title="Oy boshidan beri to'plangan jami">
                To'langan (jami)
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Qolgan
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Tanlash
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Holat
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Xabar
              </th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="acc">
            <template v-for="section in displaySections" :key="section.key">
              <!-- Guruh sarlavhasi (bosilganда ochiladi/yopiladi) -->
              <tr v-if="section.name" :key="'h-' + section.key" @click="toggleGroup(section.key)"
                class="bg-blue-900/20 border-y border-white/10 cursor-pointer hover:bg-blue-800/10 transition select-none">
                <td :colspan="isManager ? 13 : 12" class="px-4 py-2.5">
                  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div class="flex items-center gap-2 font-semibold text-gray-700">
                      <AppIcon name="chevron-down" class="text-gray-400 transition-transform duration-200"
                        :class="isSectionOpen(section) ? '' : '-rotate-90'" />
                      <AppIcon name="groups" class="text-gray-400" />
                      <span>{{ section.name }}</span>
                      <span v-if="section.teacher" class="text-xs font-normal text-gray-400">· {{ section.teacher
                      }}</span>
                      <span class="text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{{
                        section.payments.length }} ta</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs tabular-nums">
                      <span class="text-gray-500">Jami:
                        <b class="text-gray-700">{{
                          money(section.totalDue)
                        }}</b></span>
                      <span class="text-green-600">To'langan: <b>{{ money(section.totalPaid) }}</b></span>
                      <span :class="section.remaining > 0
                        ? 'text-red-500'
                        : 'text-green-600'
                        ">Qolgan: <b>{{ money(section.remaining) }}</b></span>
                    </div>
                  </div>
                </td>
              </tr>

              <template v-if="isSectionOpen(section)">
                <tr v-for="payment in section.payments" :key="'p-' + payment.id"
                  class="acc-row border-b border-white/10 hover:bg-blue-500/10 transition">
                  <td class="px-4 py-3 font-medium">
                    <div>{{ payment.student_name }}</div>
                    <!-- Virtual karta: barcha oylar bo'yicha balans/qarz -->
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span v-if="payment.wallet_balance > 0"
                        class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium"
                        title="Kartada qolgan (ortiqcha) pul">
                        Karta: +{{ money(payment.wallet_balance) }}
                      </span>
                      <span v-if="payment.wallet_debt > 0"
                        class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-medium"
                        title="Umumiy qarzdorlik">
                        Qarz: −{{ money(payment.wallet_debt) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ payment.student_phone }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ payment.teacher_name }}
                  </td>
                  <td class="px-4 py-3 text-gray-600">
                    {{ courseLabel(payment) }}
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ money(paymentNetDue(payment)) }}</div>
                    <div v-if="paymentDiscount(payment) > 0" class="text-[11px] text-gray-400 line-through">
                      {{ money(paymentAmountDue(payment)) }}
                    </div>
                  </td>
                  <td v-if="isManager" class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <input type="number" min="0" step="1000" v-model.number="payment.discount"
                        @keydown="blockNegativeKey($event)" placeholder="0"
                        class="border border-white/10 rounded-lg px-2 py-1 w-20 text-sm outline-none focus:border-white/10" />
                      <div class="flex rounded-lg overflow-hidden border border-gray-200 text-[11px] shrink-0">
                        <button type="button" @click="applyDiscount(payment, 'month')"
                          class="px-2 py-1 text-gray-600 hover:bg-gray-100 transition" title="Faqat shu oyga">
                          1 oy
                        </button>
                        <button type="button" @click="applyDiscount(payment, 'standing')"
                          class="px-2 py-1 border-l border-gray-200 text-indigo-600 hover:bg-indigo-50 transition"
                          title="Har oyga (doimiy)">
                          Doimiy
                        </button>
                      </div>
                    </div>
                    <p v-if="payment.monthly_discount > 0" class="text-[10px] text-indigo-500 mt-1 whitespace-nowrap">
                      Doimiy: {{ money(payment.monthly_discount) }}
                    </p>
                  </td>
                  <td class="px-4 py-3">
                    <template v-if="payment.total_lessons">
                      <div class="text-[11px] text-gray-400">
                        {{ payment.attended_count }}/{{ payment.total_lessons }} dars
                      </div>
                      <button @click="applyAttendanceDue(payment)"
                        class="text-xs font-semibold text-indigo-500 hover:text-indigo-600 hover:underline"
                        title="Shu summani 'Oylik to'lov'ga qo'yish">
                        {{ money(payment.attendance_due) }}
                      </button>
                    </template>
                    <span v-else class="text-gray-300">—</span>
                  </td>
                  <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {{ formatDue(payment) }}
                  </td>
                  <td class="px-4 py-3">
                    <!-- Jami to'langan — qo'lda yozilmaydi. Bo'lib to'lashda
                         kassir "+ To'lov" orqali SHU SAFAR tushgan summani
                         kiritadi, jamini tizim qo'shadi. -->
                    <div class="flex items-center gap-1.5">
                      <span class="tabular-nums font-medium">{{ money(payment.paid_amount) }}</span>
                      <button type="button" @click="openInstallment(payment)"
                        class="px-2 py-1 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[11px] font-semibold transition shrink-0"
                        title="Bugun tushgan summani qo'shish">
                        <AppIcon name="plus" /> To'lov
                      </button>
                      <button type="button" @click="openHistory(payment)"
                        class="px-1.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition shrink-0"
                        title="To'lov tarixi — qaysi kuni qancha tushgan">
                        <AppIcon name="receipt" />
                      </button>
                      <button v-if="isManager" type="button" @click="startTotalCorrection(payment)"
                        class="px-1.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition shrink-0"
                        title="Jamini tuzatish (xato yozilgan bo'lsa)">
                        <AppIcon name="edit" />
                      </button>
                    </div>

                    <p v-if="payment.paid_today" class="text-[11px] text-emerald-600 mt-1 tabular-nums">
                      Bugun: +{{ money(payment.paid_today) }}
                    </p>

                    <!-- Shu safar tushgan summa -->
                    <div v-if="payOpenId === payment.id" class="mt-2 flex flex-wrap items-center gap-1.5">
                      <input type="number" min="1" step="1000" v-model.number="payAmount"
                        @keydown="blockNegativeKey($event)" @keyup.enter="submitInstallment(payment)"
                        placeholder="Bugun tushdi" autofocus
                        class="border border-emerald-200 rounded-lg px-2 py-1 w-32 text-sm outline-none focus:border-emerald-400" />
                      <button type="button" @click="fillRemaining(payment)" v-if="remainingAmount(payment) > 0"
                        class="px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-[11px] transition"
                        title="Qolgan summani qo'yish">
                        Qolgan: {{ money(remainingAmount(payment)) }}
                      </button>
                      <button type="button" @click="submitInstallment(payment)" :disabled="paySaving"
                        class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition disabled:opacity-40">
                        {{ paySaving ? "..." : "Qabul qilish" }}
                      </button>
                      <button type="button" @click="payOpenId = null"
                        class="px-1.5 py-1 rounded-lg text-gray-400 hover:text-gray-600 transition">
                        <AppIcon name="x" />
                      </button>
                      <p v-if="payError" class="w-full max-w-[260px] whitespace-normal text-[11px] text-rose-500">
                        {{ payError }}
                      </p>
                    </div>

                    <!-- Jamini tuzatish (kamaytirish tasdiqlanadi) -->
                    <div v-if="editTotalId === payment.id" class="mt-2 flex items-center gap-1.5">
                      <input type="number" min="0" step="1" v-model.number="payment.paid_amount"
                        @keydown="blockNegativeKey($event)" @input="sanitizePaidAmount(payment)"
                        @keyup.enter="saveTotalCorrection(payment)" placeholder="0"
                        class="border border-amber-200 rounded-lg px-2 py-1 w-28 text-sm outline-none focus:border-amber-400" />
                      <button type="button" @click="saveTotalCorrection(payment)"
                        class="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-semibold hover:bg-amber-600 transition">
                        Tuzatish
                      </button>
                      <button type="button" @click="editTotalId = null; payment.paid_amount = payment._paid_before"
                        class="px-1.5 py-1 rounded-lg text-gray-400 hover:text-gray-600 transition">
                        <AppIcon name="x" />
                      </button>
                    </div>

                    <!-- Tarix: qaysi kuni qancha tushgan -->
                    <!-- bg-gray-100: tungi rejimda bg-gray-50 shaffof
                         bo'lib qoladi, ro'yxat fonsiz osilib turardi -->
                    <div v-if="payHistoryId === payment.id"
                      class="mt-2 rounded-lg border border-gray-200 bg-gray-100 p-2 text-[11px] min-w-[200px]">
                      <p v-if="payHistoryLoading" class="text-gray-400">Yuklanmoqda...</p>
                      <p v-else-if="!payHistoryRows.length" class="text-gray-400">
                        Kassa jurnalida yozuv yo'q
                      </p>
                      <ul v-else class="space-y-0.5">
                        <li v-for="h in payHistoryRows" :key="h.id" class="flex items-center justify-between gap-3">
                          <span class="text-gray-500">
                            {{ shortDate(h.date || h.created_at) }}
                            <span v-if="h.kind === 'adjust'" class="text-amber-600">· tuzatish</span>
                          </span>
                          <span class="tabular-nums font-semibold"
                            :class="h.amount >= 0 ? 'text-emerald-600' : 'text-rose-500'">
                            {{ h.amount >= 0 ? "+" : "−" }}{{ money(Math.abs(h.amount)) }}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </td>
                  <td class="px-4 py-3 font-medium" :class="remainingAmount(payment) > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                    ">
                    {{ remainingAmount(payment) > 0 ? "-" : "+"
                    }}{{ money(Math.abs(remainingAmount(payment))) }}
                  </td>
                  <td class="px-4 py-3">
                    <label class="inline-flex items-center cursor-pointer">
                      <!-- ✅ TUZATILDI: summa 0/bo'sh bo'lsa checkbox disabled -->
                      <input type="checkbox" v-model="payment.is_checked" :disabled="!Number(payment.paid_amount) ||
                        Number(payment.paid_amount) <= 0
                        " @change="savePaymentRow(payment)"
                        class="h-4 w-4 rounded border-white/10 text-gray-900 focus:ring-gray-900 disabled:opacity-40 disabled:cursor-not-allowed" />
                    </label>
                  </td>
                  <td class="px-4 py-3">
                    <span :class="[
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      payment.is_checked
                        ? 'bg-green-800 text-green-700'
                        : 'bg-red-100 text-red-600',
                    ]">
                      {{ payment.is_checked ? "To'langan" : "To'lanmagan" }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <button @click="openMsgModal('single', payment)"
                        class="relative px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-500 transition text-sm"
                        :title="tgLinkedIds.has(payment.student_id)
                          ? 'Botga ulangan — xabar boradi'
                          : 'Hali botga ulanmagan'
                          ">
                        <AppIcon name="mail" />
                        <span :class="[
                          'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white',
                          tgLinkedIds.has(payment.student_id)
                            ? 'bg-green-400'
                            : 'bg-gray-300',
                        ]"></span>
                      </button>
                      <button @click="deleteStudentRow(payment)" title="Studentni butunlay o'chirish"
                        class="px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-red-500 transition text-sm">
                        <AppIcon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </TransitionGroup>
        </table>
        <p v-if="filteredPayments.length === 0" class="text-center py-8 text-gray-400 text-sm">
          {{ paySearch ? "Hech narsa topilmadi." : "Bu oy uchun to'lovlar yo'q." }}
        </p>
        <!-- Pagination (faqat oddiy ro'yxat rejimida) -->
        <div v-if="!groupByGroup && payTotalPages > 1"
          class="flex items-center justify-between gap-3 p-4 border-t border-gray-100">
          <button @click="payPage--" :disabled="payPage <= 1"
            class="px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            <AppIcon name="arrow-left" /> Oldingi
          </button>
          <p class="text-xs text-gray-400 tabular-nums">
            {{ payPage }} / {{ payTotalPages }} —
            {{ filteredPayments.length.toLocaleString() }} ta yozuv
          </p>
          <button @click="payPage++" :disabled="payPage >= payTotalPages"
            class="px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
            Keyingi
            <AppIcon name="arrow-right" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ TARIX ══════════ -->
    <div v-if="activeTab === 'history'">
      <div class="flex flex-wrap gap-3 mb-5">
        <div>
          <label class="block text-xs text-gray-400 mb-1">O'qituvchi</label>
          <select v-model="historyTeacherId"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none min-w-[160px]">
            <option value="">— Tanlang —</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Oy</label>
          <input type="month" v-model="historyMonth"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <div class="flex items-end">
          <button @click="fetchHistoryPayments" :disabled="!historyTeacherId || loadingHistory"
            class="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-40">
            {{ loadingHistory ? "Yuklanmoqda..." : "Ko'rish" }}
          </button>
        </div>
      </div>

      <div v-if="!historyTeacherId" class="text-center py-16 text-gray-400">
        <p class="text-sm">O'qituvchini tanlang</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div class="bg-gray-100 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-1">Jami</p>
            <p class="text-xl font-semibold">{{ money(historyTotalAmount) }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ historyPayments.length }} o'quvchi
            </p>
          </div>
          <div class="bg-green-50 rounded-xl p-4">
            <p class="text-xs text-green-600 mb-1">To'langan</p>
            <p class="text-xl font-semibold text-green-700">
              {{ money(historyPaidAmount) }}
            </p>
            <p class="text-xs text-green-500 mt-1">
              {{historyPayments.filter((p) => p.is_paid).length}} o'quvchi
            </p>
          </div>
          <div class="bg-red-50 rounded-xl p-4">
            <p class="text-xs text-red-500 mb-1">Qolgan</p>
            <p class="text-xl font-semibold text-red-600">
              {{ money(historyUnpaidAmount) }}
            </p>
            <p class="text-xs text-red-400 mt-1">
              {{historyPayments.filter((p) => !p.is_paid).length}} o'quvchi
            </p>
          </div>
        </div>

        <div v-if="loadingHistory" class="text-center py-8 text-gray-400">
          Yuklanmoqda...
        </div>
        <div v-else class="border border-gray-100 rounded-2xl overflow-x-auto">
          <table class="pay-nowrap w-full text-sm min-w-[900px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  #
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  Student
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  Kurs
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  Oylik to'lov
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  To'langan
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  Qolgan
                </th>
                <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                  Holat
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(payment, idx) in historyPayments" :key="payment.id"
                class="border-b border-gray-50 hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-gray-400 text-xs">{{ idx + 1 }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium">{{ payment.student_name }}</p>
                  <p class="text-xs text-gray-400">
                    {{ payment.student_phone }}
                  </p>
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ courseLabel(payment) }}
                </td>
                <td class="px-4 py-3 font-medium">
                  {{ money(paymentAmountDue(payment)) }}
                </td>
                <td class="px-4 py-3 text-gray-700">
                  {{ money(paymentPaidAmount(payment)) }}
                </td>
                <td class="px-4 py-3 font-medium" :class="remainingAmount(payment) > 0
                  ? 'text-red-600'
                  : 'text-green-600'
                  ">
                  {{ remainingAmount(payment) > 0 ? "-" : "+"
                  }}{{ money(Math.abs(remainingAmount(payment))) }}
                </td>
                <td class="px-4 py-3">
                  <span :class="[
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    payment.is_paid
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600',
                  ]">
                    <AppIcon :name="payment.is_paid ? 'check' : 'x'" />
                    {{ payment.is_paid ? "To'langan" : "To'lanmagan" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="historyPayments.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Bu oy uchun to'lovlar yo'q.
          </p>
        </div>
      </template>
    </div>

    <!-- ══════════ TO'LOV SO'ROVLARI (chek) ══════════ -->
    <div v-if="activeTab === 'payreq'">
      <PaymentRequests @accepted="onPaymentAccepted" />
    </div>

    <!-- ══════════ DAVOMAT ══════════ -->
    <div v-if="activeTab === 'attendance'">
      <!-- Ustoz + guruh yonma-yon (ustoz slot orqali board filtriga qo'shiladi) -->
      <AttendanceBoard :groups="attTeacherGroups">
        <template #filters>
          <div class="w-full sm:w-64">
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Ustoz</label>
            <div class="relative">
              <select
                :value="selectedTeacherForAtt?.id || ''"
                @change="onAttTeacherChange($event)"
                class="w-full appearance-none border border-gray-200 bg-white rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-indigo-300 transition cursor-pointer"
              >
                <option value="" disabled>Ustozni tanlang…</option>
                <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                  {{ teacher.name }}
                </option>
              </select>
              <AppIcon
                name="chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </template>
      </AttendanceBoard>
    </div>

    <!-- ══════════ QO'SHISH ══════════ -->
    <div v-if="activeTab === 'add'" class="max-w-[420px]">
      <div v-if="addNetworkError"
        class="mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
        <span class="text-red-400">
          <AppIcon name="warning" />
        </span>
        <div>
          <p class="text-xs font-medium text-red-600">Internet aloqasi yo'q</p>
          <p class="text-xs text-red-400">
            Tarmoqni tekshirib qayta urinib ko'ring
          </p>
        </div>
        <button @click="addNetworkError = false"
          class="ml-auto text-red-300 hover:text-red-500 text-lg leading-none cursor-pointer">
          ×
        </button>
      </div>

      <div v-if="addSuccessMsg"
        class="mb-4 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
        <span class="text-green-500">
          <AppIcon name="check" />
        </span>
        <p class="text-xs font-medium text-green-700">{{ addSuccessMsg }}</p>
      </div>

      <div class="flex flex-col gap-4 border border-white/10 p-4 rounded-2xl">
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Ism</label>
          <input type="text" v-model="addForm.name" placeholder="Ism" :class="inputClass('name')" />
        </div>
        <div v-if="detectedRole === 'student' || !detectedRole">
          <label class="block text-xs text-gray-400 mb-1.5">Familiya</label>
          <input type="text" v-model="addForm.surname" placeholder="Familiyangiz" :class="inputClass('surname')" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Telefon</label>
          <input type="tel" v-model="addForm.phone" placeholder="+998 90 000 00 00"
            :class="inputClass('phone')" />
        </div>

        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Parol</label>
          <input type="password" v-model="addForm.password" @keyup.enter="submitAdd" placeholder="••••••••"
            :class="inputClass('password')" />
          <p v-if="roleLabel" class="text-xs text-gray-400 mt-1.5">
            Aniqlangan rol:
            <span class="font-medium text-gray-600">{{ roleLabel }}</span>
          </p>
        </div>

        <!-- Faqat student uchun: o'qituvchi va dars kuni -->
        <template v-if="detectedRole === 'student'">
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">O'qituvchi</label>
            <select v-model="addForm.teacher_id" :class="inputClass('teacher_id')">
              <option value="">Tanlang</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Dars kuni</label>
            <div class="flex gap-2">
              <button type="button" @click="addForm.schedule = 'odd'" :class="[
                'flex-1 py-2 rounded-xl text-sm border transition cursor-pointer',
                addForm.schedule === 'odd'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ]">
                Du / Chor / Juma
              </button>
              <button type="button" @click="addForm.schedule = 'even'" :class="[
                'flex-1 py-2 rounded-xl text-sm border transition cursor-pointer',
                addForm.schedule === 'even'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ]">
                Se / Pay / Shan
              </button>
              <button type="button" @click="addForm.schedule = 'daily'" :class="[
                'flex-1 py-2 rounded-xl text-sm border transition cursor-pointer',
                addForm.schedule === 'daily'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              ]">
                Har kuni
              </button>
            </div>
          </div>
        </template>

        <button @click="submitAdd" :disabled="addLoading"
          class="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition cursor-pointer disabled:opacity-50">
          {{ addLoading ? "Saqlanmoqda..." : "Qo'shish" }}
        </button>
      </div>
    </div>

    <div class="" v-if="activeTab === 'mahsulotlar'">
      <AdminProducts />
    </div>
    <div class="" v-if="activeTab === 'orders'">
      <Adminorders />
    </div>
    <div class="" v-if="activeTab === 'fee'">
      <DefaultFee />
    </div>
    <div class="" v-if="activeTab === 'settings'">
      <Coin_settings />
    </div>
    <div class="" v-if="activeTab === 'news'">
      <NewsManager />
    </div>
    <div v-if="activeTab === 'receipt'">
      <ReceiptSettings />
    </div>
    <div v-if="activeTab === 'groups'">
      <Groups />
    </div>

    <!-- ══════════ XABAR YUBORISH MODAL ══════════ -->
    <div v-if="msgModal.open" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      @click.self="msgModal.open = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-800">{{ msgTitle }}</h3>
          <button @click="msgModal.open = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <!-- Kimga yuborish -->
        <div v-if="msgModal.mode !== 'single'" class="grid grid-cols-2 gap-2 mb-3">
          <button v-for="t in msgTargets" :key="t.key" @click="msgModal.target = t.key" :class="[
            'px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition flex items-center gap-1.5 justify-center',
            msgModal.target === t.key
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          ]">
            <AppIcon :name="t.icon" />
            {{ t.label }}
            <span v-if="t.key === 'unpaid'">({{ unpaidStudentIds.length }})</span>
          </button>
        </div>

        <p v-if="msgHasPlaceholders" class="text-xs text-gray-400 mb-2">
          {ism} — o'quvchi ismi, {oy} — tanlangan oy ({{ monthLabel }})
          bilan avtomatik almashtiriladi. Xabar faqat botga ulangan
          o'quvchilarga boradi.
        </p>
        <p v-else class="text-xs text-gray-400 mb-2">
          Xabar faqat botga ulanganlarga boradi.
          <span v-if="msgModal.target === 'leads'">
            Leadlar botga o'zlari yozgan bo'lsagina xabar oladi.
          </span>
        </p>

        <textarea v-model="msgModal.text" rows="5"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"></textarea>

        <div v-if="msgResult" :class="[
          'mt-3 text-sm rounded-xl px-3 py-2',
          msgResult.error
            ? 'bg-red-50 text-red-600'
            : 'bg-green-50 text-green-700',
        ]">
          <template v-if="msgResult.error">
            <AppIcon name="x-circle" /> {{ msgResult.error }}
          </template>
          <template v-else-if="msgResult.async">
            <AppIcon name="check-circle" /> {{ msgResult.queued }} ta o'quvchiga yuborilmoqda (fonda).
            {{ msgResult.no_chat }} tasi hali botga ulanmagan.
          </template>
          <template v-else>
            <AppIcon name="check-circle" /> Yuborildi: {{ msgResult.sent }}
            <span v-if="msgResult.no_chat">· Botga ulanmagan: {{ msgResult.no_chat }}</span>
            <span v-if="msgResult.failed">· Xato: {{ msgResult.failed }}</span>
          </template>
        </div>

        <div class="flex gap-2 mt-4">
          <button @click="msgModal.open = false"
            class="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
            Yopish
          </button>
          <button @click="sendMsg" :disabled="msgModal.sending || !msgModal.text.trim()"
            class="flex-1 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 transition disabled:opacity-50">
            {{ msgModal.sending ? "Yuborilmoqda..." : "Yuborish" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Vaqtida to'lov coin mukofoti bildirishnomasi -->
    <Teleport to="body">
      <Transition name="coin-toast">
        <div v-if="coinToast"
          class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-medium shadow-2xl shadow-emerald-900/30 flex items-center gap-2">
          <AppIcon name="coin" class="w-4 h-4" />
          <span>{{ coinToast }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.coin-toast-enter-active,
.coin-toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.coin-toast-enter-from,
.coin-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

/* Jadval kataklari qisilmasin — har bir so'z bir qatorда, to'liq chiqsin.
   Tor ekranда jadval gorizontal scroll bo'ladi (overflow-x-auto konteyner). */
.pay-nowrap th,
.pay-nowrap td {
  white-space: nowrap;
}

/* Guruh akkordeon — studentlar animatsiya bilan ochiladi/yopiladi */
.acc-enter-active {
  transition:
    opacity 0.32s ease,
    transform 0.32s ease;
}

.acc-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.acc-enter-from,
.acc-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Yopilayotgan qatorlar boshqalarini bosib qo'ymasligi uchun */
.acc-leave-active {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {

  .acc-enter-active,
  .acc-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>