<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import AdminProducts from "./AdminProducts.vue";
import Adminorders from "./Adminorders.vue";
import Coin_settings from "./coin_settings.vue";
import DefaultFee from "./DefaultFee.vue";
import { normalizePhone } from "../utils/phone.js";
import Groups from "./groups.vue";
import LessonsPlans from "./LessonsPlans.vue";
import NewsManager from "./NewsManager.vue";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();
const API = "https://itline-django-9s85.onrender.com/api";

const user = JSON.parse(localStorage.getItem("user") || "null");
// Menejer ham shu panelga kiradi (u eng yuqori daraja)
if (!user || !(user.is_excellence || user.role === "manager")) {
  router.push("/login");
}

function logout() {
  localStorage.removeItem("user");
  router.push("/login");
}

const activeTab = ref("payments");

// Panel bo'limlari (ikonka nomlari AppIcon.vue dagi ro'yxatdan)
const TABS = [
  { key: "payments", icon: "payment", label: "Payments" },
  { key: "fee", icon: "briefcase", label: "Courses" },
  { key: "history", icon: "chart", label: "History" },
  { key: "attendance", icon: "attendance", label: "Attendance" },
  { key: "add", icon: "user-plus", label: "Add" },
  { key: "mahsulotlar", icon: "shop", label: "Products" },
  { key: "orders", icon: "orders", label: "Orders" },
  { key: "settings", icon: "coin", label: "Coin Settings" },
  { key: "groups", icon: "groups", label: "Groups" },
  { key: "news", icon: "news", label: "News" },
];

const teachers = ref([]);
const stagePrices = ref([]);
const payments = ref([]);
const groups = ref([]);
const courses = ref([]);
const loading = ref(false);
const generating = ref(false);

const selectedTeacherForAtt = ref(null);
const attStudents = ref([]);
const selectedStudent = ref(null);
const studentMonthAttendance = ref([]);
const selectedAttMonth = ref(new Date().toISOString().slice(0, 7));
const loadingAtt = ref(false);
const attPayments = ref([]);

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const selectedTeacherId = ref("");
const editingPrice = ref(null);

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
      teachers.value = res2.ok ? await res2.json() : [];
      return;
    }
    teachers.value = await res.json();
  } catch (e) {
    console.error("Fetch Teachers Error:", e);
    teachers.value = [];
  }
}

async function fetchStagePrices() {
  try {
    const res = await fetch(`${API}/stage-prices/`);
    if (!res.ok) throw new Error("Bosqich narxlarini yuklashda xatolik");
    stagePrices.value = await res.json();
  } catch (e) {
    console.error("Fetch Stage Prices Error:", e);
    stagePrices.value = [];
  }
}

async function fetchCourses() {
  try {
    const res = await fetch(`${API}/courses/`);
    if (!res.ok) throw new Error("Kurslarni yuklashda xatolik");
    courses.value = await res.json();
  } catch (e) {
    console.error("Fetch Courses Error:", e);
    courses.value = [];
  }
}

async function fetchGroups() {
  try {
    const res = await fetch(`${API}/groups/`);
    if (!res.ok) throw new Error("Guruhlarni yuklashda xatolik");
    groups.value = await res.json();
  } catch (e) {
    console.error("Fetch Groups Error:", e);
    groups.value = [];
  }
}

async function fetchPayments() {
  loading.value = true;
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
  } catch (e) {
    console.error("Fetch Payments Error:", e);
    payments.value = [];
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

onMounted(async () => {
  await Promise.allSettled([
    fetchTeachers(),
    fetchStagePrices(),
    fetchCourses(),
    fetchGroups(),
  ]);
  await fetchPayments();
  fetchTgStatus();
});

watch(activeTab, (tab) => {
  if (tab === "history" && historyTeacherId.value) {
    fetchHistoryPayments();
  }
  // Davomat to'lovlari faqat kerak bo'lganda yuklanadi (sahifa tez ochilishi uchun)
  if (tab === "attendance" && !attPayments.value.length) {
    fetchAttPayments();
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
      });
    }
    const sec = map.get(name);
    sec.payments.push(p);
    sec.totalDue += Number(paymentAmountDue(p)) || 0;
    sec.totalPaid += paymentPaidAmount(p);
  }
  const arr = [...map.values()].map((s) => ({
    ...s,
    remaining: s.totalDue - s.totalPaid,
  }));
  arr.sort((a, b) => {
    if (a.name === "Guruhsiz") return 1;
    if (b.name === "Guruhsiz") return -1;
    return a.name.localeCompare(b.name);
  });
  return arr;
});

