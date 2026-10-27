import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { teacherInquiriesApi } from '@/api/endpoints/teacher'
import type { InquiryDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Status = NonNullable<InquiryDto['status']>

const LABELS: Record<Exclude<Status, 'New'>, { ar: string; en: string }> = {
  Contacted: { ar: 'تم التواصل', en: 'Contacted' },
  Converted: { ar: 'اشترك', en: 'Converted' },
  Closed: { ar: 'إغلاق', en: 'Close' },
}

/**
 * Moves an inquiry along New → Contacted → Converted/Closed
 * (PUT /teacher/inquiries/{id}/status). The codes are sent as the API's enum;
 * the labels are display only.
 */
export function InquiryStatusMenu({ inquiry }: { inquiry: InquiryDto }) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()

  const update = useMutation({
    mutationFn: (status: Status) => teacherInquiriesApi.updateStatus(inquiry.id!, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      const label = LABELS[status as Exclude<Status, 'New'>]
      toast({ title: label ? (ar ? label.ar : label.en) : '', variant: 'success' })
    },
    onError: showError,
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" loading={update.isPending}>
          {ar ? 'الحالة' : 'Status'}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(LABELS) as Exclude<Status, 'New'>[]).map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={inquiry.status === status}
            onSelect={() => update.mutate(status)}
          >
            {ar ? LABELS[status].ar : LABELS[status].en}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
