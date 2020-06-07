import { Multi, CurlCode } from 'node-libcurl';
import { IConfig } from '../config/types';
import { ExtendedEasy } from '../handers/easy';
import { setHandleUrlOptions } from '../options/url';

export class Runner {
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
        this.rampUp(this.config.clientsNumber.initial);
    }

    public rampUp(grow: number) {
        const initUrlConfig = this.config.urls[0];
        for (let i = 0; i < grow; i++) {
            const handle = new ExtendedEasy(i);
            setHandleUrlOptions(handle, initUrlConfig);

            console.log(`Added client #${i}`);
            this.addHandle(handle);
        }
    }

    public stop() {
        this.multi.close();
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
            this.stop();
            if (cb) {
                cb();
            }
        }
    };

    private addHandle(handle: ExtendedEasy) {
        this.handles.push(handle);
        // TODO: handle errors
        this.multi.addHandle(handle);
    }

    private closeHandle(handle: ExtendedEasy) {
        // TODO: handle errors
        this.multi.removeHandle(handle);
        handle.close();
    }

    private createNextHandle(handle: ExtendedEasy): ExtendedEasy {
        const nextHandle = ExtendedEasy.duplicate(handle);
        nextHandle.currentLoop++;

        const urlIndex = nextHandle.currentLoop % this.config.urls.length;
        setHandleUrlOptions(nextHandle, this.config.urls[urlIndex]);
        return nextHandle;
    }

    private shouldRepeat(currentLoop: number) {
        return typeof this.config.loops !== 'number' || currentLoop < this.config.loops;
    }
}
