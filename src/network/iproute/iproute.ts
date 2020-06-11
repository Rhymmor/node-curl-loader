import { Address4, Address6 } from 'ip-address';
import { isIPv4, isIP } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createWriteStream, unlink } from 'fs';
import { BigInteger } from 'jsbn';
import { calculateNetmask } from '../ip';
import { ISecondaryIpOptions } from './types';
import { logger } from '../../lib/logger';

const asyncExec = promisify(exec);
const asyncUnlink = promisify(unlink);

// Here we rely on iproute2. Can be replaced with Linux API if any

const batchFilePath = path.join('/tmp', 'node-curl-loader-ip.batch');

export async function addSecondaryIps(interfaceName: string, startIp: string, options: ISecondaryIpOptions) {
    if (!isIP(startIp)) {
        throw new Error(`Start IP is incorrect (${startIp})`);
    }

    await createBatchFile(interfaceName, startIp, options);
    const execPromise = asyncExec(`ip ${options.force ? '-force' : ''} -batch ${batchFilePath}`);
    if (options.force) {
        execPromise.catch(e => logger.warn('Cannot assign secondary addresses', e));
    }

    await asyncUnlink(batchFilePath);
}

function createBatchFile(interfaceName: string, startIp: string, options: ISecondaryIpOptions) {
    return new Promise((resolve, reject) => {
        const Address = isIPv4(startIp) ? Address4 : Address6;
        const startIpObj = new Address(startIp);
        const amount = getIpsAmount(startIpObj, options);
        const netmask = typeof options.netmask === 'number' ? options.netmask : getNetmask(startIpObj, amount);

        const stream = createWriteStream(batchFilePath, { flags: 'w' });
        stream
            .on('error', err => reject(err))
            .on('close', resolve)
            .on('open', () => {
                let lastIpBigInt = startIpObj.bigInteger();
                const bigOne = new BigInteger('1');
                for (let i = 0; i < amount; i++) {
                    const newIp = Address.fromBigInteger(lastIpBigInt);
                    stream.write(prepareAddIpCmd(interfaceName, newIp.address, netmask) + '\n');
                    lastIpBigInt = lastIpBigInt.add(bigOne);
                }
                stream.close();
            });
    });
}

function getIpsAmount<A extends Address4 | Address6>(startIp: A, options: ISecondaryIpOptions): number {
    if (options.endIp !== undefined) {
        const Address = startIp.v4 ? Address4 : Address6;
        const endIpBigInt = new Address(options.endIp).bigInteger();

        // TODO: For now we assume the amount of IPs is a safe integer
        const ipRangeCount = endIpBigInt.subtract(startIp.bigInteger()).add(new BigInteger('1')).intValue();
        return Math.min(ipRangeCount, options.amount);
    }

    return options.amount;
}

function getNetmask<A extends Address4 | Address6>(startIp: A, amount: number): number {
    const Address = startIp.v4 ? Address4 : Address6;
    const startIpBigInt = startIp.bigInteger();
    const amountBigInt = new BigInteger(String(amount));

    return calculateNetmask(startIp, Address.fromBigInteger(startIpBigInt.add(amountBigInt)));
}

function prepareAddIpCmd(interfaceName: string, ip: string, mask: number) {
    return `address add dev ${interfaceName} ${ip}/${mask}`;
}
