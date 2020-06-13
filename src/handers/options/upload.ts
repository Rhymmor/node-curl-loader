import { ExtendedEasy } from '../easy';
import { IConfig, IConfigUrlData } from '../../config/types';
import { Curl } from 'node-libcurl';
import { isOk } from '../../lib/utils';
import { FileUtils } from '../../lib/fs';
import { logger } from '../../lib/logger';

export class EasyUploadConfigurator {
    private readonly config: IConfig;

    private readonly descriptors = new Map<string, number>();

    constructor(config: IConfig) {
        this.config = config;
    }

    public async configureUrl(handle: ExtendedEasy) {
        const urlConfig = this.config.urls[handle.urlNumber];
        if (urlConfig && urlConfig.data) {
            // TODO: Let's type methods more strictly
            if (urlConfig.method === 'POST') {
                this.setPostData(handle, urlConfig.data);
            } else if (urlConfig.method === 'PUT') {
                await this.setPutData(handle, urlConfig.data);
            } else {
                throw new Error(`Uploading files for the method ${urlConfig.method} is not supported yet`);
            }
        }
    }

    public async cleanup(): Promise<void> {
        logger.debug('Cleaning up upload configurator');
        const promises: Promise<void>[] = [];
        for (const fd of this.descriptors.values()) {
            promises.push(FileUtils.close(fd).then(() => logger.debug(`fd ${fd} closed`)));
        }
        await Promise.all(promises);

        this.descriptors.clear();
    }

    private setPostData(handle: ExtendedEasy, data: IConfigUrlData) {
        if ('contents' in data) {
            handle.setOpt(Curl.option.POSTFIELDS, data.contents);
        } else {
            handle.setOpt(Curl.option.HTTPPOST, [{ name: 'file', file: data.uploadFilePath }]);
        }
    }

    private async setPutData(handle: ExtendedEasy, data: IConfigUrlData) {
        let fd: number | undefined;
        if ('uploadFilePath' in data) {
            fd = await this.getFileDescriptor(data.uploadFilePath);
        } else if ('contents' in data) {
            handle.setOpt(Curl.option.CUSTOMREQUEST, 'PUT');
            handle.setOpt(Curl.option.POSTFIELDS, data.contents);
            return;
        }

        if (!isOk(fd)) {
            throw new Error(`Cannot prepare a file descriptor for the url #${handle.urlNumber}`);
        }

        handle.setOpt(Curl.option.UPLOAD, true);
        handle.setOpt(Curl.option.READDATA, fd);
    }

    private async getFileDescriptor(filepath: string): Promise<number> {
        let fd = this.descriptors.get(filepath);
        if (!isOk(fd)) {
            fd = await FileUtils.open(filepath, 'r');
            this.descriptors.set(filepath, fd);
        }
        return fd;
    }
}
