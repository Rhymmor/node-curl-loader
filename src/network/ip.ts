import { Address4, Address6 } from 'ip-address';

export function calculateSubnet<A extends Address4 | Address6>(startIp: A, endIp: A) {
    const startMask = startIp.mask();
    const endMask = endIp.mask();

    for (let i = 0; i < startMask.length; i++) {
        if (startMask[i] !== endMask[i]) {
            return i;
        }
    }

    return startMask.length;
}
