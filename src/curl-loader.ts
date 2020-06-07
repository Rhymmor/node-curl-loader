import { IConfig } from './config/types';
import { IFinishCallback } from './types/utils';
import { Loader } from './modules/loader';
import { validateConfig } from './config/validation';

export class CurlLoader {
    private currentLoader?: Loader;

    public run(config: IConfig, cb?: IFinishCallback) {
        const configValidation = validateConfig(config);
        if (!configValidation.valid) {
            throw new Error(`Config is incorrect. Details ${configValidation.details}`);
        }

        this.currentLoader = new Loader(configValidation.obj);
        this.currentLoader.run(cb);
    }

    public stop(): boolean {
        if (this.currentLoader) {
            this.currentLoader.stop();
            return true;
        }
        return false;
    }
}
