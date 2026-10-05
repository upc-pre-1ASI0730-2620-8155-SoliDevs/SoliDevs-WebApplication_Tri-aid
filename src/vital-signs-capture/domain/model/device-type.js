/**
 * DeviceType catalog of the Vital Signs Capture bounded context.
 * Each device type measures one vital sign with its unit, input
 * placeholder, valid range and a demo sample generator (no real
 * hardware yet).
 */
export const DeviceType = [
    { key: 'pa', label: 'Presión arterial', device: 'Tensiómetro', unit: 'mmHg', ph: 'Sistólica', lim: [50, 260],
        sample: () => { const s = rnd(95, 160); return `${s}/${rnd(60, Math.min(100, s - 15))}` } },
    { key: 'spo2', label: 'SpO₂', device: 'Oxímetro', unit: '%', ph: '98', lim: [50, 100], sample: () => String(rnd(88, 100)) },
    { key: 'fc', label: 'Frecuencia cardíaca', device: 'Pulsímetro', unit: 'lpm', ph: '72', lim: [20, 250], sample: () => String(rnd(55, 120)) },
    { key: 'temp', label: 'Temperatura', device: 'Termómetro', unit: '°C', ph: '36.5', lim: [30, 45], sample: () => (35.5 + Math.random() * 3.4).toFixed(1) }
]

function rnd(a, b) {
    return Math.round(a + Math.random() * (b - a))
}

export const deviceTypeOf = key => DeviceType.find(t => t.key === key) || null
