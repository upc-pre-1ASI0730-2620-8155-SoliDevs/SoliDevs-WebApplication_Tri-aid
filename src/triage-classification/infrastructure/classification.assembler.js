/**
 * Traduce entre el resource plano del backend falso y la entidad de dominio
 * Classification (aggregate root del bounded context).
 */
import { Classification } from '../domain/model/classification.entity.js'
import { ClassificationResource } from './classification.resource.js'

export class ClassificationAssembler {
    static toEntity(resource) {
        if (!resource) return null
        return new Classification({
            id: resource.id,
            episodeId: resource.episodeId,
            level: resource.level,
            suggestedLevel: resource.suggestedLevel,
            state: resource.state,
            overriddenBy: resource.overriddenBy,
            justification: resource.justification,
            suggestedAt: resource.suggestedAt,
            confirmedAt: resource.confirmedAt
        })
    }

    static toResource(entity) {
        return new ClassificationResource({
            id: entity.id,
            episodeId: entity.episodeId,
            level: entity.level,
            suggestedLevel: entity.suggestedLevel,
            state: entity.state,
            overriddenBy: entity.overriddenBy,
            justification: entity.justification,
            suggestedAt: entity.suggestedAt,
            confirmedAt: entity.confirmedAt
        })
    }
}
