# karnataka-districts.json — source and licence

District boundary polygons for Karnataka, used to draw district outlines on the
full-screen map (`src/components/search/FullScreenMap.tsx`).

## Source

- **Dataset:** India district boundaries, Census 2011 delineation
- **Provider:** DataMeet — <https://github.com/datameet/maps> (`Districts/Census_2011/2011_Dist.shp`)
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
  — <https://creativecommons.org/licenses/by/4.0/>

CC BY 4.0 permits commercial use and modification, and requires attribution.
The attribution obligation is satisfied by this file plus the in-app credit
rendered on the map itself ("District boundaries © DataMeet, CC BY 4.0").

## Modifications made

The upstream shapefile covers all of India (~10 MB). It was transformed to a
Karnataka-only GeoJSON of ~146 KB (~39 KB gzipped):

1. Filtered to features where `ST_NM == "Karnataka"` — 30 districts.
2. Coordinates rounded to 3 decimal places (~110 m).
3. Douglas–Peucker simplification at 0.0025° (~275 m) tolerance.
4. Rings smaller than ~2 km² dropped (stray islets, invisible at this scale).
5. All properties dropped except `district`.
6. Census 2011 names mapped to current spellings — Bangalore → Bengaluru Urban,
   Mysore → Mysuru, Belgaum → Belagavi, Gulbarga → Kalaburagi, Bijapur →
   Vijayapura, Shimoga → Shivamogga, Tumkur → Tumakuru, Chikmagalur →
   Chikkamagaluru, Chamrajnagar → Chamarajanagar, Bellary → Ballari.

## Known limitations

Census 2011 predates districts created since — notably **Vijayanagara**
(carved out of Ballari in 2021). Those areas therefore appear within their
pre-split parent district. The data is used for visual context only; listings
are matched to districts by reverse-geocoding their coordinates, not by these
polygons, so this does not affect search results.

To regenerate, re-run the extraction against the upstream shapefile with the
same simplification parameters.
