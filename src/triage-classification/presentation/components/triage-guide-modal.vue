<script setup>
// Guia de la Norma Tecnica N. 158-MINSA (US23): parametros sobrepuestos a la vista.
import { TRIAGE_LEVELS } from '../../domain/model/triage-level.js'
import { t } from '../../../shared/application/i18n.js'

defineProps({ title: String, sub: String, closeLabel: String })
defineEmits(['close'])
</script>

<template>
    <div class="tg-overlay" @click.self="$emit('close')">
        <div class="ta-card tg-modal">
            <h3 class="ta-h">{{ title }}</h3>
            <p class="ta-sub">{{ sub }}</p>
            <ul>
                <li v-for="l in TRIAGE_LEVELS" :key="l.code">
                    <span class="tg-code" :style="{ background: l.color }">{{ l.code }}</span>
                    <div>
                        <b>{{ t('triage.level.' + l.code + '.name') }}</b>
                        <small>{{ t('triage.level.' + l.code + '.range') }}</small>
                    </div>
                </li>
            </ul>
            <div class="tg-actions">
                <button class="ta-btn" @click="$emit('close')">{{ closeLabel }}</button>
            </div>
        </div>
    </div>
</template>


<style scoped>
.tg-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.tg-modal{width:min(520px,100%);display:grid;gap:10px}
.tg-modal ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:10px}
.tg-modal li{display:flex;gap:12px;align-items:flex-start}
.tg-code{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;flex:none}
.tg-modal li small{display:block;color:var(--ta-muted);font-size:11.5px}
.tg-actions{display:flex;justify-content:flex-end;margin-top:6px}
</style>
