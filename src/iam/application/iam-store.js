import { reactive, markRaw } from 'vue'
import { User } from '../domain/model/user.entity.js'
import { IamService } from '../infrastructure/iam.service.js'
import { session } from '../../shared/application/demo-session.js'

/**
 * Reactive state of the IAM bounded context. Holds the signed-in user
 * and mirrors the shared demo-session consumed by the sidebar and other
 * views, so existing components keep working untouched.
 */
export const iamStore = reactive({
    user: null,
    restoring: false,
    restored: false,

    service: markRaw(new IamService()),

    /** Whether an account is signed in. */
    get isSignedIn() { return this.user !== null },

    /**
     * Signs in and fills both the IAM user and the shared session used
     * by the sidebar (name, initials, unit, shift, institution).
     */
    async signIn(username, password) {
        const result = await this.service.signIn(username, password)
        this.setUser(result.data)
        return result
    },

    /** Maps the signed-in user into the store and the shared session. */
    setUser(user) {
        this.user = user
        session.name = user.fullName
        session.initials = user.initials
        session.unit = user.role || user.unit
        session.shift = user.shift
        session.institution = user.institution
    },

    /** Restores an open session after a page reload. */
    async restore() {
        if (this.restored || this.restoring) return
        this.restoring = true
        try {
            const result = await this.service.restoreSession()
            if (result.data) this.setUser(result.data)
            this.restored = true
        } finally {
            this.restoring = false
        }
    },

    /** Signs out and clears the session state. */
    async signOut() {
        await this.service.signOut()
        this.user = null
        session.name = ''
        session.initials = ''
        session.unit = ''
        session.shift = ''
        session.institution = ''
    }
})
