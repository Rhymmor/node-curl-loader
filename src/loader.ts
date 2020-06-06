import { Multi, Curl, CurlCode } from 'node-libcurl';
import { IConfig, IConfigUrl } from './lib/config';
import { ExtendedEasy } from './handers/easy';
import { getCurlMethodOptions } from './lib/options/methods';

export class Loader {
    private readonly config: IConfig;
    private readonly handles: ExtendedEasy[] = [];
    private multi: Multi = new Multi();

    constructor(config: IConfig) {
        this.config = config;
    }

    public run(cb?: () => void) {
        this.multi = new Multi();
        // TODO: Type properly
        this.multi.onMessage(this.onMessage(cb) as any);

        const initUrlConfig = this.config.urls[0];
        for (let i = 0; i < this.config.clientsNumber; i++) {
            const handle = new ExtendedEasy(i);
            this.setUrl(handle, initUrlConfig);
            // handle.setOpt(Curl.option.WRITEFUNCTION, onData)

            console.log(`Added client #${i}`);
            this.addHandle(handle);
        }
    }

    private onMessage = (cb?: () => void) => (error: Error, handle: ExtendedEasy, errorCode: CurlCode) => {
        console.log('# of handles active: ' + this.multi.getCount());

        const responseCode = handle.getInfo('RESPONSE_CODE').data;
        const url = this.config.urls[handle.currentLoop % this.config.urls.length].url;

        if (error) {
            console.log(url + ' returned error: "' + error.message + '" with errcode: ' + errorCode);
        } else {
            console.log(url + ' returned response code: ' + responseCode);
        }

        if (this.shouldRepeat(handle.currentLoop)) {
            console.log(`Performing request num ${handle.currentLoop + 1} for client #${handle.num}`);
            const nextHandle = this.createNextHandle(handle);
            this.addHandle(nextHandle);
        }
        this.closeHandle(handle);

        if (this.multi.getCount() === 0) {
            this.multi.close();
            if (cb) {
                cb();
            }
        }
    };

    private addHandle(handle: ExtendedEasy) {
        this.handles.push(handle);
        this.multi.addHandle(handle);
    }

    private closeHandle(handle: ExtendedEasy) {
        this.multi.removeHandle(handle);
        handle.close();
    }

    private createNextHandle(handle: ExtendedEasy): ExtendedEasy {
        const nextHandle = ExtendedEasy.duplicate(handle);
        nextHandle.currentLoop++;

        const urlIndex = nextHandle.currentLoop % this.config.urls.length;
        this.setUrl(nextHandle, this.config.urls[urlIndex]);
        return nextHandle;
    }

    private shouldRepeat(currentLoop: number) {
        return typeof this.config.loops !== 'number' || currentLoop < this.config.loops;
    }

    private setUrl(handle: ExtendedEasy, urlConfig: IConfigUrl) {
        handle.setOpt(Curl.option.URL, urlConfig.url);
        const methodOpts = getCurlMethodOptions(urlConfig.method);
        for (const [key, value] of Object.entries(methodOpts)) {
            // TODO: Type properly
            handle.setOpt(key as any, value as any);
        }

        handle.setOpt(Curl.option.PUT, urlConfig.url);
    }
}
