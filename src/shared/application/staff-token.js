/**
 * Staff session token. The API issues a JWT on sign-in; every data request
 * attaches it so the backend can authorize (vouchers, patients, ...).
 * Stored apart from the patient portal token so the two sessions never mix.
 */
const KEY = 'triaid.staff.token'

export function setStaffToken(token) { try { localStorage.setItem(KEY, token) } catch {} }
export function getStaffToken() { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
export function clearStaffToken() { try { localStorage.removeItem(KEY) } catch {} }