// Jadval uchun bo'limlar: guruh rejimida guruhlar, aks holda bitta bo'lim
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
  target: "all", // "all" rejimida: all | unpaid (to'lov qilmaganlar)
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
    target: "all",
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
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

function startEditPrice(sp) {
  editingPrice.value = { stage: sp.stage, value: sp.price };
}

async function savePrice() {
  if (!editingPrice.value) return;
  const res = await fetch(
    `${API}/stage-prices/update/${editingPrice.value.stage}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: editingPrice.value.value }),
    },
  );
  const data = await res.json();
  const sp = stagePrices.value.find(
    (s) => s.stage === editingPrice.value.stage,
  );
  if (sp) sp.price = data.price;
  editingPrice.value = null;
}

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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount_due: payment.amount_due ?? paymentAmountDue(payment),
    }),
  });
}

const totalAmount = computed(() =>
  payments.value.reduce((a, b) => a + Number(paymentAmountDue(b) || 0), 0),
);
// ══════════ TUZATILDI: paidAmount endi bitta manbadan (paymentPaidAmount) hisoblanadi ══════════
const paidAmount = computed(() =>
  payments.value.reduce((a, b) => a + paymentPaidAmount(b), 0),
);
const unpaidAmount = computed(() => totalAmount.value - paidAmount.value);

const historyTotalAmount = computed(() =>
  historyPayments.value.reduce(
    (a, b) => a + Number(paymentAmountDue(b) || 0),
    0,
  ),
);
const historyPaidAmount = computed(() =>
  historyPayments.value.reduce((a, b) => a + paymentPaidAmount(b), 0),
);
const historyUnpaidAmount = computed(
  () => historyTotalAmount.value - historyPaidAmount.value,
);

async function selectTeacherForAtt(teacher) {
  selectedTeacherForAtt.value = teacher;
  selectedStudent.value = null;
  studentMonthAttendance.value = [];
  loadingAtt.value = true;
  try {
    const res = await fetch(`${API}/students/?teacher_id=${teacher.id}`);
    attStudents.value = await res.json();
  } finally {
    loadingAtt.value = false;
  }
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

// Qolgan = Oylik to'lov (default summa) - hozirgacha to'langan summa
function remainingAmount(payment) {
  const due = Number(paymentAmountDue(payment)) || 0;
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
// ══════════ TUZATILDI: status FAQAT checkbox (is_checked) holatiga qarab belgilanadi ══════════
async function savePaymentRow(payment) {
  const shouldBePaid = Boolean(payment.is_checked);

  try {
    const res = await fetch(`${API}/payments/confirm/${payment.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_paid: shouldBePaid,
        is_checked: shouldBePaid,
        amount_due: payment.amount_due ?? paymentAmountDue(payment),
        paid_amount: payment.paid_amount ?? 0,
      }),
    });

    const data = await res.json().catch(() => ({}));
    payment.is_paid = data.is_paid ?? shouldBePaid;
    payment.is_checked = data.is_checked ?? shouldBePaid;
    payment.paid_amount = data.paid_amount ?? payment.paid_amount;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_due: payment.amount_due ?? paymentAmountDue(payment),
          paid_amount: payment.paid_amount,
          is_checked: shouldBePaid,
          is_paid: shouldBePaid,
        }),
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      payment.is_paid = fallbackData.is_paid ?? shouldBePaid;
      payment.is_checked = fallbackData.is_checked ?? shouldBePaid;
    } catch (fallbackError) {
      console.error("To'lovni saqlashda xatolik:", fallbackError);
    }
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

  // Oddiy o'quvchi uchun raqam bot orqali tasdiqlangan bo'lishi shart
  if (role === "student" && normalizedPhone !== verify.value.verifiedPhone) {
    verify.value.error =
      "Avval telefon raqamni bot orqali tasdiqlang (Kod yuborish tugmasi)";
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

// ══════════ TELEFONNI BOT ORQALI TASDIQLASH ══════════
const verify = ref({
  sending: false,
  checking: false,
  codeSent: false,
  verifiedPhone: "", // tasdiqlangan raqam (normalizatsiya qilingan)
  code: "",
  error: "",
  notLinked: false,
});

const BOT_USERNAME = "itline_test_2026bot";

// Raqam o'zgarsa tasdiq bekor bo'ladi
watch(
  () => addForm.value.phone,
  () => {
    verify.value.codeSent = false;
    verify.value.verifiedPhone = "";
    verify.value.code = "";
    verify.value.error = "";
    verify.value.notLinked = false;
  },
);

const phoneVerified = computed(() => {
  const p = safeNormalizePhone(addForm.value.phone);
  return !!p && p === verify.value.verifiedPhone;
});

async function sendVerifyCode() {
  const phone = safeNormalizePhone(addForm.value.phone);
  if (!phone) {
    addMarkError("phone");
    return;
  }
  verify.value.sending = true;
  verify.value.error = "";
  verify.value.notLinked = false;
  try {
    const res = await fetch(`${API}/verify/send-code/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      verify.value.error = data.error || "Kod yuborib bo'lmadi";
      verify.value.notLinked = !!data.not_linked;
      return;
    }
    verify.value.codeSent = true;
  } catch {
    verify.value.error = "Internet aloqasi yo'q";
  } finally {
    verify.value.sending = false;
  }
}

async function checkVerifyCode() {
  const phone = safeNormalizePhone(addForm.value.phone);
  const code = verify.value.code.trim();
  if (!phone || code.length < 4) return;
  verify.value.checking = true;
  verify.value.error = "";
  try {
    const res = await fetch(`${API}/verify/check-code/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) {
      verify.value.error = data.error || "Kod noto'g'ri";
      return;
    }
    verify.value.verifiedPhone = phone;
    verify.value.error = "";
  } catch {
    verify.value.error = "Internet aloqasi yo'q";
  } finally {
    verify.value.checking = false;
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
      <button @click="$router.push('/profile')"
        class="px-4 py-2 rounded-full border border-gray-200 text-sm hover:bg-gray-50 transition">
        <AppIcon name="settings" /> Profil
      </button>
    </div>

    <!-- Tablar -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-1">
      <button v-for="tab in TABS" :key="tab.key" @click="activeTab = tab.key" :class="[
        'cursor-pointer px-4 py-2 rounded-full text-sm border transition whitespace-nowrap flex items-center gap-1.5',
        activeTab === tab.key
          ? 'bg-gray-900 text-white border-gray-900'
          : 'border-gray-200 text-gray-500 hover:bg-gray-50',
      ]">
        <AppIcon :name="tab.icon" />
        {{ tab.label }}
      </button>
      <router-link
        class="px-4 py-2 rounded-full text-sm border transition whitespace-nowrap border-gray-200 text-gray-500 hover:bg-gray-50"
        to="/finance">
        <AppIcon name="money" /> finance
      </router-link>
      <router-link
        class="px-4 py-2 rounded-full text-sm border transition whitespace-nowrap border-gray-200 text-gray-500 hover:bg-gray-50"
        to="/database">
        <AppIcon name="database" /> Baza
      </router-link>
      <router-link
        class="px-4 py-2 rounded-full text-sm border transition whitespace-nowrap border-gray-200 text-gray-500 hover:bg-gray-50"
        to="/manager/students">
        <AppIcon name="manager" /> Menejer paneli
      </router-link>
    </div>

    <!-- ══════════ TO'LOVLAR ══════════ -->
    <div v-if="activeTab === 'payments'">
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


        <div class="flex items-end">
          <button @click="openMsgModal('all')"
            class="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-sky-600 transition">
            <AppIcon name="send" /> Barchaga xabar
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
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Davomat to'lovi
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Muddat
              </th>
              <th class="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                To'langan
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
                <td colspan="12" class="px-4 py-2.5">
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
                  <td class="px-4 py-3 font-medium">{{ payment.student_name }}</td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ payment.student_phone }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ payment.teacher_name }}
                  </td>
                  <td class="px-4 py-3 text-gray-600">
                    {{ courseLabel(payment) }}
                  </td>
                  <td class="px-4 py-3">{{ money(paymentAmountDue(payment)) }}</td>
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
                    <!-- ✅ TUZATILDI: manfiy son kiritib bo'lmaydi -->
                    <input type="number" min="0" step="1" v-model.number="payment.paid_amount"
                      @keydown="blockNegativeKey($event)" @input="sanitizePaidAmount(payment)"
                      @change="savePaymentRow(payment)" placeholder="0"
                      class="border border-white/10 rounded-lg px-2 py-1 w-28 text-sm outline-none focus:border-white/10" />
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

    <!-- ══════════ DAVOMAT ══════════ -->
    <div v-if="activeTab === 'attendance'">
      <div class="flex gap-4 mb-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Oy</label>
          <input type="month" v-model="selectedAttMonth"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- O'qituvchilar -->
        <div class="space-y-2">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            O'qituvchilar
          </h3>
          <p v-if="teachers.length === 0" class="text-sm text-gray-400 py-4">
            Yuklanmoqda...
          </p>
          <div v-for="teacher in teachers" :key="teacher.id" @click="selectTeacherForAtt(teacher)" :class="[
            'px-4 py-3 rounded-xl cursor-pointer transition text-sm border',
            selectedTeacherForAtt?.id === teacher.id
              ? 'bg-gray-900 text-white border-gray-900'
              : 'border-gray-100 hover:bg-gray-50',
          ]">
            <p class="font-medium">{{ teacher.name }}</p>
            <p :class="selectedTeacherForAtt?.id === teacher.id
              ? 'text-gray-300'
              : 'text-gray-400'
              " class="text-xs">
              {{ teacher.phone || "Telefon yo'q" }}
            </p>
          </div>
        </div>

        <!-- Studentlar -->
        <div class="space-y-2">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            O'quvchilar
          </h3>
          <p v-if="!selectedTeacherForAtt" class="text-sm text-gray-400 py-4">
            O'qituvchi tanlang
          </p>
          <p v-else-if="loadingAtt" class="text-sm text-gray-400 py-4">
            Yuklanmoqda...
          </p>
          <template v-else>
            <div v-for="student in attStudents" :key="student.id" @click="selectStudentForAtt(student)" :class="[
              'px-4 py-3 rounded-xl cursor-pointer transition text-sm border',
              selectedStudent?.id === student.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-100 hover:bg-gray-50',
            ]">
              <div class="flex justify-between items-center">
                <div>
                  <p class="font-medium">
                    {{ student.name }} {{ student.surname }}
                  </p>
                  <p :class="selectedStudent?.id === student.id
                    ? 'text-gray-300'
                    : 'text-gray-400'
                    " class="text-xs">
                    {{ student.group_name || student.course_name || "" }}
                  </p>
                </div>
                <span v-if="getStudentPaymentForAtt(student.id)" :class="[
                  'text-xs px-2 py-0.5 rounded-full',
                  getStudentPaymentForAtt(student.id)?.is_paid
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-500',
                ]">
                  <AppIcon :name="getStudentPaymentForAtt(student.id)?.is_paid ? 'check' : 'x'" />
                </span>
              </div>
            </div>
            <p v-if="attStudents.length === 0" class="text-sm text-gray-400 py-4">
              O'quvchi yo'q
            </p>
          </template>
        </div>

        <!-- Davomat -->
        <div>
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {{
              selectedStudent ? selectedStudent.name + " davomati" : "Davomat"
            }}
          </h3>
          <p v-if="!selectedStudent" class="text-sm text-gray-400 py-4">
            O'quvchi tanlang
          </p>
          <p v-else-if="loadingAtt" class="text-sm text-gray-400 py-4">
            Yuklanmoqda...
          </p>
          <div v-else class="space-y-1.5">
            <div v-if="getStudentPaymentForAtt(selectedStudent.id)" :class="[
              'rounded-xl p-3 mb-3',
              getStudentPaymentForAtt(selectedStudent.id)?.is_paid
                ? 'bg-green-50 border border-green-100'
                : 'bg-red-50 border border-red-100',
            ]">
              <p class="text-xs font-medium" :class="getStudentPaymentForAtt(selectedStudent.id)?.is_paid
                ? 'text-green-700'
                : 'text-red-600'
                ">
                {{
                  getStudentPaymentForAtt(selectedStudent.id)?.is_paid
                    ? "To'lov qilingan"
                    : "To'lov qilinmagan"
                }}
              </p>
              <p class="text-sm font-semibold mt-0.5">
                {{
                  money(
                    paymentAmountDue(
                      getStudentPaymentForAtt(selectedStudent.id),
                    ),
                  )
                }}
              </p>
            </div>
            <div v-for="att in studentMonthAttendance" :key="att.id"
              class="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2">
              <div>
                <p class="text-sm font-medium">{{ att.lesson_title }}</p>
                <p class="text-xs text-gray-400">{{ att.lesson_date }}</p>
              </div>
              <span :class="[
                'px-2 py-0.5 rounded-full text-xs font-medium',
                statusStyle[att.status],
              ]">
                {{ statusLabel[att.status] }}
              </span>
            </div>
            <p v-if="studentMonthAttendance.length === 0" class="text-sm text-gray-400 py-4 text-center">
              Bu oy uchun dars yo'q
            </p>
          </div>
        </div>
      </div>
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
          <div class="flex gap-2">
            <input type="tel" v-model="addForm.phone" placeholder="+998 90 000 00 00"
              :class="[inputClass('phone'), 'flex-1']" />
            <button v-if="detectedRole === 'student' && !phoneVerified" @click="sendVerifyCode"
              :disabled="verify.sending || !addForm.phone"
              class="px-3 rounded-xl bg-sky-500 text-white text-xs font-medium hover:bg-sky-600 transition disabled:opacity-50 whitespace-nowrap shrink-0">
              {{ verify.sending ? "..." : verify.codeSent ? "Qayta" : "Kod yuborish" }}
            </button>
            <span v-else-if="phoneVerified"
              class="px-3 flex items-center rounded-xl bg-green-50 text-green-600 text-xs font-medium border border-green-200 whitespace-nowrap shrink-0">
              <AppIcon name="check" /> Tasdiqlandi
            </span>
          </div>

          <!-- Kod kiritish -->
          <div v-if="detectedRole === 'student' && verify.codeSent && !phoneVerified" class="mt-2 flex gap-2">
            <input type="text" inputmode="numeric" maxlength="6" v-model="verify.code" @keyup.enter="checkVerifyCode"
              placeholder="Botdan kelgan 6 xonali kod"
              class="flex-1 px-3 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 outline-none focus:border-sky-400 transition text-sm tabular-nums tracking-widest" />
            <button @click="checkVerifyCode" :disabled="verify.checking || verify.code.trim().length < 4"
              class="px-4 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition disabled:opacity-50 whitespace-nowrap shrink-0">
              {{ verify.checking ? "..." : "Tasdiqlash" }}
            </button>
          </div>

          <!-- Yordam / xato -->
          <p v-if="detectedRole === 'student' && verify.codeSent && !phoneVerified && !verify.error"
            class="text-xs text-sky-600 mt-1.5">
            <AppIcon name="phone" /> Kod o'quvchining Telegramiga yuborildi — kodni so'rab, shu yerga
            kiriting.
          </p>
          <div v-if="verify.error" class="mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <p class="text-xs text-amber-700">{{ verify.error }}</p>
            <a v-if="verify.notLinked" :href="`https://t.me/${BOT_USERNAME}`" target="_blank" rel="noopener"
              class="text-xs text-sky-600 hover:underline font-medium mt-1 inline-block">
              @{{ BOT_USERNAME }} ni ochish
              <AppIcon name="arrow-right" />
            </a>
          </div>
          <p v-else-if="detectedRole === 'student' && !verify.codeSent && !phoneVerified"
            class="text-xs text-gray-400 mt-1.5">
            O'quvchi avval botga /start bosib raqamini yuborishi kerak, keyin
            "Kod yuborish"ni bosing.
          </p>
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
    <div v-if="activeTab === 'groups'">
      <Groups />
    </div>

    <!-- ══════════ XABAR YUBORISH MODAL ══════════ -->
    <div v-if="msgModal.open" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      @click.self="msgModal.open = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-800">
            {{
              msgModal.mode === "single"
                ? `${msgModal.student?.name}ga xabar`
                : msgModal.target === "unpaid"
                  ? "To'lov qilmaganlarga xabar"
                  : "Barcha o'quvchilarga xabar"
            }}
          </h3>
          <button @click="msgModal.open = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <!-- Kimga yuborish: barchaga yoki to'lov qilmaganlarga -->
        <div v-if="msgModal.mode !== 'single'" class="grid grid-cols-2 gap-2 mb-3">
          <button @click="msgModal.target = 'all'" :class="[
            'px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition',
            msgModal.target === 'all'
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          ]">
            <AppIcon name="users" /> Barchaga
          </button>
          <button @click="msgModal.target = 'unpaid'" :class="[
            'px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition',
            msgModal.target === 'unpaid'
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          ]">
            <AppIcon name="payment" /> To'lov qilmaganlar ({{ unpaidStudentIds.length }})
          </button>
        </div>

        <p class="text-xs text-gray-400 mb-2">
          {ism} — o'quvchi ismi, {oy} — tanlangan oy ({{ monthLabel }})
          bilan avtomatik almashtiriladi. Xabar faqat botga ulangan
          o'quvchilarga boradi.
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
