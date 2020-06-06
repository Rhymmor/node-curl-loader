import { IConfig, IConfigClientNumber } from './types';
import { IValidationResult } from '../lib/validation';

export function validateConfig(config: IConfig): IValidationResult<IConfig> {
    const validConfig = { ...config };

    const clientsValidation = validateClientsNumber(config.clientsNumber);
    if (!clientsValidation.valid) {
        return clientsValidation;
    }
    validConfig.clientsNumber = clientsValidation.obj;

    return { valid: true, obj: validConfig };
}

function validateClientsNumber(clients: IConfigClientNumber): IValidationResult<IConfigClientNumber> {
    const validClients = { ...clients };

    for (const [key, value] of Object.entries(validClients)) {
        if (value < 0) {
            return { valid: false, details: `Clients numbers cannot be less that zero (${key} = ${value})` };
        }
    }

    if (validClients.full < validClients.initial) {
        console.warn('Initial clients number is greater than full one');
        validClients.initial = validClients.full;
    }
    if (validClients.full < validClients.initial + validClients.grow) {
        console.warn('Clients grow number will be decreased to match full number');
        validClients.grow = validClients.full - validClients.initial;
    }

    return { valid: true, obj: validClients };
}
