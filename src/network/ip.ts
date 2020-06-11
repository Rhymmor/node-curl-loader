import { Address4, Address6 } from 'ip-address';
import { isIPv4 } from 'net';
import { BigInteger } from 'jsbn';

export function calculateNetmask<A extends Address4 | Address6>(startIp: A, endIp: A) {
    const startMask = startIp.mask();
    const endMask = endIp.mask();

    for (let i = 0; i < startMask.length; i++) {
        if (startMask[i] !== endMask[i]) {
            return i;
        }
    }

    return startMask.length;
}

export function getIpWrapClass(ip: string) {
    return isIPv4(ip) ? Address4 : Address6;
}

export function increaseIp(ip: string, step: number): string {
    const Address = getIpWrapClass(ip);
    const newIpBigInt = new Address(ip).bigInteger().add(new BigInteger(String(step)));
    return Address.fromBigInteger(newIpBigInt).address;
}
