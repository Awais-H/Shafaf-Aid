
import fetch from 'node-fetch';

async function search(q) {
    const url = `https://data.humdata.org/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=20`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n--- Searching for "${q}" ---`);
    json.result?.results?.forEach(d => {
        d.resources?.forEach(r => {
            if (r.format.toUpperCase() === 'CSV' && (r.name.toLowerCase().includes('presence') || r.name.toLowerCase().includes('partner') || r.name.toLowerCase().includes('activity'))) {
                console.log(`- Dataset: ${d.title}`);
                console.log(`  [CSV] ${r.name}: ${r.url}`);
            }
        });
    });
}

async function main() {
    await search('oPt humanitarian presence');
    await search('State of Palestine operational presence');
}

main();
