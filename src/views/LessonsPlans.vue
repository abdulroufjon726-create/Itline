<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import lessonSoundFile from "/sounds/mixkit-airport-announcement-ding-1569.wav";
import newsSoundFile from "/sounds/mixkit-elegant-door-announcement-224.wav";
import AppIcon from "@/components/AppIcon.vue";
import telegramQrImg from "../icon/telegram_QR.png";
import itlineWebQrImg from "../icon/Itline_web-qr.png";

const router = useRouter();
const API = "https://itline-django-9s85.onrender.com/api";

const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user) {
  router.push("/login");
}

// ─────────────────────────────
// STATE
// ─────────────────────────────

const groups = ref([]);
const loading = ref(true);
const errorMsg = ref("");

// Soniyalik soat — faqat header'dagi jonli soat uchun
const clockNow = ref(new Date());
// 1 soniyada bir yangilanadigan "holat" vaqti
const statusNow = ref(new Date());

let clockTimer = null;
let statusTimer = null;
let refetchTimer = null;

const DAY_NAMES = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

const SCHEDULE_LABEL = {
  odd: "Du / Chor / Juma",
  even: "Se / Pay / Shan",
  daily: "Har kuni",
};

// ─────────────────────────────
// OVOZLI BILDIRISHNOMALAR (Web Audio API)
// ─────────────────────────────

const soundEnabled = ref(true);
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

const lessonAudio = new Audio(lessonSoundFile);
const newsAudio = new Audio(newsSoundFile);
lessonAudio.preload = "auto";
newsAudio.preload = "auto";

// ─────────────────────────────
// OVOZNI OCHISH (brauzer autoplay siyosati)
// Brauzerlar foydalanuvchi biror joyni bosmaguncha ovoz chiqarishga
// ruxsat bermaydi. Birinchi bosishda (yoki tugma bosilganda) ovozni
// "ochamiz" — shundan keyin dars/e'lon ovozlari o'zi chiqadi.
// ─────────────────────────────
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    getAudioCtx();
  } catch (e) {
    /* jim */
  }
  [lessonAudio, newsAudio].forEach((a) => {
    const wasMuted = a.muted;
    a.muted = true;
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = wasMuted;
      }).catch(() => {
        a.muted = wasMuted;
      });
    } else {
      a.muted = wasMuted;
    }
  });
}

function playLessonAlert() {
  if (!soundEnabled.value) return;

  lessonAudio.currentTime = 0;
  lessonAudio.play().catch((e) => console.warn(e));

  setTimeout(() => {
    lessonAudio.currentTime = 0;
    lessonAudio.play().catch((e) => console.warn(e));
  }, 4200);

  setTimeout(() => {
    lessonAudio.currentTime = 0;
    lessonAudio.play().catch((e) => console.warn(e));
  }, 8200);

  setTimeout(() => {
    lessonAudio.currentTime = 0;
    lessonAudio.play().catch((e) => console.warn(e));
  }, 12200);
  setTimeout(() => {
    lessonAudio.currentTime = 0;
    lessonAudio.play().catch((e) => console.warn(e));
  }, 16200);

  triggerVisualPulse();
}

function playNewsAlert() {
  if (!soundEnabled.value) return;

  // ✅ Sound chiqayotganda news rotation'ni pause qil
  pauseNewsRotationDuringSound();

  newsAudio.currentTime = 0;
  newsAudio.play().catch((e) => console.warn(e));

  setTimeout(() => {
    newsAudio.currentTime = 0;
    newsAudio.play().catch((e) => console.warn(e));
  }, 5200);

  setTimeout(() => {
    newsAudio.currentTime = 0;
    newsAudio.play().catch((e) => console.warn(e));
  }, 10200);

  triggerVisualPulse();
}

function beep(freq = 1200, delay = 0, duration = 0.1, volume = 0.15) {
  setTimeout(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Beep xatosi:", e);
    }
  }, delay * 1000);
}

const visualAlert = ref(false);
let visualAlertTimer = null;
function triggerVisualPulse() {
  visualAlert.value = true;
  clearTimeout(visualAlertTimer);
  visualAlertTimer = setTimeout(() => (visualAlert.value = false), 2500);
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  if (soundEnabled.value) {
    unlockAudio();
    getAudioCtx();
    beep(1200, 0, 0.1, 0.15);
  }
}

// ─────────────────────────────
// POP-UP BILDIRISHNOMALAR (dars boshlandi / yangi e'lon)
// ─────────────────────────────

// Har bir popup 18 soniya ko'rinadi (talab: 15–20 soniya)
const POPUP_MS = 18000;
const popupQueue = ref([]); // navbatdagi bildirishnomalar
const activePopup = ref(null); // hozir ko'rsatilayotgani
let popupTimer = null;

function enqueuePopup(p) {
  popupQueue.value.push(p);
  if (!activePopup.value) showNextPopup();
}

function showNextPopup() {
  clearTimeout(popupTimer);
  const next = popupQueue.value.shift();
  if (!next) {
    activePopup.value = null;
    return;
  }
  activePopup.value = next;

  // ✅ Ovoz popup bilan BIR VAQTDA — har bir popup ko'rsatilganda o'z ovozi
  // chiqadi. Bir nechta dars bir vaqtda boshlansa ham popuplar navbat bilan
  // chiqib, har biri o'z ovozini oladi (ovozlar ustma-ust tushmaydi).
  if (next.kind === "lesson") playLessonAlert();
  else if (next.kind === "news") playNewsAlert();

  popupTimer = setTimeout(showNextPopup, POPUP_MS);
}

