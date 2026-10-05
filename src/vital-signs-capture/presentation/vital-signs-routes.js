const devicesView = () => import('./views/devices-view.vue')

// Routes of the Vital Signs Capture bounded context.
const vitalSignsRoutes = [
  { path: 'devices', name: 'devices', component: devicesView, meta: { titleKey: 'nav.devices' } }
]

export default vitalSignsRoutes
