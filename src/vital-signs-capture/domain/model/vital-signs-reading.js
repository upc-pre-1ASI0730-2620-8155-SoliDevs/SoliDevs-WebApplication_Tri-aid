/**
 * ReadingSource: how a vital sign value entered the system.
 * @readonly
 */
export const ReadingSource = {
    Auto: 'auto',
    Manual: 'manual'
}

/**
 * ReadingStatus: lifecycle of a set of readings.
 * Pending -> captured values awaiting confirmation.
 * Confirmed -> the staff validated the readings (VitalsConfirmedEvent fires).
 * Rejected -> the staff discarded the readings.
 * @readonly
 */
export const ReadingStatus = {
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    Rejected: 'Rejected'
}