function closePopup() {
  // Joriysini yopib, navbatdagisiga o'tadi (yoki hammasi tugasa yopadi)
  showNextPopup();
}

function showLessonPopup(g) {
  enqueuePopup({
    kind: "lesson",
    id: `lesson-${g.id}`,
    title: g.name,
    room: g.room || "",
    time: formatTime(g.lesson_time),
    day: todayLabel.value,
    teacher: g.teacher?.name || "",
    students: g.students?.length || 0,
  });
}

function showNewsPopup(n) {
  enqueuePopup({
    kind: "news",
    id: `news-${n.id}`,
    title: n.title,
    content: n.content,
    priority: n.priority || "normal",
  });
}

// ─────────────────────────────
// DARS BOSHLANISHIDAN 5 DAQIQA OLDIN TELEGRAM ESLATMA
// ─────────────────────────────

const REMINDER_LEAD_SECONDS = 300; // 5 daqiqa
const remindedLessonIds = new Set();

async function sendLessonReminder(groupId) {
  try {
    await fetch(`${API}/lessons/send-reminders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId }),
    });
  } catch (e) {
    // Backend idempotent — xato bo'lsa jim o'tamiz
  }
}

const alertedLessonIds = new Set();
let lastCheckedDay = new Date().toDateString();

function checkLessonAlerts() {
  const today = new Date().toDateString();
  if (today !== lastCheckedDay) {
    alertedLessonIds.clear();
    remindedLessonIds.clear();
    lastCheckedDay = today;
  }

  todaysGroups.value.forEach((g) => {
    if (!g.lesson_time) return;
    const secondsLeft = secondsUntilLesson(g.lesson_time);

    // Darsga 5 daqiqa qolganda telegram eslatma yuboriladi
    if (
      secondsLeft > 0 &&
      secondsLeft <= REMINDER_LEAD_SECONDS &&
      !remindedLessonIds.has(g.id)
    ) {
      remindedLessonIds.add(g.id);
      sendLessonReminder(g.id);
    }

    // Dars boshlanganda pop-up navbatga qo'yiladi — ovoz popup
    // ko'rsatilganda (showNextPopup) chiqadi, shunda ular sinxron bo'ladi
    if (secondsLeft <= 0 && secondsLeft > -2 && !alertedLessonIds.has(g.id)) {
      alertedLessonIds.add(g.id);
      showLessonPopup(g);
    }
  });
}

// ─────────────────────────────
// FETCH
// ─────────────────────────────

async function fetchGroups() {
  try {
    const res = await fetch(`${API}/groups/`);
    if (!res.ok) throw new Error("Guruhlarni yuklashda xatolik");
    groups.value = await res.json();
    errorMsg.value = "";
  } catch (e) {
    errorMsg.value = "Ma'lumotlarni yuklab bo'lmadi. Qayta urinib ko'ring.";
  } finally {
    loading.value = false;
  }
}

// Birinchi foydalanuvchi harakatida ovozni ochamiz (autoplay siyosati)
const UNLOCK_EVENTS = ["pointerdown", "click", "keydown", "touchstart"];
function onFirstGesture() {
  unlockAudio();
  UNLOCK_EVENTS.forEach((ev) => window.removeEventListener(ev, onFirstGesture));
}

onMounted(() => {
  fetchGroups();
  UNLOCK_EVENTS.forEach((ev) =>
    window.addEventListener(ev, onFirstGesture, { passive: true }),
  );
  clockTimer = setInterval(() => (clockNow.value = new Date()), 1000);
  statusTimer = setInterval(() => {
    statusNow.value = new Date();
    checkLessonAlerts();
  }, 1000);
  refetchTimer = setInterval(fetchGroups, 120000);
});

onUnmounted(() => {
  clearInterval(clockTimer);
  clearInterval(statusTimer);
  clearInterval(refetchTimer);
  UNLOCK_EVENTS.forEach((ev) => window.removeEventListener(ev, onFirstGesture));
});

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function scheduleTypeForDate(date) {
  const py = (date.getDay() + 6) % 7;
  if ([0, 2, 4].includes(py)) return "odd";
  if ([1, 3, 5].includes(py)) return "even";
  return null; // Yakshanba — dars yo'q
}

function timeToMinutes(t) {
  if (!t) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t) {
  if (!t) return "--:--";
  const [h, m] = t.split(":");
  return `${h}:${m}`;
}

function formatClock(date) {
  return date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ✅ Joriy vaqtdan darsgacha qolgan aniq soniyani hisoblaydi
function secondsUntilLesson(lessonTime) {
  if (!lessonTime) return -1;
  const [h, m] = lessonTime.split(":").map(Number);
  const target = new Date(statusNow.value);
  target.setHours(h, m, 0, 0);
  return Math.round((target - statusNow.value) / 1000);
}

// ✅ Soniyani "X soat Y daqiqa qoldi" ko'rinishiga o'giradi
function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return "HOZIR";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0 && m > 0) return `${h} soat ${m} daq qoldi`;
  if (h > 0) return `${h} soat qoldi`;
  if (m > 0) return `${m} daq qoldi`;
  return "1 daq qoldi";
}

// ─────────────────────────────
// COMPUTED
// ─────────────────────────────

const todaySchedule = computed(() => scheduleTypeForDate(clockNow.value));
const todayLabel = computed(() => DAY_NAMES[clockNow.value.getDay()]);
const todayDate = computed(() =>
  clockNow.value.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
  }),
);

const todaysGroups = computed(() => {
  if (!todaySchedule.value) return [];
  const filtered = groups.value
    .filter(
      (g) =>
        (g.schedule === todaySchedule.value || g.schedule === "daily") &&
        g.lesson_time,
    )
    .slice();

  // Joriy vaqtni olish
  const nowMin = timeToMinutes(
    `${statusNow.value.getHours()}:${statusNow.value.getMinutes()}`,
  );

  // Qolgan (hali boshlanmagani va hozir) va o'tgan darslarni ajrat
  const upcoming = filtered.filter(
    (g) => timeToMinutes(g.lesson_time) >= nowMin,
  );
  const past = filtered.filter((g) => timeToMinutes(g.lesson_time) < nowMin);

  // Qolganlarni vaqti bo'yicha o'rnat (yaqindan uzoqga)
  upcoming.sort(
    (a, b) => timeToMinutes(a.lesson_time) - timeToMinutes(b.lesson_time),
  );

  // O'tganlarni teskari o'rnat (eng yaqin o'tgan dars yuqorida)
  past.sort(
    (a, b) => timeToMinutes(b.lesson_time) - timeToMinutes(a.lesson_time),
  );

  return [...upcoming, ...past];
});

// ✅ Eng yaqin kelayotgan darsning id'si (vaqtga qarab, indeksga emas)
const nextGroupId = computed(() => {
  const nowMin = timeToMinutes(
    `${statusNow.value.getHours()}:${statusNow.value.getMinutes()}`,
  );
  const upcoming = todaysGroups.value.filter(
    (g) => timeToMinutes(g.lesson_time) >= nowMin,
  );
  return upcoming.length ? upcoming[0].id : null;
});

// ✅ Har bir guruh o'zining haqiqiy vaqti bo'yicha baholanadi
function rowStatus(group) {
  const nowMin = timeToMinutes(
    `${statusNow.value.getHours()}:${statusNow.value.getMinutes()}`,
  );
  const t = timeToMinutes(group.lesson_time);

  if (t < nowMin) return "past";
  if (group.id === nextGroupId.value) return "next";
  return "upcoming";
}

function statusText(group) {
  const status = rowStatus(group);
  if (status === "past") return "Boshlangan";

  const secondsLeft = secondsUntilLesson(group.lesson_time);

  if (status === "next") {
    return secondsLeft > 0 ? formatCountdown(secondsLeft) : "HOZIR";
  }

  // upcoming
  return formatCountdown(secondsLeft);
}

const STATUS_CLASS = {
  past: "bg-slate-800/60 text-slate-500",
  next: "bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.5)]",
  upcoming: "bg-slate-800/80 text-slate-400 border border-slate-700",
};

// ─────────────────────────────
// NEWS
// ─────────────────────────────

const news = ref([]);
const currentNewsIndex = ref(0);
let newsRotateTimer = null;
let newsRefetchTimer = null;
let newsAudioTimer = null;

// Avval ko'rilgan e'lonlar ID'lari — yangisini aniqlash uchun
const seenNewsIds = new Set();
let firstNewsLoad = true;

async function fetchNews() {
  try {
    const res = await fetch(`${API}/news/active/`);
    if (!res.ok) return;
    const data = await res.json();

    if (!firstNewsLoad) {
      // Yangi e'lonlar navbatga qo'yiladi — ovoz popup ko'rsatilganda chiqadi
      const newItems = data.filter((n) => !seenNewsIds.has(n.id));
      newItems.forEach(showNewsPopup);
    }

    data.forEach((n) => seenNewsIds.add(n.id));
    news.value = data;

    // ✅ Agar xabar o'chsa va index chiqib ketsa, uni tuzatish
    if (news.value.length > 0 && currentNewsIndex.value >= news.value.length) {
      currentNewsIndex.value = 0;
    }

    firstNewsLoad = false;
  } catch (e) {
    // jim
  }
}

// ✅ News rotation'ni boshlash
function startNewsRotation() {
  newsRotateTimer = setInterval(() => {
    if (news.value.length > 1) {
      currentNewsIndex.value = (currentNewsIndex.value + 1) % news.value.length;
    }
  }, 6000);
}

// ✅ News rotation'ni to'xtatish va sound tugagandan keyin qayta boshlash
function pauseNewsRotationDuringSound() {
  clearInterval(newsRotateTimer);
  clearInterval(newsAudioTimer);
  // Sound tugagandan keyin (5.2 soniya + buffer), rotation'ni qayta boshlash
  newsAudioTimer = setTimeout(() => {
    startNewsRotation();
  }, 5400);
}

onMounted(() => {
  fetchNews();
  startNewsRotation();
  newsRefetchTimer = setInterval(fetchNews, 10000);
});

onUnmounted(() => {
  clearInterval(newsRotateTimer);
  clearInterval(newsRefetchTimer);
  clearInterval(newsAudioTimer);
  clearTimeout(popupTimer);
});

const PRIORITY_STYLE = {
  urgent: "bg-red-500/10 border-red-500/40 text-red-300",
  important: "bg-amber-400/10 border-amber-400/40 text-amber-300",
  normal: "bg-slate-800/60 border-slate-700 text-slate-300",
};

const PRIORITY_DOT = {
  urgent: "bg-red-400",
  important: "bg-amber-400",
  normal: "bg-slate-500",
};

// ✅ E'lon dotslarini ham qo'lda tanlash mumkin (karusel to'xtab, qaytadan boshlanadi)
function selectNews(idx) {
  currentNewsIndex.value = idx;
  clearInterval(newsRotateTimer);
  startNewsRotation();
}

// ─────────────────────────────
// REYTING (Top 10 o'quvchi — coin bo'yicha)
// Backend /leaderboard/ faqat oddiy o'quvchilarni coin bo'yicha tartiblab beradi
// ─────────────────────────────

const leaderboard = ref([]);
const groupBoard = ref([]);
let leaderboardTimer = null;

async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API}/leaderboard/`);
    if (!res.ok) return;
    leaderboard.value = await res.json();
  } catch (e) {
    // jim
  }
}

