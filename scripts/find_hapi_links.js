
import fetch from 'node-fetch';

async function findHapiCsvs(iso3) {
    const q = `HAPI ${iso3}`;
    const url = `https://data.humdata.org/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=5`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n--- HAPI Resources for ${iso3} ---`);
    json.result?.results?.forEach(d => {
        d.resources?.forEach(r => {
            if (r.format.toUpperCase() === 'CSV' && (r.name.toLowerCase().includes('presence') || r.name.toLowerCase().includes('population') || r.name.toLowerCase().includes('needs'))) {
                console.log(`[${r.name}] ${r.url}`);
            }
        });
    });
}

async function main() {
    const isos = ['SOM', 'SSD', 'AFG', 'PSE', 'BGD', 'YEM'];
    for (const iso of isos) {
        await findHapiCsvs(iso);
    }
}

main();
