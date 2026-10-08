const devicesView = () => import('./views/devices-view.vue')

const vitalSignsRoutes = [
  { path: 'devices', name: 'devices', component: devicesView, meta: { titleKey: 'nav.devices' } }
]

export default vitalSignsRoutes
