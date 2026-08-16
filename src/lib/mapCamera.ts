/**
 * Camera math for Google Maps, done in our own code.
 *
 * map.fitBounds() needs the container measured, so when it's called before the
 * map's first layout pass (during construction, or while an overlay is still
 * fading in) Google queues it internally and applies it at the next idle. A
 * queued frame landing after the user's tap yanks the camera off whatever they
 * tapped — which is why the first district tap kept "zooming to the centre".
 *
 * cameraForBounds computes the same center+zoom fitBounds would, but
 * synchronously. The result is applied with setCenter/setZoom, which update
 * the camera immediately and unconditionally — nothing left to race.
 */

export interface BoundsLike {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CameraTarget {
  center: { lat: number; lng: number };
  zoom: number;
}

// Google's world is a 256px square at zoom 0; each zoom level doubles it.
const BASE_TILE = 256;

const mercatorY = (lat: number): number => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

const inverseMercatorY = (y: number): number =>
  ((2 * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 2) * 180) / Math.PI;

export const cameraForBounds = (
  bounds: BoundsLike,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
  limits: { min: number; max: number } = { min: 1, max: 21 }
): CameraTarget => {
  let { north, south, east, west } = bounds;

  // Degenerate spans (a single listing) would otherwise push zoom to the cap.
  const MIN_SPAN = 0.02; // ~2 km
  if (north - south < MIN_SPAN) {
    const mid = (north + south) / 2;
    north = mid + MIN_SPAN / 2;
    south = mid - MIN_SPAN / 2;
  }
  if (east - west < MIN_SPAN) {
    const mid = (east + west) / 2;
    east = mid + MIN_SPAN / 2;
    west = mid - MIN_SPAN / 2;
  }

  const availW = Math.max(40, viewportWidth - padding * 2);
  const availH = Math.max(40, viewportHeight - padding * 2);

  // Extents as fractions of the mercator world square.
  const worldW = (east - west) / 360;
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const worldH = ySouth - yNorth;

  const zoomForW = Math.log2(availW / (BASE_TILE * worldW));
  const zoomForH = Math.log2(availH / (BASE_TILE * worldH));

  // Floor to an integer like fitBounds does on raster maps — flooring only
  // ever widens the view, so the bounds always fit.
  let zoom = Math.floor(Math.min(zoomForW, zoomForH));
  zoom = Math.max(limits.min, Math.min(limits.max, zoom));

  return {
    // Latitude midpoint must be taken in mercator space, or tall bounds sit
    // visibly off-centre vertically.
    center: { lat: inverseMercatorY((yNorth + ySouth) / 2), lng: (west + east) / 2 },
    zoom,
  };
};

/** Smallest bounds containing every position. */
export const boundsOfPositions = (positions: { lat: number; lng: number }[]): BoundsLike =>
  positions.reduce(
    (b, p) => ({
      north: Math.max(b.north, p.lat),
      south: Math.min(b.south, p.lat),
      east: Math.max(b.east, p.lng),
      west: Math.min(b.west, p.lng),
    }),
    { north: -90, south: 90, east: -180, west: 180 }
  );
