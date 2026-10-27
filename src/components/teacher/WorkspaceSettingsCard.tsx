import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantApi } from '@/api/endpoints/tenant'
import { isApiError } from '@/api/errors'
import type { TenantSettingsDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/primitives'

type Toggles = Pick<
  TenantSettingsDto,
  | 'notifyParentsOnAbsence'
  | 'notifyParentsOnLowGrade'
  | 'notifyParentsOnHomeworkMissed'
  | 'allowStudentSelfEnrollment'
  | 'autoApproveReviews'
>

/**
 * The workspace's operational rules (PUT /tenant/settings): when parents are
 * notified, the late and low-grade thresholds, self-enrollment and review
 * approval. Currency, time zone and language are shown but not edited here.
 * The API requires Tenant.Manage — anyone without it gets the server's 403.
 */
export function WorkspaceSettingsCard({ settings, queryKey }: { settings: TenantSettingsDto; queryKey: readonly unknown[] }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const seed = React.useCallback(
    () => ({
      toggles: {
        notifyParentsOnAbsence: Boolean(settings.notifyParentsOnAbsence),
        notifyParentsOnLowGrade: Boolean(settings.notifyParentsOnLowGrade),
        notifyParentsOnHomeworkMissed: Boolean(settings.notifyParentsOnHomeworkMissed),
        allowStudentSelfEnrollment: Boolean(settings.allowStudentSelfEnrollment),
        autoApproveReviews: Boolean(settings.autoApproveReviews),
      } as Toggles,
      threshold: String(settings.gradeNotificationThresholdPercentage ?? ''),
      late: String(settings.lateThresholdMinutes ?? ''),
    }),
    [settings],
  )
  const [state, setState] = React.useState(seed)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => setState(seed()), [seed])

  const threshold = Number(state.threshold)
  const late = Number(state.late)
  const invalid =
    !/^\d+$/.test(state.threshold) || threshold < 0 || threshold > 100 || !/^\d+$/.test(state.late) || late < 0

  const save = useMutation({
    mutationFn: () =>
      tenantApi.updateSettings({
        ...state.toggles,
        gradeNotificationThresholdPercentage: threshold,
        lateThresholdMinutes: late,
      }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey })
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (e) => setError(isApiError(e) ? e.message : ar ? 'حصلت مشكلة.' : 'Something went wrong.'),
  })

  const toggle = (key: keyof Toggles, label: string, help: string) => (
    <label key={key} className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-body-sm font-semibold text-foreground">{label}</span>
        <span className="block text-caption text-muted-foreground">{help}</span>
      </span>
      <Switch
        checked={Boolean(state.toggles[key])}
        onCheckedChange={(v) => setState((s) => ({ ...s, toggles: { ...s.toggles, [key]: v } }))}
      />
    </label>
  )

  return (
    <Card className="p-6">
      <h3 className="font-display text-heading-sm text-foreground">{ar ? 'إعدادات المنصة' : 'Workspace settings'}</h3>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { label: ar ? 'العملة' : 'Currency', value: settings.currency },
          { label: ar ? 'المنطقة الزمنية' : 'Time zone', value: settings.timeZoneId },
          { label: ar ? 'لغة المنصة' : 'Default language', value: settings.defaultLanguage },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-caption text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 font-display text-body-sm font-bold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 divide-y divide-border border-y border-border">
        {toggle(
          'notifyParentsOnAbsence',
          ar ? 'بلّغ ولي الأمر بالغياب' : 'Tell parents about absences',
          ar ? 'رسالة لولي الأمر لما الطالب يتسجّل غايب أو متأخر.' : 'Parents are notified when a student is marked absent or late.',
        )}
        {toggle(
          'notifyParentsOnLowGrade',
          ar ? 'بلّغ ولي الأمر بالدرجات الضعيفة' : 'Tell parents about low grades',
          ar ? 'لما الدرجة تقل عن الحد اللي تحت.' : 'When a score falls below the threshold below.',
        )}
        {toggle(
          'notifyParentsOnHomeworkMissed',
          ar ? 'بلّغ ولي الأمر بالواجبات الفايتة' : 'Tell parents about missed homework',
          ar ? 'لما ميعاد التسليم يعدّي من غير تسليم.' : 'When a deadline passes without a submission.',
        )}
        {toggle(
          'allowStudentSelfEnrollment',
          ar ? 'الطلاب يشتركوا بنفسهم' : 'Students can enroll themselves',
          ar ? 'من غير ما تضيفهم إنت.' : 'Without you adding them.',
        )}
        {toggle(
          'autoApproveReviews',
          ar ? 'انشر التقييمات تلقائي' : 'Publish reviews automatically',
          ar ? 'من غير مراجعة قبل النشر.' : 'Without checking them first.',
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-caption font-semibold text-foreground">
            {ar ? 'حد الدرجة الضعيفة (%)' : 'Low-grade threshold (%)'}
          </span>
          <Input
            value={state.threshold}
            onChange={(e) => setState((s) => ({ ...s, threshold: e.target.value }))}
            inputMode="numeric"
            dir="ltr"
            className="tnum mt-1.5 w-28"
          />
        </label>
        <label className="block">
          <span className="text-caption font-semibold text-foreground">
            {ar ? 'يتحسب متأخر بعد (دقيقة)' : 'Late after (minutes)'}
          </span>
          <Input
            value={state.late}
            onChange={(e) => setState((s) => ({ ...s, late: e.target.value }))}
            inputMode="numeric"
            dir="ltr"
            className="tnum mt-1.5 w-28"
          />
        </label>
      </div>
      {invalid && (
        <p className="mt-2 text-caption text-destructive-strong">
          {ar ? 'الحد من 0 لـ 100، والدقايق رقم صحيح.' : 'Threshold must be 0–100 and minutes a whole number.'}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-caption text-destructive-strong">
          {error}
        </p>
      )}
      <Button className="mt-5" loading={save.isPending} disabled={invalid} onClick={() => save.mutate()}>
        {t('common.save')}
      </Button>
    </Card>
  )
}
