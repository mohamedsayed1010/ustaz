import * as React from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, MailOpen, XCircle } from 'lucide-react'
import { teamApi } from '@/api/endpoints/tenant'
import { refreshAccessToken } from '@/api/client'
import { isApiError } from '@/api/errors'
import { useAuth } from '@/hooks/use-auth'
import { usePageTitle } from '@/hooks/use-page-title'
import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

type Outcome = { kind: 'accepted'; refreshed: boolean } | { kind: 'declined' } | null

/**
 * Where a workspace invitation is answered. The backend's invitation email
 * points here (/team/invitations); the token itself is handed over by whoever
 * sent the invite (it is shown to them once), usually as ?token=… on this URL.
 *
 * Accepting needs the invited account to be signed in — the server checks the
 * email matches — and afterwards the access token must be renewed, because
 * workspace access is carried in it. Declining works signed in or not.
 */
export default function TeamInvitationPage() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'دعوة للانضمام' : 'Workspace invitation')
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, refreshUser, hasRole } = useAuth()
  const [token, setToken] = React.useState(params.get('token') ?? '')
  const [error, setError] = React.useState<string | null>(null)
  const [outcome, setOutcome] = React.useState<Outcome>(null)
  const clean = token.trim()

  const fail = (e: unknown) =>
    setError(isApiError(e) ? e.message : ar ? 'حصلت مشكلة، جرّب تاني.' : 'Something went wrong, try again.')

  const accept = useMutation({
    mutationFn: () => teamApi.acceptInvitation({ token: clean }),
    onSuccess: async () => {
      setError(null)
      // The old token predates the membership; renew it so the new access applies now.
      const refreshed = Boolean(await refreshAccessToken())
      if (refreshed) await refreshUser()
      setOutcome({ kind: 'accepted', refreshed })
    },
    onError: fail,
  })

  const decline = useMutation({
    mutationFn: () => teamApi.declineInvitation(clean),
    onSuccess: () => {
      setError(null)
      setOutcome({ kind: 'declined' })
    },
    onError: fail,
  })

  const from = location.pathname + location.search

  return (
    <>
      <PageHeader
        compact
        eyebrow={ar ? 'مساحة عمل' : 'Workspace'}
        title={ar ? 'دعوة للانضمام لفريق' : 'Invitation to join a team'}
        description={
          ar
            ? 'حد دعاك تنضم لمساحة عمل مدرّس على أستاذ كمساعد أو عضو في الفريق.'
            : 'Someone invited you to join a teacher’s workspace on USTAZ as an assistant or team member.'
        }
      />
      <section className="section-y !py-12">
        <div className="container-page">
          <Card className="mx-auto max-w-xl p-6">
            {outcome?.kind === 'accepted' ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto size-10 text-success-strong" aria-hidden />
                <h2 className="mt-4 font-display text-heading-md text-foreground">
                  {ar ? 'انضميت للفريق' : 'You joined the team'}
                </h2>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  {outcome.refreshed
                    ? ar
                      ? 'صلاحياتك الجديدة اتفعّلت.'
                      : 'Your new access is active.'
                    : ar
                      ? 'سجّل خروج وادخل تاني عشان صلاحياتك الجديدة تتفعّل.'
                      : 'Sign out and back in to activate your new access.'}
                </p>
                {outcome.refreshed && (hasRole('teacher') || hasRole('assistant')) && (
                  <Button className="mt-6" onClick={() => navigate('/teacher/dashboard')}>
                    {ar ? 'افتح لوحة التحكم' : 'Open the console'}
                  </Button>
                )}
              </div>
            ) : outcome?.kind === 'declined' ? (
              <div className="text-center">
                <XCircle className="mx-auto size-10 text-muted-foreground" aria-hidden />
                <h2 className="mt-4 font-display text-heading-md text-foreground">
                  {ar ? 'رفضت الدعوة' : 'Invitation declined'}
                </h2>
                <Button asChild variant="outline" className="mt-6">
                  <Link to="/">{ar ? 'الرئيسية' : 'Home'}</Link>
                </Button>
              </div>
            ) : (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (clean && isAuthenticated) accept.mutate()
                }}
              >
                <div className="flex items-start gap-3">
                  <MailOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-body-sm text-muted-foreground">
                    {isAuthenticated
                      ? ar
                        ? `هتنضم بحساب ${user?.email ?? ''}. لازم يكون نفس الإيميل اللي الدعوة اتبعتتله.`
                        : `You will join as ${user?.email ?? ''}. It must be the email the invitation was sent to.`
                      : ar
                        ? 'سجّل دخول بالإيميل اللي الدعوة اتبعتتله عشان تقبلها.'
                        : 'Sign in with the email the invitation was sent to in order to accept it.'}
                  </p>
                </div>

                <Field
                  label={ar ? 'كود الدعوة' : 'Invitation code'}
                  htmlFor="invite-token"
                  hint={ar ? 'موجود في اللينك اللي وصلك من صاحب الدعوة.' : 'It is in the link the inviter sent you.'}
                >
                  <Input
                    id="invite-token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value)
                      setError(null)
                    }}
                    dir="ltr"
                    autoComplete="off"
                    spellCheck={false}
                    className="text-start font-latin"
                  />
                </Field>

                {error && (
                  <p role="alert" className="text-body-sm text-destructive-strong">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {isAuthenticated ? (
                    <Button type="submit" loading={accept.isPending} disabled={!clean || decline.isPending}>
                      {ar ? 'قبول الدعوة' : 'Accept invitation'}
                    </Button>
                  ) : (
                    <>
                      <Button asChild>
                        <Link to="/login" state={{ from }}>
                          {ar ? 'سجّل دخول' : 'Sign in'}
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/register" state={{ from }}>
                          {ar ? 'اعمل حساب' : 'Create an account'}
                        </Link>
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive-strong"
                    loading={decline.isPending}
                    disabled={!clean || accept.isPending}
                    onClick={() => decline.mutate()}
                  >
                    {ar ? 'رفض' : 'Decline'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}
