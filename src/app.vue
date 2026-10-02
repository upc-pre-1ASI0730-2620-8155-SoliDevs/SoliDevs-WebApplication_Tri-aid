<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import './shared/presentation/styles/tokens.css'
import './shared/presentation/styles/ui.css'
import TheSidebar from './shared/presentation/components/sidebar.vue'
import NotificationBell from './alerting/presentation/components/notification-bell.vue'
import ToastHost from './shared/presentation/components/toast-host.vue'
import LangSwitch from './shared/presentation/components/lang-switch.vue'
import { t } from './shared/application/i18n.js'
import { session } from './shared/application/demo-session.js'

const route = useRoute()
const isAuth = computed(() => route.meta.layout === 'auth')
const scroller = ref(null)
const progress = ref(0)

function onScroll() {
  const el = scroller.value
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? el.scrollTop / max : 0
}
watch(() => route.fullPath, () => {
  scroller.value?.scrollTo({ top: 0, behavior: 'instant' })
  progress.value = 0
})
</script>

<template>
  <ToastHost />
  <LangSwitch v-if="isAuth" class="ls--float" />
  <router-view v-if="isAuth" v-slot="{ Component, route: r }">
    <Transition name="page" mode="out-in"><component :is="Component" :key="r.path" /></Transition>
  </router-view>

  <div v-else class="shell">
    <TheSidebar />
    <div class="shell__main">
      <header v-if="route.meta.titleKey" class="tb">
        <span class="tb__title">{{ t(route.meta.titleKey) }}</span>
        <div class="tb__right">
          <LangSwitch />
          <NotificationBell />
          <div v-if="session.name" class="tb__user"><span class="tb__av">{{ session.initials }}</span><span>{{ session.name }}</span></div>
        </div>
        <div class="tb__bar"><span :style="{ transform: `scaleX(${progress})` }"></span></div>
      </header>
      <main ref="scroller" class="content" @scroll.passive="onScroll">
        <router-view v-slot="{ Component, route: r }">
          <Transition name="page" mode="out-in"><component :is="Component" :key="r.path" /></Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
body { margin: 0; }
#app { border-inline: 0; }
.shell{display:flex;height:100vh;overflow:hidden;background:var(--ta-bg);font-family:var(--ta-font);color:var(--ta-text);letter-spacing:0;line-height:1.4;text-align:left}
.shell__main{flex:1;min-width:0;display:flex;flex-direction:column}
.tb{position:relative;flex:none;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;background:var(--ta-surface);border-bottom:1px solid var(--ta-line);z-index:5}
.tb__title{font-size:14px;font-weight:600}
.tb__right{display:flex;align-items:center;gap:18px}
.tb__user{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600}
.tb__av{width:24px;height:24px;border-radius:50%;background:#d6eedd;color:var(--ta-brand);display:grid;place-items:center;font-size:9px;font-weight:600}
.tb__bar{position:absolute;left:0;right:0;bottom:-1px;height:2px;pointer-events:none}
.tb__bar span{display:block;height:100%;background:var(--ta-accent);transform-origin:left;transition:transform .1s linear}
.content{flex:1;overflow-y:auto;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--ta-brand) transparent}
.content::-webkit-scrollbar{width:8px}
.content::-webkit-scrollbar-thumb{background:var(--ta-brand);border-radius:8px}
</style>