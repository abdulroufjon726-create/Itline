<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "@/components/AppIcon.vue";
import { authHeaders } from "@/utils/managerApi";
const router = useRouter();
const API = "https://itline-django-9s85.onrender.com/api";
const user = JSON.parse(localStorage.getItem("user") || "null");

const hasAccess = ref(false);
const isTeacherOrAdmin =
  user && (user.is_admin || user.is_excellence || user.teacher_id);

if (!user) {
  router.push("/login");
} else if (!isTeacherOrAdmin) {
  console.log("Not allowed to access Groups");
  router.push("/");
} else {
  hasAccess.value = true;
}


// ─────────────────────────────
// STATE
// ─────────────────────────────

const groups = ref([]);
const teachers = ref([]);
const allStudents = ref([]);
const courses = ref([]);
const rooms = ref([]);

// Tanlangan kursning darajalari — kurs almashsa ro'yxat ham almashadi
const courseLevels = computed(() => {
  const course = courses.value.find((c) => c.id === Number(form.value?.course_id));
  return course?.levels || [];
});

const loadingGroups = ref(true);
const savingGroup = ref(false);

// panel: null | 'create' | 'edit' | 'detail'
const panel = ref(null);
const activeGroup = ref(null);
// Detail panelida o'quvchilar ro'yxati default yopiq — foydalanuvchi bosganda ochiladi
const showStudents = ref(false);

const form = ref({
  name: "",
  course_id: null,
  teacher_id: null,
  students: [],
  lesson_time: "09:00",
  room: "",
  schedule: "odd",
  opened_date: "",
});
const studentSearch = ref("");

const avatarColors = [
  { backgroundColor: "#EEEDFE", color: "#3C3489" },
  { backgroundColor: "#E1F5EE", color: "#085041" },
  { backgroundColor: "#FAECE7", color: "#712B13" },
  { backgroundColor: "#E6F1FB", color: "#0C447C" },
  { backgroundColor: "#FAEEDA", color: "#633806" },
];

const SCHEDULE_LABEL = {
  odd: "Du / Chor / Juma",
  even: "Se / Pay / Shan",
  daily: "Har kuni",
};

// ─────────────────────────────
// COMPUTED
// ─────────────────────────────

const searchResults = computed(() => {
  const q = studentSearch.value.trim().toLowerCase();
  if (!q) return [];
  return allStudents.value
    .filter(
      (s) =>
        !form.value.students.includes(s.id) &&
        (`${s.name} ${s.surname}`.toLowerCase().includes(q) ||
          (s.phone || "").includes(q)),
    )
    .slice(0, 8);
});

const selectedStudents = computed(() =>
  allStudents.value.filter((s) => form.value.students.includes(s.id)),
);

// ✅ Faqat admin va excellence guruh qo'sha olishlari mumkin
const canCreateGroup = computed(() => (hasAccess.value = true));

// ─────────────────────────────
// GURUH FILTRI
// Ustoz faqat o'z guruhlarini ko'radi — boshqa ustozning guruhiga
// umuman kira olmaydi (backend ham shu tarzda filtrlaydi).
// Menejer va panel darajasidagi (excellence) foydalanuvchi hammasini
// ko'radi.
// ─────────────────────────────
const canSeeAllGroups = computed(
  () => user?.role === "manager" || !!user?.is_excellence,
);

const showAllTeachers = ref(canSeeAllGroups.value);

const myTeacherId = computed(() => user?.teacher_id ?? null);

// Guruhni qidirish — nom, o'qituvchi yoki xona bo'yicha
const groupSearch = ref("");
// O'qituvchi bo'yicha filter (null = barcha o'qituvchilar)
const filterTeacherId = ref(null);

const visibleGroups = computed(() => {
  let list = groups.value;
  // Ustozga faqat o'z guruhlari. Serverdan ham shundayi keladi, bu
  // yerdagisi qo'shimcha himoya (keshdan eski ma'lumot qolsa ham)
  if (!canSeeAllGroups.value && myTeacherId.value) {
    list = list.filter(
      (g) => (g.teacher?.id ?? g.teacher_id) === myTeacherId.value,
    );
  }
  // O'qituvchi bo'yicha filter (dropdown)
  if (filterTeacherId.value) {
    list = list.filter(
      (g) => (g.teacher?.id ?? g.teacher_id) === filterTeacherId.value,
    );
  }
  const q = groupSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (g) =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.teacher?.name || "").toLowerCase().includes(q) ||
        (g.room || "").toLowerCase().includes(q),
    );
  }
  return list;
});

