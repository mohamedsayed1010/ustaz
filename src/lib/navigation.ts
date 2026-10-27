import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { AppRole } from '@/hooks/use-auth'

export interface NavEntry {
  href: string
  icon: LucideIcon
  label: { ar: string; en: string }
  /** `notifications` / `messages` wire this row to a live unread badge. */
  badge?: 'notifications' | 'messages'
  /** Assistants only see rows they hold the permission for. */
  permission?: string
  /** Workspace owner only — no permission grants it, so assistants never see it. */
  ownerOnly?: boolean
}

export interface NavSection {
  title?: { ar: string; en: string }
  items: NavEntry[]
}

const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { href: '/student/dashboard', icon: LayoutDashboard, label: { ar: 'نظرة عامة', en: 'Overview' } },
      { href: '/student/courses', icon: BookOpen, label: { ar: 'كورساتي', en: 'My courses' } },
      { href: '/student/schedule', icon: CalendarDays, label: { ar: 'جدولي', en: 'Schedule' } },
      { href: '/student/calendar', icon: CalendarRange, label: { ar: 'التقويم', en: 'Calendar' } },
    ],
  },
  {
    title: { ar: 'الدراسة', en: 'Study' },
    items: [
      { href: '/student/exams', icon: FileText, label: { ar: 'الامتحانات', en: 'Exams' } },
      { href: '/student/homework', icon: ClipboardCheck, label: { ar: 'الواجبات', en: 'Homework' } },
      { href: '/student/grades', icon: GraduationCap, label: { ar: 'الدرجات', en: 'Grades' } },
      { href: '/student/attendance', icon: CalendarCheck, label: { ar: 'الحضور', en: 'Attendance' } },
      { href: '/student/certificates', icon: Award, label: { ar: 'الشهادات', en: 'Certificates' } },
    ],
  },
  {
    title: { ar: 'حسابي', en: 'Account' },
    items: [
      { href: '/student/payments', icon: Wallet, label: { ar: 'المدفوعات', en: 'Payments' } },
      { href: '/student/favorites', icon: Heart, label: { ar: 'المفضّلة', en: 'Favorites' } },
      { href: '/student/inquiries', icon: HelpCircle, label: { ar: 'طلباتي', en: 'My inquiries' } },
      { href: '/student/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' }, badge: 'messages' },
      { href: '/student/notifications', icon: Bell, label: { ar: 'الإشعارات', en: 'Notifications' }, badge: 'notifications' },
      { href: '/student/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } },
    ],
  },
]

const TEACHER_NAV: NavSection[] = [
  {
    items: [
      { href: '/teacher/dashboard', icon: LayoutDashboard, label: { ar: 'نظرة عامة', en: 'Overview' } },
      { href: '/teacher/analytics', icon: BarChart3, label: { ar: 'التحليلات', en: 'Analytics' }, permission: 'Analytics.View' },
      { href: '/teacher/activity', icon: Activity, label: { ar: 'النشاط', en: 'Activity' }, permission: 'Analytics.View' },
    ],
  },
  {
    title: { ar: 'التدريس', en: 'Teaching' },
    items: [
      { href: '/teacher/groups', icon: Users, label: { ar: 'المجموعات', en: 'Groups' }, permission: 'Groups.View' },
      { href: '/teacher/courses', icon: BookOpen, label: { ar: 'الكورسات', en: 'Courses' }, permission: 'Courses.View' },
      { href: '/teacher/schedule', icon: CalendarDays, label: { ar: 'الجدول', en: 'Schedule' }, permission: 'Schedule.View' },
      { href: '/teacher/calendar', icon: CalendarRange, label: { ar: 'التقويم', en: 'Calendar' }, permission: 'Schedule.View' },
      { href: '/teacher/attendance', icon: ClipboardCheck, label: { ar: 'الحضور', en: 'Attendance' }, permission: 'Attendance.View' },
      { href: '/teacher/exams', icon: FileText, label: { ar: 'الامتحانات', en: 'Exams' }, permission: 'Exams.View' },
      { href: '/teacher/homework', icon: ScrollText, label: { ar: 'الواجبات', en: 'Homework' }, permission: 'Homework.View' },
    ],
  },
  {
    title: { ar: 'الطلاب', en: 'Students' },
    items: [
      { href: '/teacher/students', icon: GraduationCap, label: { ar: 'الطلاب', en: 'Students' }, permission: 'Students.View' },
      { href: '/teacher/announcements', icon: Megaphone, label: { ar: 'الإعلانات', en: 'Announcements' }, permission: 'Announcements.View' },
      { href: '/teacher/certificates', icon: Award, label: { ar: 'الشهادات', en: 'Certificates' } },
      { href: '/teacher/reviews', icon: Star, label: { ar: 'التقييمات', en: 'Reviews' } },
    ],
  },
  {
    title: { ar: 'الأعمال', en: 'Business' },
    items: [
      { href: '/teacher/payments', icon: Wallet, label: { ar: 'المدفوعات', en: 'Payments' }, permission: 'Payments.View' },
      { href: '/teacher/discounts', icon: Tag, label: { ar: 'الخصومات', en: 'Discounts' } },
      { href: '/teacher/billing', icon: CreditCard, label: { ar: 'الاشتراك', en: 'Subscription' } },
      { href: '/teacher/assistants', icon: UserCog, label: { ar: 'المساعدين', en: 'Assistants' } },
      { href: '/teacher/website', icon: Globe, label: { ar: 'الموقع', en: 'Website' }, permission: 'Website.View' },
      { href: '/teacher/audit-log', icon: ScrollText, label: { ar: 'سجل العمليات', en: 'Audit log' }, ownerOnly: true },
    ],
  },
  {
    title: { ar: 'حسابي', en: 'Account' },
    items: [
      { href: '/teacher/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' }, badge: 'messages' },
      { href: '/teacher/notifications', icon: Bell, label: { ar: 'الإشعارات', en: 'Notifications' }, badge: 'notifications' },
      { href: '/teacher/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } },
    ],
  },
]

