import * as afs from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';

export namespace FileUtils {
    const tmpDir = process.env['TMP_DIR'] || '/tmp/node-curl-loader';

    // To not use default async version with FileHandle
    export const open = promisify(fs.open);
    export const close = promisify(fs.close);

    export function createTmpDir() {
        return afs.mkdir(tmpDir);
    }

    export function removeTmpDir() {
        return new Promise<void>((resolve, reject) => {
            return rimraf(tmpDir, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    export function writeTmp(filename: string, content: string | Uint8Array) {
        return afs.writeFile(getTmpPath(filename), content);
    }

    export function openTmp(filename: string, flag = 'r') {
        return open(getTmpPath(filename), flag);
    }

    export function getTmpPath(filename: string) {
        return path.join(tmpDir, filename);
    }
}
