/**
 * Cliente de endpoints reutilizable con operaciones CRUD sobre una coleccion.
 * Espeja la clase BaseEndpoint del repositorio de referencia (learning-center).
 */
export class BaseEndpoint {
    constructor(baseApi, endpointPath) {
        this.http = baseApi.http
        this.endpointPath = endpointPath
    }

    getAll() {
        return this.http.get(this.endpointPath)
    }

    getById(id) {
        return this.http.get(`${this.endpointPath}/${id}`)
    }

    create(resource) {
        return this.http.post(this.endpointPath, resource)
    }

    update(id, resource) {
        return this.http.put(`${this.endpointPath}/${id}`, resource)
    }

    delete(id) {
        return this.http.delete(`${this.endpointPath}/${id}`)
    }
}
