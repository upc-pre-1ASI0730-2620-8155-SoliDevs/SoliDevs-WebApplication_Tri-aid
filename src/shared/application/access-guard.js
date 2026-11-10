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

    const publicPaths = ['/login', '/recuperar', '/register']
    if (publicPaths.includes(path)) {
        // Cliente con sesion que llega desde el landing con intencion de
        // compra: directo al checkout de ese plan, sin registro/login.
        if (path === '/register' && to.query.plan) {
            return iamStore.isSignedIn
                ? { path: '/subscriptions', query: { plan: String(to.query.plan) } }
                : null
        }
        return iamStore.isSignedIn ? '/panel' : null
    }

    await iamStore.restore()
    if (!iamStore.isSignedIn) return '/login'

    await subscriptionStore.load()

    const adminOnlyPaths = ['/subscriptions', '/users']
    if (adminOnlyPaths.includes(path) && !iamStore.isAdmin) return '/panel'

    if (subscriptionStore.subscription?.state === 'overdue') {
        const allowedWhenOverdue = ['/subscriptions', '/acceso-suspendido']
        if (!allowedWhenOverdue.includes(path)) return '/acceso-suspendido'
    }
    return null
}
