import { Multi, CurlCode } from 'node-libcurl';
import { IConfig, IConfigUrl } from '../config/types';
import { ExtendedEasy } from '../handers/easy';
import { EasyConfigurator } from '../handers/options/url';
import { logger } from '../lib/logger';

export class Runner {
    private readonly config: IConfig;
    private shouldStop: () => boolean;

    private readonly handles: ExtendedEasy[] = [];
    private multi: Multi = new Multi();
    private callback?: (err?: any) => void;

    private readonly configurator: EasyConfigurator;
    private readonly sleepTimeouts = new Map<number, NodeJS.Timer>();
    private readonly completionTimeouts = new Map<number, NodeJS.Timer>();

    constructor(config: IConfig, shouldStop: () => boolean) {
        this.config = config;
        this.shouldStop = shouldStop;
        this.configurator = new EasyConfigurator(config);
    }

    public run(cb?: (err?: any) => void) {
        logger.debug('Running clients');

        this.callback = cb;
        this.prepareMulti();
        this.rampUp(this.config.clientsNumber.initial);
    }

    public rampUp(grow: number) {
        logger.debug(`Ramping up clients by ${grow}`);

        const currentLength = this.getClientsNumber();

        for (let i = 0; i < grow; i++) {
            const clientNumber = currentLength + i;
            const handle = new ExtendedEasy(clientNumber);
            this.configurator.configure(handle);

            this.prepareHandleUrl(handle);

            this.addHandle(handle);
            logger.debug(`Added client #${clientNumber}`);
        }
    }

    public async stop() {
        await this.configurator.cleanup().catch(e => logger.warn('Configurator cleanup was failed', e));
        this.multi.close();
        this.callback = undefined;
    }

    public getClientsNumber() {
        return this.handles.length;
    }

    private prepareMulti() {
        this.multi = new Multi();
        this.setMultiOptions();
        this.multi.onMessage((...args) => this.onMessage<any>(...args));
    }

    private onMessage = <T extends ExtendedEasy>(error: Error, handle: T, errorCode: CurlCode) => {
        logger.debug('# of handles active: ' + this.multi.getCount());

        const url = this.config.urls[handle.urlNumber].url;

        if (error) {
            logger.debug(url + ' returned error: "' + error.message + '" with errcode: ' + errorCode);
        } else {
            const responseCode = handle.getInfo('RESPONSE_CODE').data;
            logger.debug(url + ' returned response code: ' + responseCode);
        }

        this.onFinishedHandle(handle);
    };

    private onFinishedHandle(handle: ExtendedEasy) {
        const lastSleep = this.sleepTimeouts.get(handle.num);
        if (lastSleep) {
            clearTimeout(lastSleep);
            this.sleepTimeouts.delete(handle.num);
        }
        const completeTimeout = this.completionTimeouts.get(handle.num);
        if (completeTimeout) {
            clearTimeout(completeTimeout);
            this.completionTimeouts.delete(handle.num);
        }

        this.closeHandle(handle);

        if (this.shouldRepeat(handle.currentLoop, handle.urlNumber)) {
            const currentUrlConfig = this.config.urls[handle.urlNumber];
            if (typeof currentUrlConfig.sleepAfterMs !== 'number' || currentUrlConfig.sleepAfterMs === 0) {
                this.performNextRequest(handle);
            } else {
                this.sleepTimeouts.delete(handle.num);

                if (currentUrlConfig.freshConnect) {
                    handle.reset();
                }

                this.sleepTimeouts.set(
                    handle.num,
                    setTimeout(() => this.performNextRequest(handle, false), currentUrlConfig.sleepAfterMs)
                );
            }
        }

        if (this.multi.getCount() === 0 && this.sleepTimeouts.size === 0) {
            if (this.shouldStop()) {
                this.stop()
                    .then(() => this.callback?.())
                    .catch(e => this.callback?.(e));
            }
        }
    }

    private setMultiOptions() {
        this.multi.setOpt(Multi.option.PIPELINING, 2);
    }

    private performNextRequest(handle: ExtendedEasy, reuse = true) {
        const nextHandle = this.prepareHandleNextUrl(handle, reuse);
        logger.debug(
            `Performing request with url #${nextHandle.urlNumber}, loop #${nextHandle.currentLoop} for a client #${nextHandle.num}`
        );

        this.addHandle(nextHandle);
    }

    private addHandle(handle: ExtendedEasy) {
        this.handles[handle.num] = handle;
        // TODO: handle errors
        this.multi.addHandle(handle);
    }

    private closeHandle(handle: ExtendedEasy) {
        // TODO: handle errors
        this.multi.removeHandle(handle);
    }

    private prepareHandleNextUrl(handle: ExtendedEasy, _reuse = true): ExtendedEasy {
        const urlsLength = this.config.urls.length;

        if (handle.urlNumber >= urlsLength - 1) {
            handle.urlNumber = 0;
            handle.currentLoop++;
        } else {
            handle.urlNumber++;
        }

        this.prepareHandleUrl(handle);
        return handle;
    }

    private prepareHandleUrl(handle: ExtendedEasy) {
        this.configurator.configureUrl(handle);

        const urlConfig = this.config.urls[handle.urlNumber];
        if (this.hasCompletionTimeout(urlConfig)) {
            this.completionTimeouts.set(
                handle.num,
                setTimeout(() => {
                    logger.debug(
                        `Stopping a request for client ${handle.num} due to completion timeout ${urlConfig.completionTimeoutMs} ms`
                    );
                    this.onFinishedHandle(handle);
                }, urlConfig.completionTimeoutMs!)
            );
        }
    }

    private hasCompletionTimeout(urlConfig: IConfigUrl) {
        return typeof urlConfig.completionTimeoutMs === 'number' && urlConfig.completionTimeoutMs > 0;
    }

    private shouldRepeat(currentLoop: number, currentUrl: number) {
        return (
            typeof this.config.loops !== 'number' ||
            currentLoop < this.config.loops ||
            (currentLoop === this.config.loops && currentUrl + 1 < this.config.urls.length)
        );
    }
}