const myGroupsCount = computed(() => {
  if (!myTeacherId.value) return 0;
  return groups.value.filter(
    (g) => (g.teacher?.id ?? g.teacher_id) === myTeacherId.value,
  ).length;
});

// ─────────────────────────────
// FETCH
// ─────────────────────────────

async function fetchGroups() {
  loadingGroups.value = true;
  try {
    // Sarlavha orqali backend chaqiruvchini aniqlaydi: ustozga faqat
    // o'z guruhlari qaytariladi
    const res = await fetch(`${API}/groups/`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Guruhlarni yuklashda xatolik");
    groups.value = await res.json();

    if (activeGroup.value) {
      activeGroup.value =
        groups.value.find((g) => g.id === activeGroup.value.id) || null;
    }
  } catch (e) {
    console.error("Fetch Groups Error:", e);
  } finally {
    loadingGroups.value = false;
  }
}

async function fetchTeachers() {
  try {
    const res = await fetch(`${API}/teachers/`);
    if (!res.ok) throw new Error("O'qituvchilarni yuklashda xatolik");
    teachers.value = await res.json();
  } catch (e) {
    console.error("Fetch Teachers Error:", e);
  }
}

async function fetchCourses() {
  try {
    const res = await fetch(`${API}/courses/`);
    if (!res.ok) throw new Error("Kurslarni yuklashda xatolik");
    courses.value = await res.json();
  } catch (e) {
    console.error("Fetch Courses Error:", e);
  }
}

async function fetchRooms() {
  try {
    const res = await fetch(`${API}/rooms/`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Xonalarni yuklashda xatolik");
    rooms.value = await res.json();
  } catch (e) {
    console.error("Fetch Rooms Error:", e);
  }
}

function groupCourse(group) {
  if (!group) return null;
  if (group.course && typeof group.course === "object" && group.course.id) {
    return group.course;
  }
  const courseId = group.course_id || group.course?.id || group.course;
  return courses.value.find((c) => c.id === courseId) || null;
}

async function fetchAllStudents() {
  try {
    const res = await fetch(`${API}/students/`);
    if (!res.ok) throw new Error("O'quvchilarni yuklashda xatolik");
    allStudents.value = await res.json();
  } catch (e) {
    console.error("Fetch Students Error:", e);
  }
}

onMounted(async () => {
  await Promise.all([
    fetchGroups(),
    fetchTeachers(),
    fetchAllStudents(),
    fetchCourses(),
    fetchRooms(),
  ]);
  // Normalize groups' students entries to objects with `id` when backend returns numeric IDs
  if (allStudents.value.length && groups.value.length) {
    groups.value = groups.value.map((g) => ({
      ...g,
      students: g.students?.length
        ? g.students.map((s) => (typeof s === "number" ? { id: s } : s))
        : allStudents.value.filter((s) => s.group === g.id || s.group_id === g.id),
    }));
  }
});

// ─────────────────────────────
// PANEL HELPERS
// ─────────────────────────────

function openCreate() {
  if (!canCreateGroup.value) {
    alert("Sizda guruh yaratish ruhsati yo'q");
    return;
  }

  form.value = {
    name: "",
    course_id: null,
    teacher_id: null,
    students: [],
    lesson_time: "09:00",
    room: "",
    room_id: null,
    level_id: null,
    duration_minutes: 90,
    schedule: "odd",
    opened_date: "",
  };
  studentSearch.value = "";
  activeGroup.value = null;
  panel.value = "create";
}

function openEdit(group) {
  // ✅ Ruhsat tekshirish
  if (!canCreateGroup.value) {
    alert("Sizda guruhni tahrirlash ruhsati yo'q");
    return;
  }

  form.value = {
    name: group.name,
    course_id: group.course?.id || group.course_id || null,
    teacher_id: group.teacher?.id || null,
    students: group.students?.map((s) => s.id ?? s) || [],
    lesson_time: group.lesson_time || "09:00",
    room: group.room || "",
    room_id: group.room_ref || null,
    level_id: group.level || null,
    duration_minutes: group.duration_minutes || 90,
    schedule: group.schedule || "odd",
    opened_date: (group.opened_date || "").slice(0, 10),
  };
  studentSearch.value = "";
  activeGroup.value = group;
  panel.value = "edit";
  scrollToTop();
}

// Guruh tanlanganda panelni ko'rish uchun sahifani tepaga scroll qiladi
function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openDetail(group) {
  activeGroup.value = group;
  panel.value = "detail";
  showStudents.value = false; // har safar yopiq holatda ochiladi
  scrollToTop();
}

function closePanel() {
  panel.value = null;
  activeGroup.value = null;
}

// ─────────────────────────────
// STUDENT SEARCH
// ─────────────────────────────

function addStudent(id) {
  if (!form.value.students.includes(id)) form.value.students.push(id);
  studentSearch.value = "";
}

function removeStudent(id) {
  form.value.students = form.value.students.filter((s) => s !== id);
}

// ─────────────────────────────
// CRUD
// ─────────────────────────────

async function saveGroup() {
  if (!form.value.name.trim()) {
    alert("Guruh nomini kiriting");
    return;
  }
  savingGroup.value = true;
  try {
    const isEdit = panel.value === "edit";
    const url = isEdit
      ? `${API}/groups/update/${activeGroup.value.id}/`
      : `${API}/groups/create/`;
    const method = isEdit ? "PATCH" : "POST";

    const payload = {
      name: form.value.name.trim(),
      students: form.value.students,
      lesson_time: form.value.lesson_time,
      room: form.value.room.trim(),
      room_id: form.value.room_id || null,
      level_id: form.value.level_id || null,
      duration_minutes: form.value.duration_minutes || 90,
      schedule: form.value.schedule,
      opened_date: form.value.opened_date || null,
    };

    if (form.value.course_id) {
      payload.course_id = Number(form.value.course_id);
    }

    if (form.value.teacher_id) {
      payload.teacher_id = Number(form.value.teacher_id);
    }

    let res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });

    // Xona band — menejerga kim bandligini aytamiz va baribir saqlash
    // imkonini beramiz (katta zal ikkiga bo'lingan bo'lishi mumkin)
    if (res.status === 409) {
      const d = await res.json().catch(() => ({}));
      const busy = (d.conflicts || [])
        .map((c) => `• ${c.name} — ${c.lesson_time}${c.teacher_name ? ` (${c.teacher_name})` : ""}`)
        .join("\n");
      if (!confirm(`${d.error}\n\n${busy}\n\nBaribir saqlansinmi?`)) return;
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...payload, force: true }),
      });
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || `Xatolik yuz berdi: ${res.status}`);
      return;
    }

    const saved = await res.json().catch(() => null);
    await fetchGroups();

    const id = isEdit ? activeGroup.value?.id : saved?.id || saved?.group?.id;
    const updated = groups.value.find((g) => g.id === id);

    if (updated) openDetail(updated);
    else closePanel();
  } catch (e) {
    alert("Server bilan aloqa yo'q yoki so'rovda xatolik");
  } finally {
    savingGroup.value = false;
  }
}

