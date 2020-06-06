export interface IConfig {
    clientsNumber: number;
    loops?: number;
    durationSec: number;
    urls: IConfigUrl[];
}

export interface IConfigUrl {
    url: string;
    method: string;
}
