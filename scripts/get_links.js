
import fetch from 'node-fetch';

async function getResource(packageId) {
    const url = `https://data.humdata.org/api/3/action/package_show?id=${packageId}`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n--- Resources for ${packageId} ---`);
    json.result?.resources?.forEach(r => {
        if (r.format.toUpperCase() === 'CSV') {
            console.log(`[${r.name}] ${r.url}`);
        }
    });
}

async function main() {
    await getResource('opt-3w-operational-presence');
    await getResource('bgd-operational-presence-3w');
}

main();
