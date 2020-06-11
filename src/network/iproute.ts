import { Address4, Address6 } from 'ip-address';
import { isIPv4, isIP } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createWriteStream, unlink } from 'fs';
import { BigInteger } from 'jsbn';
import { calculateSubnet } from './ip';

const asyncExec = promisify(exec);
const asyncUnlink = promisify(unlink);
console.log(asyncExec);

// Here we rely on iproute2. Can be replaced with Linux API if any

const batchFilePath = path.join('/tmp', 'node-curl-loader-ip.batch');

export async function addSecondaryIps(interfaceName: string, startIp: string, amount: number) {
    if (!isIP(startIp)) {
        throw new Error(`Start IP is incorrect (${startIp})`);
    }

    await createBatchFile(startIp, amount, interfaceName);
    await asyncExec(`ip -batch ${batchFilePath}`);
    await asyncUnlink(batchFilePath);
}

function createBatchFile(startIp: string, amount: number, interfaceName: string) {
    return new Promise((resolve, reject) => {
        const Address = isIPv4(startIp) ? Address4 : Address6;
        const startIpObj = new Address(startIp);
        const startIpBigInt = startIpObj.bigInteger();
        const endIpBigInt = new BigInteger(String(amount));

        const subnet = calculateSubnet(startIpObj, Address.fromBigInteger(startIpBigInt.add(endIpBigInt)));

        console.log({ subnet });

        const stream = createWriteStream(batchFilePath, { flags: 'w' });
        stream
            .on('error', err => reject(err))
            .on('close', resolve)
            .on('open', () => {
                let lastIpBigInt = startIpObj.bigInteger();
                const bigOne = new BigInteger('1');
                for (let i = 0; i < amount; i++) {
                    const newIp = Address.fromBigInteger(lastIpBigInt);
                    stream.write(prepareAddIpCmd(interfaceName, newIp.address, subnet) + '\n');
                    lastIpBigInt = lastIpBigInt.add(bigOne);
                }
                stream.close();
            });
    });
}

function prepareAddIpCmd(interfaceName: string, ip: string, mask: number) {
    return `address add dev ${interfaceName} ${ip}/${mask}`;
}
