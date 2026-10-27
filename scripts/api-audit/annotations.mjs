/**
 * The judgement calls the audit cannot derive mechanically, one per operation,
 * each with the evidence behind it. Everything else in the report is computed.
 *
 *   notApplicable  — not a frontend responsibility (the reason is reported)
 *   redundantWith  — a client function exists but no screen calls it, because
 *                    the same data/effect already reaches the UI through the
 *                    named, integrated operation (checked against the spec's
 *                    schemas or the backend handler). Still counted as
 *                    "client-only"; reported separately from real gaps.
 *   gap            — a real missing workflow, with what it would need
 *   changed        — what this run changed for the operation
 */
export const ANNOTATIONS = {
  /* ------------------------------ not applicable ------------------------------ */
  'POST /api/v1/billing/webhooks/{provider}': {
    notApplicable:
      'Payment-provider callback (server to server). The provider calls it with a signed payload; a browser never should.',
  },

  /* ------------------- aliases and duplicate routes (same handler) ------------------- */
  'GET /api/v1/teachers/{id}/profile': { redundantWith: 'GET /teachers/{id} — the backend documents it as an alias' },
  'GET /api/v1/admin/analytics': { redundantWith: 'GET /admin/dashboard — backend alias returning the same AdminDashboardDto' },
  'GET /api/v1/admin/analytics/tenants': {
    redundantWith: 'GET /admin/tenants — same handler and query (GetAdminTenantsQuery)',
  },
  'POST /api/v1/teacher/exams/{id}/results/bulk': {
    redundantWith: 'POST /teacher/exams/{id}/results — backend summary: "identical semantics"',
  },
  'POST /api/v1/assistants/invitations/accept': {
    redundantWith:
      'POST /team/invitations/accept — same AcceptInvitationCommand; the only invitation email links to /team/invitations',
  },
  'GET /api/v1/tenant/team/{id}': { redundantWith: 'GET /tenant/assistants rows — same TenantMemberDto, same handler' },
  'PUT /api/v1/tenant/team/{id}/role': { redundantWith: 'PUT /tenant/assistants/{id} — same ChangeMemberRoleCommand' },
  'PUT /api/v1/tenant/team/{id}/status': { redundantWith: 'PUT /tenant/assistants/{id}/status — same ChangeMemberStatusCommand' },
  'DELETE /api/v1/tenant/team/{id}': { redundantWith: 'DELETE /tenant/assistants/{id} — same RemoveTeamMemberCommand' },
  'GET /api/v1/tenant/assistants/{id}': { redundantWith: 'GET /tenant/assistants rows — same TenantMemberDto incl. permissions' },
  'PUT /api/v1/teacher/about': { redundantWith: 'PUT /teacher/profile — headline and bio are part of the profile form' },
  'POST /api/v1/teacher/schedule': {
    redundantWith: 'POST /teacher/groups/{id}/schedule — used by the group form (GroupFormDialog)',
  },
  'PUT /api/v1/teacher/schedule/{id}': { redundantWith: 'PUT /teacher/groups/{id}/schedule/{scheduleId} (GroupFormDialog)' },
  'DELETE /api/v1/teacher/schedule/{id}': {
    redundantWith: 'DELETE /teacher/groups/{id}/schedule/{scheduleId} (GroupFormDialog)',
  },
  'POST /api/v1/teacher/attendance/sessions/{id}/records': {
    redundantWith: 'POST /teacher/attendance/sessions/{id}/bulk — same RecordAttendanceCommand',
  },
  'PUT /api/v1/teacher/attendance/records/{id}': {
    redundantWith: 'POST /teacher/attendance/sessions/{id}/bulk — the session sheet re-marks rows in one request',
  },
  'GET /api/v1/teacher/attendance/group/{groupId}': {
    redundantWith: 'GET /teacher/attendance/sessions?GroupId= — same sessions, filtered',
  },
  'POST /api/v1/teacher/homework/{id}/submissions/grade': {
    redundantWith: 'POST /teacher/homework/submissions/{submissionId}/grade — graded one by one on the homework page',
  },
  'PUT /api/v1/enrollments/courses/{id}/progress': {
    redundantWith:
      'POST/DELETE /student/courses/{courseId}/lessons/{lessonId}/complete — the learn page derives progress from lessons',
  },
  'GET /api/v1/public/tenants/{slug}/branding': { redundantWith: 'GET /public/tenants/{slug} — its payload carries branding' },
  'GET /api/v1/public/tenants/{slug}/seo': { redundantWith: 'GET /public/tenants/{slug} — its payload carries website.seo' },

  /* ------------- detail reads whose DTO the UI already has from a list ------------- */
  'GET /api/v1/subjects/{idOrSlug}': { redundantWith: 'GET /subjects — the full SubjectDto list, cached app-wide' },
  'GET /api/v1/grades/{idOrSlug}': { redundantWith: 'GET /grades — the full GradeDto list, cached app-wide' },
  'GET /api/v1/subjects/{id}/teachers': { redundantWith: 'GET /teachers?SubjectId=' },
  'GET /api/v1/subjects/{id}/courses': { redundantWith: 'GET /courses?SubjectId=' },
  'GET /api/v1/subjects/{id}/groups': { redundantWith: 'GET /groups?SubjectId=' },
  'GET /api/v1/grades/{id}/teachers': { redundantWith: 'GET /teachers?GradeId=' },
  'GET /api/v1/grades/{id}/courses': { redundantWith: 'GET /courses?GradeId=' },
  'GET /api/v1/grades/{id}/groups': { redundantWith: 'GET /groups?GradeId=' },
  'GET /api/v1/teachers/{id}/achievements': { redundantWith: 'GET /teachers/{id} — TeacherDetailsDto.achievements' },
  'GET /api/v1/groups/{id}/schedule': { redundantWith: 'GET /groups/{id} — GroupDetailsDto.schedules' },
  'GET /api/v1/courses/{id}/sections': { redundantWith: 'GET /courses/{id} — CourseDetailsDto.sections' },
  'GET /api/v1/student/schedule/upcoming': {
    redundantWith: 'GET /student/upcoming-classes and StudentDashboardDto.upcomingClasses',
  },
  'GET /api/v1/inquiries/{id}': { redundantWith: 'the inquiry lists (teacher, student, admin) — same InquiryDto' },
  'GET /api/v1/teacher/inquiries/{id}': { redundantWith: 'GET /teacher/inquiries — same InquiryDto' },
  'GET /api/v1/teacher/announcements/{id}': { redundantWith: 'GET /teacher/announcements — same AnnouncementDto' },
  'GET /api/v1/teacher/discounts/{id}': { redundantWith: 'GET /teacher/discounts — same DiscountDto' },
  'GET /api/v1/teacher/certificates/{id}': { redundantWith: 'GET /teacher/certificates — same CertificateDto' },
  'GET /api/v1/student/certificates/{id}': { redundantWith: 'GET /student/certificates — same CertificateDto' },
  'GET /api/v1/notifications/{id}': {
    redundantWith: 'GET /notifications — same NotificationDto; a notification opens its target screen, not a detail view',
  },
  'GET /api/v1/teacher/homework/submissions/{submissionId}': {
    redundantWith: 'GET /teacher/homework/{id}/submissions — same HomeworkSubmissionDto',
  },
  'GET /api/v1/billing/invoices/{id}': { redundantWith: 'GET /billing/invoices — same InvoiceDto' },
  'GET /api/v1/billing/transactions/{id}': { redundantWith: 'GET /billing/transactions — same BillingTransactionDto' },
  'GET /api/v1/billing/plans/{id}': { redundantWith: 'GET /billing/plans — the full SubscriptionPlanDto list' },
  'GET /api/v1/enrollments/courses/{id}': { redundantWith: 'GET /student/enrollments/courses — same CourseEnrollmentDto' },
  'GET /api/v1/enrollments/groups/{id}': { redundantWith: 'GET /student/enrollments/groups — same GroupEnrollmentDto' },

  /* ------------------------------ changed in this run ------------------------------ */
  'POST /api/v1/teacher/groups/{groupId}/students': {
    changed:
      '"Add to group" on /teacher/students: enrolls a student the teacher already has into another of their groups. ' +
      'Students who are in none of the teacher\'s groups cannot be picked — no endpoint lists them to a teacher.',
  },
  ...Object.fromEntries(
    [
      'PUT /api/v1/teacher/groups/{id}',
      'PUT /api/v1/teacher/courses/{id}/sections/{sectionId}',
      'PUT /api/v1/teacher/courses/{id}/lessons/{lessonId}',
      'PUT /api/v1/teacher/groups/{id}/curriculum/{curriculumId}',
      'PUT /api/v1/reviews/{id}',
      'PUT /api/v1/parent/profile',
      'PUT /api/v1/student/profile',
      'PUT /api/v1/teacher/profile',
      'PUT /api/v1/tenant',
      'PUT /api/v1/teacher/courses/{id}',
      'PUT /api/v1/teacher/discounts/{id}',
      'PUT /api/v1/teacher/exams/{id}/questions/{questionId}',
      'PUT /api/v1/teacher/exams/{id}',
      'PUT /api/v1/teacher/homework/{id}',
    ].map((id) => [
      id,
      {
        changed:
          'Fixed: an emptied optional field was sent as null, which this command reads as "unchanged", so clearing it on edit did nothing. Edit payloads now send "" (stored as cleared).',
      },
    ]),
  ),
  'POST /api/v1/tenant/assistants/invite': {
    changed: 'Now used only for the Assistant role — the route overwrites any other role with Assistant (see POST /tenant/team/invite).',
  },
  'POST /api/v1/tenant/team/invite': {
    changed:
      'Assistants page now sends non-Assistant roles here; /tenant/assistants/invite overwrites the role with Assistant, so picking Moderator/ContentManager/Admin was silently ignored.',
  },
  'POST /api/v1/messages/conversations': { changed: 'New-conversation dialog on the messages page (teachers and assistants, with workspace members).' },
  'GET /api/v1/student/analytics': { changed: 'Academic-standing panel on /student/grades.' },
  'GET /api/v1/parent/children/{studentId}/analytics': { changed: 'Academic-standing panel on /parent/children/:id.' },
  'GET /api/v1/student/inquiries': { changed: 'New page /student/inquiries (also the target of the backend\'s inquiry notifications).' },
  'GET /api/v1/admin/analytics/revenue': { changed: 'SaaS revenue chart on /admin/reports.' },
  'GET /api/v1/platform/overview': { changed: 'Schools/subscriptions strip on /admin/dashboard.' },
  'GET /api/v1/platform/users': { changed: 'New page /admin/users.' },
  'GET /api/v1/platform/administrators': { changed: 'Administrators tab on /admin/users.' },
  'POST /api/v1/platform/administrators/{userId}': { changed: 'Grant action on /admin/users (reason required, as the validator demands).' },
  'DELETE /api/v1/platform/administrators/{userId}': { changed: 'Revoke action on /admin/users; hidden for the last administrator.' },
  'GET /api/v1/admin/discounts': { changed: 'New page /admin/discounts.' },
  'GET /api/v1/admin/teachers/{id}': { changed: 'Profile sheet on /admin/teachers — the only way to read an unverified teacher\'s profile.' },
  'GET /api/v1/teacher/analytics/overview': { changed: 'Last-30-days comparison strip on /teacher/analytics; wrapper type no longer offers the undeclared Take.' },
  'GET /api/v1/tenant/branding': { changed: 'New page /teacher/website (Branding tab).' },
  'PUT /api/v1/tenant/branding': { changed: '/teacher/website Branding tab.' },
  'POST /api/v1/tenant/logo': { changed: '/teacher/website Branding tab.' },
  'POST /api/v1/tenant/cover': { changed: '/teacher/website Branding tab.' },
  'GET /api/v1/tenant/website': { changed: '/teacher/website Content tab.' },
  'PUT /api/v1/tenant/website': { changed: '/teacher/website Content tab.' },
  'GET /api/v1/tenant/website/sections': { changed: '/teacher/website Sections tab.' },
  'POST /api/v1/tenant/website/sections': { changed: '/teacher/website Sections tab.' },
  'PUT /api/v1/tenant/website/sections/{id}': { changed: '/teacher/website Sections tab (edit, visibility).' },
  'DELETE /api/v1/tenant/website/sections/{id}': { changed: '/teacher/website Sections tab.' },
  'POST /api/v1/tenant/website/sections/reorder': { changed: '/teacher/website Sections tab (move up/down).' },
  'GET /api/v1/tenant/domains': { changed: '/teacher/website Domains tab.' },
  'POST /api/v1/tenant/domains': { changed: '/teacher/website Domains tab.' },
  'PUT /api/v1/tenant/domains/{id}': { changed: '/teacher/website Domains tab (make primary).' },
  'DELETE /api/v1/tenant/domains/{id}': { changed: '/teacher/website Domains tab.' },
  'POST /api/v1/tenant/domains/{id}/verify': { changed: '/teacher/website Domains tab.' },
  'GET /api/v1/tenant/audit-logs': { changed: 'New owner-only page /teacher/audit-log.' },
  'GET /api/v1/public/tenants/{slug}': { changed: 'New public page /site/:slug.' },
  'GET /api/v1/public/tenants/{slug}/teachers': { changed: '/site/:slug.' },
  'GET /api/v1/public/tenants/{slug}/groups': { changed: '/site/:slug.' },
  'GET /api/v1/public/tenants/{slug}/courses': { changed: '/site/:slug.' },
}
