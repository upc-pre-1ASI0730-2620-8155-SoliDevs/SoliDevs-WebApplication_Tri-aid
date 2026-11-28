<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { iamStore } from '../../application/iam-store.js'
import { subscriptionStore } from '../../../subscription/application/subscription-store.js'
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

// Seat limit of the contracted plan (maxUsers; 0 = unlimited).
const seats = computed(() => subscriptionStore.seatInfo(users.value.length))
const seatsLabel = computed(() =>
    seats.value.unlimited ? t('um.seatsUnlimited') : `${users.value.length} / ${seats.value.limit}`)

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

// The API stores role and shift in English; show them in the UI language.
const roleLabel = r => t('role.' + r, r)
const shiftLabel = sh => t('shift.' + sh, sh)
const initialsOf = u => `${(u.names || '')[0] || ''}${(u.surnames || '')[0] || ''}`.toUpperCase() || '?'
const query = ref('')
const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return users.value
    return users.value.filter(u => [u.names, u.surnames, u.username, u.email, roleLabel(u.role), shiftLabel(u.shift)]
        .some(v => String(v || '').toLowerCase().includes(q)))
})
const roleKey = r => String(r || '').toLowerCase().includes('admin') ? 'admin' : String(r || '').toLowerCase().includes('nurse') ? 'nurse' : 'physician'

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
    if (seats.value.atLimit) {
        notify({ type: 'error', title: t('um.limitReachedTitle'), detail: t('um.limitReached', { limit: seats.value.limit }) })
        return
    }
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
    gsap.fromTo(pageGrid.value.querySelectorAll('.um-in'),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'all' })
})
</script>

