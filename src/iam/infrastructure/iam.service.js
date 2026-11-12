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
     * Registers a new institution together with its administrator
     * account (self-service onboarding). Creates the admin user and
     * opens a session for them. The trial subscription is started by
     * the Subscription context once the session exists.
     * Backend swap note: with the .NET API this becomes a single
     * POST /institutions transaction.
     * @param {Object} input - { institution, names, surnames, email, username, password }
     * @returns {Promise<{ok: true, data: User}>} The admin account.
     */
    /**
     * Early availability check for the register wizard (step 1): the
     * institution name must not belong to an existing account.
     * @param {string} institution
     * @returns {Promise<boolean>} true when available.
     */
    async isInstitutionAvailable(institution) {
        const users = await this.api.getUsers()
        const needle = String(institution || '').trim().toLowerCase()
        return !(users.data || []).some(u => String(u.institution || '').trim().toLowerCase() === needle)
    }

    async registerInstitution(input) {
        await delay()
        const users = await this.api.getUsers()
        const list = users.data || []
        const usernameTaken = list.some(u => String(u.username).toLowerCase() === input.username.trim().toLowerCase())
        if (usernameTaken) {
            const error = new Error('username-taken')
            error.code = 'username-taken'
            throw error
        }
        const institutionTaken = list.some(u => String(u.institution).toLowerCase() === input.institution.trim().toLowerCase())
        if (institutionTaken) {
            const error = new Error('institution-taken')
            error.code = 'institution-taken'
            throw error
        }
        const admin = new User({
            ...input,
            institution: input.institution.trim(),
            role: 'Triage Administrator',
            unit: 'Triaje'
        })
        const created = await this.api.createUser({ ...admin })
        return { ok: true, data: new User(created.data) }
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
     * Registers a staff account under the administrator's institution
     * (US55): the new user always inherits the admin's institution.
     * @param {Object} input - { username, password, names, surnames, role, unit, shift, institution }
     * @returns {Promise<{ok: true, data: User}>}
     */
    async createStaffUser(input) {
        await delay()
        const response = await this.api.createUser(input)
        return { ok: true, data: new User(response.data) }
    }

    /**
     * Updates a staff account (US55): profile, email, role, shift and
     * optionally the password. The institution cannot be changed here.
     * @param {string|number} id - User identifier.
     * @param {Object} input - Editable user fields.
     * @returns {Promise<{ok: true, data: User}>}
     */
    async updateStaffUser(id, input) {
        await delay()
        // PUT replaces the whole record: merge with the stored user so
        // fields not sent (like an untouched password) survive.
        const existing = await this.api.getUserById(id)
        const merged = { ...existing.data, ...input }
        const response = await this.api.updateUser(id, merged)
        return { ok: true, data: new User(response.data) }
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
