import DISTRICTS_GEOJSON from '@/data/karnataka-districts.json';

/**
 * District hit-testing and framing, done in our own code rather than through
 * Google's Data layer.
 *
 * The Data layer's click events depend on what is actually painted: with the
 * unfocused districts drawn stroke-only (fill opacity 0, to keep panning
 * smooth), interior taps are unreliable and a tap near a shared edge can
 * resolve to the neighbouring district. Ray-casting against the polygons
 * ourselves is exact, cheap, and testable — a tap inside a district always
 * returns that district.
 */

type Ring = number[][];
type Poly = Ring[];

interface DistrictShape {
  name: string;
  polys: Poly[];
  bounds: { north: number; south: number; east: number; west: number };
}

const buildShapes = (): DistrictShape[] =>
  (DISTRICTS_GEOJSON as any).features.map((feature: any) => {
    const geometry = feature.geometry;
    const polys: Poly[] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

    let north = -90, south = 90, east = -180, west = 180;
    for (const poly of polys) {
      for (const [lng, lat] of poly[0]) {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng > east) east = lng;
        if (lng < west) west = lng;
      }
    }

    return { name: feature.properties.district, polys, bounds: { north, south, east, west } };
  });

// Computed once at module load; the geometry never changes.
const SHAPES: DistrictShape[] = buildShapes();

const inRing = (lng: number, lat: number, ring: Ring): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

// Inside the outer ring and outside every hole.
const inPolygon = (lng: number, lat: number, poly: Poly): boolean => {
  if (!inRing(lng, lat, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) {
    if (inRing(lng, lat, poly[k])) return false;
  }
  return true;
};

/** The district containing this point, or null if outside Karnataka. */
export const districtAt = (lat: number, lng: number): string | null => {
  for (const shape of SHAPES) {
    // Cheap bounding-box reject before the full ray cast.
    const b = shape.bounds;
    if (lat > b.north || lat < b.south || lng > b.east || lng < b.west) continue;
    for (const poly of shape.polys) {
      if (inPolygon(lng, lat, poly)) return shape.name;
    }
  }
  return null;
};

/** Lat/lng extent of a district, for framing the camera on it. */
export const districtBounds = (name: string) =>
  SHAPES.find((s) => s.name === name)?.bounds ?? null;

export const districtNames = () => SHAPES.map((s) => s.name);
