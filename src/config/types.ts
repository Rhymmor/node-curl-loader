export interface IConfig {
    clientsNumber: IConfigClientNumber;
    network: IConfigNetwork;
    loops?: number;
    durationSec: number;
    urls: IConfigUrl[];
}

export interface IConfigClientNumber {
    full: number;
    initial: number;
    grow: number;
}

export interface IConfigUrl {
    url: string;
    method: string;
    sleepAfterMs?: number;
    completionTimeoutMs?: number;
    headers?: Record<string, string>;
    freshConnect?: boolean;
}

export interface IConfigNetwork {
    interfaceName: string;
    netmask?: number;
    noAdditionalInterfaceIps?: boolean;
    minIp: string;
    maxIp?: string;
    force?: boolean;
}
