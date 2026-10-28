<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { iamStore } from '../../application/iam-store.js'
import { notify } from '../../../shared/application/toast-store.js'

const { t } = useI18n()
const users = ref([])
const loading = ref(false)
const busy = ref(false)
const pageGrid = ref(null)
const modalCard = ref(null)

// null = closed; 'new' = creating; a user id = editing that record.
const editing = ref(null)
const form = ref({})
const errors = ref({})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Field-level validation for the staff account form. */
function validate() {
    const f = form.value
    const e = {}
    if (!String(f.username || '').trim()) e.username = t('um.errRequired')
    else if (String(f.username).trim().length < 4) e.username = t('um.errUsernameShort')
    if (editing.value === 'new') {
        if (!f.password) e.password = t('um.errRequired')
        else if (f.password.length < 6) e.password = t('um.errPasswordShort')
    } else if (f.password && f.password.length < 6) {
        e.password = t('um.errPasswordShort')
    }
    if (!String(f.names || '').trim()) e.names = t('um.errRequired')
    if (f.email && !EMAIL_RE.test(f.email)) e.email = t('um.errEmail')
    errors.value = e
    return Object.keys(e).length === 0
}

const roles = ['Triage Administrator', 'Triage Nurse', 'Emergency Physician']
const shifts = ['Morning', 'Evening', 'Night']

const institution = computed(() => iamStore.user?.institution || '')

/** Admins are symmetric: a peer admin can never edit another admin. */
function isAdminRole(role) {
    return String(role || '').toLowerCase().includes('admin')
}
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function blankForm() {
    return { username: '', password: '', names: '', surnames: '', email: '', role: 'Triage Nurse', shift: 'Morning' }
}

async function load() {
    loading.value = true
    try {
        const response = await iamStore.service.api.getUsers()
        users.value = (response.data || []).filter(u => u.institution === institution.value)
    } finally {
        loading.value = false
    }
}

function startCreate() {
    form.value = blankForm()
    errors.value = {}
    editing.value = 'new'
}

function startEdit(user) {
    form.value = { ...user, password: '' }
    errors.value = {}
    editing.value = user.id
}

function cancel() {
    editing.value = null
    form.value = blankForm()
    errors.value = {}
}

async function submit() {
    if (!validate()) return
    // Username must stay unique within the platform (case-insensitive).
    const name = String(form.value.username || '').trim().toLowerCase()
    const taken = users.value.some(u =>
        String(u.id) !== String(editing.value) &&
        String(u.username || '').trim().toLowerCase() === name)
    if (taken) {
        notify({ type: 'error', title: t('um.usernameTaken') })
        return
    }
    busy.value = true
    try {
        if (editing.value === 'new') {
            await iamStore.service.createStaffUser({ ...form.value, institution: institution.value })
            notify({ type: 'success', title: t('um.created') })
        } else {
            const payload = { ...form.value }
            if (!payload.password) delete payload.password
            await iamStore.service.updateStaffUser(editing.value, payload)
            notify({ type: 'success', title: t('um.updated') })
        }
        cancel()
        await load()
    } catch {
        notify({ type: 'error', title: t('um.error') })
    } finally {
        busy.value = false
    }
}

