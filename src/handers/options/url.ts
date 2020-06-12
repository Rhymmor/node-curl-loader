import { ExtendedEasy } from '../easy';
import { IConfigUrl, IConfig } from '../../config/types';
import { Curl } from 'node-libcurl';
import { getCurlMethodOptions } from './methods';
import { EasyUploadConfigurator } from './upload';
import { increaseIp } from '../../lib/network/ip';

export class EasyConfigurator {
    private readonly upload: EasyUploadConfigurator;
    private readonly config: IConfig;

    constructor(config: IConfig) {
        this.upload = new EasyUploadConfigurator(config);
        this.config = config;
    }

    public configure(handle: ExtendedEasy) {
        handle.setOpt(Curl.option.INTERFACE, increaseIp(this.config.network.minIp, handle.num));
    }

    public configureUrl(handle: ExtendedEasy) {
        const urlConfig = this.config.urls[handle.urlNumber];
        if (!urlConfig) {
            throw new Error(`No config for URL #${handle.urlNumber}`);
        }
        this.configureUrlCommon(handle, urlConfig);
        this.upload.configureUrl(handle);
    }

    public async cleanup(): Promise<void> {
        await Promise.all([this.upload.cleanup()]);
    }

    private configureUrlCommon(handle: ExtendedEasy, urlConfig: IConfigUrl) {
        // curl_easy_setopt (handle, CURLOPT_DNS_CACHE_TIMEOUT, -1);
        // curl_easy_setopt (handle, CURLOPT_CONNECTTIMEOUT, url->connect_timeout ? url->connect_timeout : connect_timeout);
        // curl_easy_setopt (handle, CURLOPT_SSL_VERIFYPEER, 0);
        // curl_easy_setopt (handle, CURLOPT_SSL_VERIFYHOST, 0);

        // Probably we will need it for multi-thread:
        // curl_easy_setopt (handle, CURLOPT_NOSIGNAL, 1);

        // For HTTP:
        // curl_easy_setopt (handle, CURLOPT_FOLLOWLOCATION, 1);
        // curl_easy_setopt (handle, CURLOPT_UNRESTRICTED_AUTH, 1);
        // curl_easy_setopt (handle, CURLOPT_MAXREDIRS, -1);
        // curl_easy_setopt (handle, CURLOPT_SSL_VERIFYPEER, bctx->ssl_verify_peer ? 1L : 0L);
        // curl_easy_setopt (handle, CURLOPT_COOKIEFILE, "");

        handle.setOpt(Curl.option.URL, urlConfig.url);
        const methodOpts = getCurlMethodOptions(urlConfig.method);
        for (const [key, value] of Object.entries(methodOpts)) {
            // TODO: Type properly
            handle.setOpt(key as any, value as any);
        }
        if (urlConfig.headers) {
            const headersList: string[] = Object.entries(urlConfig.headers).map(([key, value]) => `${key}: ${value}`);
            handle.setOpt(Curl.option.HTTPHEADER, headersList);
        }

        handle.setOpt(Curl.option.FRESH_CONNECT, urlConfig.freshConnect || false);
        if (urlConfig.freshConnect) {
            handle.setOpt(Curl.option.FORBID_REUSE, true);
        }
    }
}
