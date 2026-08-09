// Sana oralig'i bilan ishlash — DateRange komponenti va uni o'qiydigan
// sahifalar orasidagi umumiy kelishuv.

/** Bo'sh chetlar so'rovga qo'shilmaydi — backend ularni "cheklovsiz" deb biladi. */
export function rangeParams(range, params = new URLSearchParams()) {
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  return params;
}

/** Joriy oy — ko'p sahifalar shundan boshlanadi. */
export function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${last}` };
}

export function emptyRange() {
  return { from: "", to: "" };
}

/** "2026-08-10 — 2026-08-20" ko'rinishidagi qisqa yozuv (sarlavhalar uchun). */
export function rangeLabel(range) {
  if (!range?.from && !range?.to) return "Butun davr";
  if (range.from && range.to) return `${range.from} — ${range.to}`;
  return range.from ? `${range.from} dan` : `${range.to} gacha`;
}