<template>
    <div ref="pageGrid" class="ta-page">
        <section class="ta-card">
            <div class="um-top">
                <div>
                    <h3 class="ta-h">{{ t('um.people') }}</h3>
                    <p class="ta-sub">{{ institution }} · {{ seatsLabel }}</p>
                </div>
                <button class="ta-btn" @click="startCreate">
                    <i class="pi pi-plus"></i>{{ t('um.new') }}
                </button>
            </div>

            <div v-if="users.length" class="um-search">
                <i class="pi pi-search"></i>
                <input v-model="query" type="search" class="ta-input" :placeholder="t('um.search')" :aria-label="t('um.search')" />
            </div>

            <TransitionGroup v-if="filtered.length" name="list" tag="div" class="um-list">
                <div v-for="u in filtered" :key="u.id" class="um-row" :class="{ 'um-row--admin': isAdminRole(u.role) }">
                    <span class="um-av" :class="`um-av--${roleKey(u.role)}`">{{ initialsOf(u) }}</span>
                    <div class="um-who">
                        <b>{{ u.names }} {{ u.surnames }} <span v-if="u.id === iamStore.user?.id" class="um-self">{{ t('um.self') }}</span></b>
                        <small class="mono">{{ u.username }} · {{ u.email }}</small>
                    </div>
                    <span class="um-rolechip" :class="`um-rolechip--${roleKey(u.role)}`">{{ roleLabel(u.role) }}</span>
                    <span class="um-shift">{{ shiftLabel(u.shift) }}</span>
                    <button v-if="!isAdminRole(u.role)" class="ta-btn ta-btn--ghost ta-btn--sm um-edit" @click="startEdit(u)">
                        <i class="pi pi-pencil"></i>{{ t('um.edit') }}
                    </button>
                    <span v-else class="um-locked" :title="t('um.adminProtected')">
                        <i class="pi pi-lock"></i>{{ t('um.adminNote') }}
                    </span>
                </div>
            </TransitionGroup>
            <p v-else-if="users.length && query" class="um-empty">
                <b>{{ t('um.noResults') }}</b>
            </p>
        </section>
        <p v-if="!loading && !users.length" class="ta-sub">{{ t('um.empty') }}</p>

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
                                    <option v-for="r in roles" :key="r" :value="r">{{ roleLabel(r) }}</option>
                                </select>
                            </div>
                            <div class="um-field"><label>{{ t('um.shift') }}</label>
                                <select class="ta-select" v-model="form.shift">
                                    <option v-for="s in shifts" :key="s" :value="s">{{ shiftLabel(s) }}</option>
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
.um-head__right{display:flex;align-items:center;gap:12px}
.um-seats{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;background:#eef5f1;border:1px solid var(--ta-line);color:var(--ta-muted);font-size:.82rem;font-weight:600;font-family:var(--ta-mono)}
.um-seats--near{background:#fdf4e0;border-color:#efd9a8;color:#9a6d10}
.um-seats--full{background:var(--ta-danger-bg);border-color:var(--ta-danger-line);color:var(--ta-danger)}
.um-limit{display:flex;align-items:center;gap:10px;margin:0;padding:12px 16px;border-radius:10px;background:var(--ta-danger-bg);border:1px solid var(--ta-danger-line);color:var(--ta-danger);font-size:.86rem}
.um-limit a{margin-left:auto;color:var(--ta-danger);font-weight:600;text-decoration:underline;white-space:nowrap}

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

.um-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.um-grid .um-full{grid-column:1/-1}

/* ── Lista de personal: mismo patrón que la lista de pacientes ── */
.um-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.um-top .ta-btn{text-decoration:none}
.um-search{position:relative;margin-bottom:14px}
.um-search i{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--ta-muted);pointer-events:none}
.um-search .ta-input{padding-left:36px}
.um-list{display:grid;gap:8px}
.um-row{display:grid;grid-template-columns:36px minmax(0,1.6fr) 170px 80px 150px;gap:14px;align-items:center;padding:12px 14px;border:1px solid var(--ta-line);border-radius:12px;background:#fff;transition:border-color .2s,transform .2s,box-shadow .2s}
.um-row:hover{border-color:var(--ta-brand);transform:translateY(-1px);box-shadow:0 6px 18px -12px rgba(10,107,56,.35)}
.um-row--admin{box-shadow:inset 3px 0 0 var(--ta-brand)}
.um-av{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:600;color:#fff}
.um-av--admin{background:var(--ta-brand)}
.um-av--nurse{background:#2d6a8a}
.um-av--physician{background:#6d28d9}
.um-who{display:grid;min-width:0}
.um-who b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:8px}
.um-who small{font-size:11px;color:var(--ta-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.um-self{font-size:10px;font-weight:600;color:var(--ta-brand);background:#d3f1d9;border-radius:999px;padding:2px 8px;line-height:1.4}
.um-rolechip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:500;white-space:nowrap;justify-self:start}
.um-rolechip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.um-rolechip--admin{background:#d3f1d9;color:var(--ta-brand)}
.um-rolechip--nurse{background:#e3eef6;color:#2d6a8a}
.um-rolechip--physician{background:#ede9fe;color:#6d28d9}
.um-shift{font-size:12px;color:var(--ta-muted);white-space:nowrap}
.um-edit{justify-self:end}
.um-locked{display:inline-flex;align-items:center;justify-self:end;gap:6px;font-size:11px;color:var(--ta-muted);white-space:nowrap}
.um-locked .pi{font-size:12px}
.um-empty{display:grid;justify-items:center;gap:4px;padding:28px 12px;text-align:center;color:var(--ta-muted);font-size:12.5px}
@media(max-width:760px){
  .um-row{grid-template-columns:36px minmax(0,1fr) 14px;row-gap:8px}
  .um-who{grid-column:2}
  .um-rolechip{grid-column:2;justify-self:start}
  .um-shift{grid-column:2;font-size:11px}
  .um-edit,.um-locked{grid-column:1/-1;justify-self:start}
  .um-top{flex-direction:column;align-items:stretch}
  .um-top .ta-btn{width:100%}
}
</style>
