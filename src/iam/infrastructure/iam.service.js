import { User } from '../domain/model/user.entity.js'
import { IamApi } from './iam-api.js'

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))

/**
 * Service of the IAM bounded context. Validates credentials against the
 * platform users, opens and closes sessions, and exposes the signed-in
 * account. Ready to be swapped for token-based auth when the .NET
 * backend arrives: only this class talks to the API.
 */
export class IamService {
    constructor() {
        this.api = new IamApi()
        this.sessionId = sessionStorage.getItem('triaid.sessionId') || null
    }

    /**
     * Sign in with username and password. On success opens a session
     * record and returns the signed-in user (without credentials).
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{ok: true, data: User}>}
     */
    async signIn(username, password) {
        await delay()
        const response = await this.api.getUsers()
        const match = (response.data || [])
            .map(u => new User(u))
            .find(u => u.username.toLowerCase() === String(username).trim().toLowerCase())
        if (!match || match.password !== password) {
            const error = new Error('invalid-credentials')
            error.code = 'invalid-credentials'
            throw error
        }
        const session = await this.api.createSession({
            userId: match.id,
            username: match.username,
            openedAt: new Date().toISOString()
        })
        this.sessionId = session.data.id
        sessionStorage.setItem('triaid.sessionId', this.sessionId)
        return { ok: true, data: match }
    }

    /**
     * Restores the session of a previously signed-in user (page reload).
     * Returns null when there is no open session.
     */
    async restoreSession() {
        if (!this.sessionId) return { data: null }
        try {
            const sessions = await this.api.getSessions()
            const open = (sessions.data || []).find(s => String(s.id) === String(this.sessionId))
            if (!open) return { data: null }
            const user = await this.api.getUserById(open.userId)
            return { data: new User(user.data) }
        } catch {
            return { data: null }
        }
    }

    /** Closes the current session record. */
    async signOut() {
        if (this.sessionId) {
            try { await this.api.deleteSession(this.sessionId) } catch { /* best effort */ }
            this.sessionId = null
            sessionStorage.removeItem('triaid.sessionId')
        }
        return { ok: true }
    }
}
