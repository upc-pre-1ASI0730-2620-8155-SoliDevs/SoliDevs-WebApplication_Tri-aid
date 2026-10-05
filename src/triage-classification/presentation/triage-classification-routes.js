const classificationView = () => import('./views/triage-classification-view.vue')

// Routes of the Triage Classification bounded context.
const triageClassificationRoutes = [
  { path: ':episode', name: 'triage-classification', component: classificationView, meta: { titleKey: 'triage.title' } }
]

export default triageClassificationRoutes
