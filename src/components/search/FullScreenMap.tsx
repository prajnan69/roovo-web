import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import { useGoogleMapsLoader } from '@/lib/googleMaps';
import { useNavigation } from '@/hooks/useNavigation';
import { triggerHaptic } from '@/lib/haptics';
import { useBackCloseable } from '@/hooks/useBackCloseable';
import { useBottomNavBar } from '@/context/BottomNavBarContext';
import { resolveImageUrl } from '@/utils/imageUtils';
import { KARNATAKA_BOUNDS } from '@/data/karnatakaDistricts';
import { districtAt, districtBounds } from '@/lib/karnatakaGeo';
import { cameraForBounds, boundsOfPositions, type BoundsLike } from '@/lib/mapCamera';
import { getRandomComingSoonMessage } from '@/data/districtComingSoonMessages';
// Karnataka district boundaries, Census 2011 via DataMeet (CC BY 4.0),
// filtered to this state and simplified to ~275 m tolerance. See
// src/data/KARNATAKA_DISTRICTS_ATTRIBUTION.md.
import KARNATAKA_DISTRICTS_GEOJSON from '@/data/karnataka-districts.json';

// Below this zoom a price pill is more clutter than information — several of
// them collide into an unreadable mess at state level — so markers collapse to
// plain dots and only expand into prices once you're close enough to compare.
const ZOOM_SHOW_PRICES = 9;

// Dots shrink the further out you go, so a state-wide view reads as a light
// scatter of locations rather than a row of heavy blobs.
const dotSizeForZoom = (zoom: number) => {
  if (zoom >= 8) return 12;
  if (zoom >= 7) return 10;
  if (zoom >= 6.5) return 8;
  return 6;
};

interface FullScreenMapProps {
  isOpen: boolean;
  onClose: () => void;
  listings: any[];
}

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#F4F3F0' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8A82' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#ECEBE5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FAFAF8' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DCE5F2' }] },
  { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  styles: MAP_STYLE,
  minZoom: 5.4,
  maxZoom: 17,
  restriction: { latLngBounds: KARNATAKA_BOUNDS, strictBounds: false },
  gestureHandling: 'greedy',
};

const getLat = (l: any) => Number(l.latitude ?? l.location?.latitude);
const getLng = (l: any) => Number(l.longitude ?? l.location?.longitude);

let activeCameraAnimation: { cancel: () => void } | null = null;

