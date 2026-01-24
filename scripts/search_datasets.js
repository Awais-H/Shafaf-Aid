
import fetch from 'node-fetch';

async function search(q) {
    const url = `https://data.humdata.org/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=10`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\nResults for "${q}":`);
    json.result?.results?.forEach(d => {
        console.log(`- ${d.title} (ID: ${d.id})`);
        d.resources?.forEach(r => {
            if (r.format.toUpperCase() === 'CSV') {
                console.log(`  [CSV] ${r.name}: ${r.url}`);
            }
        });
    });
}

async function main() {
    await search('oPt 3W');
    await search('Bangladesh 3W');
    await search('Yemen 3W');
    await search('Afghanistan 3W');
}

main();
