import { IConfig } from './config/types';
import { Loader } from './modules/loader';
import { validateConfig } from './config/validation';
import { addSecondaryIps } from './lib/network/iproute/iproute';
import { FileUtils } from './lib/fs';
import { logger } from './lib/logger';

export class CurlLoader {
    private loader?: Loader;

    public async run(config: IConfig) {
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
                flushFirst: cfg.network.flushFirst,
            });
        }

        await this.cleanup();
        await FileUtils.createTmpDir();
        await this.runLoader(cfg);
        await this.cleanup();
    }

    public async stop(): Promise<boolean> {
        if (this.loader) {
            await this.loader.stop().catch(e => logger.warn('Failed to preperly stop loader', e));
            await this.cleanup();

            this.loader = undefined;
            return true;
        }
        return false;
    }

    private runLoader(config: IConfig): Promise<void> {
        return new Promise<void>(resolve => {
            this.loader = new Loader(config);
            this.loader.run(() => resolve());
        });
    }

    private async cleanup() {
        await FileUtils.removeTmpDir().catch(e => logger.warn('Failed to remove temporary directory', e));
    }
}
