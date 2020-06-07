export interface IConfig {
    clientsNumber: IConfigClientNumber;
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
    headers?: Record<string, string>;
}
