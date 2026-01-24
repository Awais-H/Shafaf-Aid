
import fetch from 'node-fetch';

async function search(q) {
    const url = `https://data.humdata.org/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=10`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n--- Results for "${q}" ---`);
    json.result?.results?.forEach(d => {
        console.log(`- ${d.title}`);
        d.resources?.forEach(r => {
            if (r.format.toUpperCase() === 'CSV') {
                console.log(`  [CSV] ${r.name}: ${r.url}`);
            }
        });
    });
}

async function main() {
    await search('Palestine');
    await search('Bangladesh');
    await search('oPt');
    await search('Gaza');
}

main();
