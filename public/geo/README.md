# GeoJSON Files

This folder contains GeoJSON boundary files for map rendering.

## World

- `world.geojson` - World boundaries (not included in demo, using point visualization instead)

## Curated Countries

Add country-specific GeoJSON files here for polygon rendering:

- `somalia.geojson`
- `bangladesh.geojson`
- `yemen.geojson`
- `south_sudan.geojson`
- `afghanistan.geojson`

## Sources

For production use, consider:
- Natural Earth Data (public domain)
- OCHA Administrative Boundaries (humanitarian use)
- OpenStreetMap (ODbL license)

## Note

The demo uses point-based visualization (ScatterplotLayer) instead of polygons.
The synthetic polygon generation in `RegionPolygons.ts` creates approximate 
boundaries from centroid coordinates for visualization purposes.
