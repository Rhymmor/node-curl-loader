import { Easy } from 'node-libcurl';

export class ExtendedEasy extends Easy {
    public num: number;
    public currentLoop: number = 1;
    public urlNumber: number = 0;

    constructor(num: number) {
        super();
        this.num = num;
    }

    static duplicate(handle: ExtendedEasy, reuse = true): ExtendedEasy {
        const dupHandle: ExtendedEasy = reuse ? (handle.dupHandle() as ExtendedEasy) : new ExtendedEasy(handle.num);
        dupHandle.num = handle.num;
        dupHandle.urlNumber = handle.urlNumber;
        dupHandle.currentLoop = handle.currentLoop;
        return dupHandle;
    }
}
