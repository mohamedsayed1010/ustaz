/**
 * What this audit run changed, and what was checked by hand in a browser.
 * Rendered into section 5 of the coverage report as written here.
 */
export const CHANGES = {
  files: [
    /* ------------------------------ defects fixed ------------------------------ */
    {
      file: 'src/pages/teacher/TeacherAssistantsPage.tsx',
      change:
        'Invite dialog: non-Assistant roles now go to POST /tenant/team/invite. /tenant/assistants/invite overwrites the role with Assistant, so choosing Moderator, Content manager or Admin was silently ignored.',
    },
    {
      file: 'src/lib/navigation.ts, src/components/notifications/NotificationCenter.tsx',
      change:
        'notificationHref(): maps every backend notification/email link (ActionUrl, CtaPath) to a real route for the viewer\'s role. Before, rows linked straight to backend paths such as /billing, /teacher/groups/{id} or /messages/conversations/{id} that the router does not have. Also adds the student "My inquiries", admin "All accounts"/"Discount codes" and teacher "Website"/"Audit log" nav entries, and an ownerOnly flag that hides owner-only rows from assistants.',
    },
    {
      file: 'src/lib/form.ts + 12 edit forms',
      change:
        'optionalText(): the backend\'s update commands read null as "leave unchanged", so emptying an optional field on edit was silently ignored (25 fields, e.g. group/course/exam/homework description, lesson video URL, profile city and bio, workspace contact details). Edit payloads now send "" (the backend stores it as cleared). Files: GroupFormDialog, CourseContentSheet, GroupCurriculumSheet, ReviewPanel, ParentSettingsPage, StudentSettingsPage, TeacherCoursesPage, TeacherDiscountsPage, TeacherExamDetailPage, TeacherExamsPage, TeacherHomeworkPage, TeacherSettingsPage.',
    },
    {
      file: 'src/api/endpoints/teacher.ts',
      change: 'windowedOverview no longer accepts Take, which GET /teacher/analytics/overview does not declare (it would be dropped).',
    },
    {
      file: 'src/pages/shared/MessagesPage.tsx',
      change:
        'Opens ?conversation=<id> directly (notification deep link); new-conversation dialog for teachers and assistants (POST /messages/conversations with workspace members).',
    },
    { file: 'src/pages/student/StudentCoursesPage.tsx', change: 'Opens ?tab=groups (enrollment notifications).' },
    {
      file: 'src/components/admin/UserStateButton.tsx',
      change: 'Also refreshes the platform user lists after suspending/activating.',
    },

    /* --------------------------- integrations added --------------------------- */
    {
      file: 'src/components/analytics/StudentStandingPanel.tsx (new)',
      change: 'Academic standing for a window; used by /student/grades (GET /student/analytics) and /parent/children/:id (GET /parent/children/{id}/analytics).',
    },
    { file: 'src/pages/student/StudentGradesPage.tsx', change: 'Shows StudentStandingPanel.' },
    { file: 'src/pages/parent/ParentChildDetailPage.tsx', change: 'Shows StudentStandingPanel.' },
    { file: 'src/pages/student/StudentInquiriesPage.tsx (new)', change: '/student/inquiries — GET /student/inquiries.' },
    {
      file: 'src/pages/admin/AdminUsersPage.tsx (new)',
      change: '/admin/users — GET /platform/users, GET /platform/administrators, grant/revoke platform authority (reason required).',
    },
    { file: 'src/pages/admin/AdminDiscountsPage.tsx (new)', change: '/admin/discounts — GET /admin/discounts.' },
    {
      file: 'src/pages/teacher/TeacherStudentsPage.tsx',
      change: '"Add to group" — POST /teacher/groups/{groupId}/students for a student the teacher already has.',
    },
    { file: 'src/pages/admin/AdminTeachersPage.tsx', change: 'Profile sheet — GET /admin/teachers/{id}.' },
    { file: 'src/pages/admin/AdminDashboardPage.tsx', change: 'Schools and subscriptions strip — GET /platform/overview.' },
    { file: 'src/pages/admin/AdminModerationPages.tsx', change: 'Reports page: SaaS revenue chart — GET /admin/analytics/revenue.' },
    { file: 'src/pages/teacher/TeacherAnalyticsPage.tsx', change: 'Last-30-days comparison — GET /teacher/analytics/overview.' },
    {
      file: 'src/pages/teacher/TeacherWebsitePage.tsx (new)',
      change: '/teacher/website — branding, logo, cover, website content, sections (add/edit/hide/delete/reorder) and custom domains (add/verify/primary/remove).',
    },
    { file: 'src/pages/teacher/TeacherAuditLogPage.tsx (new)', change: '/teacher/audit-log — GET /tenant/audit-logs (owner only).' },
    {
      file: 'src/pages/PublicSitePage.tsx (new)',
      change: '/site/:slug — a workspace\'s public page: GET /public/tenants/{slug} and its teachers, groups and courses.',
    },
    { file: 'src/routes/index.tsx', change: 'Routes for the six new pages.' },
    { file: 'src/lib/query-client.ts', change: 'Query keys for the new reads.' },

    /* --------------------------------- tooling --------------------------------- */
    {
      file: 'scripts/audit-api-coverage.mjs, scripts/api-audit/* (new)',
      change:
        'This audit: live spec inventory joined to controller auth; TypeScript-compiler analysis of every API call, its consumers and route reachability; contract tests of every wrapper through Vite SSR with stubbed fetch; read-only live probes; notification-link checks; report generation.',
    },
  ],
  browser: [
    {
      screen: '/ and /teachers (public)',
      checked: 'Requests go through the dev proxy to the live API; 18 production subjects render as filters',
      result: 'pass — all /api/v1 requests 200, no console errors',
    },
    {
      screen: '/pricing (public)',
      checked: 'GET /billing/plans renders the live plans',
      result: 'pass — Starter (free), Professional (499 EGP), Center (1,499 EGP); no console errors',
    },
    {
      screen: '/site/:slug (new, public)',
      checked: 'Unknown slug: real 404 from GET /public/tenants/{slug}, no retry, not-found state',
      result: 'pass — one request, 404, "page does not exist" state; no console errors',
    },
    {
      screen: '/admin/users, /teacher/website, /student/inquiries (new, protected)',
      checked: 'Signed out: role guard redirects before any protected request',
      result: 'pass — redirected to /login; no /platform, /tenant or /student request sent',
    },
    {
      screen: 'Every signed-in screen',
      checked: 'Data rendering, mutations, empty/error states with real data',
      result: 'not run — no test credentials; no sign-in was attempted',
    },
  ],
}
