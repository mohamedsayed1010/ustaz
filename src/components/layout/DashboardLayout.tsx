import * as React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronsUpDown, LogOut, MoreHorizontal, Settings, UserRound } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { SearchTrigger } from '@/components/search/SearchTrigger'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import { RoleDot } from '@/components/dashboard/kit'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useScrollToTop } from '@/hooks/use-ui'
import { useAuth, ROLE_HOME, type AppRole } from '@/hooks/use-auth'
import { useUnreadCounts } from '@/hooks/use-notifications'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/motion'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import {
  MOBILE_PRIMARY,
  ROLE_LABELS,
  navFor,
  type NavEntry,
  type NavSection,
} from '@/lib/navigation'

/**
 * The console shell shared by every role.
 *
 * Desktop: a quiet 15rem rail (brand, console switcher, grouped navigation)
 * beside a 56px toolbar. Phone and tablet: the rail folds into a bottom tab bar
 * with the role's four most-used places plus "More", which opens the full
 * navigation as a sheet — so nothing is ever more than two taps away.
 *
 * The role colour (teacher orange, student teal, parent navy-slate) appears as
 * a single dot beside the console name. It is the one visual thread that tells
 * a family using all three consoles which side of the loop they are on.
 */
export function DashboardLayout({ role }: { role: AppRole }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const lang: 'ar' | 'en' = locale === 'ar-EG' ? 'ar' : 'en'
  const { user, roles, hasRole, permissions, logout } = useAuth()
  const { toast } = useToast()
  const unread = useUnreadCounts()
  const [moreOpen, setMoreOpen] = React.useState(false)
  useScrollToTop()

  React.useEffect(() => setMoreOpen(false), [location.pathname])

  const isAssistant = role === 'teacher' && hasRole('assistant') && !hasRole('teacher')
  const consoleRole: AppRole = isAssistant ? 'assistant' : role
  const sections = React.useMemo(
    () => navFor(role, { permissions, isAssistant }),
    [role, permissions, isAssistant],
  )
  const flatItems = React.useMemo(() => sections.flatMap((s) => s.items), [sections])
  const mobileItems = MOBILE_PRIMARY[consoleRole]
    .map((href) => flatItems.find((item) => item.href === href))
    .filter((item): item is NavEntry => Boolean(item))
    .slice(0, 4)

  const displayName = user?.displayName?.trim() || user?.firstName || '—'
  const roleLabel = ROLE_LABELS[consoleRole][lang]
  const photo = imageUrl(user?.profileImageUrl)
  const traits = avatarTraitsFor(user?.id ?? 'anonymous')

  /** Other consoles this same account can open. */
  const otherRoles = roles.filter((r) => r !== role && !(r === 'assistant' && role === 'teacher'))

  const badgeFor = (item: NavEntry) =>
    item.badge === 'notifications'
      ? unread.notifications
      : item.badge === 'messages'
        ? unread.messages
        : undefined

  async function handleLogout() {
    await logout()
    toast({ title: t('auth.logoutDone'), variant: 'success' })
    navigate('/login', { replace: true })
  }

  const notificationsHref = flatItems.find((i) => i.badge === 'notifications')?.href ?? '/'
  const settingsHref = `${ROLE_HOME[role].replace('/dashboard', '')}/settings`
  const hasSettings = flatItems.some((i) => i.href === settingsHref)

  /** The page we're on, for the toolbar's context line. */
  const current =
    flatItems.find((i) => location.pathname === i.href) ??
    flatItems
      .filter((i) => location.pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]

  const moreActive = !mobileItems.some((i) => location.pathname.startsWith(i.href))

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-primary-foreground"
      >
        {lang === 'ar' ? 'تخطَّ إلى المحتوى' : 'Skip to content'}
      </a>

      {/* --------------------------- Desktop rail --------------------------- */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-border bg-surface lg:flex">
        <div className="flex h-14 shrink-0 items-center px-4">
          <Link to="/" aria-label={t('common.appName')} className="rounded-md">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <ConsoleSwitcher
            role={consoleRole}
            label={roleLabel}
            otherRoles={otherRoles}
            lang={lang}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label={roleLabel}>
          <NavSections sections={sections} lang={lang} badgeFor={badgeFor} />
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <Link
            to="/"
            className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-caption font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            {t('nav.backToSite')}
            <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </aside>

      {/* ----------------------------- Content column ---------------------------- */}
      <div className="lg:ps-60">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <Link to={ROLE_HOME[role]} className="rounded-md lg:hidden" aria-label={roleLabel}>
              <LogoMark className="size-8" />
            </Link>

            {/* Where you are — the console and the page, on one quiet line. */}
            <div className="hidden min-w-0 items-center gap-2 text-caption md:flex lg:min-w-[10rem]">
              <RoleDot role={consoleRole} />
              <span className="truncate text-muted-foreground">{roleLabel}</span>
              {current && (
                <>
                  <span className="text-muted-foreground/50" aria-hidden>
                    /
                  </span>
                  <span className="truncate font-semibold text-foreground">{current.label[lang]}</span>
                </>
              )}
            </div>

            <div className="ms-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5">
              <SearchTrigger variant="responsive" className="md:max-w-[16rem] xl:max-w-[20rem]" />
              <LanguageToggle className="hidden sm:grid" />
              <ThemeToggle />
              <NotificationCenter allHref={notificationsHref} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={displayName}
                    className="ms-1 rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Avatar
                      traits={traits}
                      seed={user?.id ?? 'anonymous'}
                      name={displayName}
                      src={photo}
                      size="sm"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuLabel className="normal-case tracking-normal">
                    <span dir="auto" className="block text-body-sm font-semibold text-foreground">
                      {displayName}
                    </span>
                    <span className="block break-all text-caption font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                      <RoleDot role={consoleRole} />
                      {roleLabel}
                      {user && !user.emailConfirmed && (
                        <Badge variant="warning" size="sm" className="ms-auto">
                          {lang === 'ar' ? 'أكّد الإيميل' : 'Verify email'}
                        </Badge>
                      )}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {user?.teacherId && (
                    <DropdownMenuItem asChild>
                      <Link to={`/teachers/${user.teacherId}`}>
                        <UserRound />
                        {lang === 'ar' ? 'شوف بروفايلك العام' : 'View public profile'}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasSettings && (
                    <DropdownMenuItem asChild>
                      <Link to={settingsHref}>
                        <Settings />
                        {t('nav.settings')}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {otherRoles.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {otherRoles.map((other) => (
                        <DropdownMenuItem key={other} asChild>
                          <Link to={ROLE_HOME[other]}>
                            <RoleDot role={other} className="mx-1" />
                            {ROLE_LABELS[other][lang]}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()}>
                    <LogOut className="flip-rtl" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[90rem] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* --------------------- Phone + tablet: bottom tab bar -------------------- */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        aria-label={roleLabel}
      >
        <ul
          className="mx-auto grid max-w-xl"
          style={{ gridTemplateColumns: `repeat(${mobileItems.length + 1}, 1fr)` }}
        >
          {mobileItems.map((item) => {
            const badge = badgeFor(item)
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'relative flex flex-col items-center gap-1 px-1 pb-1.5 pt-2.5 text-[0.6875rem] font-semibold transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />
                      )}
                      <span className="relative">
                        <item.icon className="size-5" strokeWidth={isActive ? 2.1 : 1.75} />
                        {badge ? (
                          <span className="absolute -end-1 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                        ) : null}
                      </span>
                      <span className="w-full truncate text-center">{item.label[lang]}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'relative flex w-full flex-col items-center gap-1 px-1 pb-1.5 pt-2.5 text-[0.6875rem] font-semibold transition-colors',
                moreActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {moreActive && (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />
              )}
              <span className="relative">
                <MoreHorizontal className="size-5" />
                {unread.notifications + unread.messages > 0 &&
                  !mobileItems.some((i) => i.badge) && (
                    <span className="absolute -end-1 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                  )}
              </span>
              <span>{lang === 'ar' ? 'المزيد' : 'More'}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] lg:hidden">
          <SheetHeader className="flex-row items-center justify-between gap-3 text-start">
            <SheetTitle className="flex items-center gap-2 text-body font-semibold">
              <RoleDot role={consoleRole} />
              {roleLabel}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-2">
            {otherRoles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-2.5 pb-3 pt-1">
                {otherRoles.map((other) => (
                  <Link
                    key={other}
                    to={ROLE_HOME[other]}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-caption font-semibold text-foreground"
                  >
                    <RoleDot role={other} />
                    {ROLE_LABELS[other][lang]}
                  </Link>
                ))}
              </div>
            )}
            <NavSections sections={sections} lang={lang} badgeFor={badgeFor} columns />
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border px-2.5 pt-4">
              <Link to="/" className="text-caption font-semibold text-muted-foreground">
                {t('nav.backToSite')}
              </Link>
              <LanguageToggle variant="inline" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function NavSections({
  sections,
  lang,
  badgeFor,
  columns = false,
}: {
  sections: NavSection[]
  lang: 'ar' | 'en'
  badgeFor: (item: NavEntry) => number | undefined
  /** Two columns of rows — the phone "More" sheet. */
  columns?: boolean
}) {
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={section.title?.en ?? `section-${i}`}>
          {section.title && <p className="data-label px-2.5 pb-1.5 pt-1">{section.title[lang]}</p>}
          <div className={cn('space-y-px', columns && 'grid grid-cols-2 gap-x-2 gap-y-px space-y-0')}>
            {section.items.map((item) => (
              <SidebarLink key={item.href} item={item} lang={lang} badge={badgeFor(item)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarLink({
  item,
  lang,
  badge,
}: {
  item: NavEntry
  lang: 'ar' | 'en'
  badge?: number
}) {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-body-sm transition-colors duration-150',
          isActive
            ? 'bg-navy-soft font-semibold text-navy-strong'
            : 'font-medium text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="rail-active"
              className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              aria-hidden
            />
          )}
          <item.icon
            className={cn('size-[1.0625rem] shrink-0', isActive ? 'text-navy-strong' : 'text-muted-foreground')}
            strokeWidth={isActive ? 2.1 : 1.75}
          />
          <span className="flex-1 truncate">{item.label[lang]}</span>
          {badge ? (
            <span className="tnum min-w-[1.25rem] rounded-sm bg-primary px-1 text-center text-[0.6875rem] font-semibold leading-[1.125rem] text-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

/**
 * The console name — and, for accounts that hold more than one role (a teacher
 * who is also a parent), the switch between their consoles.
 */
function ConsoleSwitcher({
  role,
  label,
  otherRoles,
  lang,
}: {
  role: AppRole
  label: string
  otherRoles: AppRole[]
  lang: 'ar' | 'en'
}) {
  const { user } = useAuth()
  const workspace = user?.tenantName

  const face = (
    <>
      <RoleDot role={role} className="size-2.5" />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-caption font-semibold text-foreground">{label}</span>
        {workspace && (
          <span dir="auto" className="block truncate text-[0.6875rem] text-muted-foreground">
            {workspace}
          </span>
        )}
      </span>
    </>
  )

  const frame =
    'flex w-full items-center gap-2.5 rounded-md border border-border bg-navy-soft px-2.5 py-2 text-start'

  if (otherRoles.length === 0) return <div className={frame}>{face}</div>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            frame,
            'transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {face}
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[13.5rem]">
        <DropdownMenuLabel>{lang === 'ar' ? 'لوحاتك' : 'Your consoles'}</DropdownMenuLabel>
        <DropdownMenuItem disabled className="opacity-100">
          <RoleDot role={role} className="mx-1" />
          <span className="flex-1 font-semibold text-foreground">{label}</span>
          <Check className="text-foreground" />
        </DropdownMenuItem>
        {otherRoles.map((other) => (
          <DropdownMenuItem key={other} asChild>
            <Link to={ROLE_HOME[other]}>
              <RoleDot role={other} className="mx-1" />
              {ROLE_LABELS[other][lang]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