// Guruhlar reytingi — o'rtacha coin bo'yicha, ya'ni kichik guruh ham
// katta guruh bilan teng raqobatlashadi
async function fetchGroupBoard() {
  try {
    const res = await fetch(`${API}/leaderboard/groups/?limit=5`);
    if (!res.ok) return;
    groupBoard.value = await res.json();
  } catch (e) {
    // jim
  }
}

const topStudents = computed(() => leaderboard.value.slice(0, 5));
const topGroups = computed(() => groupBoard.value.slice(0, 5));

function rankClass(i) {
  if (i === 0)
    return "bg-amber-400 text-white shadow-[0_0_16px_rgba(251,191,36,0.5)]";
  if (i === 1) return "bg-slate-500 text-slate-900";
  if (i === 2) return "bg-orange-400/90 text-white";
  return "bg-slate-800 text-white";
}

// ─────────────────────────────
// BOARD KARUSEL: jadval (60s) ↔ reyting (30s)
// ⚠️ Bu dars/e'lon popuplariga ta'sir qilmaydi — ular alohida Teleport overlay,
//    o'z navbati/taymeri bilan ishlaydi (showNextPopup / popupQueue).
// ─────────────────────────────

// Aylanma tartib: dars jadvali 1 daqiqa, keyin ikkala reyting 30
// soniyadan. Jadval uzoqroq turadi — kelgan odam avval o'z darsini
// qidiradi, reyting esa qarab turish uchun.
const BOARD_ORDER = ["schedule", "leaderboard", "groups"];
const BOARD_DURATION = { schedule: 60000, leaderboard: 30000, groups: 30000 };

