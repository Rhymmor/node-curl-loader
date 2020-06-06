import { Easy } from 'node-libcurl';

export class ExtendedEasy extends Easy {
    public num: number;
    public currentLoop: number = 0;

    constructor(num: number) {
        super();
        this.num = num;
    }

    static duplicate(handle: ExtendedEasy) {
        const dupHandle = handle.dupHandle() as ExtendedEasy;
        dupHandle.num = handle.num;
        dupHandle.currentLoop = handle.currentLoop + 1;
        return dupHandle;
    }
}
