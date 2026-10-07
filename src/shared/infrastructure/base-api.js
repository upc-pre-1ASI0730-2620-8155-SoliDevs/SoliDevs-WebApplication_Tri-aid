import axios from 'axios'

const triAidApiUrl = import.meta.env.VITE_TRIAGE_PLATFORM_API_URL

/**
 * Cliente HTTP compartido de la plataforma Tri-Aid.
 * The base URL points to the fake backend (json-server) in development.
 * Mirrors the BaseApi class of the reference repository (learning-center).
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

    /** True when the backend is Firebase RTDB (REST API needs .json suffix). */
    get isRtdb() {
        return /firebaseio\.com|firebasedatabase\.app/.test(this.#http.defaults.baseURL || '')
    }
}
