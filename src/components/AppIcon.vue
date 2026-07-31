<script setup>
/**
 * Ilovaning yagona ikonka komponenti (Iconify / Lucide).
 *
 * Ikonkalar build vaqtida SVG sifatida qo'shiladi — ishlash paytida
 * tarmoqqa murojaat qilinmaydi, shuning uchun oflaynda ham ko'rinadi.
 *
 * Ishlatish:
 *   <AppIcon name="users" class="w-4 h-4" />
 *
 * Yangi ikonka kerak bo'lsa: https://icones.js.org/collection/lucide
 * dan nomini topib, quyidagi ro'yxatga qo'shiladi.
 */
import { computed } from "vue";

// ── Navigatsiya / harakatlar ──
import ArrowLeft from "~icons/lucide/arrow-left";
import ArrowRight from "~icons/lucide/arrow-right";
import ArrowUp from "~icons/lucide/arrow-up";
import ArrowDown from "~icons/lucide/arrow-down";
import ChevronDown from "~icons/lucide/chevron-down";
import ChevronLeft from "~icons/lucide/chevron-left";
import ChevronRight from "~icons/lucide/chevron-right";
import X from "~icons/lucide/x";
import Search from "~icons/lucide/search";
import Plus from "~icons/lucide/plus";
import Pencil from "~icons/lucide/pencil";
import Trash from "~icons/lucide/trash-2";
import LogOut from "~icons/lucide/log-out";
import Settings from "~icons/lucide/settings";
import RefreshCw from "~icons/lucide/refresh-cw";
import LoaderCircle from "~icons/lucide/loader-circle";

// ── Holat ──
import Check from "~icons/lucide/check";
import CheckCircle from "~icons/lucide/circle-check-big";
import XCircle from "~icons/lucide/circle-x";
import AlertTriangle from "~icons/lucide/triangle-alert";
import Info from "~icons/lucide/info";

// ── Odamlar / ta'lim ──
import Users from "~icons/lucide/users";
import User from "~icons/lucide/user";
import UserPlus from "~icons/lucide/user-plus";
import GraduationCap from "~icons/lucide/graduation-cap";
import Shield from "~icons/lucide/shield";
import Crown from "~icons/lucide/crown";
import Star from "~icons/lucide/star";

// ── Guruh / jadval ──
import FolderKanban from "~icons/lucide/folder-kanban";
import Calendar from "~icons/lucide/calendar";
import CalendarDays from "~icons/lucide/calendar-days";
import Clock from "~icons/lucide/clock";
import ClipboardList from "~icons/lucide/clipboard-list";
import DoorOpen from "~icons/lucide/door-open";
import BookOpen from "~icons/lucide/book-open";

// ── Moliya / do'kon ──
import CreditCard from "~icons/lucide/credit-card";
import Wallet from "~icons/lucide/wallet";
import Coins from "~icons/lucide/coins";
import Banknote from "~icons/lucide/banknote";
import ShoppingCart from "~icons/lucide/shopping-cart";
import Package from "~icons/lucide/package";
import Gift from "~icons/lucide/gift";
import Briefcase from "~icons/lucide/briefcase";
import ChartColumn from "~icons/lucide/chart-column";
import Receipt from "~icons/lucide/receipt";

// ── Aloqa ──
import Mail from "~icons/lucide/mail";
import Send from "~icons/lucide/send";
import Phone from "~icons/lucide/phone";
import Megaphone from "~icons/lucide/megaphone";
import Newspaper from "~icons/lucide/newspaper";
import Bell from "~icons/lucide/bell";

// ── Boshqa ──
import Trophy from "~icons/lucide/trophy";
import Medal from "~icons/lucide/medal";
import Key from "~icons/lucide/key";
import Palette from "~icons/lucide/palette";
import Sun from "~icons/lucide/sun";
import Moon from "~icons/lucide/moon";
import Database from "~icons/lucide/database";
import Globe from "~icons/lucide/globe";
import Coffee from "~icons/lucide/coffee";
import WifiOff from "~icons/lucide/wifi-off";
import Sparkles from "~icons/lucide/sparkles";
import Eye from "~icons/lucide/eye";
import EyeOff from "~icons/lucide/eye-off";
import Volume2 from "~icons/lucide/volume-2";
import VolumeX from "~icons/lucide/volume-x";
import CircleHelp from "~icons/lucide/circle-help";
import Monitor from "~icons/lucide/monitor";
import Smartphone from "~icons/lucide/smartphone";
import Lock from "~icons/lucide/lock";
import LockOpen from "~icons/lucide/lock-open";
import Ban from "~icons/lucide/ban";

const ICONS = {
  // navigatsiya
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  x: X,
  search: Search,
  plus: Plus,
  edit: Pencil,
  trash: Trash,
  logout: LogOut,
  settings: Settings,
  refresh: RefreshCw,
  spinner: LoaderCircle,
  // holat
  check: Check,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  warning: AlertTriangle,
  info: Info,
  // odamlar
  users: Users,
  user: User,
  "user-plus": UserPlus,
  student: GraduationCap,
  teacher: Shield,
  manager: Crown,
  star: Star,
  // guruh / jadval
  groups: FolderKanban,
  calendar: Calendar,
  schedule: CalendarDays,
  clock: Clock,
  attendance: ClipboardList,
  room: DoorOpen,
  course: BookOpen,
  // moliya
  payment: CreditCard,
  wallet: Wallet,
  coin: Coins,
  money: Banknote,
  shop: ShoppingCart,
  orders: Package,
  gift: Gift,
  briefcase: Briefcase,
  chart: ChartColumn,
  receipt: Receipt,
  // aloqa
  mail: Mail,
  send: Send,
  phone: Phone,
  megaphone: Megaphone,
  news: Newspaper,
  bell: Bell,
  // boshqa
  trophy: Trophy,
  medal: Medal,
  key: Key,
  palette: Palette,
  sun: Sun,
  moon: Moon,
  database: Database,
  globe: Globe,
  coffee: Coffee,
  offline: WifiOff,
  sparkles: Sparkles,
  eye: Eye,
  "eye-off": EyeOff,
  "volume-on": Volume2,
  "volume-off": VolumeX,
  help: CircleHelp,
  monitor: Monitor,
  mobile: Smartphone,
  lock: Lock,
  unlock: LockOpen,
  ban: Ban,
};

const props = defineProps({
  name: { type: String, required: true },
});

const component = computed(() => ICONS[props.name] || null);
</script>

<template>
  <!--
    O'lcham 1em — ya'ni yonidagi matn bilan bir xil. Shu tufayli emoji
    turgan joyga qo'yilganda tartib buzilmaydi. Kerak bo'lsa tashqaridan
    class="w-5 h-5" bilan kattalashtiriladi.
  -->
  <component
    :is="component"
    v-if="component"
    aria-hidden="true"
    class="app-icon"
  />
</template>

<style>
.app-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  vertical-align: -0.125em;
}
</style>
