import axios from 'axios'

const triAidApiUrl = import.meta.env.VITE_TRIAGE_PLATFORM_API_URL

/**
 * Cliente HTTP compartido de la plataforma Tri-Aid.
 * La URL base apunta al backend falso (json-server) en desarrollo.
 * Espeja la clase BaseApi del repositorio de referencia (learning-center).
 */
export class BaseApi {
    #http

    constructor() {
        this.#http = axios.create({
            baseURL: triAidApiUrl,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    get http() {
        return this.#http
    }
}
