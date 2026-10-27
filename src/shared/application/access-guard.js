import { iamStore } from '../../iam/application/iam-store.js'
import { subscriptionStore } from '../../subscription/application/subscription-store.js'

/**
 * Access guard of the platform. Combines the IAM session with the
 * Subscription bounded context to decide whether navigation is allowed:
 *
 *  - No open session            -> back to /login.
 *  - Subscription 'overdue'     -> only /subscriptions, /acceso-suspendido
 *                                  and auth pages are reachable.
 *  - 'pending' (grace period)   -> navigation allowed (the shell shows a
 *                                  reminder banner).
 *
 * Backend swap note: when the .NET API enforces subscription status
 * server-side, this guard stays as a UX fast-path; the API responses
 * will reject unauthorized requests independently.
 *
 * @param {object} to - Target route.
 * @returns {Promise<string|null>} A redirect path, or null to allow.
 */
export async function accessGuard(to) {
    const path = to.path

    // Rutas que nunca requieren sesion.
    const publicPaths = ['/login', '/recuperar']
    if (publicPaths.includes(path)) return iamStore.isSignedIn ? '/panel' : null

    // Restaurar la sesion abierta (no-op si ya esta lista).
    await iamStore.restore()
    if (!iamStore.isSignedIn) return '/login'

    // Solo si hay sesion interesa el estado de la suscripcion.
    await subscriptionStore.load()

    // RBAC: la gestion de usuarios y la suscripcion son del administrador.
    const adminOnlyPaths = ['/subscriptions', '/users']
    if (adminOnlyPaths.includes(path) && !iamStore.isAdmin) return '/panel'

    if (subscriptionStore.subscription?.state === 'overdue') {
        const allowedWhenOverdue = ['/subscriptions', '/acceso-suspendido']
        if (!allowedWhenOverdue.includes(path)) return '/acceso-suspendido'
    }
    return null
}
