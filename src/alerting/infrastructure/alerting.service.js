import {Alert} from '../domain/model/alert.entity.js';

export class AlertingService {

    async getActiveAlerts() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    data: [
                        new Alert(1, 'Flores Rojas, Ana Lucía', 'I', 'SpO2', '09871234', 'EP-240911-0041', '11:05', '89 %', '94-100 %', 'critical'),
                        new Alert(2, 'Ramírez Torres, Diego', 'II', 'Frecuencia cardíaca', '71203485', 'EP-240911-0039', '10:58', '128 lpm', '60-100 lpm', 'warning'),
                        new Alert(3, 'Quispe Mamani, Julia', 'III', 'Presión arterial', '45781203', 'EP-240911-0034', '09:50', '168/104 mmHg', '< 140/90 mmHg', 'warning')
                    ]
                });
            }, 300);
        });
    }
}