const PARENT_NAV: NavSection[] = [
  {
    items: [
      { href: '/parent/dashboard', icon: LayoutDashboard, label: { ar: 'نظرة عامة', en: 'Overview' } },
      { href: '/parent/children', icon: Users, label: { ar: 'الأبناء', en: 'Children' } },
      { href: '/parent/calendar', icon: CalendarRange, label: { ar: 'التقويم', en: 'Calendar' } },
      { href: '/parent/announcements', icon: Megaphone, label: { ar: 'الإعلانات', en: 'Announcements' } },
    ],
  },
  {
    title: { ar: 'حسابي', en: 'Account' },
    items: [
      { href: '/parent/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' }, badge: 'messages' },
      { href: '/parent/notifications', icon: Bell, label: { ar: 'الإشعارات', en: 'Notifications' }, badge: 'notifications' },
      { href: '/parent/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } },
    ],
  },
]

const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: { ar: 'نظرة عامة', en: 'Overview' } },
      { href: '/admin/analytics', icon: BarChart3, label: { ar: 'التحليلات', en: 'Analytics' } },
    ],
  },
  {
    title: { ar: 'المنصة', en: 'Platform' },
    items: [
      { href: '/admin/tenants', icon: Building2, label: { ar: 'المنصّات', en: 'Workspaces' } },
      { href: '/admin/users', icon: UserCog, label: { ar: 'كل الحسابات', en: 'All accounts' } },
      { href: '/admin/teachers', icon: GraduationCap, label: { ar: 'المدرّسين', en: 'Teachers' } },
      { href: '/admin/students', icon: Users, label: { ar: 'الطلاب', en: 'Students' } },
      { href: '/admin/courses', icon: BookOpen, label: { ar: 'الكورسات', en: 'Courses' } },
      { href: '/admin/groups', icon: UsersRound, label: { ar: 'المجموعات', en: 'Groups' } },
      { href: '/admin/enrollments', icon: ClipboardCheck, label: { ar: 'الاشتراكات', en: 'Enrollments' } },
    ],
  },
  {
    title: { ar: 'الإدارة', en: 'Operations' },
    items: [
      { href: '/admin/reviews', icon: Star, label: { ar: 'مراجعة التقييمات', en: 'Review moderation' } },
      { href: '/admin/inquiries', icon: MessageSquare, label: { ar: 'الاستفسارات', en: 'Inquiries' } },
      { href: '/admin/plans', icon: CreditCard, label: { ar: 'الباقات', en: 'Plans' } },
      { href: '/admin/discounts', icon: Tag, label: { ar: 'أكواد الخصم', en: 'Discount codes' } },
      { href: '/admin/reports', icon: BarChart3, label: { ar: 'التقارير', en: 'Reports' } },
      { href: '/admin/audit-logs', icon: ShieldCheck, label: { ar: 'سجل العمليات', en: 'Audit log' } },
    ],
  },
  {
    title: { ar: 'حسابي', en: 'Account' },
    items: [
      { href: '/admin/notifications', icon: Bell, label: { ar: 'الإشعارات', en: 'Notifications' }, badge: 'notifications' },
    ],
  },
]

export const ROLE_NAV: Record<AppRole, NavSection[]> = {
  student: STUDENT_NAV,
  teacher: TEACHER_NAV,
  // An assistant works inside the teacher console; permissions trim the rows.
  assistant: TEACHER_NAV,
  parent: PARENT_NAV,
  admin: ADMIN_NAV,
}

/** The four rows promoted to the mobile bottom bar, per role. */
export const MOBILE_PRIMARY: Record<AppRole, string[]> = {
  student: ['/student/dashboard', '/student/courses', '/student/schedule', '/student/homework'],
  teacher: ['/teacher/dashboard', '/teacher/groups', '/teacher/schedule', '/teacher/students'],
  assistant: ['/teacher/dashboard', '/teacher/groups', '/teacher/attendance', '/teacher/homework'],
  parent: ['/parent/dashboard', '/parent/children', '/parent/announcements', '/parent/messages'],
  admin: ['/admin/dashboard', '/admin/tenants', '/admin/teachers', '/admin/reviews'],
}

