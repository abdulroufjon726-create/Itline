import { API } from "@/config";
import { defineStore } from "pinia";
import { useUiStore } from "./uiStore";

// Backenddagi Student modeliga mos keladi (Teacher emas — coin faqat studentlarda)
// coinStore.ts ichida
interface LeaderboardUser {
  id: number;
  rank: number;
  name: string;
  surname: string;
  teacher_name: string;
  coin_balance: number;
  role: "student" | "teacher" | "admin" | "manager";
}
export type CoinReason =
  | "exam_pass"
  | "homework_done"
  | "homework_missed"
  | "present"
  | "late"
  | "absent"
  | "manual";

function pushAlert(message: string, type: string = "success") {
  window.dispatchEvent(
    new CustomEvent("app-alert", { detail: { message, type } }),
  );
}

export const useCoinStore = defineStore("coin", {
  state: () => ({
    users: [] as LeaderboardUser[],
    _lastFetched: 0 as number,
  }),
  getters: {
    // Backend allaqachon coin bo'yicha tartiblab, rank biriktirib beradi
    leaderboard: (state) => state.users,
    topN: (state) => (n: number) => state.users.slice(0, n),
  },
  actions: {
    // Reyting ro'yxatini /leaderboard/ orqali oladi (Student.objects, coin bo'yicha tartiblangan)
    async fetchUsers(force: boolean = false) {
      const ui = useUiStore();
      const TTL = 60 * 1000; // 60s cache — ortiqcha so'rovlarni oldini olish uchun
      if (
        !force &&
        this._lastFetched &&
        Date.now() - this._lastFetched < TTL &&
        this.users.length
      ) {
        return;
      }
      ui.start();
      try {
        const res = await fetch(`${API}/leaderboard/`);
        if (!res.ok) {
          console.error("CoinStore.fetchUsers non-ok", res.status);
          pushAlert(`Reytingni yuklashda xatolik: ${res.status}`, "error");
          return;
        }
        this.users = await res.json();
        this._lastFetched = Date.now();
      } catch (e) {
        console.error("CoinStore.fetchUsers", e);
        pushAlert("Reytingni yuklashda server xatosi", "error");
      } finally {
        ui.stop();
      }
    },

    findUser(id: number) {
      return this.users.find((u) => u.id === id) || null;
    },

    // Yagona coin berish funksiyasi — backenddagi /coins/give/ bilan to'g'ridan-to'g'ri mos.
    // Backend javobidagi haqiqiy balansni qaytaradi (optimistik hisoblamaymiz).
    async giveCoins(
      studentId: number,
      reason: CoinReason,
      amount?: number,
      note?: string,
      teacherId?: number,
    ) {
      const ui = useUiStore();
      ui.start();
      try {
        const res = await fetch(`${API}/coins/give/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            teacher_id:
              teacherId ??
              JSON.parse(localStorage.getItem("user") || "{}").teacher_id,
            reason,
            amount,
            note,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          pushAlert(data.error || "Coin berishda xatolik", "error");
          return null;
        }

        // Lokal ro'yxatdagi balansni backend qaytargan haqiqiy son bilan yangilaymiz
        const u = this.findUser(studentId);
        if (u) u.coin_balance = data.coin_balance;

        return data.coins as number;
      } catch (e) {
        console.error("CoinStore.giveCoins", e);
        pushAlert("Server bilan aloqa yo\u02bbq", "error");
        return null;
      } finally {
        ui.stop();
      }
    },
    async applyTask(studentId: number, done: boolean, teacherId?: number) {
      return this.giveCoins(
        studentId,
        done ? "homework_done" : "homework_missed",
        undefined,
        undefined,
        teacherId,
      );
    },

    async applyExam(studentId: number, passed: boolean, teacherId?: number) {
      if (!passed) {
        return this.giveCoins(
          studentId,
          "manual",
          0,
          "Imtihondan o\u02bbtmadi",
          teacherId,
        );
      }
      // Bitta so'rov — backendda EXAM_PASS_COINS = 80 sifatida belgilangan
      return this.giveCoins(
        studentId,
        "exam_pass",
        undefined,
        undefined,
        teacherId,
      );
    },

    async referral(studentId: number, teacherId?: number) {
      return this.giveCoins(
        studentId,
        "manual",
        100,
        "Referral bonusi",
        teacherId,
      );
    },
  },
});
