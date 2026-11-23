/**
 * Routes of the Patient Portal bounded context. `/portal` is the sign-in;
 * the three children share the portal layout and require a patient session.
 */
import PortalLayout from './components/portal-layout.vue'

export default [
  {
    path: 'portal',
    meta: { layout: 'portal-public' },
    children: [
      { path: '', name: 'portal-login', component: () => import('./views/portal-login-view.vue'), meta: { titleKey: 'portal.login.title', portalPublic: true } },
      {
        path: '',
        component: PortalLayout,
        meta: { layout: 'portal' },
        children: [
          { path: 'estado', name: 'portal-status', component: () => import('./views/portal-status-view.vue'), meta: { titleKey: 'portal.nav.status' } },
          { path: 'turno', name: 'portal-turn', component: () => import('./views/portal-turn-view.vue'), meta: { titleKey: 'portal.nav.turn' } },
          { path: 'comprobante', name: 'portal-voucher', component: () => import('./views/portal-voucher-view.vue'), meta: { titleKey: 'portal.nav.voucher' } }
        ]
      }
    ]
  }
]