export const ROLE_LABELS: Record<AppRole, { ar: string; en: string }> = {
  student: { ar: 'لوحة الطالب', en: 'Student console' },
  teacher: { ar: 'لوحة المدرّس', en: 'Teacher console' },
  assistant: { ar: 'لوحة المساعد', en: 'Assistant console' },
  parent: { ar: 'لوحة ولي الأمر', en: 'Parent console' },
  admin: { ar: 'لوحة المنصة', en: 'Platform console' },
}

export const ROLE_ICONS: Record<AppRole, LucideIcon> = {
  student: BookOpen,
  teacher: GraduationCap,
  assistant: UserCog,
  parent: Users,
  admin: ShieldCheck,
}

/**
 * Filters the nav for what this user may actually open. Assistants are limited
 * by their granted permissions; everyone else sees their full console.
 */
export function navFor(
  role: AppRole,
  options: { permissions?: string[]; isAssistant?: boolean } = {},
): NavSection[] {
  const sections = ROLE_NAV[role]
  if (!options.isAssistant) return sections

  const granted = new Set(options.permissions ?? [])
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.ownerOnly && (!item.permission || granted.has(item.permission)),
      ),
    }))
    .filter((section) => section.items.length > 0)
}

/* ------------------------- Notification destinations ------------------------ */

/** Which console a role works in; assistants share the teacher's. */
function areaFor(role: AppRole | null): 'student' | 'teacher' | 'parent' | 'admin' | null {
  if (!role) return null
  return role === 'assistant' ? 'teacher' : role
}

type Area = NonNullable<ReturnType<typeof areaFor>>

/**
 * Backend notification and email links (`ActionUrl` / `CtaPath` in the
 * notification and email catalogs) name resources, not screens — several point
 * at paths this app has never had. Each rule maps one backend shape onto the
 * screen that shows it for the viewer's console. Checked against the router by
 * scripts/audit-api-coverage.mjs.
 */
const NOTIFICATION_ROUTES: [RegExp, (m: RegExpMatchArray, area: Area) => string | null][] = [
  [/^\/$/, () => '/'],
  [/^\/(login|team\/invitations)$/, (m) => `/${m[1]}`],
  [/^\/courses\/([^/]+)$/, (m) => `/courses/${m[1]}`],
  [/^\/announcements\/[^/]+$/, (_, area) =>
    area === 'teacher' || area === 'parent' ? `/${area}/announcements` : `/${area}/dashboard`],
  [/^\/billing(\/.*)?$/, (_, area) => (area === 'teacher' ? '/teacher/billing' : null)],
  [/^\/certificates\/[^/]+$/, (_, area) =>
    area === 'student' || area === 'teacher' ? `/${area}/certificates` : null],
  [/^\/messages\/conversations\/([^/]+)$/, (m, area) =>
    area === 'admin' ? null : `/${area}/messages?conversation=${encodeURIComponent(m[1])}`],
  [/^\/settings(\/.*)?$/, (_, area) => (area === 'admin' ? null : `/${area}/settings`)],
  [/^\/parent\/children\/([^/]+)(\/.*)?$/, (m) => `/parent/children/${m[1]}`],
  [/^\/student\/courses\/([^/]+)\/progress$/, (m) => `/student/courses/${m[1]}`],
  [/^\/student\/enrollments\/groups$/, () => '/student/courses?tab=groups'],
  [/^\/student\/exams\/attempts\/[^/]+$/, () => '/student/exams'],
  [/^\/teacher\/analytics\/students$/, () => '/teacher/students'],
  [/^\/teacher\/courses\/[^/]+$/, () => '/teacher/courses'],
  [/^\/teacher\/exams\/([^/]+)\/attempts$/, (m) => `/teacher/exams/${m[1]}`],
  [/^\/teacher\/groups\/[^/]+$/, () => '/teacher/groups'],
  [/^\/teacher\/homework\/([^/]+)\/submissions$/, (m) => `/teacher/homework/${m[1]}`],
  // Inquiries are triaged on the teacher dashboard.
  [/^\/teacher\/inquiries(\/.*)?$/, () => '/teacher/dashboard'],
  [/^\/teacher\/profile$/, () => '/teacher/settings'],
]

/**
 * The in-app route a notification should open, or the role's notification list
 * when the link has no screen in this console. Unknown links inside the
 * viewer's own console are kept as they are.
 */
export function notificationHref(actionUrl: string | null | undefined, role: AppRole | null): string | null {
  if (!actionUrl) return null
  // Absolute links (reset / verification emails) are not in-app routes.
  if (/^[a-z]+:\/\//i.test(actionUrl)) return actionUrl
  const area = areaFor(role)
  const [pathname, search = ''] = actionUrl.split('?')
  for (const [pattern, to] of NOTIFICATION_ROUTES) {
    const match = pathname.match(pattern)
    if (!match) continue
    if (!area) return pathname === '/' || match[0].startsWith('/courses/') ? actionUrl : null
    const target = to(match, area)
    if (!target) return `/${area}/notifications`
    return search && !target.includes('?') ? `${target}?${search}` : target
  }
  if (area && pathname.startsWith(`/${area}/`)) return actionUrl
  return area ? `/${area}/notifications` : null
}
