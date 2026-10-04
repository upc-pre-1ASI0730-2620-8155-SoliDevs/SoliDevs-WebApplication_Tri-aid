// Estado en memoria del Bounded Context Triage Classification.
// TODO: reemplazar por llamadas al API (ASP.NET Core) cuando exista el backend.
import { reactive, computed } from 'vue'
import { Classification } from '../domain/model/classification.entity.js'

export const triageStore = reactive({ classifications: [] })

export const findClassification = episodeId =>
  triageStore.classifications.find(c => c.episodeId === episodeId) || null

export const saveClassification = classification => {
  const i = triageStore.classifications.findIndex(c => c.episodeId === classification.episodeId)
  if (i >= 0) triageStore.classifications[i] = classification
  else triageStore.classifications.push(classification)
  return classification
}

export const levelOfEpisode = episodeId => findClassification(episodeId)?.level || null

export const pendingCount = computed(() =>
  triageStore.classifications.filter(c => !c.isConfirmed).length)

/** Tiempo de ciclo del triaje en minutos: llegada → confirmación (US24). */
export const cycleMinutes = episode => {
  const c = findClassification(episode?.id)
  if (!c?.confirmedAt || !episode?.arrival) return null
  const ms = new Date(c.confirmedAt) - new Date(episode.arrival)
  return Math.max(0, Math.round(ms / 60000))
}
