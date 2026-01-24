
import fetch from 'node-fetch';

const CKAN_URL = 'https://data.humdata.org/api/3/action/package_search?q=3W%20Somalia&rows=1';

async function probe() {
    console.log('Fetching...');
    const res = await fetch(CKAN_URL);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

probe();
