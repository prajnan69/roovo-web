// Karnataka's districts, used to place pins on the destination picker map.
//
// Coordinates are each district's headquarters town rather than a true
// polygon centroid — Roovo has no district boundary data, and for dropping a
// map pin the HQ reads more naturally anyway (it's the place people picture
// when they hear the district name).
//
// These positions are only ever used to POSITION pins. A listing is assigned
// to its district by reverse-geocoding the listing's own coordinates (see
// resolveArea in lib/googleMaps), never by proximity to this table, so a
// slightly-off centroid here can't misfile a listing.

export interface KarnatakaDistrict {
  name: string;
  lat: number;
  lng: number;
}

export const KARNATAKA_DISTRICTS: KarnatakaDistrict[] = [
  { name: 'Bagalkot', lat: 16.1691, lng: 75.6615 },
  { name: 'Ballari', lat: 15.1394, lng: 76.9214 },
  { name: 'Belagavi', lat: 15.8497, lng: 74.4977 },
  { name: 'Bengaluru Rural', lat: 13.2437, lng: 77.7172 },
  { name: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946 },
  { name: 'Bidar', lat: 17.9104, lng: 77.5199 },
  { name: 'Chamarajanagar', lat: 11.9261, lng: 76.9438 },
  { name: 'Chikkaballapur', lat: 13.4355, lng: 77.7315 },
  { name: 'Chikkamagaluru', lat: 13.3161, lng: 75.7720 },
  { name: 'Chitradurga', lat: 14.2251, lng: 76.3980 },
  { name: 'Dakshina Kannada', lat: 12.9141, lng: 74.8560 },
  { name: 'Davanagere', lat: 14.4644, lng: 75.9218 },
  { name: 'Dharwad', lat: 15.4589, lng: 75.0078 },
  { name: 'Gadag', lat: 15.4315, lng: 75.6355 },
  { name: 'Hassan', lat: 13.0072, lng: 76.0962 },
  { name: 'Haveri', lat: 14.7935, lng: 75.3990 },
  { name: 'Kalaburagi', lat: 17.3297, lng: 76.8343 },
  { name: 'Kodagu', lat: 12.4244, lng: 75.7382 },
  { name: 'Kolar', lat: 13.1357, lng: 78.1325 },
  { name: 'Koppal', lat: 15.3547, lng: 76.1547 },
  { name: 'Mandya', lat: 12.5223, lng: 76.8955 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Raichur', lat: 16.2076, lng: 77.3463 },
  { name: 'Ramanagara', lat: 12.7209, lng: 77.2800 },
  { name: 'Shivamogga', lat: 13.9299, lng: 75.5681 },
  { name: 'Tumakuru', lat: 13.3409, lng: 77.1010 },
  { name: 'Udupi', lat: 13.3409, lng: 74.7421 },
  { name: 'Uttara Kannada', lat: 14.8138, lng: 74.1297 },
  { name: 'Vijayanagara', lat: 15.2690, lng: 76.3909 },
  { name: 'Vijayapura', lat: 16.8302, lng: 75.7100 },
  { name: 'Yadgir', lat: 16.7700, lng: 77.1376 },
];

// Roughly the middle of the state, and its extent — used for the map's
// initial camera and to stop the user panning off to the rest of India.
export const KARNATAKA_CENTER = { lat: 14.75, lng: 76.0 };
export const KARNATAKA_BOUNDS = {
  north: 18.6,
  south: 11.4,
  west: 73.8,
  east: 78.7,
};

/**
 * Google returns district names in forms that don't always match this table
 * ("Bangalore Urban" vs "Bengaluru Urban", "Bangalore Rural District").
 * Normalise both sides before comparing so a listing lands on the right pin.
 */
export const normaliseDistrictName = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/\bdistrict\b/g, '')
    .replace(/bangalore/g, 'bengaluru')
    .replace(/mangalore/g, 'mangaluru')
    .replace(/mysore/g, 'mysuru')
    .replace(/belgaum/g, 'belagavi')
    .replace(/gulbarga/g, 'kalaburagi')
    .replace(/bellary/g, 'ballari')
    .replace(/bijapur/g, 'vijayapura')
    .replace(/shimoga/g, 'shivamogga')
    .replace(/tumkur/g, 'tumakuru')
    .replace(/hospet|hosapete/g, 'vijayanagara')
    .replace(/[^a-z]/g, '');

export const findDistrict = (name: string): KarnatakaDistrict | undefined => {
  const target = normaliseDistrictName(name);
  return KARNATAKA_DISTRICTS.find((d) => normaliseDistrictName(d.name) === target);
};
