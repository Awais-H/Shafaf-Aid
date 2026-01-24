
import * as fs from 'fs';
import * as readline from 'readline';

async function main() {
    const fileStream = fs.createReadStream('scripts/temp.csv');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineCount = 0;
    for await (const line of rl) {
        if (line.includes('Palestine') || line.includes('PSE') || line.includes('Bangladesh') || line.includes('BGD')) {
            console.log(line);
        }
        lineCount++;
        if (lineCount > 100000) break; // prevent infinite hangs
    }
}
main();
