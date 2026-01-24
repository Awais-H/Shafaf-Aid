
import fetch from 'node-fetch';

async function main() {
    const url = 'https://data.humdata.org/dataset/8b99ca18-1e41-4e93-93c9-a19e0274bea8/resource/b9789668-955c-47d6-ac39-c0dc19ca1bbd/download/operational_presence.csv';
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n');
    console.log('Headers:', lines[0]);
    console.log('Checking for Palestine/PSE/BGD/Bangladesh...');
    lines.forEach(l => {
        if (l.includes('Palestine') || l.includes('PSE') || l.includes('Bangladesh') || l.includes('BGD')) {
            console.log(l);
        }
    });
}

main();