const boardView = ref("schedule");
let boardRotateTimer = null;

function scheduleBoardRotation() {
  clearTimeout(boardRotateTimer);
  boardRotateTimer = setTimeout(() => {
    const i = BOARD_ORDER.indexOf(boardView.value);
    boardView.value = BOARD_ORDER[(i + 1) % BOARD_ORDER.length];
    scheduleBoardRotation();
  }, BOARD_DURATION[boardView.value] ?? 30000);
}

// Sarlavha har ko'rinish uchun alohida
const BOARD_TITLE = {
  schedule: { tag: "DARSLAR TAXTASI", title: "Bugungi jadval" },
  leaderboard: { tag: "REYTING", title: "Top 5 o'quvchi" },
  groups: { tag: "REYTING", title: "Top 5 guruh" },
};

function setBoardView(view) {
  boardView.value = view;
  scheduleBoardRotation(); // qo'lda tanlanganda taymer qaytadan boshlanadi
}

// ─────────────────────────────
// QR KARUSEL: har biri 30s, e'lonlardagidek tanlanadi
// ─────────────────────────────

const QR_ACCENT = {
  sky: {
    ring: "ring-sky-400/40",
    shadow: "shadow-sky-500/20",
    text: "text-sky-300",
    dotOn: "bg-sky-400",
  },
  amber: {
    ring: "ring-amber-400/40",
    shadow: "shadow-amber-500/20",
    text: "text-amber-300",
    dotOn: "bg-amber-400",
  },
};

const qrCards = [
  { id: "telegram", label: "Telegram", img: telegramQrImg, icon: "send", accent: "sky" },
  { id: "website", label: "Veb-sayt", img: itlineWebQrImg, icon: "globe", accent: "amber" },
];

const currentQrIndex = ref(0);
const QR_ROTATE_MS = 30000;
let qrRotateTimer = null;

function startQrRotation() {
  clearInterval(qrRotateTimer);
  qrRotateTimer = setInterval(() => {
    currentQrIndex.value = (currentQrIndex.value + 1) % qrCards.length;
  }, QR_ROTATE_MS);
}

function selectQr(idx) {
  currentQrIndex.value = idx;
  startQrRotation(); // qo'lda tanlanganda taymer qaytadan boshlanadi
}

function refreshBoards() {
  fetchLeaderboard();
  fetchGroupBoard();
}

onMounted(() => {
  refreshBoards();
  leaderboardTimer = setInterval(refreshBoards, 60000);
  scheduleBoardRotation();
  startQrRotation();
});

