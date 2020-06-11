import { IConfig } from './config/types';
import { IFinishCallback } from './types/utils';
import { Loader } from './modules/loader';
import { validateConfig } from './config/validation';
import { addSecondaryIps } from './network/iproute/iproute';

export class CurlLoader {
    private loader?: Loader;

    public async run(config: IConfig, cb?: IFinishCallback) {
        const configValidation = validateConfig(config);
        if (!configValidation.valid) {
            throw new Error(`Config is incorrect. Details ${configValidation.details}`);
        }
        const cfg = configValidation.obj;

        if (cfg.network.noAdditionalInterfaceIps !== true) {
            const { minIp, interfaceName, maxIp, netmask } = config.network;
            await addSecondaryIps(interfaceName, minIp, {
                endIp: maxIp,
                netmask,
                amount: cfg.clientsNumber.full,
                force: cfg.network.force,
            });
        }

        return await this.runLoader(cfg, cb);
    }

    private runLoader(config: IConfig, cb?: IFinishCallback): Promise<void> {
        return new Promise<void>(resolve => {
            this.loader = new Loader(config);
            this.loader.run(() => {
                if (cb) {
                    cb();
                }
                resolve();
            });
        });
    }

    public stop(): boolean {
        if (this.loader) {
            this.loader.stop();
            return true;
        }
        return false;
    }
}
