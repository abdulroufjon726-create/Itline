<template>
    <div class="p-6">
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900">Kurslar</h1>
            <p class="text-gray-400 mt-1">Kurs narxlarini belgilash va kursga oid to'lov ma'lumotlarini boshqarish</p>
        </div>

        <!-- ══════════ KURSLAR (narx shu yerda belgilanadi) ══════════ -->
        <div class="mb-8">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold text-gray-900">Kurslar</h2>
                <button @click="openCreateCourseModal"
                    class="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-medium transition">
                    + Yangi kurs qo'shish
                </button>
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-400">
                        <tr>
                            <th class="px-4 py-2 font-medium">Kurs nomi</th>
                            <th class="px-4 py-2 font-medium">Oylik summa</th>
                            <th class="px-4 py-2 font-medium">Guruhlar</th>
                            <th class="px-4 py-2 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loadingCourses">
                            <td colspan="4" class="px-4 py-6 text-center text-gray-400">Yuklanmoqda...</td>
                        </tr>
                        <tr v-else-if="courses.length === 0">
                            <td colspan="4" class="px-4 py-6 text-center text-gray-400">Hozircha kurs yo'q</td>
                        </tr>
                        <tr v-for="c in courses" :key="c.id" class="border-t border-gray-100">
                            <td class="px-4 py-3 font-medium text-gray-900">{{ c.name }}</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <input type="number" v-model.number="c.monthly_fee" @change="updateCourseFee(c)"
                                        class="w-28 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                                    <span v-if="c.saving" class="text-xs text-gray-400">saqlanmoqda...</span>
                                    <span v-else-if="c.saved" class="text-xs text-green-600">saqlandi</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-gray-500">{{ c.groups_count ?? 0 }} ta</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2 justify-end">
                                    <button @click="toggleLevels(c)"
                                        class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer">
                                        Darajalar<span v-if="c.levels_count"> ({{ c.levels_count }})</span>
                                    </button>
                                    <button @click="removeCourse(c)"
                                        class="text-sm px-3 py-1.5 rounded-lg border border-red-300/30 hover:bg-red-500/50 text-red-500 cursor-pointer">
                                        O'chirish
                                    </button>
                                </div>
                            </td>
                        </tr>

                        <!-- Kurs darajalari: narxi bo'lsa kurs narxidan ustun turadi -->
                        <tr v-if="openLevelsFor === c.id" class="border-t border-gray-100 bg-gray-50/60">
                            <td colspan="4" class="px-4 py-3">
                                <p class="text-xs text-gray-400 mb-2">
                                    Daraja narxi 0 bo'lsa kursning umumiy narxi ishlatiladi.
                                    Narx o'zgarsa keyingi oylarning to'lovlari avtomatik yangilanadi.
                                </p>

                                <div v-for="l in (c.levels || [])" :key="l.id"
                                    class="flex flex-wrap items-center gap-2 py-1.5">
                                    <input v-model="l.name" @change="saveLevel(c, l)"
                                        class="w-40 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                                    <input type="number" v-model.number="l.monthly_fee" @change="saveLevel(c, l)"
                                        placeholder="0 = kurs narxi"
                                        class="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                                    <span class="text-xs text-gray-400">
                                        amaldagi: {{ formatSum(l.effective_fee) }} so'm · {{ l.groups_count ?? 0 }} guruh
                                    </span>
                                    <button @click="removeLevel(c, l)"
                                        class="text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer ml-auto">
                                        O'chirish
                                    </button>
                                </div>

                                <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 mt-2">
                                    <input v-model="levelDraft.name" placeholder="Daraja nomi (Beginner, A1...)"
                                        class="w-48 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                                    <input type="number" v-model.number="levelDraft.monthly_fee" placeholder="Narx (ixtiyoriy)"
                                        class="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                                    <button @click="addLevel(c)" :disabled="!levelDraft.name.trim() || levelBusy"
                                        class="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 cursor-pointer">
                                        Daraja qo'shish
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ══════════ XONALAR ══════════ -->
        <div class="bg-white rounded-2xl border border-gray-100 mt-6">
            <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 class="font-semibold text-gray-900">Xonalar</h2>
                    <p class="text-xs text-gray-400 mt-0.5">
                        Guruh ochilganda xona ro'yxatdan tanlanadi — bir vaqtda bir xonaga
                        ikki guruh qo'yilsa ogohlantiriladi.
                    </p>
                </div>
            </div>

            <div class="p-4 space-y-2">
                <div v-for="r in rooms" :key="r.id" class="flex flex-wrap items-center gap-2">
                    <input v-model="r.name" @change="saveRoom(r)"
                        class="w-40 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                    <input type="number" v-model.number="r.capacity" @change="saveRoom(r)" placeholder="Sig'imi"
                        class="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                    <span class="text-xs text-gray-400">{{ r.groups_count ?? 0 }} guruh</span>
                    <button @click="removeRoom(r)"
                        class="text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer ml-auto">
                        O'chirish
                    </button>
                </div>
                <p v-if="!rooms.length" class="text-sm text-gray-400 py-2">Hozircha xona yo'q</p>

                <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                    <input v-model="roomDraft.name" placeholder="Xona nomi (204-xona)"
                        class="w-48 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                    <input type="number" v-model.number="roomDraft.capacity" placeholder="Sig'imi"
                        class="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                    <button @click="addRoom" :disabled="!roomDraft.name.trim() || roomBusy"
                        class="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 cursor-pointer">
                        Xona qo'shish
                    </button>
                </div>
            </div>
        </div>



        <!-- Statistika kartalari olib tashlandi -->

        <!-- Guruhlar ko'rsatilmaydi; sahifa faqat kurslarga oid ma'lumotlarni beradi -->

        <!-- MODAL: Yangi kurs qo'shish -->
        <div v-if="showCreateCourseModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl w-full max-w-md p-6">
                <h2 class="text-lg font-bold text-gray-900 mb-4">Yangi kurs qo'shish</h2>

                <label class="block text-sm text-gray-400 mb-1">Kurs nomi</label>
                <input v-model="createCourseForm.name" type="text" placeholder="Masalan: Matematika"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />

                <label class="block text-sm text-gray-400 mb-1">Oylik summa (so'm)</label>
                <input v-model.number="createCourseForm.monthly_fee" type="number" placeholder="600000"
                    class="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />

                <div class="flex justify-end gap-3">
                    <button @click="showCreateCourseModal = false"
                        class="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-50">
                        Bekor qilish
                    </button>
                    <button @click="createCourse" :disabled="creatingCourse"
                        class="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50">
                        {{ creatingCourse ? 'Saqlanmoqda...' : 'Yaratish' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Guruh bilan bog'liq modallar olib tashlandi; sahifa faqat kurslar bilan ishlaydi -->
    </div>
</template>

<script setup>
/*
  Haqiqiy backend (urls.py + views.py) bilan mos endpoint'lar:

    Kurslar:
      GET    /api/courses/                  -> kurslar ro'yxati
      POST   /api/courses/create/           -> { name, monthly_fee }
      PATCH  /api/courses/update/<id>/      -> { name?, monthly_fee? }   <-- PATCH, PUT emas!
      DELETE /api/courses/delete/<id>/

    Guruhlar:
      GET    /api/groups/                   -> guruhlar ro'yxati (course_name, monthly_fee, teacher_name, students_count bilan)
      GET    /api/groups/<id>/               -> bitta guruh
      POST   /api/groups/create/             -> { name, teacher_id, course_id, lesson_time, room, schedule, students? }
      PATCH  /api/groups/update/<id>/        -> { name?, teacher_id?, course_id?, lesson_time?, room?, schedule?, students? }  <-- PATCH!
      DELETE /api/groups/delete/<id>/

    O'quvchilar:
      GET    /api/students/                  -> hammasi (group_id bo'yicha frontendda filtrlanadi)
      PATCH  /api/students/update/<id>/      -> { group: id }   -- agar sizning backendingizda boshqa metod bo'lsa (masalan PUT),
                                                  shu yerdagi savePaymentRow/addSelectedStudents ichidagi methodni moslang

  MUHIM: GroupSerializer sizda faqat students_count qaytaradi, students ro'yxatini emas.
  Shu sabab guruh ichidagi o'quvchilar ro'yxati /api/students/ dan olinib, group_id bo'yicha
  frontendda filtrlanadi (backend GroupSerializer'ga nested "students" qo'shsangiz, buni ham
  to'g'ridan-to'g'ri API javobidan olib, filtrlashni olib tashlash mumkin).
*/
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { authHeaders } from "@/utils/managerApi";

const API_BASE = "https://itline-django-9s85.onrender.com/api";

const courses = ref([]);
const groups = ref([]);
const teachers = ref([]);
const students = ref([]);

const loadingCourses = ref(false);
const loadingGroups = ref(false);
const selectedTeacher = ref("");

const showCreateCourseModal = ref(false);
const creatingCourse = ref(false);
const createCourseForm = ref({ name: "", monthly_fee: null });

const showCreateGroupModal = ref(false);
const creatingGroup = ref(false);
const createGroupForm = ref({
    name: "",
    course_id: "",
    teacher_id: "",
    lesson_time: "09:00",
    room: "",
    schedule: "odd",
});

const showGroupModal = ref(false);
const activeGroup = ref(null);

const showAddStudentModal = ref(false);
const addingStudents = ref(false);
const studentSearch = ref("");
const selectedStudentIds = ref([]);

function formatSum(n) {
    const val = Number(n) || 0;
    return val.toLocaleString("ru-RU");
}

const filteredGroups = computed(() => {
    if (!selectedTeacher.value) return groups.value;
    return groups.value.filter((g) => g.teacher === selectedTeacher.value || g.teacher_id === selectedTeacher.value);
});

// bitta guruhga tegishli o'quvchilar - Student.group FK orqali frontendda filtrlanadi
function groupStudentsList(group) {
    return students.value.filter((s) => s.group === group.id || s.group_id === group.id);
}

// stats removed — page focuses on courses only

const filteredStudentsToAdd = computed(() => {
    const q = studentSearch.value.trim().toLowerCase();
    return students.value.filter((s) => {
        const inGroup = s.group === activeGroup.value?.id || s.group_id === activeGroup.value?.id;
        if (inGroup) return false;
        if (!q) return true;
        return `${s.name} ${s.surname}`.toLowerCase().includes(q) || (s.phone || "").includes(q);
    });
});

// ── Kurslar ──
async function loadCourses() {
    loadingCourses.value = true;
    try {
        const { data } = await axios.get(`${API_BASE}/courses/`);
        courses.value = (data || []).map((c) => ({ ...c, saving: false, saved: false }));
    } catch (e) {
        console.error("Kurslarni yuklashda xatolik:", e);
    } finally {
        loadingCourses.value = false;
    }
}

function openCreateCourseModal() {
    createCourseForm.value = { name: "", monthly_fee: null };
    showCreateCourseModal.value = true;
}

async function createCourse() {
    if (!createCourseForm.value.name) return;
    creatingCourse.value = true;
    try {
        await axios.post(`${API_BASE}/courses/create/`, createCourseForm.value);
        showCreateCourseModal.value = false;
        await loadCourses();
    } catch (e) {
        console.error("Kurs yaratishda xatolik:", e);
    } finally {
        creatingCourse.value = false;
    }
}

async function updateCourseFee(course) {
    course.saving = true;
    course.saved = false;
    try {
        await axios.patch(`${API_BASE}/courses/update/${course.id}/`, { monthly_fee: course.monthly_fee });
        course.saved = true;
        setTimeout(() => (course.saved = false), 2000);
        await loadGroups(); // guruhlar jadvalidagi "Oylik summa" ustuni ham yangilansin
    } catch (e) {
        console.error("Kurs narxini yangilashda xatolik:", e);
    } finally {
        course.saving = false;
    }
}

async function removeCourse(course) {
    if (!confirm(`"${course.name}" kursini o'chirishga ishonchingiz komilmi?`)) return;
    try {
        await axios.delete(`${API_BASE}/courses/delete/${course.id}/`);
        await loadCourses();
    } catch (e) {
        console.error("Kursni o'chirishda xatolik (unga bog'langan guruhlar bo'lishi mumkin):", e);
        alert("Kursni o'chirib bo'lmadi. Unga bog'langan guruhlar bo'lishi mumkin.");
    }
}

// ── Kurs darajalari ──
// Daraja narxi kurs narxidan ustun turadi: bitta kursning "Beginner" va
// "Advanced" guruhlari har xil turishi mumkin. Narx 0 bo'lsa kursniki.

const openLevelsFor = ref(null);
const levelDraft = ref({ name: "", monthly_fee: null });
const levelBusy = ref(false);

function toggleLevels(course) {
    openLevelsFor.value = openLevelsFor.value === course.id ? null : course.id;
    levelDraft.value = { name: "", monthly_fee: null };
}

async function addLevel(course) {
    if (!levelDraft.value.name.trim()) return;
    levelBusy.value = true;
    try {
        await axios.post(`${API_BASE}/courses/${course.id}/levels/create/`, {
            name: levelDraft.value.name.trim(),
            monthly_fee: levelDraft.value.monthly_fee || 0,
        }, { headers: authHeaders() });
        levelDraft.value = { name: "", monthly_fee: null };
        await loadCourses();
        openLevelsFor.value = course.id;
    } catch (e) {
        alert(e?.response?.data?.error || "Daraja qo'shilmadi");
    } finally {
        levelBusy.value = false;
    }
}

async function saveLevel(course, level) {
    try {
        await axios.patch(`${API_BASE}/course-levels/${level.id}/update/`, {
            name: level.name,
            monthly_fee: level.monthly_fee || 0,
        }, { headers: authHeaders() });
        await loadCourses();
        openLevelsFor.value = course.id;
    } catch (e) {
        alert(e?.response?.data?.error || "Daraja saqlanmadi");
        await loadCourses();
    }
}

async function removeLevel(course, level) {
    if (!confirm(`"${level.name}" darajasi o'chiriladi. Guruhlar saqlanadi.`)) return;
    try {
        await axios.delete(`${API_BASE}/course-levels/${level.id}/delete/`, {
            headers: authHeaders(),
        });
        await loadCourses();
        openLevelsFor.value = course.id;
    } catch (e) {
        alert(e?.response?.data?.error || "Daraja o'chirilmadi");
    }
}

// ── Xonalar ──

const rooms = ref([]);
const roomDraft = ref({ name: "", capacity: null });
const roomBusy = ref(false);

async function loadRooms() {
    try {
        const { data } = await axios.get(`${API_BASE}/rooms/`, { headers: authHeaders() });
        rooms.value = data || [];
    } catch (e) {
        console.error("Xonalarni yuklashda xatolik:", e);
    }
}

async function addRoom() {
    if (!roomDraft.value.name.trim()) return;
    roomBusy.value = true;
    try {
        await axios.post(`${API_BASE}/rooms/create/`, {
            name: roomDraft.value.name.trim(),
            capacity: roomDraft.value.capacity || 0,
        }, { headers: authHeaders() });
        roomDraft.value = { name: "", capacity: null };
        await loadRooms();
    } catch (e) {
        alert(e?.response?.data?.error || "Xona qo'shilmadi");
    } finally {
        roomBusy.value = false;
    }
}

async function saveRoom(room) {
    try {
        await axios.patch(`${API_BASE}/rooms/${room.id}/update/`, {
            name: room.name,
            capacity: room.capacity || 0,
        }, { headers: authHeaders() });
        await loadRooms();
    } catch (e) {
        alert(e?.response?.data?.error || "Xona saqlanmadi");
        await loadRooms();
    }
}

async function removeRoom(room) {
    if (!confirm(`"${room.name}" xonasi o'chiriladi. Guruhlar xonasiz qoladi.`)) return;
    try {
        await axios.delete(`${API_BASE}/rooms/${room.id}/delete/`, { headers: authHeaders() });
        await loadRooms();
    } catch (e) {
        alert(e?.response?.data?.error || "Xona o'chirilmadi");
    }
}

// ── Guruhlar ──
async function loadGroups() {
    loadingGroups.value = true;
    try {
        const { data } = await axios.get(`${API_BASE}/groups/`);
        groups.value = (data || []).map((g) => ({
            ...g,
            students: g.students?.length
                ? g.students.map((s) => (typeof s === 'number' ? { id: s } : s))
                : (students.value || []).filter((s) => s.group === g.id || s.group_id === g.id),
        }));
    } catch (e) {
        console.error("Guruhlarni yuklashda xatolik:", e);
    } finally {
        loadingGroups.value = false;
    }
}

async function loadTeachers() {
    try {
        const { data } = await axios.get(`${API_BASE}/teachers/`);
        teachers.value = data || [];
    } catch (e) {
        console.error("O'qituvchilarni yuklashda xatolik:", e);
    }
}

async function loadStudents() {
    try {
        const { data } = await axios.get(`${API_BASE}/students/`);
        students.value = data || [];
    } catch (e) {
        console.error("O'quvchilarni yuklashda xatolik:", e);
    }
}

function openCreateGroupModal() {
    createGroupForm.value = {
        name: "",
        course_id: "",
        teacher_id: "",
        lesson_time: "09:00",
        room: "",
        schedule: "odd",
    };
    showCreateGroupModal.value = true;
}

async function createGroup() {
    if (!createGroupForm.value.name || !createGroupForm.value.course_id || !createGroupForm.value.teacher_id) return;
    creatingGroup.value = true;
    try {
        await axios.post(`${API_BASE}/groups/create/`, createGroupForm.value);
        showCreateGroupModal.value = false;
        await loadGroups();
    } catch (e) {
        console.error("Guruh yaratishda xatolik:", e);
    } finally {
        creatingGroup.value = false;
    }
}

async function removeGroup(group) {
    if (!confirm(`"${group.name}" guruhini o'chirishga ishonchingiz komilmi?`)) return;
    try {
        await axios.delete(`${API_BASE}/groups/delete/${group.id}/`);
        await loadGroups();
    } catch (e) {
        console.error("Guruhni o'chirishda xatolik:", e);
    }
}

function openGroupModal(group) {
    activeGroup.value = group;
    showGroupModal.value = true;
}

function openAddStudentModal(group) {
    activeGroup.value = group;
    studentSearch.value = "";
    selectedStudentIds.value = [];
    showAddStudentModal.value = true;
}

async function addSelectedStudents() {
    addingStudents.value = true;
    try {
        // Prefer updating the group with the students array (backend expects students list on group update)
        const existing = activeGroup.value?.students?.map((s) => (s.id ? s.id : s)) ||
            (students.value?.length
                ? students.value.filter((s) => s.group === activeGroup.value.id || s.group_id === activeGroup.value.id).map((s) => s.id)
                : []);
        const payloadStudents = Array.from(new Set([...existing, ...selectedStudentIds.value]));
        const url = `${API_BASE}/groups/update/${activeGroup.value.id}/`;
        const attemptBodies = [
            { students: payloadStudents },
            { students_ids: payloadStudents },
            { student_ids: payloadStudents },
            { students_list: payloadStudents },
        ];

        const attemptErrors = [];
        let succeeded = false;
        for (const body of attemptBodies) {
            try {
                await axios.patch(url, body);
                succeeded = true;
                break;
            } catch (err) {
                attemptErrors.push(err?.response?.data || err.message || String(err));
            }
        }

        if (succeeded) {
            showAddStudentModal.value = false;
            await Promise.all([loadStudents(), loadGroups()]);
            return;
        }
    } catch (e) {
        console.error("O'quvchilarni qo'shishda xatolik:", e);
        // If group update fails, try per-student update as a fallback and surface errors
        const fallbackErrors = [];
        try {
            await Promise.all(
                selectedStudentIds.value.map(async (id) => {
                    try {
                        await axios.patch(`${API_BASE}/students/update/${id}/`, { group: activeGroup.value.id });
                    } catch (err) {
                        fallbackErrors.push({ id, error: err?.response?.data || err.message });
                    }
                }),
            );
            if (fallbackErrors.length === 0) {
                showAddStudentModal.value = false;
                await Promise.all([loadStudents(), loadGroups()]);
                return;
            }
        } catch (inner) {
            console.error('Fallback failed:', inner);
        }

        // Build and show informative alert including all attempt errors and fallback errors
        const serverMsg = e?.response?.data?.error || e?.response?.data || e?.message || String(e);
        let msg = "O'quvchilarni guruhga qo'shishda xatolik.\n\nGroup update attempts returned:\n" + attemptErrors.map((a, i) => `Attempt ${i + 1}: ${JSON.stringify(a)}`).join("\n") + "\n\nPer-student fallback errors:\n" + (fallbackErrors.length ? fallbackErrors.map(fe => `id=${fe.id} -> ${JSON.stringify(fe.error)}`).join('\n') : 'None');
        alert(msg);
    } finally {
        addingStudents.value = false;
    }
}

onMounted(async () => {
    await loadCourses();
    await loadRooms();
    await loadStudents();
    await loadGroups();
    await loadTeachers();
});
</script>