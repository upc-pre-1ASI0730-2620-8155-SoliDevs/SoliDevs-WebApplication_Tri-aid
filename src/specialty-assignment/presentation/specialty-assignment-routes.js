const referralView = () => import('./views/specialty-assignment-view.vue')

const specialtyAssignmentRoutes = [
  { path: ':episode', name: 'specialty-assignment', component: referralView, meta: { titleKey: 'referral.title' } }
]

export default specialtyAssignmentRoutes
