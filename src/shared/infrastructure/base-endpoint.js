import { session } from '../../shared/application/demo-session.js'

/**
 * Reusable endpoint client with CRUD operations over the backend
 * (json-server in development, Firebase RTDB in production). Adapts
 * RTDB responses to the { data: Array | Object } shape.
 *
 * Multi-tenancy: endpoints declared as tenantScoped automatically tag
 * created records with the signed-in institution and filter reads so an
 * institution never sees another one's clinical data. Catalogs (plans,
 * specialties, symptoms) and IAM stay global.
 *
 * Backend swap note: with the .NET API, tenancy will be enforced from
 * the session token server-side; this client-side filter remains as a
 * UX fast-path.
 */
export class BaseEndpoint {
    constructor(baseApi, endpointPath, { tenantScoped = false } = {}) {
        this.http = baseApi.http
        this.endpointPath = endpointPath
        // RTDB REST requires a .json suffix; json-server does not.
        this.suffix = baseApi.isRtdb ? '.json' : ''
        this.tenantScoped = tenantScoped
    }

    /** Filters a mapped collection down to the signed-in institution. */
    #tenant(list) {
        if (!this.tenantScoped || !session.institution) return list
        const mine = String(session.institution).trim().toLowerCase()
        return list.filter(r => String(r.institution || '').trim().toLowerCase() === mine)
    }

    /** GET collection: json-server returns an array; RTDB a map { id: item }. */
    getAll() {
        return this.http.get(`${this.endpointPath}${this.suffix}`).then(r => {
            let list = Array.isArray(r.data)
                ? r.data
                : Object.entries(r.data || {})
                    .filter(([, v]) => v !== null)
                    .map(([k, v]) => ({ id: v.id !== undefined ? v.id : k, ...v }))
            list = this.#tenant(list)
            r.data = list
            return r
        })
    }

    /** GET single item by key; tenant-scoped endpoints hide foreign records. */
    getById(id) {
        return this.http.get(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`).then(r => {
            if (this.tenantScoped && r.data && String(r.data.institution || '').trim().toLowerCase()
                !== String(session.institution || '').trim().toLowerCase()) {
                const error = new Error('record not found for this institution')
                error.code = 'not-found'
                throw error
            }
            return r
        })
    }

    /** POST: tags the record with the institution and generates an id on RTDB. */
    create(resource) {
        if (this.tenantScoped && session.institution && !resource.institution) {
            resource = { ...resource, institution: session.institution }
        }
        return this.http.post(`${this.endpointPath}${this.suffix}`, resource).then(r => {
            if (!r.data || !r.data.name) return r
            const id = r.data.name
            return { ...r, data: { ...resource, id } }
        })
    }

    /** PUT: full replace of the item; the institution tag is preserved. */
    update(id, resource) {
        if (this.tenantScoped && session.institution && !resource.institution) {
            resource = { ...resource, institution: session.institution }
        }
        return this.http.put(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`, resource)
    }

    /** DELETE item by key. */
    delete(id) {
        return this.http.delete(`${this.endpointPath}/${encodeURIComponent(id)}${this.suffix}`)
    }
}
