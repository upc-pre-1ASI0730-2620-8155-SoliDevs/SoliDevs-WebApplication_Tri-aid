const referralView = () => import('./views/specialty-assignment-view.vue')

// Routes of the Specialty Assignment bounded context.
const specialtyAssignmentRoutes = [
  { path: ':episode', name: 'specialty-assignment', component: referralView, meta: { titleKey: 'referral.title' } }
]

export default specialtyAssignmentRoutes
