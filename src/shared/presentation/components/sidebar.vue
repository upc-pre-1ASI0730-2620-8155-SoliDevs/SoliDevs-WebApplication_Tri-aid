<script setup>
import logo from '../../../assets/tri-aid-logo.png'
import { session } from '../../application/demo-session.js'
import { unreadCount } from '../../../alerting/application/alert-store.js'
import { t } from '../../application/i18n.js'

const items = [
  { key: 'nav.panel', icon: 'pi pi-home', to: '/panel' },
  { key: 'nav.patients', icon: 'pi pi-users', to: '/patient-registration' },
  { key: 'nav.alerts', icon: 'pi pi-bell', to: '/alerting', alerts: true },
  { key: 'nav.reports', icon: 'pi pi-file', to: '/reports' },
  { key: 'nav.devices', icon: 'pi pi-desktop', to: '/devices' },
  { key: 'nav.subscription', icon: 'pi pi-shield', to: '/subscriptions' }
]
</script>

<template>
  <aside class="sb">
    <header class="sb__brand">
      <img :src="logo" alt="Tri-Aid" />
      <div><strong>Tri-Aid</strong><small>{{ t('brand.sub') }}<span v-if="session.shift"> · {{ session.shift }}</span></small></div>
    </header>

    <nav class="sb__nav">
      <router-link v-for="it in items" :key="it.key" :to="it.to" class="sb__link">
        <i :class="it.icon"></i><span>{{ t(it.key) }}</span>
        <span v-if="it.alerts && unreadCount" class="sb__badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </router-link>
    </nav>

    <footer v-if="session.name" class="sb__foot">
      <div class="sb__user">
        <span class="sb__av">{{ session.initials }}</span>
        <div><b>{{ session.name }}</b><small>{{ session.unit }}</small></div>
      </div>
      <router-link to="/login" class="sb__out"><i class="pi pi-sign-out"></i><span>{{ t('nav.signOut') }}</span></router-link>
    </footer>
  </aside>
</template>

<style>
.sb{width:248px;flex:none;height:100vh;display:flex;flex-direction:column;background:var(--ta-ink);color:#d9e8df;padding:20px 12px 14px;box-sizing:border-box;font-family:var(--ta-font);letter-spacing:0;line-height:1.4;text-align:left}
.sb__brand{display:flex;align-items:flex-start;gap:10px;padding:0 8px 22px}
.sb__brand img{width:24px;height:24px;border-radius:6px;flex:none}
.sb__brand strong{display:block;font-size:14px;font-weight:600;line-height:24px;color:#fff}
.sb__brand small{display:block;font-family:var(--ta-mono);font-size:8px;letter-spacing:.1em;color:#7fa392;line-height:1.3}
.sb__nav{display:grid;gap:2px;align-content:start;flex:1}
.sb__link{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;color:#a9c2b4;text-decoration:none;font-size:13px;transition:background .2s,color .2s}
.sb__link i{font-size:14px;width:16px;text-align:center}
.sb__link:hover{background:rgba(255,255,255,.05);color:#fff}
.sb__link.router-link-active{background:#12382a;color:var(--ta-accent)}
.sb__badge{margin-left:auto;background:var(--ta-danger);color:#fff;font-size:10px;font-weight:600;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:grid;place-items:center;box-sizing:border-box}
.sb__foot{border-top:1px solid rgba(255,255,255,.08);padding-top:14px;display:grid;gap:10px}
.sb__user{display:flex;align-items:center;gap:10px;padding:0 8px}
.sb__av{width:26px;height:26px;border-radius:7px;background:#12382a;color:var(--ta-accent);display:grid;place-items:center;font-size:9px;font-weight:600;flex:none}
.sb__user b{display:block;font-size:12px;font-weight:600;color:#fff}
.sb__user small{display:block;font-size:10.5px;color:#7fa392}
.sb__out{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;color:#f2997b;text-decoration:none;font-size:12.5px;transition:background .2s}
.sb__out:hover{background:rgba(255,255,255,.05)}
</style>