export class Alert{
    constructor(id,patientName,priority,vitalSign,dni,episode,time,value,safeRange,severity){
        this.id=id;
        this.patientName = patientName;
        this.priority = priority;
        this.vitalSign = vitalSign;
        this.dni = dni;
        this.episode = episode;
        this.time = time;
        this.value = value;
        this.safeRange = safeRange;
        this.severity=severity;
    }
}