async function deleteGroup(id) {
  if (!confirm("Guruh o'chiriladi. Davom etasizmi?")) return;

  // Kurs tugagan bo'lsa — studentlarni ham o'chirish imkoniyati
  const withStudents = confirm(
    "Guruhdagi STUDENTLARNI ham butunlay o'chirasizmi?\n\n" +
      "OK — studentlar ham o'chiriladi (kurs tugagan holat).\n" +
      "Bekor qilish — studentlar saqlanadi, faqat guruh o'chadi.\n\n" +
      "Boshqa guruhga ham a'zo studentlar o'chirilmaydi.",
  );

  try {
    const url = `${API}/groups/delete/${id}/${withStudents ? "?with_students=1" : ""}`;
    const res = await fetch(url, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "O'chirishda xatolik");
      return;
    }
    closePanel();
    await fetchGroups();
    alert(
      withStudents
        ? `Guruh va ${d.deleted_students ?? 0} ta student o'chirildi.`
        : "Guruh o'chirildi. Studentlar saqlanib qoldi.",
    );
  } catch (e) {
    alert("Server bilan aloqa yo'q");
  }
}

async function deleteStudent(s) {
  if (
    !confirm(
      `${s.name} ${s.surname || ""} butunlay o'chiriladi (to'lovlari va davomati bilan). Davom etasizmi?`,
    )
  )
    return;
  try {
    const res = await fetch(`${API}/students/delete/${s.id}/`, {
      method: "POST",
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "O'chirishda xatolik");
      return;
    }
    if (activeGroup.value) {
      activeGroup.value.students = (activeGroup.value.students || []).filter(
        (x) => x.id !== s.id,
      );
    }
    fetchGroups();
  } catch (e) {
    alert("Server bilan aloqa yo'q");
  }
}

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function initials(s) {
  return ((s.name?.[0] || "") + (s.surname?.[0] || "")).toUpperCase();
}

function formatSum(n) {
  const val = Number(n) || 0;
  return val.toLocaleString("ru-RU");
}

