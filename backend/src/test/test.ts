import { forEachChild } from "typescript";
import { getFilePieces } from "../service";
import { stringify } from "querystring";
import * as fs from 'fs';
import { buffer } from "stream/consumers";

const datas = getFilePieces('repository/dog.mp4', 1024 * 1024, [0, 1, 2, 3,])

console.log(datas.length)
const a = [1, 22, 33]
const writeStream = fs.createWriteStream('repository/dog-copy.mp4');
for (let index = 0; index < datas.length; index++) {
    const a = {
        name: 'phuoc',
        data: {
            data: datas[index],
            age: 16,
        },
        age: 16,
    }
    writeStream.write(Buffer.from(JSON.parse(JSON.stringify(a)).data.data))
}
console.log(Math.floor(6.2))    