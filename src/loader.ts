import { Runner } from './runner';
import { IConfig } from './lib/config';

export class Loader {
    private readonly runner: Runner;
    private readonly config: IConfig;

    private durationTimer?: NodeJS.Timer;
    private callback?: () => void;

    constructor(config: IConfig) {
        this.config = config;
        this.runner = new Runner(config);
    }

    public run(callback: () => void) {
        this.callback = callback;

        this.runner.run(this.onAfterStop);
        if (typeof this.config.durationSec === 'number') {
            this.durationTimer = setTimeout(() => this.stop(), this.config.durationSec * 1000);
        }
    }

    public stop() {
        this.runner.stop();
        this.onAfterStop();
    }

    private onAfterStop = () => {
        if (this.callback) {
            this.callback();
        }

        this.cleanup();
    };

    public cleanup() {
        if (this.durationTimer) {
            clearTimeout(this.durationTimer);
        }
        this.durationTimer = undefined;
        this.callback = undefined;
    }
}
