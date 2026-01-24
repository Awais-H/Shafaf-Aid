import json
import random
import os

# Configuration
OUTPUT_DIR = "src/data"
NUM_ORGS = 15
TOTAL_PROJECTS = 180

# Constants
NEED_LEVELS = ["low", "medium", "high"]
AID_TYPES = ["food", "medical", "infrastructure"]

# Seed data
COUNTRIES = [
    {"id": "syria", "name": "Syria", "population": 21500000, "need_level": "high"},
    {"id": "yemen", "name": "Yemen", "population": 33000000, "need_level": "high"},
    {"id": "sudan", "name": "Sudan", "population": 45000000, "need_level": "high"},
    {"id": "afghanistan", "name": "Afghanistan", "population": 40000000, "need_level": "high"},
    {"id": "somalia", "name": "Somalia", "population": 17000000, "need_level": "high"},
    {"id": "palestine", "name": "Palestine", "population": 5000000, "need_level": "high"},
    {"id": "myanmar", "name": "Myanmar", "population": 54000000, "need_level": "medium"},
    {"id": "ethiopia", "name": "Ethiopia", "population": 120000000, "need_level": "medium"}
]

REGIONS_DB = {
    "syria": [
        ("aleppo", 4500000, "high"), ("idlib", 3000000, "high"), ("damascus", 2500000, "medium"),
        ("homs", 1500000, "medium"), ("raqqa", 900000, "high")
    ],
    "yemen": [
        ("sanaa", 4000000, "high"), ("aden", 1200000, "medium"), ("taiz", 2800000, "high"),
        ("hodeidah", 2000000, "high"), ("marib", 1000000, "high")
    ],
    "sudan": [
        ("khartoum", 6000000, "high"), ("darfur", 9000000, "high"), ("kordofan", 4000000, "high"),
        ("blue-nile", 1200000, "medium")
    ],
    "afghanistan": [
        ("kabul", 4500000, "high"), ("herat", 2000000, "medium"), ("kandahar", 1500000, "high"),
        ("mazar", 1000000, "medium")
    ],
    "somalia": [
        ("mogadishu", 2500000, "high"), ("baidoa", 800000, "high"), ("hargeisa", 1200000, "low"),
        ("kismayo", 500000, "high")
    ],
    "palestine": [
        ("gaza", 2300000, "high"), ("west-bank-north", 1500000, "medium"), ("west-bank-south", 1200000, "medium")
    ],
    "myanmar": [
        ("rakhine", 3000000, "high"), ("yangon", 7000000, "low"), ("mandalay", 1500000, "low")
    ],
    "ethiopia": [
        ("tigray", 6000000, "high"), ("amhara", 20000000, "medium"), ("oromia", 35000000, "medium"),
        ("somali-region", 5000000, "high")
    ]
}

NGO_NAMES = [
    "World Food Programme", "Médecins Sans Frontières", "ICRC", "UN Refugee Agency", 
    "UNICEF", "Oxfam", "International Rescue Committee", "World Health Organization",
    "Save the Children", "Islamic Relief", "CARE International", "Mercy Corps",
    "Norwegian Refugee Council", "Action Against Hunger", "Direct Relief"
]

def generate_orgs():
    orgs = []
    for i in range(len(NGO_NAMES)):
        org_id = NGO_NAMES[i].lower().replace(" ", "-").replace("é", "e").replace("ç", "c")
        orgs.append({"id": org_id, "name": NGO_NAMES[i]})
    return orgs

def generate_regions(countries):
    regions = []
    for country in countries:
        cid = country["id"]
        if cid in REGIONS_DB:
            for r_name, r_pop, r_need in REGIONS_DB[cid]:
                rid = f"{cid}-{r_name}"
                regions.append({
                    "id": rid,
                    "country_id": cid,
                    "name": r_name.title().replace("-", " "),
                    "population": r_pop,
                    "need_level": r_need
                })
    return regions

def generate_edges(orgs, regions):
    edges = []
    # Ensure every high-need region has at least some aid (but maybe insufficient)
    high_need_regions = [r for r in regions if r["need_level"] == "high"]
    
    # Random edges
    for _ in range(TOTAL_PROJECTS):
        org = random.choice(orgs)
        # Weighted random choice: High need regions are more likely to attract aid, 
        # but we also want gaps to appear.
        if random.random() < 0.7:
            target_region = random.choice(high_need_regions)
        else:
            target_region = random.choice(regions)
            
        aid_type = random.choice(AID_TYPES)
        # Random project count
        count = random.randint(1, 15)
        
        # Check if edge exists
        existing = next((e for e in edges if e["org_id"] == org["id"] and e["region_id"] == target_region["id"] and e["aid_type"] == aid_type), None)
        
        if existing:
            existing["project_count"] += count
        else:
            edges.append({
                "org_id": org["id"],
                "region_id": target_region["id"],
                "aid_type": aid_type,
                "project_count": count
            })
    return edges

def main():
    print("Generating synthetic data...")
    
    countries = COUNTRIES
    orgs = generate_orgs()
    regions = generate_regions(countries)
    edges = generate_edges(orgs, regions)
    
    # Write to files
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(f"{OUTPUT_DIR}/countries.json", "w") as f:
        json.dump(countries, f, indent=2)
    
    with open(f"{OUTPUT_DIR}/regions.json", "w") as f:
        json.dump(regions, f, indent=2)
        
    with open(f"{OUTPUT_DIR}/orgs.json", "w") as f:
        json.dump(orgs, f, indent=2)
        
    with open(f"{OUTPUT_DIR}/aid_edges.json", "w") as f:
        json.dump(edges, f, indent=2)
        
    print(f"Done! Generated:")
    print(f" - {len(countries)} countries")
    print(f" - {len(regions)} regions")
    print(f" - {len(orgs)} organizations")
    print(f" - {len(edges)} aid edges")

if __name__ == "__main__":
    main()
