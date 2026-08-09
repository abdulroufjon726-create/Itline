// O'quvchining qabul holati — kalitlar backend'dagi Student.STATUS_CHOICES
// bilan bir xil bo'lishi shart.
//
// Faqat "active" haqiqiy o'quvchi hisoblanadi: oylik to'lov faqat shunga
// yaratiladi. Qolgan ikkitasi menejerning ish ro'yxati — kimni kutyapmiz,
// kimga qo'ng'iroq qilish kerak.

export const STUDENT_STATUSES = [
  {
    key: "pending",
    label: "Kutilmoqda",
    chip: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
  {
    key: "contact",
    label: "Bog'lanish kerak",
    chip: "bg-rose-50 text-rose-600",
    dot: "bg-rose-400",
  },
  {
    key: "active",
    label: "Faol",
    chip: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-400",
  },
];

const FALLBACK = {
  key: "",
  label: "—",
  chip: "bg-slate-100 text-slate-500",
  dot: "bg-slate-300",
};

export function statusInfo(key) {
  return STUDENT_STATUSES.find((s) => s.key === key) || FALLBACK;
}

export const statusLabel = (key) => statusInfo(key).label;
