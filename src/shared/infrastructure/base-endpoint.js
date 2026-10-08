/**
 * Reusable endpoint client with CRUD operations over Firebase Realtime
 * Database (REST API). Adapts the RTDB responses to the shape previously
 * provided by json-server ({ data: Array | Object }).
 * Mirrors the BaseEndpoint class of the reference repository (learning-center).
 */
export class BaseEndpoint {
    constructor(baseApi, endpointPath) {
        this.http = baseApi.http
        this.endpointPath = endpointPath
        this.suffix = baseApi.isRtdb ? '.json' : ''
    }

    /** GET collection: json-server returns an array; RTDB a map { id: item }. */
    getAll() {
        return this.http.get(`${this.endpointPath}${this.suffix}`).then(r => {
            if (Array.isArray(r.data)) return r
            const map = r.data || {}
            r.data = Object.entries(map)
                .filter(([, v]) => v !== null)
                .map(([k, v]) => ({ id: v.id !== undefined ? v.id : k, ...v }))
            return r
        })
    }

    /** GET single item by key. */
    getById(id) {
        return this.http.get(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`)
    }

    /** POST: RTDB generates a push id ({ name }) -> merged into the resource. */
    create(resource) {
        return this.http.post(`${this.endpointPath}${this.suffix}`, resource).then(r => {
            if (!r.data || !r.data.name) return r
            const id = r.data.name
            return { ...r, data: { ...resource, id } }
        })
    }

    /** PUT: full replace of the item under its key. */
    update(id, resource) {
        return this.http.put(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`, resource)
    }

    /** DELETE item by key. */
    delete(id) {
        return this.http.delete(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`)
    }
}