/* Modal GSAP hooks: fade/scale in, shrink out (same language as checkout). */
function onModalEnter(el, done) {
    if (reduce()) { done(); return }
    const card = el.querySelector('.um-modal__card')
    gsap.timeline({ onComplete: done })
        .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' })
        .fromTo(card, { y: 26, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.05)
        .fromTo(card.querySelectorAll('.um-field'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power3.out' }, 0.15)
}

function onModalLeave(el, done) {
    if (reduce()) { done(); return }
    const card = el.querySelector('.um-modal__card')
    gsap.timeline({ onComplete: done })
        .to(card, { y: 18, scale: 0.95, opacity: 0, duration: 0.22, ease: 'power2.in' })
        .to(el, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.08)
}

onMounted(async () => {
    await load()
    await nextTick()
    if (reduce() || !pageGrid.value) return
    // Staggered card entrance, same language as the other modules.
    gsap.fromTo(pageGrid.value.querySelectorAll('.um-in'),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'all' })
})
</script>

<template>
    <div ref="pageGrid" class="ta-page">
        <section class="ta-card um-in um-head">
            <div>
                <h3 class="ta-h">{{ t('um.title') }}</h3>
                <p class="ta-sub">{{ t('um.sub') }}</p>
            </div>
            <button class="ta-btn" @click="startCreate">{{ t('um.new') }}</button>
        </section>

        <p class="um-inst um-in">
            <i class="pi pi-hospital"></i>
            {{ t('um.institution') }}: <b>{{ institution }}</b>
        </p>

        <section class="ta-card um-in">
            <table class="um-table">
                <thead>
                    <tr>
                        <th>{{ t('um.username') }}</th>
                        <th>{{ t('um.fullName') }}</th>
                        <th>{{ t('um.email') }}</th>
                        <th>{{ t('um.role') }}</th>
                        <th>{{ t('um.shift') }}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="u in users" :key="u.id">
                        <td>{{ u.username }}</td>
                        <td>
                            {{ u.names }} {{ u.surnames }}
                            <span v-if="isAdminRole(u.role)" class="um-badge">{{ t('um.adminBadge') }}</span>
                        </td>
                        <td>{{ u.email || '—' }}</td>
                        <td>{{ u.role }}</td>
                        <td>{{ u.shift }}</td>
                        <td class="um-row-actions">
                            <button v-if="!isAdminRole(u.role)" class="um-edit" @click="startEdit(u)">
                                <i class="pi pi-pencil"></i> {{ t('um.edit') }}
                            </button>
                            <span v-else class="um-locked" :title="t('um.adminProtected')">
                                <i class="pi pi-lock"></i> {{ t('um.adminProtected') }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p v-if="!loading && !users.length" class="ta-sub">{{ t('um.empty') }}</p>
        </section>

        <Transition :css="false" @enter="onModalEnter" @leave="onModalLeave">
            <div v-if="editing !== null" class="um-modal" @click.self="cancel">
                <div ref="modalCard" class="ta-card um-modal__card" role="dialog" aria-modal="true">
                    <h4 class="ta-h">{{ editing === 'new' ? t('um.new') : t('um.editTitle') }}</h4>
                    <form @submit.prevent="submit" novalidate>
                        <div class="um-grid">
                            <div class="um-field">
                                <label>{{ t('um.username') }} *</label>
                                <input class="ta-input" :class="{ bad: errors.username }" v-model="form.username" @input="delete errors.username" />
                                <small v-if="errors.username" class="um-err">{{ errors.username }}</small>
                            </div>
                            <div class="um-field">
                                <label>{{ t('login.pass') }} {{ editing === 'new' ? '*' : '' }}</label>
                                <input class="ta-input" :class="{ bad: errors.password }" v-model="form.password" type="password" :placeholder="editing === 'new' ? '' : t('um.passKeep')" @input="delete errors.password" />
                                <small v-if="errors.password" class="um-err">{{ errors.password }}</small>
                            </div>
                            <div class="um-field">
                                <label>{{ t('um.names') }} *</label>
                                <input class="ta-input" :class="{ bad: errors.names }" v-model="form.names" @input="delete errors.names" />
                                <small v-if="errors.names" class="um-err">{{ errors.names }}</small>
                            </div>
                            <div class="um-field"><label>{{ t('um.surnames') }}</label><input class="ta-input" v-model="form.surnames" /></div>
                            <div class="um-field">
                                <label>{{ t('um.email') }}</label>
                                <input class="ta-input" :class="{ bad: errors.email }" v-model="form.email" type="email" @input="delete errors.email" />
                                <small v-if="errors.email" class="um-err">{{ errors.email }}</small>
                            </div>
                            <div class="um-field"><label>{{ t('um.role') }}</label>
                                <select class="ta-select" v-model="form.role">
                                    <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                                </select>
                            </div>
                            <div class="um-field"><label>{{ t('um.shift') }}</label>
                                <select class="ta-select" v-model="form.shift">
                                    <option v-for="s in shifts" :key="s" :value="s">{{ s }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="um-actions">
                            <button type="button" class="ta-btn ta-btn--ghost" @click="cancel">{{ t('um.cancel') }}</button>
                            <button type="submit" class="ta-btn" :disabled="busy">
                                {{ busy ? t('um.saving') : (editing === 'new' ? t('um.create') : t('um.save')) }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.um-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.um-inst { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 0.85rem; color: var(--ta-text); }
.um-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.um-table th, .um-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--ta-line); }
.um-table th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ta-muted); }
.um-table tbody tr:hover { background: color-mix(in srgb, var(--ta-brand) 4%, transparent); }
.um-row-actions { text-align: right; }
.um-edit { border: 1px solid var(--ta-line); background: transparent; color: var(--ta-text); border-radius: 8px; padding: 5px 10px; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color .2s, color .2s; }
.um-edit:hover { border-color: var(--ta-brand); color: var(--ta-brand); }
.um-badge { margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--ta-brand) 14%, transparent); color: var(--ta-brand); font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.um-locked { display: inline-flex; align-items: center; gap: 6px; color: var(--ta-muted); font-size: 0.75rem; cursor: not-allowed; }
.um-err { color: var(--ta-danger, #c8372d); font-size: 0.72rem; }

.um-modal { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 20px; background: rgba(6, 26, 18, 0.55); backdrop-filter: blur(3px); }
.um-modal__card { width: min(640px, 100%); max-height: calc(100vh - 60px); overflow-y: auto; }
.um-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 16px 0 18px; }
.um-field { display: grid; gap: 6px; }
.um-field label { font-size: 11.5px; font-weight: 500; color: var(--ta-muted); }
.um-actions { display: flex; justify-content: flex-end; gap: 10px; }
</style>