// Moves the camera with optional smooth 60fps/120fps interpolation.
const applyCamera = (
  map: google.maps.Map,
  bounds: BoundsLike,
  padding: number,
  smooth: boolean = false
) => {
  if (activeCameraAnimation) {
    activeCameraAnimation.cancel();
    activeCameraAnimation = null;
  }

  const div = map.getDiv();
  const width = div.clientWidth || window.innerWidth;
  const height = div.clientHeight || window.innerHeight;
  const cam = cameraForBounds(bounds, width, height, padding, { min: 6, max: 17 });

  if (!smooth) {
    const anyMap = map as any;
    if (typeof anyMap.moveCamera === 'function') {
      anyMap.moveCamera({ center: cam.center, zoom: cam.zoom });
    } else {
      map.setZoom(cam.zoom);
      map.setCenter(cam.center);
    }
    return;
  }

  const startCenter = map.getCenter();
  if (!startCenter) {
    const anyMap = map as any;
    if (typeof anyMap.moveCamera === 'function') {
      anyMap.moveCamera({ center: cam.center, zoom: cam.zoom });
    } else {
      map.setZoom(cam.zoom);
      map.setCenter(cam.center);
    }
    return;
  }

  const startLat = startCenter.lat();
  const startLng = startCenter.lng();
  const startZoom = typeof map.getZoom() === 'number' ? map.getZoom()! : cam.zoom;

  const targetLat = cam.center.lat;
  const targetLng = cam.center.lng;
  const targetZoom = cam.zoom;

  if (
    Math.abs(startLat - targetLat) < 0.0001 &&
    Math.abs(startLng - targetLng) < 0.0001 &&
    Math.abs(startZoom - targetZoom) < 0.01
  ) {
    return;
  }

  const startTime = performance.now();
  const duration = 460; // 460ms fluid glide
  let cancelled = false;
  let rafId: number | null = null;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (currentTime: number) => {
    if (cancelled) return;
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = easeOutCubic(progress);

    const curLat = startLat + (targetLat - startLat) * ease;
    const curLng = startLng + (targetLng - startLng) * ease;
    const curZoom = startZoom + (targetZoom - startZoom) * ease;

    const anyMap = map as any;
    if (typeof anyMap.moveCamera === 'function') {
      anyMap.moveCamera({
        center: { lat: curLat, lng: curLng },
        zoom: curZoom,
      });
    } else {
      map.setCenter({ lat: curLat, lng: curLng });
      map.setZoom(curZoom);
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      activeCameraAnimation = null;
    }
  };

  rafId = requestAnimationFrame(step);

  activeCameraAnimation = {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
};

class DirectMarkerOverlay {
  private overlay: google.maps.OverlayView;
  private container: HTMLDivElement;
  private inner: HTMLDivElement;
  private pos: google.maps.LatLng;

  constructor(position: { lat: number; lng: number }) {
    this.pos = new google.maps.LatLng(position.lat, position.lng);

    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.left = '0px';
    this.container.style.top = '0px';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.transition = 'none';
    this.container.style.webkitTransition = 'none';
    this.container.style.pointerEvents = 'auto';
    this.container.style.zIndex = '10';

    this.inner = document.createElement('div');
    this.inner.style.transition = 'none';
    this.inner.style.webkitTransition = 'none';
    this.container.appendChild(this.inner);

    const self = this;
    const OverlayClass = class extends google.maps.OverlayView {
      onAdd() {
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(self.container);
      }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(self.pos);
        if (point) {
          self.container.style.left = `${Math.round(point.x)}px`;
          self.container.style.top = `${Math.round(point.y)}px`;
        }
      }
      onRemove() {
        if (self.container.parentNode) {
          self.container.parentNode.removeChild(self.container);
        }
      }
    };
    this.overlay = new OverlayClass();
  }

  setMap(map: google.maps.Map | null) {
    this.overlay.setMap(map);
  }

  update(
    listing: any,
    isActive: boolean,
    showPrices: boolean,
    dotSize: number,
    onSelect: () => void
  ) {
    this.container.style.zIndex = isActive ? '999' : (showPrices ? '100' : '10');
    this.inner.innerHTML = '';
    this.inner.onclick = (e) => {
      e.stopPropagation();
      onSelect();
    };

    if (showPrices) {
      this.inner.className = `inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-[13px] font-black whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,0.16)] select-none cursor-pointer ${
        isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'
      }`;
      const dot = document.createElement('span');
      dot.className = `w-2 h-2 rounded-full flex-shrink-0 ${
        isActive ? 'bg-white' : 'bg-indigo-600'
      }`;
      this.inner.appendChild(dot);

      const priceText = document.createTextNode(
        `₹${Number(listing.price_per_night || 0).toLocaleString('en-IN')}`
      );
      this.inner.appendChild(priceText);
    } else {
      const size = isActive ? Math.max(12, dotSize + 4) : dotSize;
      this.inner.className = `rounded-full select-none cursor-pointer ${
        isActive
          ? 'bg-indigo-600 ring-4 ring-indigo-200 shadow-lg'
          : 'bg-indigo-600 ring-2 ring-white shadow-md'
      }`;
      this.inner.style.width = `${size}px`;
      this.inner.style.height = `${size}px`;
    }
  }
}

const buildDistrictStyle =
  (focused: string | null) =>
  (feature: google.maps.Data.Feature): google.maps.Data.StyleOptions => {
    const isFocused = focused !== null && feature.getProperty('district') === focused;
    return {
      fillColor: '#4F46E5',
      fillOpacity: isFocused ? 0.14 : 0,
      strokeColor: '#4F46E5',
      strokeOpacity: isFocused ? 0.75 : 0.35,
      strokeWeight: isFocused ? 2 : 1,
      clickable: false,
    };
  };

