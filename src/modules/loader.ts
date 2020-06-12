import { Runner } from './runner';
import { IConfig } from '../config/types';
import { logger } from '../lib/logger';

export class Loader {
    private readonly runner: Runner;
    private readonly config: IConfig;

    private durationTimer?: NodeJS.Timer;
    private rampupInterval?: NodeJS.Timer;
    private callback?: () => void;

    constructor(config: IConfig) {
        this.config = config;
        this.runner = new Runner(config, this.shouldRunnerStop);
    }

    public run(callback?: () => void) {
        this.callback = callback;

        this.runner.run(this.onAfterStop);

        if (typeof this.config.durationSec === 'number') {
            this.durationTimer = setTimeout(() => this.stop(), this.config.durationSec * 1000);
        }

        if (this.config.clientsNumber.grow > 0) {
            this.setRampup();
        }
    }

    public async stop() {
        logger.info('Stopping loader');
        await this.runner.stop();
        this.onAfterStop();
    }

    public cleanup() {
        logger.debug('Cleaning up loader');
        if (this.durationTimer) {
            clearTimeout(this.durationTimer);
        }
        this.durationTimer = undefined;
        this.cleanupRampup();
        this.callback = undefined;
    }

    private setRampup() {
        logger.debug('Setting clients ramp up');
        this.rampupInterval = setInterval(() => {
            const { full, grow } = this.config.clientsNumber;
            const currentClients = this.runner.getClientsNumber();
            const clientsToFull = full - currentClients;
            const currentGrow = clientsToFull > grow ? grow : clientsToFull;

            this.runner.rampUp(currentGrow);

            if (this.runner.getClientsNumber() >= full) {
                return this.cleanupRampup();
            }
        }, 1000);
    }

    private shouldRunnerStop = () => {
        if (this.rampupInterval) {
            logger.debug('Runner has finished but rampup still active');
            return false;
        }
        return true;
    };

    private onAfterStop = (_err?: any) => {
        const callback = this.callback;
        this.cleanup();
        if (callback) {
            callback();
        }
    };

    private cleanupRampup() {
        logger.debug('Cleaning up clients ramp up');
        if (this.rampupInterval) {
            clearInterval(this.rampupInterval);
        }
        this.rampupInterval = undefined;
    }
}
