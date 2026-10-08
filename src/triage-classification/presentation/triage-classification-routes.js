const classificationView = () => import('./views/triage-classification-view.vue')

const triageClassificationRoutes = [
  { path: ':episode', name: 'triage-classification', component: classificationView, meta: { titleKey: 'triage.title' } }
]

export default triageClassificationRoutes
