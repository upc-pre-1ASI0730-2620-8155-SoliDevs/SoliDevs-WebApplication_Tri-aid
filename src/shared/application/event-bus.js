/**
 * Minimal application event bus used to propagate domain events across
 * bounded contexts (e.g. VitalsConfirmedEvent consumed by Incidents).
 */
const listeners = {}

export function on(event, handler) {
    (listeners[event] = listeners[event] || []).push(handler)
}

export function emit(event, payload) {
    for (const handler of listeners[event] || []) handler(payload)
}
