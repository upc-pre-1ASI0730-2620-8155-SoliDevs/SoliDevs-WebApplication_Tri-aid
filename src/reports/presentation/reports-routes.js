const reportsView = () => import('./views/reports-view.vue')

// Routes of the shift-reports view (chronological care log, alert log and metrics).
const reportsRoutes = [
  { path: '', name: 'reports', component: reportsView, meta: { titleKey: 'nav.reports' } }
]

export default reportsRoutes