// ─────────────────────────────
// GURUHGA TELEGRAM XABAR
// ─────────────────────────────

const groupMsg = ref({
  open: false,
  group: null,
  sending: false,
  text: "",
});
const groupMsgResult = ref(null);

function openGroupMsg(group) {
  groupMsgResult.value = null;
  groupMsg.value = {
    open: true,
    group,
    sending: false,
    text:
      "Assalomu alaykum, {ism}!\n" +
      "ITLINE o'quv markazida oylik to'lov muddati yaqinlashmoqda. " +
      "Iltimos, to'lovni o'z vaqtida amalga oshiring. Rahmat! 🙏",
  };
}

async function sendGroupMsg() {
  const m = groupMsg.value;
  if (!m.text.trim() || m.sending || !m.group) return;
  m.sending = true;
  groupMsgResult.value = null;
  try {
    const res = await fetch(`${API}/messages/send-group/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: m.group.id, text: m.text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
    groupMsgResult.value = data;
  } catch (e) {
    groupMsgResult.value = { error: e.message };
  } finally {
    groupMsg.value.sending = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <RouterLink to="/" class="text-gray-400 hover:text-gray-700 transition shrink-0">
            <AppIcon name="arrow-left" class="w-4 h-4" />
          </RouterLink>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-semibold truncate">Guruhlar</h1>
            <p class="text-xs sm:text-sm text-gray-400">
              {{ visibleGroups.length }} ta guruh
              <span v-if="myTeacherId && !showAllTeachers"> — sizniki</span>
            </p>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <RouterLink to="/groups/board"
            class="border border-gray-200 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-gray-100 transition bg-white whitespace-nowrap">
            <AppIcon name="attendance" /> Jadval
          </RouterLink>
          <button v-if="canCreateGroup" @click="openCreate"
            class="cursor-pointer bg-black text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-gray-800 transition whitespace-nowrap">
            + Guruh
          </button>
        </div>
      </div>
      <div class="relative">
        <!-- Groups list — hidden on mobile when panel is open -->
        <div :class="[
          panel ? 'lg:grid lg:grid-cols-5 gap-4' : '',
          'flex flex-col lg:flex lg:flex-row gap-4',
        ]">
          <!-- List column -->
          <div :class="[
            panel ? 'lg:col-span-2' : 'w-full',
            panel ? 'hidden lg:block' : 'block',
          ]">
            <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
              <!-- Guruhni qidirish -->
              <div class="p-3 border-b border-gray-100">
                <div class="relative">
                  <span
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                  >
                    <AppIcon name="search" />
                  </span>
                  <input
                    v-model="groupSearch"
                    type="text"
                    placeholder="Guruh nomi, o'qituvchi yoki xona..."
                    class="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gray-400 transition"
                  />
                </div>
              </div>

              <!-- O'qituvchi bo'yicha filter (ustozga kerak emas) -->
              <div
                v-if="teachers.length && canSeeAllGroups"
                class="p-3 border-b border-gray-100"
              >
                <div class="relative">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                    <AppIcon name="teacher" />
                  </span>
                  <select
                    v-model.number="filterTeacherId"
                    class="w-full appearance-none border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition"
                  >
                    <option :value="null">Barcha o'qituvchilar</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">
                      {{ t.name }}
                    </option>
                  </select>
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                    <AppIcon name="chevron-down" />
                  </span>
                </div>
              </div>

              <!--
                Guruh filtri: o'zimniki / barcha ustozlar.
                Oddiy ustozga bu tanlov ko'rsatilmaydi — u faqat o'z
                guruhlarini ko'radi.
              -->
              <div
                v-if="myTeacherId && canSeeAllGroups"
                class="flex gap-2 p-3 border-b border-gray-100"
              >
                <button
                  @click="showAllTeachers = false"
                  :class="[
                    'flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm transition border',
                    !showAllTeachers
                      ? 'bg-black text-white border-black'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  ]"
                >
                  <AppIcon name="user" /> Mening guruhlarim
                  <span class="opacity-60">({{ myGroupsCount }})</span>
                </button>
                <button
                  @click="showAllTeachers = true"
                  :class="[
                    'flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm transition border',
                    showAllTeachers
                      ? 'bg-black text-white border-black'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  ]"
                >
                  <AppIcon name="groups" /> Barcha ustozlar
                  <span class="opacity-60">({{ groups.length }})</span>
                </button>
              </div>

              <div v-if="loadingGroups" class="text-center py-12 text-gray-400 text-sm">
                Yuklanmoqda...
              </div>

              <div v-else-if="visibleGroups.length === 0" class="text-center py-12 text-gray-400 text-sm">
                <p class="text-3xl mb-3"><AppIcon name="groups" /></p>
                <template v-if="groupSearch.trim()">
                  <p>«{{ groupSearch }}» bo'yicha guruh topilmadi</p>
                  <button @click="groupSearch = ''" class="mt-4 text-sm text-black underline">
                    Qidiruvni tozalash
                  </button>
                </template>
                <template v-else>
                <p v-if="myTeacherId && !showAllTeachers">
                  Sizga biriktirilgan guruh yo'q
                </p>
                <p v-else>Hozircha guruhlar yo'q</p>
                <button
                  v-if="myTeacherId && !showAllTeachers && canSeeAllGroups && groups.length"
                  @click="showAllTeachers = true"
                  class="mt-4 text-sm text-black underline"
                >
                  Barcha ustozlar guruhini ko'rish
                </button>
                <button v-else-if="canCreateGroup" @click="openCreate" class="mt-4 text-sm text-black underline">
                  Birinchi guruhni yarating
                </button>
                </template>
              </div>

              <div v-else>
                <div v-for="group in visibleGroups" :key="group.id" @click="openDetail(group)" :class="[
                  'px-4 sm:px-5 py-4 border-b border-gray-100 cursor-pointer transition hover:bg-gray-50 last:border-0',
                  activeGroup?.id === group.id && panel === 'detail'
                    ? 'bg-gray-50 border-l-2 border-l-black'
                    : '',
                ]">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-medium text-sm truncate">
                          {{ group.name }}
                        </p>
                        <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                          {{ group.students?.length || 0 }} ta
                        </span>
                        <span v-if="group.schedule"
                          class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                          <AppIcon name="schedule" /> {{ SCHEDULE_LABEL[group.schedule] }}
                        </span>
                        <span v-if="group.room"
                          class="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                          <AppIcon name="room" /> {{ group.room }}
                        </span>
                        <span v-if="group.needs_review"
                          class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shrink-0"
                          :title="group.review_note">
                          <AppIcon name="warning" /> Tekshirilsin
                        </span>
                      </div>
                      <p class="text-xs text-gray-400 mt-0.5 truncate">
                        {{ group.teacher?.name || "O'qituvchi yo'q" }}
                        <span v-if="group.lesson_time">
                          · {{ group.lesson_time.slice(0, 5) }}
                        </span>
                      </p>
                      <p v-if="groupCourse(group)" class="text-xs text-gray-400 mt-1 truncate">
                        Kurs: {{ groupCourse(group).name }} · Oylik: {{ formatSum(groupCourse(group).monthly_fee) }}
                        so'm
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center">
                      <div v-for="(s, i) in (group.students || []).slice(0, 3)" :key="s.id"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white -ml-2 first:ml-0"
                        :style="avatarColors[i % avatarColors.length]" :title="`${s.name} ${s.surname}`">
                        {{ initials(s) }}
                      </div>
                      <span v-if="(group.students?.length || 0) > 3" class="text-xs text-gray-400 ml-2 self-center">
                        +{{ group.students.length - 3 }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel column — full screen on mobile, side panel on desktop -->
          <div v-if="panel" :class="[
            'lg:col-span-3',
            'fixed inset-0 z-40 lg:sticky lg:top-6 lg:self-start lg:inset-auto lg:z-auto',
            'flex flex-col',
          ]">
            <!-- Mobile backdrop -->
            <div class="absolute inset-0 bg-black/20 lg:hidden" @click="closePanel"></div>

            <!-- Panel content -->
            <div
              class="relative mt-auto lg:mt-0 bg-white lg:rounded-2xl shadow-lg lg:shadow-sm rounded-t-3xl max-h-[92dvh] lg:max-h-[calc(100dvh-3rem)] overflow-y-auto p-5">
              <!-- Mobile drag handle -->
              <div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 lg:hidden"></div>

              <!-- DETAIL panel -->
              <template v-if="panel === 'detail' && activeGroup">
                <div class="flex items-start justify-between mb-5">
                  <div class="min-w-0 flex-1 pr-3">
                    <h2 class="text-lg font-semibold truncate">
                      {{ activeGroup.name }}
                    </h2>
                    <p class="text-sm text-gray-400 mt-0.5 truncate">
                      {{
                        activeGroup.teacher?.name ||
                        "O'qituvchi biriktirilmagan"
                      }}
                    </p>
                    <div class="flex items-center gap-2 mt-2 flex-wrap">
                      <span v-if="activeGroup.lesson_time"
                        class="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        <AppIcon name="clock" /> {{ activeGroup.lesson_time.slice(0, 5) }}
                      </span>
                      <span v-if="activeGroup.schedule"
                        class="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        <AppIcon name="schedule" /> {{ SCHEDULE_LABEL[activeGroup.schedule] }}
                      </span>
                      <span class="text-xs px-2.5 py-1 rounded-full" :class="activeGroup.room
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-400'
                        ">
                        <AppIcon name="room" /> {{ activeGroup.room || "Xona belgilanmagan" }}
                      </span>
                      <span v-if="activeGroup.opened_date"
                        class="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                        <AppIcon name="calendar" /> Ochilgan: {{ activeGroup.opened_date.slice(0, 10) }}
                      </span>
                    </div>
                  </div>
                  <button @click="closePanel" class="text-gray-300 hover:text-gray-600 text-2xl leading-none shrink-0">
                    ×
                  </button>
                </div>

                <!-- Import vaqtida jadvalda topilmagan ma'lumot ogohlantirishi -->
                <div v-if="activeGroup.needs_review"
                  class="mb-4 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200">
                  <p class="text-xs font-medium text-orange-700">
                    <AppIcon name="warning" /> {{ activeGroup.review_note || "Ma'lumot to'liq emas" }}
                  </p>
                  <p class="text-xs text-orange-500 mt-0.5">
                    Hozirgi qiymatlar taxminiy. Tahrirlab to'g'ri qiymatni
                    saqlasangiz, bu ogohlantirish yo'qoladi.
                  </p>
                </div>

                <!-- ✅ Tahrirlash va O'chirish tugmalari faqat admin/excellence uchun -->
                <div v-if="canCreateGroup" class="flex gap-2 mb-5">
                  <button @click="openEdit(activeGroup)"
                    class="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
                    <AppIcon name="edit" /> Tahrirlash
                  </button>
                  <button @click="openGroupMsg(activeGroup)"
                    class="flex-1 border border-sky-200 text-sky-600 py-2.5 rounded-xl text-sm hover:bg-sky-50 transition">
                    <AppIcon name="send" /> Xabar
                  </button>
                  <button @click="deleteGroup(activeGroup.id)"
                    class="flex-1 border border-red-100 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50 transition">
                    <AppIcon name="trash" /> O'chirish
                  </button>
                </div>

                <!-- Kurs ma'lumoti -->
                <div class="space-y-3 mb-4">
                  <div v-if="groupCourse(activeGroup)" class="text-sm text-gray-500">
                    <p class="font-medium">Kurs: {{ groupCourse(activeGroup).name }}</p>
                    <p class="text-xs">Oylik: {{ formatSum(groupCourse(activeGroup).monthly_fee) }} so'm</p>
                  </div>
                  <div v-else class="text-sm text-gray-500">Kurs belgilanmagan</div>
                </div>

                <!-- O'quvchilar — default yopiq, bosilganda ochiladi -->
                <button type="button" @click="showStudents = !showStudents"
                  class="flex w-full items-center justify-between gap-2 mb-3 rounded-xl border border-gray-100 px-3.5 py-2.5 text-left transition hover:bg-gray-50">
                  <span class="text-xs text-gray-500 uppercase tracking-wide">
                    O'quvchilar — {{ activeGroup.students?.length || 0 }} ta
                  </span>
                  <span class="flex items-center gap-1 text-xs text-gray-400">
                    {{ showStudents ? "Yopish" : "Ko'rish" }}
                    <span class="transition-transform" :class="showStudents ? 'rotate-180' : ''">
                      <AppIcon name="chevron-down" />
                    </span>
                  </span>
                </button>

                <div v-show="showStudents">
                  <div v-if="activeGroup.students?.length > 0" class="space-y-2">
                    <div v-for="(s, i) in activeGroup.students" :key="s.id"
                      class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                      <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        :style="avatarColors[i % avatarColors.length]">
                        {{ initials(s) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                          {{ s.name }} {{ s.surname }}
                        </p>
                        <p class="text-xs text-gray-400">{{ s.phone }}</p>
                      </div>
                      <button v-if="canCreateGroup" @click.stop="deleteStudent(s)"
                        title="Studentni butunlay o'chirish"
                        class="shrink-0 text-gray-300 hover:text-red-500 transition text-sm px-1.5 py-1 rounded-lg hover:bg-red-50">
                        <AppIcon name="trash" />
                      </button>
                    </div>
                  </div>
                  <div v-else
                    class="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                    Bu guruhda hozircha o'quvchi yo'q
                  </div>
                </div>
              </template>

              <!-- CREATE / EDIT panel -->
              <template v-else-if="panel === 'create' || panel === 'edit'">
                <div class="flex items-center justify-between mb-5">
                  <h2 class="font-semibold">
                    {{
                      panel === "create" ? "Yangi guruh" : "Guruhni tahrirlash"
                    }}
                  </h2>
                  <button @click="closePanel" class="text-gray-300 hover:text-gray-600 text-2xl leading-none">
                    ×
                  </button>
                </div>

                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Guruh nomi</label>
                  <input v-model="form.name" placeholder="Masalan: A-guruh, Django-1, Morning..."
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition" />
                </div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Dars vaqti</label>
                    <input v-model="form.lesson_time" type="time"
                      class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition" />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">
                      Dars davomiyligi
                    </label>
                    <select v-model.number="form.duration_minutes"
                      class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition">
                      <option :value="60">60 daqiqa</option>
                      <option :value="90">90 daqiqa</option>
                      <option :value="120">120 daqiqa</option>
                      <option :value="180">180 daqiqa</option>
                    </select>
                  </div>
                </div>

                <!-- Xona ro'yxatdan tanlanadi: bir vaqtda bir xonaga ikki
                     guruh qo'yilmasligi shu orqali tekshiriladi -->
                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Xona</label>
                  <select v-if="rooms.length" v-model.number="form.room_id"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition">
                    <option :value="null">— Xona tanlanmagan</option>
                    <option v-for="r in rooms" :key="r.id" :value="r.id">
                      {{ r.name }}<span v-if="r.capacity"> · {{ r.capacity }} o'rin</span>
                    </option>
                  </select>
                  <input v-else v-model="form.room" placeholder="204-xona"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition" />
                  <p v-if="!rooms.length" class="text-xs text-gray-400 mt-1.5">
                    Xonalar ro'yxati bo'sh — «Kurslar va narxlar» bo'limidan xona qo'shsangiz,
                    bandlik avtomatik tekshiriladi.
                  </p>
                </div>

                <!-- Guruh ochilgan sana — oylik to'lov shu kundan hisoblanadi -->
                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">
                    Guruh ochilgan sana
                  </label>
                  <input v-model="form.opened_date" type="date"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition" />
                  <p class="text-xs text-gray-400 mt-1.5">
                    Oylik to'lov muddati shu kundan boshlab hisoblanadi
                    (masalan 25-kuni ochilsa — har oy 25-kuni).
                  </p>
                </div>

                <!-- Schedule field -->
                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Dars kunlari</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button type="button" @click="form.schedule = 'odd'" :class="[
                      'py-2.5 rounded-xl text-xs sm:text-sm border transition cursor-pointer',
                      form.schedule === 'odd'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    ]">
                      Du / Chor / Juma
                    </button>
                    <button type="button" @click="form.schedule = 'even'" :class="[
                      'py-2.5 rounded-xl text-xs sm:text-sm border transition cursor-pointer',
                      form.schedule === 'even'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    ]">
                      Se / Pay / Shan
                    </button>
                    <button type="button" @click="form.schedule = 'daily'" :class="[
                      'py-2.5 rounded-xl text-xs sm:text-sm border transition cursor-pointer',
                      form.schedule === 'daily'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    ]">
                      Har kuni
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">
                    Kunlar o'zgarsa, barcha studentlar avtomatik yangilanadi.
                  </p>
                </div>

                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Kurs</label>
                  <select v-model.number="form.course_id"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition">
                    <option :value="null">— Tanlang</option>
                    <option v-for="c in courses" :key="c.id" :value="c.id">
                      {{ c.name }} ({{ formatSum(c.monthly_fee) }} so'm)
                    </option>
                  </select>
                </div>

                <!-- Kurs darajasi — narxi bo'lsa kurs narxidan ustun turadi -->
                <div v-if="courseLevels.length" class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">Daraja</label>
                  <select v-model.number="form.level_id"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition">
                    <option :value="null">— Darajasiz</option>
                    <option v-for="l in courseLevels" :key="l.id" :value="l.id">
                      {{ l.name }} ({{ formatSum(l.effective_fee) }} so'm)
                    </option>
                  </select>
                </div>

                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">O'qituvchi</label>
                  <select v-model.number="form.teacher_id"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white transition">
                    <option :value="null">— Tanlang</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">
                      {{ t.name }}
                    </option>
                  </select>
                </div>

                <div class="mb-4">
                  <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1.5">
                    O'quvchilar
                    <span v-if="selectedStudents.length" class="text-gray-600 normal-case ml-1">
                      ({{ selectedStudents.length }} ta tanlangan)
                    </span>
                  </label>

                  <div class="relative">
                    <!-- autocomplete="off": brauzerning o'z takliflari
                         (avval yozilgan so'zlar) natijalar ro'yxati
                         ustiga tushib, ikkalasini ham o'qib bo'lmasdi -->
                    <input v-model="studentSearch" placeholder="Ism yoki telefon raqam..."
                      autocomplete="off" spellcheck="false"
                      class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition" />
                    <div v-if="searchResults.length > 0"
                      class="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                      <div v-for="s in searchResults" :key="s.id" @click="addStudent(s.id)"
                        class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          :style="avatarColors[s.id % avatarColors.length]">
                          {{ initials(s) }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium truncate">
                            {{ s.name }} {{ s.surname }}
                          </p>
                          <p class="text-xs text-gray-400">{{ s.phone }}</p>
                        </div>
                      </div>
                    </div>
                    <p v-else-if="
                      studentSearch.trim() && searchResults.length === 0
                    "
                      class="absolute w-full mt-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-400 text-center shadow">
                      Topilmadi
                    </p>
                  </div>

                  <div v-if="selectedStudents.length > 0" class="mt-3 space-y-1.5">
                    <div v-for="(s, i) in selectedStudents" :key="s.id"
                      class="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        :style="avatarColors[i % avatarColors.length]">
                        {{ initials(s) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                          {{ s.name }} {{ s.surname }}
                        </p>
                        <p class="text-xs text-gray-400">{{ s.phone }}</p>
                      </div>
                      <button @click="removeStudent(s.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-gray-400 text-sm transition shrink-0">
                        ×
                      </button>
                    </div>
                  </div>
                  <div v-else
                    class="mt-3 text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    Hali o'quvchi tanlanmagan — yuqoridan qidiring
                  </div>
                </div>

                <div
                  class="sticky -bottom-5 -mx-5 mt-2 flex gap-2 border-t border-gray-100 bg-white px-5 pt-3 pb-2">
                  <button @click="saveGroup" :disabled="savingGroup"
                    class="flex-1 bg-black text-white py-2.5 rounded-xl text-sm hover:bg-gray-800 transition disabled:opacity-50">
                    {{
                      savingGroup
                        ? "Saqlanmoqda..."
                        : panel === "create"
                          ? "Guruh yaratish"
                          : "Saqlash"
                    }}
                  </button>
                  <button @click="closePanel"
                    class="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
                    Bekor qilish
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ GURUHGA XABAR MODAL ══════════ -->
    <div v-if="groupMsg.open" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      @click.self="groupMsg.open = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-800">
            <AppIcon name="send" /> «{{ groupMsg.group?.name }}» guruhiga xabar
          </h3>
          <button @click="groupMsg.open = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <p class="text-xs text-gray-400 mb-2">
          Guruhdagi {{ groupMsg.group?.students?.length || 0 }} ta o'quvchiga
          yuboriladi. {ism} — o'quvchi ismi bilan almashtiriladi. Xabar faqat
          botga ulangan o'quvchilarga boradi.
        </p>

        <textarea v-model="groupMsg.text" rows="5"
          class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none"></textarea>

        <div v-if="groupMsgResult" :class="[
          'mt-3 text-sm rounded-xl px-3 py-2',
          groupMsgResult.error
            ? 'bg-red-50 text-red-600'
            : 'bg-green-50 text-green-700',
        ]">
          <template v-if="groupMsgResult.error"><AppIcon name="x-circle" /> {{ groupMsgResult.error }}</template>
          <template v-else-if="groupMsgResult.async">
            <AppIcon name="check-circle" /> {{ groupMsgResult.queued }} ta o'quvchiga yuborilmoqda (fonda).
            {{ groupMsgResult.no_chat }} tasi hali botga ulanmagan.
          </template>
          <template v-else>
            <AppIcon name="check-circle" /> Yuborildi: {{ groupMsgResult.sent }}
            <span v-if="groupMsgResult.no_chat">· Botga ulanmagan: {{ groupMsgResult.no_chat }}</span>
            <span v-if="groupMsgResult.failed">· Xato: {{ groupMsgResult.failed }}</span>
          </template>
        </div>

        <div class="flex gap-2 mt-4">
          <button @click="groupMsg.open = false"
            class="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
            Yopish
          </button>
          <button @click="sendGroupMsg" :disabled="groupMsg.sending || !groupMsg.text.trim()"
            class="flex-1 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 transition disabled:opacity-50">
            {{ groupMsg.sending ? "Yuborilmoqda..." : "Yuborish" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
