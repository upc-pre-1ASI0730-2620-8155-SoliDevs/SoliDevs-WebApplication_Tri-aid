<script setup>
import { useRoute } from 'vue-router'
import { t } from '../../application/i18n.js'
const route = useRoute()
</script>

<template>
  <div class="ta-page">
    <section class="ta-card">
      <h3 class="ta-h">{{ t(route.meta.titleKey) }}</h3>
      <p class="ta-sub" style="margin:0">{{ t('common.soon') }}</p>
    </section>
  </div>
</template>