onUnmounted(() => {
  clearInterval(leaderboardTimer);
  clearTimeout(boardRotateTimer);
  clearInterval(qrRotateTimer);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-r from-[#000000] to-[#130F40] px-4 py-6 sm:py-10">
    <div class="mx-auto flex max-w-[1800px] flex-col items-start gap-5 lg:flex-row lg:gap-6">
      <!-- ══════════ NEWS SIDEBAR ══════════ -->
      <aside class="order-1 w-full shrink-0 lg:sticky lg:top-10 lg:order-2 lg:w-72 2xl:w-80"
        :class="news.length ? '' : 'hidden lg:block'">
        <div
          class="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-black/50 animate-[fadeIn_0.4s_ease]">
          <div v-if="news.length" class="flex items-center gap-2 border-b border-slate-800/80 px-6 py-5">
            <span class="text-amber-400 text-lg">
              <AppIcon name="megaphone" />
            </span>
            <p class="text-sm font-bold tracking-[0.18em] text-amber-400">
              E'LONLAR
            </p>
          </div>

          <div v-if="news.length" class="p-5">
            <div class="rounded-2xl border px-5 py-5 transition-opacity duration-300"
              :class="PRIORITY_STYLE[news[currentNewsIndex].priority]">
              <div class="mb-2.5 flex items-start gap-2.5">
                <span class="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    :class="PRIORITY_DOT[news[currentNewsIndex].priority]"></span>
                  <span class="relative inline-flex h-2.5 w-2.5 rounded-full"
                    :class="PRIORITY_DOT[news[currentNewsIndex].priority]"></span>
                </span>
                <p class="text-xl font-bold leading-snug">
                  {{ news[currentNewsIndex].title }}
                </p>
              </div>
              <p class="whitespace-pre-line text-base leading-relaxed opacity-90">
                {{ news[currentNewsIndex].content }}
              </p>
            </div>

            <!-- Rotatsiya indikatorlari (bosiladi) -->
            <div v-if="news.length > 1" class="mt-3 flex items-center justify-center gap-1.5">
              <button v-for="(n, idx) in news" :key="n.id" type="button" @click="selectNews(idx)"
                :aria-label="`E'lon ${idx + 1}`" class="h-1.5 rounded-full transition-all" :class="idx === currentNewsIndex
                  ? 'w-4 bg-amber-400'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  "></button>
            </div>
          </div>

          <!-- ══════════ QR ULANISH — e'lon bo'lmasa ham ko'rinadi (faqat katta ekran) ══════════ -->
          <div
            class="hidden bg-gradient-to-br from-[#1d2a57] via-[#141a38] to-[#0b1030] px-5 py-6 lg:block"
            :class="news.length ? 'border-t border-white/10' : ''">
            <div class="mb-4 flex items-center justify-center gap-2.5">
              <span class="h-px w-6 bg-gradient-to-r from-transparent to-sky-400/70"></span>
              <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300">
                Biz bilan bog'laning
              </p>
              <span class="h-px w-6 bg-gradient-to-l from-transparent to-amber-400/70"></span>
            </div>

            <!-- Aylanuvchi QR — har biri 30s (e'lonlardagidek tanlanadi).
                 :key almashganda element qayta mount bo'lib, qrIn animatsiyasi
                 o'ynaydi — Vue Transition'siz, shuning uchun fon tab'da ham
                 hech qachon "osilib" qolmaydi. -->
            <div class="flex justify-center">
              <div :key="currentQrIndex"
                class="flex animate-[qrIn_0.4s_ease] flex-col items-center gap-3">
                <div class="w-44 overflow-hidden rounded-2xl bg-white p-2.5 shadow-lg ring-1"
                  :class="[
                    QR_ACCENT[qrCards[currentQrIndex].accent].ring,
                    QR_ACCENT[qrCards[currentQrIndex].accent].shadow,
                  ]">
                  <img :src="qrCards[currentQrIndex].img" :alt="qrCards[currentQrIndex].label + ' QR'"
                    class="aspect-square w-full rounded-xl object-contain" />
                </div>
                <span class="flex items-center gap-1.5 text-sm font-semibold"
                  :class="QR_ACCENT[qrCards[currentQrIndex].accent].text">
                  <AppIcon :name="qrCards[currentQrIndex].icon" class="text-[14px]" />
                  {{ qrCards[currentQrIndex].label }}
                </span>
              </div>
            </div>

            <!-- Tanlash indikatorlari (bosiladi) -->
            <div class="mt-4 flex items-center justify-center gap-2">
              <button v-for="(qr, idx) in qrCards" :key="qr.id" type="button" @click="selectQr(idx)"
                :aria-label="qr.label" class="h-1.5 rounded-full transition-all"
                :class="idx === currentQrIndex
                  ? ['w-5', QR_ACCENT[qr.accent].dotOn]
                  : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                  "></button>
            </div>
          </div>
        </div>
      </aside>
      <!-- ══════════ SCHEDULE BOARD ══════════ -->
      <div
        class="order-2 w-full  min-w-0 border overflow-hidden rounded-2xl  shadow-2xl shadow-black/50 transition-all duration-500 animate-[fadeIn_0.4s_ease] lg:order-1 lg:flex-1"
        :class="visualAlert
          ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.35)] animate-[boardFlash_0.6s_ease-in-out_3]'
          : 'border-slate-800/80'
          ">
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 border-b bg-white/10 px-5 py-5 sm:px-7">
          <div class="flex min-w-0 items-center gap-3">
            <RouterLink to="/groups"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-white transition hover:border-amber-400/60 hover:text-amber-400">
              <AppIcon name="chevron-left" class="w-4 h-4" />
            </RouterLink>
            <div class="min-w-0">
              <p class="text-[10.5px] font-bold tracking-[0.16em] text-amber-400">
                {{ BOARD_TITLE[boardView].tag }}
              </p>
              <h1 class="truncate text-xl font-bold text-white">
                {{ BOARD_TITLE[boardView].title }}
              </h1>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-4">
            <!-- Ovozni yoqish/o'chirish tugmasi -->
            <button type="button" @click="toggleSound"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:border-amber-400/60 hover:text-amber-400"
              :title="soundEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish'">
              <AppIcon name="volume-on" class="w-4 h-4" v-if="soundEnabled" />
              <AppIcon name="volume-off" class="w-4 h-4" v-else />
            </button>

            <div class="text-right">
              <p class="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                {{ todayLabel }} · {{ todayDate }}
              </p>
              <p
                class="font-['Space_Mono',monospace] text-xl font-bold tabular-nums text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
                {{ formatClock(clockNow) }}
              </p>
            </div>
          </div>
        </div>

        <!-- ══════════ KARUSEL TABLARI (jadval ↔ reyting) ══════════ -->
        <div class="flex items-center gap-2 border-b border-slate-800/60 px-5 py-3 sm:px-7">
          <button type="button" @click="setBoardView('schedule')"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition"
            :class="boardView === 'schedule'
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
              : 'text-slate-400 hover:text-amber-400'
              ">
            <AppIcon name="schedule" /> Jadval
          </button>
          <button type="button" @click="setBoardView('leaderboard')"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition"
            :class="boardView === 'leaderboard'
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
              : 'text-slate-400 hover:text-amber-400'
              ">
            <AppIcon name="trophy" /> O'quvchilar
          </button>
          <button type="button" @click="setBoardView('groups')"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition"
            :class="boardView === 'groups'
              ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
              : 'text-slate-400 hover:text-amber-400'
              ">
            <AppIcon name="groups" /> Guruhlar
          </button>
          <span
            class="ml-auto hidden items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-slate-500 sm:flex">
            <span class="relative flex h-1.5 w-1.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60"></span>
              <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            </span>
            Avto almashinuv
          </span>
        </div>

        <!-- ══════════ JADVAL KO'RINISHI ══════════ -->
        <template v-if="boardView === 'schedule'">
        <!-- Column labels (desktop) -->
        <div v-if="!loading && todaysGroups.length"
          class="hidden grid-cols-[84px_1.2fr_84px_2.3fr_1.1fr_60px_124px] gap-2.5 border-b border-slate-800/60  px-5 py-4 text-xs tracking-[0.1em] text-slate-50 sm:grid sm:px-7">
          <span>VAQT</span>
          <span>GURUH</span>
          <span>XONA</span>
          <span>O'QITUVCHI</span>
          <span>KUNLAR</span>
          <span>O'QUVCHI</span>
          <span>HOLAT</span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="px-6 py-16 text-center text-sm text-slate-500">
          <div class="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400">
          </div>
          Yuklanmoqda...
        </div>

        <!-- Error -->
        <div v-else-if="errorMsg" class="px-6 py-16 text-center text-sm text-orange-400">
          {{ errorMsg }}
        </div>

        <!-- Sunday / no schedule -->
        <div v-else-if="!todaySchedule" class="px-6 py-16 text-center text-sm text-slate-500">
          <p class="mb-2 text-3xl">
            <AppIcon name="coffee" />
          </p>
          <p>Bugun dars yo'q — dam olish kuni</p>
        </div>

        <!-- Empty -->
        <div v-else-if="todaysGroups.length === 0" class="px-6 py-16 text-center text-sm text-slate-500">
          <p class="mb-2 text-3xl">
            <AppIcon name="groups" />
          </p>
          <p>Bugunga rejalashtirilgan guruh topilmadi</p>
        </div>

        <!-- Rows -->
        <div v-else class="divide-y divide-slate-800/60">
          <div v-for="(g, i) in todaysGroups" :key="g.id"
            class="animate-[rowIn_0.3s_ease_backwards] px-5 py-5 transition-opacity sm:px-7"
            :class="rowStatus(g) === 'past' ? 'opacity-40' : 'opacity-100'"
            :style="{ animationDelay: `${Math.min(i * 40, 400)}ms` }">
            <!-- Desktop row -->
            <div class="hidden grid-cols-[84px_1.2fr_84px_2.3fr_1.1fr_60px_124px] items-center gap-2.5 sm:grid">
              <span class="font-['Space_Mono',monospace] text-xl font-bold tabular-nums text-slate-100" :class="rowStatus(g) === 'next' &&
                'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                ">
                {{ formatTime(g.lesson_time) }}
              </span>

              <span class="truncate text-base font-semibold text-slate-100">
                {{ g.name }}
              </span>

              <span class="font-['Space_Mono',monospace] text-base text-slate-300">
                {{ g.room || "—" }}
              </span>

              <span class="flex min-w-0 items-center gap-2 text-base text-slate-300">
                <span v-if="g.teacher"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-amber-400">
                  {{ initials(g.teacher.name) }}
                </span>
                <span class="truncate">{{
                  g.teacher?.name || "Biriktirilmagan"
                }}</span>
              </span>

              <span class="text-sm text-slate-400">
                {{ SCHEDULE_LABEL[g.schedule] }}
              </span>

              <span class="font-['Space_Mono',monospace] text-base text-slate-300">
                {{ g.students?.length || 0 }}
              </span>

              <span>
                <span
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.06em]"
                  :class="STATUS_CLASS[rowStatus(g)]">
                  <span v-if="rowStatus(g) === 'next'" class="relative flex h-1.5 w-1.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950/60"></span>
                    <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-slate-950"></span>
                  </span>
                  {{ statusText(g) }}
                </span>
              </span>
            </div>

            <!-- Mobile card -->
            <div class="flex items-center gap-3 sm:hidden">
              <span class="font-['Space_Mono',monospace] text-lg font-bold tabular-nums text-slate-100"
                :class="rowStatus(g) === 'next' && 'text-amber-400'">
                {{ formatTime(g.lesson_time) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-slate-100">
                  {{ g.name }}
                </p>
                <p class="truncate text-[11.5px] text-slate-500">
                  {{ g.room || "Xona yo'q" }} ·
                  {{ g.teacher?.name || "O'qituvchi yo'q" }} ·
                  {{ g.students?.length || 0 }} ta
                </p>
              </div>
              <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tracking-[0.05em]"
                :class="STATUS_CLASS[rowStatus(g)]">
                {{ statusText(g) }}
              </span>
            </div>
          </div>
        </div>
        </template>

        <!-- ══════════ GURUHLAR REYTINGI (Top 5) ══════════ -->
        <template v-else-if="boardView === 'groups'">
          <div v-if="!topGroups.length" class="px-6 py-16 text-center text-sm text-slate-500">
            <p class="mb-2 text-3xl"><AppIcon name="groups" /></p>
            <p>Guruhlar reytingi hozircha bo'sh</p>
          </div>

          <div v-else class="divide-y divide-slate-800/60">
            <div v-for="(g, i) in topGroups" :key="g.group_id"
              class="flex animate-[rowIn_0.3s_ease_backwards] items-center gap-4 px-5 py-4 sm:px-7"
              :class="i === 0 ? 'bg-amber-400/5' : ''"
              :style="{ animationDelay: `${Math.min(i * 45, 450)}ms` }">
              <!-- O'rin -->
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-['Space_Mono',monospace] text-lg font-bold"
                :class="rankClass(i)">
                {{ i + 1 }}
              </span>

              <!-- Guruh nomi va ustoz -->
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-semibold text-slate-100">
                  {{ g.name }}
                </p>
                <p class="truncate text-xs text-slate-500">
                  {{ g.teacher_name || "O'qituvchi yo'q" }} ·
                  {{ g.students_count }} o'quvchi
                </p>
              </div>

              <!-- O'rtacha coin: reyting shu bo'yicha tuzilgan -->
              <span
                class="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1.5 font-['Space_Mono',monospace] text-base font-bold text-amber-300">
                <AppIcon name="coin" /> {{ g.average_coins }}
              </span>
            </div>

            <p class="px-5 py-3 text-center text-[11px] text-slate-600 sm:px-7">
              O'rtacha coin bo'yicha — guruh kattaligi natijaga ta'sir qilmaydi
            </p>
          </div>
        </template>

        <!-- ══════════ O'QUVCHILAR REYTINGI (Top 5) ══════════ -->
        <template v-else>
          <!-- Bo'sh holat -->
          <div v-if="!topStudents.length" class="px-6 py-16 text-center text-sm text-slate-500">
            <p class="mb-2 text-3xl"><AppIcon name="trophy" /></p>
            <p>Reyting hozircha bo'sh</p>
          </div>

          <!-- Ro'yxat -->
          <div v-else class="divide-y divide-slate-800/60">
            <div v-for="(s, i) in topStudents" :key="s.id"
              class="flex animate-[rowIn_0.3s_ease_backwards] items-center gap-4 px-5 py-4 sm:px-7"
              :class="i === 0 ? 'bg-amber-400/5' : ''"
              :style="{ animationDelay: `${Math.min(i * 45, 450)}ms` }">
              <!-- O'rin -->
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-['Space_Mono',monospace] text-lg font-bold"
                :class="rankClass(i)">
                {{ i + 1 }}
              </span>

              <!-- Avatar + ism -->
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-amber-400">
                  {{ initials(`${s.name} ${s.surname}`) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold text-slate-100">
                    {{ s.name }} {{ s.surname }}
                  </p>
                  <p class="truncate text-xs text-slate-500">
                    {{ s.teacher_name || "Biriktirilmagan" }}
                  </p>
                </div>
              </div>

              <!-- Coin -->
              <span
                class="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1.5 font-['Space_Mono',monospace] text-base font-bold text-amber-300">
                <AppIcon name="coin" /> {{ s.coin_balance }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ══════════ POP-UP BILDIRISHNOMA (dars / e'lon) ══════════ -->
    <Teleport to="body">
      <Transition name="popup">
        <div v-if="activePopup" class="popup-overlay" @click.self="closePopup">
          <div class="popup-card" :class="activePopup.kind === 'lesson'
            ? 'popup-lesson'
            : `popup-news popup-${activePopup.priority}`
            ">
            <button type="button" class="popup-close" @click="closePopup" aria-label="Yopish">
              <AppIcon name="x" />
            </button>

            <!-- DARS BOSHLANDI -->
            <template v-if="activePopup.kind === 'lesson'">
              <div class="popup-badge ">
                <span class="popup-badge-icon">
                  <AppIcon name="bell" />
                </span>
                <span>DARS BOSHLANDI</span>
              </div>
              <h2 class="popup-title">{{ activePopup.title }}</h2>
              <div class="popup-chips">
                <div class="popup-chip">
                  <AppIcon name="clock" />
                  <span>{{ activePopup.time }}</span>
                </div>
                <div class="popup-chip">
                  <AppIcon name="room" />
                  <span>{{ activePopup.room || "Xona belgilanmagan" }}</span>
                </div>
                <div class="popup-chip">
                  <AppIcon name="schedule" />
                  <span>{{ activePopup.day }}</span>
                </div>
              </div>
              <p v-if="activePopup.teacher" class="popup-sub">
                <AppIcon name="teacher" /> {{ activePopup.teacher }}
                <span v-if="activePopup.students">· {{ activePopup.students }} o'quvchi</span>
              </p>
            </template>

            <!-- YANGI E'LON -->
            <template v-else>
              <div class="popup-badge">
                <span class="popup-badge-icon">
                  <AppIcon name="megaphone" />
                </span>
                <span>YANGI E'LON</span>
              </div>
              <h2 class="popup-title">{{ activePopup.title }}</h2>
              <p class="popup-content">{{ activePopup.content }}</p>
            </template>

            <!-- Avtomatik yopilish indikatori -->
            <div class="popup-progress">
              <span :key="activePopup.id" class="popup-progress-bar"
                :style="{ animationDuration: POPUP_MS + 'ms' }"></span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap");

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rowIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes boardFlash {

  0%,
  100% {
    box-shadow: 0 0 0 rgba(251, 191, 36, 0);
  }

  50% {
    box-shadow: 0 0 55px rgba(251, 191, 36, 0.55);
  }
}

/* ══════════ QR KARUSEL ALMASHINUVI ══════════ */
@keyframes qrIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ══════════ POP-UP BILDIRISHNOMA ══════════ */
.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(4, 7, 12, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.popup-card {
  position: relative;
  width: 100%;
  max-width: 30rem;
  border-radius: 1.5rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  background: linear-gradient(160deg, #161d28 0%, #0d121a 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow:
    0 24px 70px -12px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(0, 0, 0, 0.3) inset;
  color: #e2e8f0;
  overflow: hidden;
  animation: popupPop 0.42s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.popup-lesson {
  border-color: rgba(251, 191, 36, 0.45);
  box-shadow:
    0 24px 70px -12px rgba(0, 0, 0, 0.75),
    0 0 60px -8px rgba(251, 191, 36, 0.35);
}

.popup-news.popup-normal {
  border-color: rgba(148, 163, 184, 0.35);
}

.popup-news.popup-important {
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow:
    0 24px 70px -12px rgba(0, 0, 0, 0.75),
    0 0 60px -8px rgba(251, 191, 36, 0.28);
}

.popup-news.popup-urgent {
  border-color: rgba(248, 113, 113, 0.55);
  box-shadow:
    0 24px 70px -12px rgba(0, 0, 0, 0.75),
    0 0 60px -8px rgba(248, 113, 113, 0.35);
}

.popup-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  color: #64748b;
  font-size: 1.05rem;
  transition:
    background 0.2s,
    color 0.2s;
}

.popup-close:hover {
  background: rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
}

.popup-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.popup-lesson .popup-badge,
.popup-news.popup-important .popup-badge {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.popup-news.popup-normal .popup-badge {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.popup-news.popup-urgent .popup-badge {
  background: rgba(248, 113, 113, 0.16);
  color: #fca5a5;
}

.popup-badge-icon {
  display: inline-flex;
  font-size: 0.95rem;
  animation: popupRing 1s ease-in-out infinite;
}

.popup-title {
  margin: 0.9rem 0 0;
  font-size: clamp(1.35rem, 5vw, 1.85rem);
  font-weight: 800;
  line-height: 1.15;
  color: #f8fafc;
  word-break: break-word;
}

.popup-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.15rem;
}

.popup-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.9rem;
  border-radius: 0.85rem;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.14);
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

.popup-chip .app-icon {
  color: #fbbf24;
  font-size: 1.05rem;
}

.popup-sub {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.popup-content {
  margin: 0.9rem 0 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #cbd5e1;
  white-space: pre-line;
  word-break: break-word;
}

.popup-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(148, 163, 184, 0.12);
}

.popup-progress-bar {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left;
  background: #fbbf24;
  animation: popupCountdown linear forwards;
}

.popup-news.popup-urgent .popup-progress-bar {
  background: #f87171;
}

.popup-news.popup-normal .popup-progress-bar {
  background: #94a3b8;
}

@keyframes popupCountdown {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

@keyframes popupPop {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes popupRing {

  0%,
  70%,
  100% {
    transform: rotate(0);
  }

  10%,
  30%,
  50% {
    transform: rotate(-12deg);
  }

  20%,
  40%,
  60% {
    transform: rotate(12deg);
  }
}

/* Transition (kirish/chiqish) */
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
