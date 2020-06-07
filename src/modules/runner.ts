import { Multi, CurlCode } from 'node-libcurl';
import { IConfig } from '../config/types';
import { ExtendedEasy } from '../handers/easy';
import { setHandleUrlOptions } from '../options/url';
import { logger } from '../lib/logger';

export class Runner {
    private readonly config: IConfig;
    private readonly handles: ExtendedEasy[] = [];
    private multi: Multi = new Multi();

    private sleepTimeouts = new Map<number, NodeJS.Timer>();

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

        const lastSleep = this.sleepTimeouts.get(handle.num);
        if (lastSleep) {
            clearTimeout(lastSleep);
            this.sleepTimeouts.delete(handle.num);
        }

        if (this.shouldRepeat(handle.currentLoop, handle.urlNumber)) {
            const nextUrlConfig = this.config.urls[handle.urlNumber];

            if (typeof nextUrlConfig.sleepAfterMs !== 'number' || nextUrlConfig.sleepAfterMs === 0) {
                this.performNextRequest(handle);
            } else {
                this.sleepTimeouts.delete(handle.num);
                this.sleepTimeouts.set(
                    handle.num,
                    setTimeout(() => this.performNextRequest(handle, false), nextUrlConfig.sleepAfterMs)
                );
            }
        }
        this.closeHandle(handle);

        if (this.multi.getCount() === 0 && this.sleepTimeouts.size === 0) {
            let shouldStop = true;
            if (cb) {
                shouldStop = cb();
            }

            if (shouldStop) {
                this.stop();
            }
        }
    };

    private performNextRequest(handle: ExtendedEasy, reuse = true) {
        const nextHandle = this.createNextHandle(handle, reuse);
        logger.debug(
            `Performing request with url #${nextHandle.urlNumber}, loop #${nextHandle.currentLoop} for a client #${nextHandle.num}`
        );

        this.addHandle(nextHandle);
    }

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

    private createNextHandle(handle: ExtendedEasy, reuse = true): ExtendedEasy {
        const nextHandle = ExtendedEasy.duplicate(handle, reuse);
        const urlsLength = this.config.urls.length;

        if (nextHandle.urlNumber >= urlsLength - 1) {
            nextHandle.urlNumber = 0;
            nextHandle.currentLoop++;
        } else {
            nextHandle.urlNumber++;
        }

        setHandleUrlOptions(nextHandle, this.config.urls[nextHandle.urlNumber]);
        return nextHandle;
    }

    private shouldRepeat(currentLoop: number, currentUrl: number) {
        return (
            typeof this.config.loops !== 'number' ||
            currentLoop < this.config.loops ||
            (currentLoop === this.config.loops && currentUrl + 1 < this.config.urls.length)
        );
    }
}