const ListingCard: React.FC<{ listing: any; onClick: () => void }> = ({ listing, onClick }) => (
  <div onClick={onClick} className="flex cursor-pointer">
    <div className="w-[104px] h-[104px] flex-shrink-0 bg-slate-100">
      {listing.all_image_urls?.[0] && (
        <img
          src={resolveImageUrl(
            typeof listing.all_image_urls[0] === 'string'
              ? listing.all_image_urls[0]
              : listing.all_image_urls[0]?.url
          )}
          alt={listing.title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
    <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-center">
      <p className="text-[14px] font-bold text-slate-900 leading-tight line-clamp-2">{listing.title}</p>
      <div className="flex items-center gap-1 mt-1">
        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        <span className="text-[12px] font-semibold text-slate-600">{listing.overall_rating || 'New'}</span>
      </div>
      <p className="text-[15px] font-black text-slate-900 mt-1">
        ₹{Number(listing.price_per_night || 0).toLocaleString('en-IN')}
        <span className="text-[11px] font-medium text-slate-500"> / night</span>
      </p>
    </div>
  </div>
);

const ListingCarousel: React.FC<{
  listings: any[];
  activeId: any;
  scrollToken: number;
  onSwipeChange: (listing: any) => void;
  onOpen: (listing: any) => void;
}> = ({ listings, activeId, scrollToken, onSwipeChange, onOpen }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = listings.findIndex((l) => l.id === activeId);
    if (index < 0) return;
    container.scrollTo({ left: index * container.clientWidth, behavior: 'auto' });
  }, [scrollToken, listings]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const width = container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / width);
      const clamped = Math.max(0, Math.min(listings.length - 1, index));
      const listing = listings[clamped];
      if (listing && listing.id !== activeId) onSwipeChange(listing);
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {listings.map((listing) => (
          <div key={listing.id} className="w-full flex-shrink-0" style={{ scrollSnapAlign: 'center' }}>
            <ListingCard listing={listing} onClick={() => onOpen(listing)} />
          </div>
        ))}
      </div>
      {listings.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-2.5 -mt-0.5">
          {listings.map((listing) => (
            <span
              key={listing.id}
              className={`rounded-full transition-all duration-200 ${
                listing.id === activeId ? 'w-4 h-1.5 bg-indigo-600' : 'w-1.5 h-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FullScreenMap: React.FC<FullScreenMapProps> = ({ isOpen, onClose, listings }) => {
  const { isLoaded } = useGoogleMapsLoader();
  const { navigate } = useNavigation();
  const { setIsNavBarVisible } = useBottomNavBar();
  const [selected, setSelected] = useState<any | null>(null);
  const [focusedDistrict, setFocusedDistrict] = useState<string | null>(null);
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null);
  const [scrollToken, setScrollToken] = useState(0);
  const mapRef = useRef<google.maps.Map | null>(null);
  const focusedRef = useRef<string | null>(null);
  const selectedRef = useRef<any | null>(null);
  selectedRef.current = selected;
  const hasFramedRef = useRef(false);
  const markersRef = useRef<Map<any, DirectMarkerOverlay>>(new Map());

  const close = () => {
    triggerHaptic();
    onClose();
  };

  useBackCloseable(isOpen, onClose);

  useEffect(() => {
    setIsNavBarVisible(!isOpen);
    return () => setIsNavBarVisible(true);
  }, [isOpen, setIsNavBarVisible]);

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setFocusedDistrict(null);
      setComingSoonMessage(null);
      focusedRef.current = null;
      hasFramedRef.current = false;
      mapRef.current = null;
      const currentMarkers = markersRef.current;
      for (const [, marker] of currentMarkers.entries()) {
        marker.setMap(null);
      }
      currentMarkers.clear();
    }
  }, [isOpen]);

  const districtStyle = (feature: google.maps.Data.Feature) =>
    buildDistrictStyle(focusedRef.current)(feature);

  const located = useMemo(
    () =>
      listings
        .filter((l) => getLat(l) && getLng(l))
        .map((listing) => ({
          listing,
          position: { lat: getLat(listing), lng: getLng(listing) },
        })),
    [listings]
  );

  const listingsByDistrict = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const { listing, position } of located) {
      const name = districtAt(position.lat, position.lng);
      if (!name) continue;
      const bucket = map.get(name);
      if (bucket) bucket.push(listing);
      else map.set(name, [listing]);
    }
    return map;
  }, [located]);

  const districtListings = focusedDistrict ? listingsByDistrict.get(focusedDistrict) ?? [] : [];

  const focusDistrict = (name: string) => {
    const bounds = districtBounds(name);
    const map = mapRef.current;
    if (!bounds || !map) return;
    triggerHaptic();
    applyCamera(map, bounds, 48, true);
    focusedRef.current = name;
    setFocusedDistrict(name);
    map.data.setStyle(districtStyle);

    const inDistrict = listingsByDistrict.get(name) ?? [];
    if (inDistrict.length > 0) {
      setSelected(inDistrict[0]);
      setScrollToken((t) => t + 1);
      setComingSoonMessage(null);
    } else {
      setSelected(null);
      setComingSoonMessage(getRandomComingSoonMessage());
    }
  };

  const selectListing = (listing: any) => {
    triggerHaptic();
    const name = districtAt(getLat(listing), getLng(listing));
    if (name && name !== focusedRef.current) {
      focusedRef.current = name;
      setFocusedDistrict(name);
      mapRef.current?.data.setStyle(districtStyle);
    }
    setSelected(listing);
    setScrollToken((t) => t + 1);
    setComingSoonMessage(null);
  };

  const selectListingRef = useRef(selectListing);
  selectListingRef.current = selectListing;

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    const latLng = event.latLng;
    if (!latLng) return;
    const name = districtAt(latLng.lat(), latLng.lng());
    if (name && name !== focusedRef.current) {
      focusDistrict(name);
    }
  };

  const resetToState = () => {
    triggerHaptic();
    focusedRef.current = null;
    setFocusedDistrict(null);
    setSelected(null);
    setComingSoonMessage(null);
    const map = mapRef.current;
    if (map) {
      applyCamera(map, KARNATAKA_BOUNDS, 24, true);
      map.data.setStyle(districtStyle);
    }
  };

  const updateMarkers = () => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const currentZoom = typeof map.getZoom() === 'number' ? map.getZoom()! : 7;
    const showPrices = currentZoom >= ZOOM_SHOW_PRICES;
    const dotSize = dotSizeForZoom(currentZoom);
    const currentMarkers = markersRef.current;
    const locatedIds = new Set(located.map((l) => l.listing.id));

    // Remove obsolete markers
    for (const [id, marker] of currentMarkers.entries()) {
      if (!locatedIds.has(id)) {
        marker.setMap(null);
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    for (const { listing, position } of located) {
      const isActive = selectedRef.current?.id === listing.id;
      let marker = currentMarkers.get(listing.id);

      if (!marker) {
        marker = new DirectMarkerOverlay(position);
        marker.setMap(map);
        currentMarkers.set(listing.id, marker);
      }

      marker.update(
        listing,
        isActive,
        showPrices,
        dotSize,
        () => selectListingRef.current(listing)
      );
    }
  };

  const updateMarkersRef = useRef(updateMarkers);
  updateMarkersRef.current = updateMarkers;

  // Synchronize markers on state changes (district focus, selection, listings load)
  useEffect(() => {
    updateMarkersRef.current();
  }, [isOpen, isLoaded, located, selected?.id, focusedDistrict]);

  // Clean up markers on modal close
  useEffect(() => {
    if (!isOpen) {
      const currentMarkers = markersRef.current;
      for (const [, marker] of currentMarkers.entries()) {
        marker.setMap(null);
      }
      currentMarkers.clear();
    }
  }, [isOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isOpen || !map) return;
    if (hasFramedRef.current || focusedRef.current || located.length === 0) return;

    applyCamera(map, boundsOfPositions(located.map((l) => l.position)), 80);
    hasFramedRef.current = true;
  }, [isOpen, located]);

  const clickHandlerRef = useRef(handleMapClick);
  clickHandlerRef.current = handleMapClick;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.9 }}
          className="fixed inset-0 z-[70] bg-[#F4F3F0]"
        >
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              onLoad={(map) => {
                mapRef.current = map;

                map.addListener('click', (event: google.maps.MapMouseEvent) => {
                  clickHandlerRef.current(event);
                });

                let lastShowPrices: boolean | null = null;
                map.addListener('zoom_changed', () => {
                  const z = map.getZoom();
                  if (typeof z === 'number') {
                    const showPrices = z >= ZOOM_SHOW_PRICES;
                    if (showPrices !== lastShowPrices) {
                      lastShowPrices = showPrices;
                      updateMarkersRef.current();
                    }
                  }
                });

                map.addListener('idle', () => {
                  updateMarkersRef.current();
                });

                map.addListener('dragstart', () => {
                  if (activeCameraAnimation) {
                    activeCameraAnimation.cancel();
                    activeCameraAnimation = null;
                  }
                });

                map.data.addGeoJson(KARNATAKA_DISTRICTS_GEOJSON as any);
                map.data.setStyle(districtStyle);

                if (located.length > 0) {
                  applyCamera(map, boundsOfPositions(located.map((l) => l.position)), 80);
                  hasFramedRef.current = true;
                } else {
                  applyCamera(map, KARNATAKA_BOUNDS, 24);
                }

                // Attach and render markers onto newly loaded map instance
                updateMarkersRef.current();
              }}
              onUnmount={() => {
                mapRef.current = null;
                const currentMarkers = markersRef.current;
                for (const [, marker] of currentMarkers.entries()) {
                  marker.setMap(null);
                }
                currentMarkers.clear();
              }}
              options={MAP_OPTIONS}
            >
              {/* Native hardware-accelerated markers managed via GPU layer */}
            </GoogleMap>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
              Loading map…
            </div>
          )}

          {/* Gentle edge fade so whatever sits beyond the state recedes.
              Deliberately weak and starting late: Karnataka's own outline runs
              close to the frame edges, and a stronger vignette washed out the
              very border this is meant to show off. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 96% 88% at 50% 50%, rgba(244,243,240,0) 78%, rgba(244,243,240,0.35) 93%, rgba(244,243,240,0.6) 100%)',
            }}
          />

          {/* All custom chrome lives in one explicitly z-indexed layer, above
              the map regardless of whatever internal stacking Google Maps'
              own panes/controls use — a plain sibling with no z-index (auto)
              can end up beneath library internals depending on how the map's
              own container establishes its stacking context. Interactive
              children opt back into pointer-events individually. */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Back */}
            <button
              onClick={close}
              className="absolute left-4 w-11 h-11 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.22)] border border-black/[0.04] flex items-center justify-center active:scale-90 transition-transform pointer-events-auto"
              style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
              aria-label="Close map"
            >
              <ArrowLeft className="w-5 h-5 text-slate-900" strokeWidth={2.4} />
            </button>

            {/* Count / focused district. Tapping while focused returns to the
                whole state, so drilling in is never a one-way trip. */}
            <button
              onClick={focusedDistrict ? resetToState : undefined}
              disabled={!focusedDistrict}
              className={`absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white shadow-lg flex items-center gap-1.5 ${
                focusedDistrict ? 'active:scale-95 transition-transform pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
            >
              <span className="text-[12px] font-bold text-slate-800 whitespace-nowrap">
                {focusedDistrict
                  ? focusedDistrict
                  : `${located.length} ${located.length === 1 ? 'stay' : 'stays'} in Karnataka`}
              </span>
              {focusedDistrict && (
                <span className="text-[11px] font-semibold text-indigo-600">· All</span>
              )}
            </button>

            {/* CC BY 4.0 requires visible attribution for the boundary data. */}
            {!selected && !comingSoonMessage && (
              <div
                className="absolute left-3"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
              >
                <span className="text-[9px] text-slate-500/70 font-medium">
                  District boundaries © DataMeet, CC BY 4.0
                </span>
              </div>
            )}

            {/* Bottom sheet: a district's stays (swipeable), or — for a
                district with none yet — a random "coming soon" note. Shared
                position/motion so switching between the two states (e.g.
                tapping from an empty district into a populated one) reads as
                one sheet changing content, not two different UI elements. */}
            <AnimatePresence mode="wait">
              {selected && districtListings.length > 0 ? (
                <motion.div
                  key="carousel"
                  initial={{ y: 140, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 140, opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
                  className="absolute left-4 right-4 pointer-events-auto"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
                >
                  <ListingCarousel
                    listings={districtListings}
                    activeId={selected.id}
                    scrollToken={scrollToken}
                    onSwipeChange={(listing) => {
                      setSelected(listing);
                      triggerHaptic();
                    }}
                    onOpen={(listing) => {
                      triggerHaptic();
                      navigate(`/listing/${listing.id}`);
                    }}
                  />
                </motion.div>
              ) : comingSoonMessage ? (
                <motion.div
                  key="coming-soon"
                  initial={{ y: 140, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 140, opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
                  className="absolute left-4 right-4 pointer-events-auto"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
                >
                  <div className="bg-white rounded-3xl shadow-2xl px-5 py-5 text-center">
                    <p className="text-[15px] font-bold text-slate-900 leading-snug">
                      {comingSoonMessage}
                    </p>
                    <p className="text-[12px] text-slate-500 font-medium mt-1">
                      No stays in {focusedDistrict} yet — try another district.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenMap;
