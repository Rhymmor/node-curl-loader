import { Multi, CurlCode } from 'node-libcurl';
import { IConfig } from '../config/types';
import { ExtendedEasy } from '../handers/easy';
import { setHandleUrlOptions } from '../options/url';
import { logger } from '../lib/logger';

export class Runner {
    private readonly config: IConfig;
    private readonly handles: ExtendedEasy[] = [];
    private multi: Multi = new Multi();

    constructor(config: IConfig) {
        this.config = config;
    }

    public run(cb?: () => boolean) {
        logger.debug('Running clients');

        this.multi = new Multi();
        // TODO: Type properly
        this.multi.onMessage(this.onMessage(cb) as any);
        this.rampUp(this.config.clientsNumber.initial);
    }

    public rampUp(grow: number) {
        logger.debug(`Ramping up clients by ${grow}`);

        const initUrlConfig = this.config.urls[0];
        const currentLength = this.handles.length;
        for (let i = 0; i < grow; i++) {
            const clientNumber = currentLength + i;
            const handle = new ExtendedEasy(clientNumber);
            setHandleUrlOptions(handle, initUrlConfig);

            this.addHandle(handle);
            logger.debug(`Added client #${clientNumber}`);
        }
    }

    public stop() {
        this.multi.close();
    }

    public getClientsNumber() {
        return this.handles.length;
    }

    private onMessage = (cb?: () => boolean) => (error: Error, handle: ExtendedEasy, errorCode: CurlCode) => {
        logger.debug('# of handles active: ' + this.multi.getCount());

        const responseCode = handle.getInfo('RESPONSE_CODE').data;
        const url = this.config.urls[handle.currentLoop % this.config.urls.length].url;

        if (error) {
            logger.debug(url + ' returned error: "' + error.message + '" with errcode: ' + errorCode);
        } else {
            logger.debug(url + ' returned response code: ' + responseCode);
        }

        if (this.shouldRepeat(handle.currentLoop)) {
            logger.debug(`Performing request num ${handle.currentLoop + 1} for client #${handle.num}`);
            const nextHandle = this.createNextHandle(handle);
            this.addHandle(nextHandle);
        }
        this.closeHandle(handle);

        if (this.multi.getCount() === 0) {
            let shouldStop = true;
            if (cb) {
                shouldStop = cb();
            }
            if (shouldStop) {
                this.stop();
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
