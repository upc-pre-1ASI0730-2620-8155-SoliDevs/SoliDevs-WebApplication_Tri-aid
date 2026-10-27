<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { iamStore } from '../../application/iam-store.js'
import { session } from '../../../shared/application/demo-session.js'
import { notify } from '../../../shared/application/toast-store.js'

const { t } = useI18n()
const pageGrid = ref(null)
const busy = ref(false)
const saved = ref(false)
const editing = ref(false)
const form = ref({})

const user = computed(() => iamStore.user || {})
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const initials = computed(() => {
    const a = String(user.value.names || ' ')[0] || ''
    const b = String(user.value.surnames || ' ')[0] || ''
    return (a + b).toUpperCase()
})

function startEdit() {
    form.value = {
        names: user.value.names || '',
        surnames: user.value.surnames || '',
        email: user.value.email || '',
        password: ''
    }
    editing.value = true
}

function cancelEdit() {
    editing.value = false
}

function valid() {
    const f = form.value
    return Boolean(f.names) && (
        f.names !== (user.value.names || '') ||
        f.surnames !== (user.value.surnames || '') ||
        f.email !== (user.value.email || '') ||
        Boolean(f.password))
}

async function submit() {
    busy.value = true
    saved.value = false
    try {
        const payload = { names: form.value.names, surnames: form.value.surnames, email: form.value.email }
        if (form.value.password) payload.password = form.value.password
        await iamStore.updateOwnProfile(payload)
        editing.value = false
        saved.value = true
        notify({ type: 'success', title: t('pr.savedToast') })
        setTimeout(() => { saved.value = false }, 2500)
    } catch {
        notify({ type: 'error', title: t('pr.error') })
    } finally {
        busy.value = false
    }
}

/* Slide/fade between view and edit states. */
function animateSwitch(target) {
    if (reduce() || !pageGrid.value) return
    const el = pageGrid.value.querySelector(target)
    if (el) gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'all' })
}

/* GSAP: entering edit mode animates the form and staggers its fields;
   leaving it brings the facts card back. */
watch(editing, async (isEditing) => {
    await nextTick()
    if (isEditing) {
        if (reduce() || !pageGrid.value) return
        const card = pageGrid.value.querySelector('.pr-form')
        if (!card) return
        gsap.timeline()
            .fromTo(card, { opacity: 0, y: 18, scale: 0.98 },
                { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.4)', clearProps: 'transform' })
            .fromTo(card.querySelectorAll('.pr-field'),
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power3.out' }, 0.12)
            .fromTo(card.querySelector('.pr-actions'),
                { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.3)
    } else {
        animateSwitch('.pr-facts')
        // The header name may have changed: refresh it too.
        if (session.name !== [user.value.names, user.value.surnames].filter(Boolean).join(' ')) {
            session.name = [user.value.names, user.value.surnames].filter(Boolean).join(' ')
        }
    }
})

onMounted(async () => {
    await nextTick()
    if (reduce() || !pageGrid.value) return
    gsap.fromTo(pageGrid.value.querySelectorAll('.pr-in'),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out', clearProps: 'all' })
})
</script>

<template>
    <div ref="pageGrid" class="ta-page">
        <section class="ta-card pr-head pr-in">
            <span class="pr-avatar">{{ initials }}</span>
            <div class="pr-head__id">
                <h3 class="ta-h">{{ user.names }} {{ user.surnames }}</h3>
                <p class="ta-sub">@{{ user.username }} · {{ user.role }}</p>
            </div>
            <button v-if="!editing" class="ta-btn pr-head__edit" @click="startEdit">
                <i class="pi pi-pencil"></i> {{ t('pr.edit') }}
            </button>
        </section>

        <section v-if="!editing" class="ta-card pr-facts pr-in">
            <div class="pr-fact"><span>{{ t('um.email') }}</span><b>{{ user.email || '—' }}</b></div>
            <div class="pr-fact"><span>{{ t('um.institution') }}</span><b>{{ user.institution }}</b></div>
            <div class="pr-fact"><span>{{ t('um.role') }}</span><b>{{ user.role }}</b></div>
            <div class="pr-fact"><span>{{ t('um.shift') }}</span><b>{{ user.shift }}</b></div>
        </section>

        <section v-else class="ta-card pr-form">
            <h4 class="ta-h">{{ t('pr.editTitle') }}</h4>
            <p class="ta-sub">{{ t('pr.editSub') }}</p>
            <form @submit.prevent="submit" novalidate>
                <div class="pr-grid">
                    <div class="pr-field"><label>{{ t('um.names') }}</label><input class="ta-input" v-model="form.names" required /></div>
                    <div class="pr-field"><label>{{ t('um.surnames') }}</label><input class="ta-input" v-model="form.surnames" /></div>
                    <div class="pr-field"><label>{{ t('um.email') }}</label><input class="ta-input" v-model="form.email" type="email" /></div>
                    <div class="pr-field">
                        <label>{{ t('login.pass') }}</label>
                        <input class="ta-input" v-model="form.password" type="password" :placeholder="t('pr.passKeep')" />
                    </div>
                </div>
                <div class="pr-actions">
                    <transition name="pr-check">
                        <span v-if="saved" class="pr-saved"><i class="pi pi-check-circle"></i> {{ t('pr.saved') }}</span>
                    </transition>
                    <button type="button" class="ta-btn ta-btn--ghost" @click="cancelEdit">{{ t('um.cancel') }}</button>
                    <button type="submit" class="ta-btn" :disabled="busy || !valid()">
                        {{ busy ? t('pr.saving') : t('um.save') }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>

<style scoped>
.pr-head { display: flex; align-items: center; gap: 16px; }
.pr-head__id { min-width: 0; }
.pr-head__edit { margin-left: auto; }
.pr-avatar { width: 54px; height: 54px; border-radius: 14px; background: #d9efe2; color: var(--ta-brand); border: 1px solid var(--ta-line); display: grid; place-items: center; font-size: 17px; font-weight: 600; flex: none; }
.pr-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.pr-fact { display: grid; gap: 3px; }
.pr-fact span { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ta-muted); }
.pr-fact b { font-size: 0.88rem; overflow-wrap: anywhere; }
.pr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 14px 0 18px; }
.pr-field { display: grid; gap: 6px; }
.pr-field label { font-size: 11.5px; font-weight: 500; color: var(--ta-muted); }
.pr-actions { display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
.pr-saved { display: inline-flex; align-items: center; gap: 6px; color: var(--ta-brand); font-size: 0.8rem; font-weight: 600; }
.pr-check-enter-active, .pr-check-leave-active { transition: opacity .25s, transform .25s; }
.pr-check-enter-from, .pr-check-leave-to { opacity: 0; transform: translateY(4px); }
</style>
