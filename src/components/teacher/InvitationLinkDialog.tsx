import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** The link an invitee opens to answer an invitation (the page the invitation email points at). */
export function invitationLink(token: string): string {
  return `${window.location.origin}/team/invitations?token=${encodeURIComponent(token)}`
}

/**
 * Shown once after an invite. The API returns the invitation token only at
 * creation and stores just its hash, so this is the inviter's one chance to
 * pass the link on (the email the invitee receives does not carry it).
 */
export function InvitationLinkDialog({
  token,
  email,
  onClose,
}: {
  token: string | null
  email?: string | null
  onClose: () => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const [copied, setCopied] = React.useState(false)
  const link = token ? invitationLink(token) : ''

  React.useEffect(() => setCopied(false), [token])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      /* clipboard blocked — the field stays selectable */
    }
  }

  return (
    <Dialog open={Boolean(token)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ar ? 'ابعت لينك الدعوة' : 'Send the invitation link'}</DialogTitle>
          <DialogDescription>
            {ar
              ? `ابعت اللينك ده لـ ${email ?? 'الشخص المدعو'} عشان يقبل الدعوة. اللينك بيظهر مرة واحدة بس.`
              : `Send this link to ${email ?? 'the invitee'} so they can accept. It is shown only once.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={link} readOnly dir="ltr" className="flex-1 text-start font-latin" onFocus={(e) => e.currentTarget.select()} aria-label={ar ? 'لينك الدعوة' : 'Invitation link'} />
          <Button variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? (ar ? 'اتنسخ' : 'Copied') : ar ? 'نسخ' : 'Copy'}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{ar ? 'تم' : 'Done'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
