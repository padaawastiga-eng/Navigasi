import { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  MapPin, 
  Compass, 
  Navigation, 
  QrCode, 
  FileText, 
  Share2, 
  Download, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Maximize, 
  Compass as CompassIcon, 
  ShieldCheck, 
  Eye, 
  Check, 
  ExternalLink,
  Laptop,
  Smartphone,
  Sparkles,
  Volume2
} from 'lucide-react';

// --- DATA TYPES ---
interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  color: string;
  label: string;
  description: string;
  percentage: number;
}

const WAYPOINTS: Waypoint[] = [
  {
    id: "START",
    name: "START (Gedung PGRI/Alun-alun Pasirwangi)",
    lat: -7.218420061372144,
    lng: 107.80347852494886,
    icon: "🏁",
    color: "green",
    label: "START",
    description: "Titik awal Jalan Santai. Pastikan berada dalam radius 50 meter dari titik ini untuk memulai perjalanan.",
    percentage: 0
  },
  {
    id: "POS_1",
    name: "POS 1 (Pertigaan Sukaraja)",
    lat: -7.2168328952312875,
    lng: 107.80728060724292,
    icon: "1",
    color: "blue",
    label: "POS 1",
    description: "Pos pemeriksaan pertama. Ambil kupon atau stempel di titik ini sebelum melanjutkan rute.",
    percentage: 20
  },
  {
    id: "POS_2",
    name: "POS 2 (Kampung Kancil)",
    lat: -7.212187332127545,
    lng: 107.80200207867729,
    icon: "2",
    color: "blue",
    label: "POS 2",
    description: "Pos pemeriksaan kedua. Istirahat sejenak dan minum air yang telah disediakan panitia.",
    percentage: 40
  },
  {
    id: "POS_3",
    name: "POS 3 (Pertigaan Barusari)",
    lat: -7.212982611724765,
    lng: 107.79518867755725,
    icon: "3",
    color: "blue",
    label: "POS 3",
    description: "Pos pemeriksaan ketiga. Tetap ikuti jalur berjalan santai di pinggir jalan demi keselamatan.",
    percentage: 60
  },
  {
    id: "POS_4",
    name: "POS 4 (Kampung Cigalumpit)",
    lat: -7.217256211874366,
    lng: 107.7987291553488,
    icon: "4",
    color: "blue",
    label: "POS 4",
    description: "Pos pemeriksaan terakhir. Pastikan semua kupon Anda sudah lengkap sebelum melangkah ke garis finish.",
    percentage: 80
  },
  {
    id: "FINISH",
    name: "FINISH (Gedung PGRI/Alun-alun Pasirwangi)",
    lat: -7.218720840778179,
    lng: 107.803363456828,
    icon: "🏆",
    color: "red",
    label: "FINISH",
    description: "Garis akhir Jalan Santai! Masukkan kupon undian Anda ke dalam kotak doorprize di panggung utama.",
    percentage: 100
  }
];

// --- HELPER GEOMETRY FUNCTIONS ---
const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

const getCompassDirection = (bearing: number): string => {
  const directions = [
    'Utara', 'Timur Laut', 'Timur', 'Tenggara', 
    'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

export default function App() {
  // --- STATE DECLARATIONS ---
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState<string>('Lokasi GPS belum tersedia.');
  
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark'>('standard');
  const [isPanelMinimized, setIsPanelMinimized] = useState<boolean>(false);
  const [outOfRoute, setOutOfRoute] = useState<boolean>(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  
  // Modals
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [showRouteDetails, setShowRouteDetails] = useState<boolean>(false);
  const [showAppsScriptExport, setShowAppsScriptExport] = useState<boolean>(false);
  const [showCongratsModal, setShowCongratsModal] = useState<boolean>(false);
  const [gasActiveTab, setGasActiveTab] = useState<'code' | 'html'>('code');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Simulation settings
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<'fast' | 'normal'>('fast');
  const simIndexRef = useRef<number>(0);
  const simIntervalRef = useRef<any>(null);

  // References for leaflet map object
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routePolylineRef = useRef<any>(null);
  const fallbackPolylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const triggeredCheckpointsRef = useRef<Set<string>>(new Set());
  const activeWaypointIndexRef = useRef<number>(0);

  // Sync activeWaypointIndexRef with activeWaypointIndex state
  useEffect(() => {
    activeWaypointIndexRef.current = activeWaypointIndex;
  }, [activeWaypointIndex]);


  // Speech/Voice synthesize function
  const speakIndonesian = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.15);
      
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log("Audio context not supported/allowed yet");
    }
  };

  // --- MAP INSTANTIATION ---
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Initialize map centered on START waypoint
    const startWp = WAYPOINTS[0];
    const initialMap = L.map(mapContainerRef.current, {
      zoomControl: false,
      maxZoom: 19
    }).setView([startWp.lat, startWp.lng], 15.5);

    mapRef.current = initialMap;

    // Add zoom control top left
    L.control.zoom({ position: 'topleft' }).addTo(initialMap);

    // Tile layers Definition
    const standardTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    });

    const satelliteTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
    });

    const satelliteLabelsTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Labels &copy; Esri'
    });

    const satelliteRoadsTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Roads &copy; Esri'
    });

    const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{y}/{x}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO'
    });

    // Save tiles reference
    (initialMap as any)._tiles = {
      standard: standardTile,
      satellite: satelliteTile,
      satelliteLabels: satelliteLabelsTile,
      satelliteRoads: satelliteRoadsTile,
      dark: darkTile
    };

    // Load default
    standardTile.addTo(initialMap);

    // Draw standard fallback polyline (dashed gray-green)
    const fallbackCoords = WAYPOINTS.map(wp => [wp.lat, wp.lng]);
    const fallbackLine = L.polyline(fallbackCoords, {
      color: '#10b981',
      weight: 5,
      opacity: 0.5,
      dashArray: '8, 12',
      lineCap: 'round'
    }).addTo(initialMap);
    fallbackPolylineRef.current = fallbackLine;

    // Create custom pins for markers
    WAYPOINTS.forEach((wp, index) => {
      let bgHex = '#10b981'; // green for START
      if (wp.id === 'FINISH') bgHex = '#ef4444'; // red for finish
      else if (wp.id.startsWith('POS_')) bgHex = '#3b82f6'; // blue for pos

      const customHtml = `
        <div class="w-9 h-9 bg-white p-[2px] rounded-full shadow-lg border border-slate-200 transition-transform duration-300 hover:scale-110 flex items-center justify-center">
          <div class="w-full h-full rounded-full text-white font-extrabold flex items-center justify-center text-xs shadow-inner" style="background-color: ${bgHex}">
            ${wp.icon}
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: customHtml,
        className: 'custom-div-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 180px;">
          <h4 class="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 mb-1">
            ${wp.icon} ${wp.id}
          </h4>
          <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded uppercase block w-max mb-1.5">${wp.label}</span>
          <p class="text-[11px] text-slate-500 leading-normal mb-2">${wp.description}</p>
          <div class="text-[9px] text-slate-400 font-mono flex flex-col border-t border-slate-100 pt-1.5">
            <span>Lat: ${wp.lat.toFixed(6)}</span>
            <span>Lng: ${wp.lng.toFixed(6)}</span>
          </div>
        </div>
      `;

      const marker = L.marker([wp.lat, wp.lng], { icon: divIcon }).addTo(initialMap);
      marker.bindPopup(popupContent);
    });

    // Load high-fidelity OSRM road coordinates
    fetchOSRMRoute();

    return () => {
      if (initialMap) {
        initialMap.remove();
      }
    };
  }, []);

  // --- TILE SWITCHER SYNC ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._tiles) return;

    const tiles = (map as any)._tiles;
    tiles.standard.remove();
    tiles.satellite.remove();
    if (tiles.satelliteLabels) tiles.satelliteLabels.remove();
    if (tiles.satelliteRoads) tiles.satelliteRoads.remove();
    tiles.dark.remove();

    if (mapStyle === 'standard') {
      tiles.standard.addTo(map);
    } else if (mapStyle === 'satellite') {
      tiles.satellite.addTo(map);
      if (tiles.satelliteRoads) tiles.satelliteRoads.addTo(map);
      if (tiles.satelliteLabels) tiles.satelliteLabels.addTo(map);
    } else if (mapStyle === 'dark') {
      tiles.dark.addTo(map);
    }
  }, [mapStyle]);

  // --- FETCH OSRM ROAD ROUTE PATHS ---
  const fetchOSRMRoute = async () => {
    const legs = [
      { from: WAYPOINTS[0], to: WAYPOINTS[1], profile: 'driving' },
      { from: WAYPOINTS[1], to: WAYPOINTS[2], profile: 'driving' },
      { from: WAYPOINTS[2], to: WAYPOINTS[3], profile: 'driving' },
      { from: WAYPOINTS[3], to: WAYPOINTS[4], profile: 'driving' }, // Follow the main road (jalan besar)!
      { from: WAYPOINTS[4], to: WAYPOINTS[5], profile: 'driving' },
    ];

    try {
      const promises = legs.map(async (leg) => {
        const url = `https://router.project-osrm.org/route/v1/${leg.profile}/${leg.from.lng},${leg.from.lat};${leg.to.lng},${leg.to.lat}?overview=full&geometries=geojson`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.routes && data.routes.length > 0) {
            const geojson = data.routes[0].geometry;
            return geojson.coordinates.map((coord: any) => [coord[1], coord[0]]) as [number, number][];
          }
        } catch (e) {
          console.error(`OSRM failed for leg: ${leg.from.id} -> ${leg.to.id}`, e);
        }

        // Fallback for this single leg if OSRM fails
        const points: [number, number][] = [];
        const steps = 15;
        for (let s = 0; s <= steps; s++) {
          const lat = leg.from.lat + (leg.to.lat - leg.from.lat) * (s / steps);
          const lng = leg.from.lng + (leg.to.lng - leg.from.lng) * (s / steps);
          points.push([lat, lng]);
        }
        return points;
      });

      const results = await Promise.all(promises);
      const combinedCoords = results.flat();
      setRouteCoordinates(combinedCoords);

      // Subdue the straight fallback dashed line
      if (fallbackPolylineRef.current) {
        fallbackPolylineRef.current.setStyle({ opacity: 0.15, weight: 3 });
      }

      // Render proper walk-snapped road polyline
      if (routePolylineRef.current && mapRef.current) {
        routePolylineRef.current.setLatLngs(combinedCoords);
      } else if (mapRef.current) {
        const L = (window as any).L;
        routePolylineRef.current = L.polyline(combinedCoords, {
          color: '#059669', // emerald 600
          weight: 7,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(mapRef.current);
      }

      // Fit bounds beautifully
      if (mapRef.current && routePolylineRef.current) {
        mapRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
      }
    } catch (err) {
      console.error("Error building combined route:", err);
      generateFallbackCoords();
    }
  };

  const generateFallbackCoords = () => {
    const coords: [number, number][] = [];
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const start = WAYPOINTS[i];
      const end = WAYPOINTS[i+1];
      const steps = 15;
      for (let s = 0; s < steps; s++) {
        const lat = start.lat + (end.lat - start.lat) * (s / steps);
        const lng = start.lng + (end.lng - start.lng) * (s / steps);
        coords.push([lat, lng]);
      }
    }
    coords.push([WAYPOINTS[WAYPOINTS.length - 1].lat, WAYPOINTS[WAYPOINTS.length - 1].lng]);
    setRouteCoordinates(coords);
  };

  // --- REAL-TIME GPS WATCH LOGIC ---
  const handleStartRealNavigation = () => {
    triggeredCheckpointsRef.current.clear(); // Reset check flags on fresh start
    setIsNavigating(true);
    speakIndonesian("Navigasi dimulai. Silakan ikuti rute jalan santai dari titik start.");
    playChime();

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('Sensor GPS tidak didukung oleh browser Anda.');
      return;
    }

    setGpsStatus('loading');
    setGpsMessage('Mencari sinyal GPS Anda...');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (isSimulating) return; // Skip updating from real sensor if simulating

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setUserLocation([lat, lng]);
        setUserAccuracy(accuracy);
        setGpsStatus('success');
        setGpsMessage(`Akurasi GPS: ±${Math.round(accuracy)} meter`);

        // Check if user is in range of current checkpoint
        processUserPosition(lat, lng, accuracy);
        updateUserOnMap(lat, lng, accuracy);
      },
      (error) => {
        if (isSimulating) return;

        let errMsg = 'Gagal membaca lokasi.';
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = 'Akses lokasi ditolak. Silakan izinkan lokasi di HP Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = 'Sinyal GPS kurang akurat atau tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          errMsg = 'Waktu pencarian GPS habis.';
        }
        setGpsStatus('error');
        setGpsMessage(errMsg);
      },
      options
    );
  };

  const updateUserOnMap = (lat: number, lng: number, accuracy: number) => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Draw user dot
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userHtml = `
        <div class="relative w-7 h-7 flex items-center justify-center">
          <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-45"></div>
          <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-marker-ref',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapRef.current);
    }

    // Draw accuracy circle
    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([lat, lng]);
      userCircleRef.current.setRadius(accuracy);
    } else {
      userCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#3b82f6',
        weight: 1,
        opacity: 0.15,
        fillColor: '#3b82f6',
        fillOpacity: 0.08
      }).addTo(mapRef.current);
    }

    // Always keep map centered on user during active navigation
    mapRef.current.setView([lat, lng]);
  };

  const processUserPosition = (lat: number, lng: number, accuracy: number) => {
    // 1. Get current checkpoint using synchronous index ref
    const currentActiveIndex = activeWaypointIndexRef.current;
    const currentTarget = WAYPOINTS[currentActiveIndex];
    
    // 2. Out of Route detection
    let finalPathCoords = routeCoordinates;
    if (finalPathCoords.length === 0) {
      finalPathCoords = WAYPOINTS.map(wp => [wp.lat, wp.lng]);
    }

    let minPathDist = Infinity;
    finalPathCoords.forEach(([cLat, cLng]) => {
      const dist = getHaversineDistance(lat, lng, cLat, cLng);
      if (dist < minPathDist) minPathDist = dist;
    });

    if (minPathDist > 100) {
      setOutOfRoute(true);
    } else {
      setOutOfRoute(false);
    }

    // 3. Special handling for START validation (Rule 13)
    if (currentActiveIndex === 0) {
      const distToStart = getHaversineDistance(lat, lng, currentTarget.lat, currentTarget.lng);
      if (distToStart <= 50) {
        // Automatically advance to POS 1
        triggerCheckpointSuccess(0);
      }
      return;
    }

    // 4. Check standard Checkpoint validation (Rule 6)
    const distToTarget = getHaversineDistance(lat, lng, currentTarget.lat, currentTarget.lng);
    if (distToTarget <= 50) {
      triggerCheckpointSuccess(currentActiveIndex);
    }
  };

  const triggerCheckpointSuccess = (index: number) => {
    const reachedWp = WAYPOINTS[index];
    
    // Safety guard to prevent duplicate notifications / speech loops
    if (triggeredCheckpointsRef.current.has(reachedWp.id)) {
      return;
    }
    triggeredCheckpointsRef.current.add(reachedWp.id);

    playChime();

    // Trigger local canvas confetti
    const conf = (window as any).confetti;
    if (conf) {
      conf({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.85 }
      });
    }

    if (reachedWp.id === 'START') {
      speakIndonesian("Anda berada di start. Rute Jalan Santai resmi dimulai! Menuju Pos Satu.");
      setActiveWaypointIndex(1);
    } else if (reachedWp.id === 'FINISH') {
      speakIndonesian("Selamat! Anda telah menyelesaikan rute Jalan Santai HGN 2026 Kecamatan Pasirwangi. Terima kasih telah berpartisipasi!");
      setActiveWaypointIndex(5); // Stop advancing
      setShowCongratsModal(true);
      if (isSimulating) handleToggleSimulation();
    } else {
      const nextIndex = index + 1;
      const nextWp = WAYPOINTS[nextIndex];
      speakIndonesian(`${reachedWp.label} tercapai! Silakan lanjutkan perjalanan menuju ${nextWp.label}.`);
      setActiveWaypointIndex(nextIndex);
    }
  };

  // --- GPS SIMULATOR (WALK DEMO) ---
  const handleToggleSimulation = () => {
    if (isSimulating) {
      // STOP SIMULATION
      setIsSimulating(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      speakIndonesian("Simulasi berjalan dihentikan.");
    } else {
      // START SIMULATION
      triggeredCheckpointsRef.current.clear(); // Reset check flags on new simulation start
      setIsSimulating(true);
      setIsNavigating(true);
      speakIndonesian("Simulasi dimulai. Berjalan otomatis menyusuri rute.");
      playChime();

      let targetCoords = routeCoordinates;
      if (targetCoords.length === 0) {
        // If OSRM failed, generate fallback
        const coords: [number, number][] = [];
        for (let i = 0; i < WAYPOINTS.length - 1; i++) {
          const start = WAYPOINTS[i];
          const end = WAYPOINTS[i+1];
          const steps = 15;
          for (let s = 0; s < steps; s++) {
            const lat = start.lat + (end.lat - start.lat) * (s / steps);
            const lng = start.lng + (end.lng - start.lng) * (s / steps);
            coords.push([lat, lng]);
          }
        }
        coords.push([WAYPOINTS[WAYPOINTS.length - 1].lat, WAYPOINTS[WAYPOINTS.length - 1].lng]);
        targetCoords = coords;
      }

      simIndexRef.current = 0;
      setActiveWaypointIndex(0);

      // Start loop
      runSimulationLoop(targetCoords);
    }
  };

  const runSimulationLoop = (coords: [number, number][]) => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    const stepMs = simSpeed === 'fast' ? 500 : 2500;

    simIntervalRef.current = setInterval(() => {
      const idx = simIndexRef.current;
      if (idx >= coords.length) {
        clearInterval(simIntervalRef.current);
        return;
      }

      const [lat, lng] = coords[idx];
      setUserLocation([lat, lng]);
      setUserAccuracy(6); // Simulate perfect satellite GPS accuracy
      setGpsStatus('success');
      setGpsMessage(`Akurasi GPS (Simulasi): ±6 meter`);

      updateUserOnMap(lat, lng, 6);
      processUserPosition(lat, lng, 6);

      simIndexRef.current = idx + 1;
    }, stepMs);
  };

  // Switch speed dynamically
  useEffect(() => {
    if (isSimulating && routeCoordinates.length > 0) {
      runSimulationLoop(routeCoordinates);
    }
  }, [simSpeed]);

  const handleTeleportNextCheckpoint = () => {
    if (!isNavigating) {
      handleStartRealNavigation();
    }
    const target = WAYPOINTS[activeWaypointIndex];
    setUserLocation([target.lat, target.lng]);
    setUserAccuracy(5);
    setGpsStatus('success');
    setGpsMessage(`Simulasi Teleport ke ${target.label}`);
    updateUserOnMap(target.lat, target.lng, 5);
    processUserPosition(target.lat, target.lng, 5);
  };

  const handleFitRoute = () => {
    if (!mapRef.current) return;
    if (routePolylineRef.current) {
      mapRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
    } else if (fallbackPolylineRef.current) {
      mapRef.current.fitBounds(fallbackPolylineRef.current.getBounds(), { padding: [50, 50] });
    }
  };

  const handleRecenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 18);
    } else {
      alert("Lokasi Anda belum terbaca. Silakan tekan '🚶 MULAI NAVIGASI' terlebih dahulu untuk mengaktifkan GPS.");
    }
  };

  // --- SOCIAL WEB SHARE API ---
  const handleShareApp = () => {
    const text = "Jalan Santai HGN 2026 Kecamatan Pasirwangi\nIkuti rute Jalan Santai dari START sampai FINISH secara interaktif.";
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'Navigasi Jalan Santai HGN 2026',
        text: text,
        url: url
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`)
        .then(() => {
          alert("📋 Link rute navigasi berhasil disalin ke clipboard!");
        })
        .catch(err => {
          console.error("Gagal menyalin link:", err);
        });
    }
  };

  // --- GOOGLE MAPS EXTERNAL NAVIGATION DIRECTIONS ---
  const handleOpenGoogleMaps = () => {
    const currentTarget = WAYPOINTS[activeWaypointIndex];
    let originCoords = "";

    if (userLocation) {
      originCoords = `${userLocation[0]},${userLocation[1]}`;
    } else {
      // Fallback to start point if no user location is active
      originCoords = `${WAYPOINTS[0].lat},${WAYPOINTS[0].lng}`;
    }

    const destCoords = `${currentTarget.lat},${currentTarget.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destCoords}&travelmode=walking`;
    window.open(url, '_blank');
  };

  // Calculating HUD dynamic values
  const currentTarget = WAYPOINTS[activeWaypointIndex];
  let distanceToTarget = 0;
  let targetBearing = 0;
  let compassDirection = "Utara";

  if (userLocation) {
    distanceToTarget = getHaversineDistance(userLocation[0], userLocation[1], currentTarget.lat, currentTarget.lng);
    targetBearing = getBearing(userLocation[0], userLocation[1], currentTarget.lat, currentTarget.lng);
    compassDirection = getCompassDirection(targetBearing);
  }

  // Calculate overall route percentage based on reached index
  const progressPercent = activeWaypointIndex * 20;

  // Code Copy
  const handleCopyGasCode = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
  };

  // Mock code content
  const codeGsContent = `/**
 * APLIKASI NAVIGASI RUTE JALAN SANTAI
 * HGN TAHUN 2026 KECAMATAN PASIRWANGI
 * 
 * Google Apps Script - Code.gs (Backend)
 * Author: Panitia Hari Guru Nasional & HUT PGRI ke-81 Kecamatan Pasirwangi
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
      .setTitle('Navigasi Jalan Santai HGN 2026 Pasirwangi')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getRouteData() {
  return {
    name: "Jalan Santai HGN 2026 Kecamatan Pasirwangi",
    waypoints: [
      { id: "START", name: "START (Gedung PGRI/Alun-alun)", lat: -7.218420061372144, lng: 107.80347852494886, icon: "🏁", color: "green", label: "START", description: "Titik awal Jalan Santai. Pastikan berada dalam radius 50 meter dari titik ini untuk memulai.", percentage: 0 },
      { id: "POS_1", name: "POS 1 (Pertigaan Sukaraja)", lat: -7.2168328952312875, lng: 107.80728060724292, icon: "1", color: "blue", label: "POS 1", description: "Pos pemeriksaan pertama. Ambil kupon atau stempel di titik ini.", percentage: 20 },
      { id: "POS_2", name: "POS 2 (Kampung Kancil)", lat: -7.212187332127545, lng: 107.80200207867729, icon: "2", color: "blue", label: "POS 2", description: "Pos pemeriksaan kedua. Istirahat sejenak dan minum air.", percentage: 40 },
      { id: "POS_3", name: "POS 3 (Pertigaan Barusari)", lat: -7.212982611724765, lng: 107.79518867755725, icon: "3", color: "blue", label: "POS 3", description: "Pos pemeriksaan ketiga. Tetap ikuti jalur berjalan di pinggir jalan.", percentage: 60 },
      { id: "POS_4", name: "POS 4 (Kampung Cigalumpit)", lat: -7.217256211874366, lng: 107.7987291553488, icon: "4", color: "blue", label: "POS 4", description: "Pos pemeriksaan terakhir. Pastikan kupon lengkap.", percentage: 80 },
      { id: "FINISH", name: "FINISH (Gedung PGRI/Alun-alun)", lat: -7.218720840778179, lng: 107.803363456828, icon: "🏆", color: "red", label: "FINISH", description: "Garis akhir Jalan Santai! Masukkan kupon undian Anda.", percentage: 100 }
    ]
  };
}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 antialiased font-sans text-slate-800">
      
      {/* HEADER BANNER */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 leading-tight tracking-tight text-sm md:text-base uppercase">Jalan Santai HGN 2026</h1>
              <p className="text-emerald-600 text-[10px] md:text-xs font-bold tracking-wider">HUT PGRI Ke-81 Kecamatan Pasirwangi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowQrCode(true)} 
              className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition duration-150" 
              title="Tampilkan QR Code Aplikasi"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowRouteDetails(true)} 
              className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition duration-150" 
              title="Detail Koordinat & Rute"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button 
              onClick={handleShareApp} 
              className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition duration-150" 
              title="Bagikan Rute Navigasi"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto relative overflow-hidden">
        
        {/* LEFT PANEL / SIDEBAR */}
        <aside className="w-full md:w-[380px] bg-white border-b md:border-b-0 md:border-r border-slate-100 flex flex-col overflow-y-auto shrink-0 z-20 max-h-[45vh] md:max-h-none shadow-sm">
          
          {/* LANDING & HERO CARD */}
          {!isNavigating ? (
            <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
              <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden mb-5">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
                <span className="bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest text-white shadow-sm inline-block">
                  Hari Guru Nasional
                </span>
                <h3 className="text-xl font-black mt-2.5 tracking-tight leading-snug">JALAN SANTAI HGN 2026</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                  Rute Jalan Santai Kecamatan Pasirwangi, Garut. Hubungkan GPS HP Anda dan berjalanlah menyusuri rute dari START hingga FINISH secara interaktif.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Navigation className="w-4 h-4 text-emerald-400 rotate-45" /> Jarak: <b>~1.8 KM</b>
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" /> Checkpoint: <b>4 POS</b>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={handleStartRealNavigation} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-5 rounded-2xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-emerald-600/25 cursor-pointer text-sm"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" /> 🚶 MULAI NAVIGASI GPS
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleFitRoute} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    🗺️ LIHAT RUTE
                  </button>
                  <button 
                    onClick={handleShareApp} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    📱 BAGIKAN RUTE
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* GPS SIMULATOR (MOCK WALK PANEL FOR EVALUATION) */}
          <div className="p-4 bg-amber-50/70 border-b border-amber-100/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-600 animate-bounce" /> GPS Simulator (Walk Demo)
              </span>
              <span className="bg-amber-100 text-amber-900 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                TEST MEJA
              </span>
            </div>
            <p className="text-[11px] text-amber-700/90 leading-relaxed mb-3 font-medium">
              Gunakan simulasi ini untuk menguji auto-checkpoint radius 50m, progress bar, arah kiblat kompas, chimes, & notifikasi suara.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleSimulation} 
                  className={`flex-1 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer ${
                    isSimulating 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/10' 
                    : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-500/10'
                  }`}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isSimulating ? 'Hentikan Simulasi' : 'Mulai Simulasi Jalan'}
                </button>
                <button 
                  onClick={handleTeleportNextCheckpoint} 
                  className="bg-white border border-amber-300 text-amber-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-amber-100 transition duration-150 cursor-pointer"
                >
                  Lompat POS
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-amber-700 font-semibold mt-0.5">
                <span>Kecepatan simulasi:</span>
                <select 
                  value={simSpeed} 
                  onChange={(e) => setSimSpeed(e.target.value as any)} 
                  className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold outline-none cursor-pointer"
                >
                  <option value="fast">Sangat Cepat (15s Rute)</option>
                  <option value="normal">Realistis (Normal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ACTIVE NAVIGATION HUD */}
          {isNavigating ? (
            <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Perjalanan</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> GPS Aktif
                </span>
              </div>

              {/* Start Condition Instruction (Rule 13) */}
              {activeWaypointIndex === 0 && !userLocation ? (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-3.5 rounded-2xl mb-4 text-xs font-semibold leading-relaxed shadow-sm">
                  📢 Silakan berjalan menuju titik <b className="text-emerald-700 font-bold">START</b> terlebih dahulu.
                  <p className="text-[10px] text-emerald-600 mt-1 font-medium">Jika Anda sedang tidak di lokasi, silakan jalankan <b>Simulator GPS</b> di atas untuk pengujian rute.</p>
                </div>
              ) : null}

              {activeWaypointIndex === 0 && userLocation ? (
                (() => {
                  const distToStart = getHaversineDistance(userLocation[0], userLocation[1], WAYPOINTS[0].lat, WAYPOINTS[0].lng);
                  if (distToStart > 50) {
                    return (
                      <div className="bg-amber-50 text-amber-900 border border-amber-200 p-3.5 rounded-2xl mb-4 text-xs font-semibold leading-relaxed shadow-sm">
                        ⚠️ Jarak Anda ke START: <b className="text-amber-700 font-bold">{distToStart < 1000 ? `${Math.round(distToStart)} meter` : `${(distToStart/1000).toFixed(1)} km`}</b>.
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Silakan mendekat hingga radius 50m ke START untuk mulai perjalanan. Atau jalankan Simulator!</p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-emerald-50 text-emerald-950 border border-emerald-200 p-3.5 rounded-2xl mb-4 text-xs font-bold leading-relaxed shadow-sm">
                        ✅ Anda berada di START. Perjalanan dapat dimulai!
                        <button 
                          onClick={() => triggerCheckpointSuccess(0)} 
                          className="mt-2.5 w-full bg-emerald-600 text-white font-bold py-1.5 rounded-xl text-[10px] transition hover:bg-emerald-700 shadow-sm shadow-emerald-600/10"
                        >
                          Klik Untuk Lanjut Ke POS 1
                        </button>
                      </div>
                    );
                  }
                })()
              ) : null}

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20 shrink-0">
                  {currentTarget.id === 'FINISH' ? '🏆' : <Navigation className="w-5 h-5 rotate-45" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">Tujuan Berikutnya</span>
                  <h3 className="font-extrabold text-slate-800 text-sm truncate">{currentTarget.id}: {currentTarget.name}</h3>
                  <p className="text-xs text-emerald-700 font-bold mt-0.5">
                    {userLocation 
                      ? (distanceToTarget < 1000 ? `${Math.round(distanceToTarget)} meter lagi` : `${(distanceToTarget/1000).toFixed(1)} km lagi`)
                      : "Menghitung jarak..."
                    }
                  </p>
                </div>
              </div>

              {/* Angle Direction HUD Card */}
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mb-4">
                <div className="text-center border-r border-slate-100 flex flex-col justify-center py-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Arah Kompas</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-700">
                    <CompassIcon 
                      className="w-4 h-4 text-emerald-600 transition-transform" 
                      style={{ transform: `rotate(${targetBearing}deg)` }} 
                    />
                    <span className="text-xs font-bold">{compassDirection}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{Math.round(targetBearing)}°</span>
                </div>
                <div className="text-center flex flex-col justify-center py-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Status GPS</span>
                  <span className={`text-xs font-extrabold block mt-1 ${outOfRoute ? 'text-red-500' : 'text-slate-700'}`}>
                    {outOfRoute ? '⚠️ Keluar Rute' : 'Berjalan'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">Deviasi: {outOfRoute ? '>100m' : '<100m'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleOpenGoogleMaps} 
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-150 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> BUKA DI GOOGLE MAPS
                </button>
                <button 
                  onClick={handleRecenterOnUser} 
                  className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-150"
                >
                  <MapPin className="w-4 h-4 text-emerald-600" /> Cari Posisi Saya
                </button>
              </div>
            </div>
          ) : null}

          {/* PROGRESS SLIDER */}
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress Perjalanan</span>
              <span className="text-sm font-black text-emerald-600">{progressPercent}%</span>
            </div>
            {/* Custom styled track bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase mt-2.5 tracking-wider px-1">
              <span>START</span>
              <span>POS 1</span>
              <span>POS 2</span>
              <span>POS 3</span>
              <span>POS 4</span>
              <span>FINISH</span>
            </div>
          </div>

          {/* TIMELINE LIST */}
          <div className="p-5 flex-1 bg-white">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Daftar Checkpoint (Timeline)</h4>
            
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-slate-200">
              {WAYPOINTS.map((wp, index) => {
                let statusText = '';
                let statusClass = '';
                let dotClass = '';
                let stepColor = '';

                if (index < activeWaypointIndex) {
                  statusText = '✓ SELESAI';
                  statusClass = 'text-emerald-600 font-extrabold';
                  dotClass = 'bg-emerald-500 text-white';
                  stepColor = 'text-slate-800';
                } else if (index === activeWaypointIndex) {
                  statusText = '● TUJUAN SAAT INI';
                  statusClass = 'text-blue-600 font-extrabold text-xs animate-pulse';
                  dotClass = 'bg-blue-600 text-white animate-bounce ring-4 ring-blue-100';
                  stepColor = 'font-bold text-slate-900';
                } else {
                  statusText = '○ BELUM DILEWATI';
                  statusClass = 'text-slate-400 font-medium';
                  dotClass = 'bg-slate-100 text-slate-400 border border-slate-200';
                  stepColor = 'text-slate-400';
                }

                return (
                  <div key={wp.id} className="relative flex items-start gap-4">
                    <div className={`absolute -left-[23px] w-4 h-4 rounded-full flex items-center justify-center text-[9px] z-10 font-bold ${dotClass}`}>
                      {index < activeWaypointIndex ? '✓' : ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h5 className={`text-xs font-bold leading-none ${stepColor}`}>
                          {wp.icon} {wp.id} - {wp.label}
                        </h5>
                        <span className={`text-[9px] uppercase tracking-wider ${statusClass}`}>{statusText}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">{wp.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRIVACY SHIELD FOOTNOTE */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium leading-relaxed text-center">
            <span className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Lokasi GPS Anda aman dan diproses hanya secara lokal di browser HP Anda.
            </span>
          </div>
        </aside>

        {/* RIGHT SECTION: MAP & ACCURACY STATUS BAR */}
        <section className="flex-1 h-[55vh] md:h-auto relative flex flex-col">
          
          {/* MAP CANVAS DIV */}
          <div id="map" ref={mapContainerRef} className="w-full flex-1 min-h-[300px]"></div>

          {/* MAP STYLE PILL SELECTOR (Standard vs Satelit) */}
          <div className="absolute bottom-5 left-5 z-[1000] bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-1.5">
            <button 
              onClick={() => setMapStyle('standard')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                mapStyle === 'standard' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-black' 
                  : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
              }`}
            >
              🗺️ Standard
            </button>
            <button 
              onClick={() => setMapStyle('satellite')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                mapStyle === 'satellite' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-black' 
                  : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
              }`}
            >
              🌍 Satelit
            </button>
            <button 
              onClick={() => setMapStyle('dark')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                mapStyle === 'dark' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-black' 
                  : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
              }`}
            >
              🌙 Dark
            </button>
          </div>

          {/* LIVE ACCURACY INDICATOR Overlay */}
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-slate-100 max-w-sm mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                gpsStatus === 'success' ? 'bg-emerald-100 text-emerald-600' :
                gpsStatus === 'loading' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500'
              }`}>
                <Navigation className={`w-4 h-4 ${gpsStatus === 'loading' ? 'animate-spin' : 'rotate-45'}`} />
              </div>
              <div className="min-w-0 leading-tight">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Sinyal GPS Realtime</span>
                <span className="text-xs font-extrabold text-slate-700 truncate block">{gpsMessage}</span>
              </div>
            </div>
            <button 
              onClick={handleStartRealNavigation} 
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition duration-150 shrink-0"
            >
              Ulangi GPS
            </button>
          </div>

          {/* FLOATING CONTROL PINS */}
          <div className="absolute bottom-5 right-5 z-[1000] flex flex-col gap-2">
            
            {/* Zoom / Navigation helpers */}
            <div className="flex flex-col rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden">
              <button 
                onClick={handleFitRoute} 
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-slate-50 border-b border-slate-100 transition duration-150 cursor-pointer"
                title="Fit Keseluruhan Rute"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRecenterOnUser} 
                className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-slate-50 transition duration-150 cursor-pointer"
                title="Pusatkan Peta di Posisi Saya"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>

          </div>

        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-4 px-4 text-center text-xs text-slate-400 z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-medium">
          <p>
            Jalan Santai HGN & HUT PGRI ke-81 Kecamatan Pasirwangi © 2026 Panitia
          </p>
          <div className="flex gap-4 items-center">
            <a href="mailto:pasirwangipgri@gmail.com" className="hover:text-emerald-600 transition">Hubungi Panitia</a>
            <span>•</span>
            <button 
              onClick={() => setShowAppsScriptExport(true)} 
              className="hover:text-emerald-600 transition font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Export Google Apps Script
            </button>
          </div>
        </div>
      </footer>

      {/* CONGRATS CELEBRATION MODAL */}
      {showCongratsModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-xl"></div>
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-slate-800 mb-1">Selamat, Anda Berhasil!</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide mb-4">Panitia Hari Guru Nasional & HUT PGRI Ke-81 Kecamatan Pasirwangi</p>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Anda telah menyelesaikan rute Jalan Santai secara interaktif dari START sampai FINISH!
            </p>
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mb-6 flex flex-col items-center justify-center">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Status Perjalanan</span>
              <span className="text-lg font-black text-emerald-800 flex items-center gap-1">100% SELESAI 🎉</span>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowCongratsModal(false)} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition duration-150 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Kembali ke Peta Rute
              </button>
              <button 
                onClick={handleShareApp} 
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-2xl transition duration-150 cursor-pointer"
              >
                <Share2 className="w-4 h-4 mr-1 inline" /> Bagikan Rute ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE */}
      {showQrCode && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-800 text-base">QR Code Rute Jalan Santai</h3>
              <button 
                onClick={() => setShowQrCode(false)} 
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
              Panitia dapat menempel QR Code ini di spanduk, meja pendaftaran, kartu peserta, titik START, atau sosial media agar peserta bisa langsung memindai & mengikuti rute.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`} 
                className="w-44 h-44 rounded-lg bg-white p-2 shadow-sm" 
                alt="QR Code" 
              />
              <span className="text-[9px] text-slate-400 font-mono mt-3 break-all select-all px-2 max-w-full font-bold">{window.location.href}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleShareApp} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                Bagikan Link
              </button>
              <button 
                onClick={() => setShowQrCode(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COORDINATES DETAIL */}
      {showRouteDetails && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Detail Koordinat & Waypoints
              </h3>
              <button 
                onClick={() => setShowRouteDetails(false)} 
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              {WAYPOINTS.map((wp) => (
                <div key={wp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-inner">
                    {wp.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs">{wp.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-semibold">{wp.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-slate-200/50 text-[10px] text-slate-400 font-mono font-bold">
                      <span>Latitude: <b>{wp.lat}</b></span>
                      <span>Longitude: <b>{wp.lng}</b></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowRouteDetails(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition duration-150 cursor-pointer text-xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE APPS SCRIPT EXPORT */}
      {showAppsScriptExport && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  🚀 Deploy ke Google Apps Script (GAS)
                </h3>
                <p className="text-xs text-slate-400 font-bold">Dapatkan URL Web App mandiri Anda tanpa server atau biaya hosting!</p>
              </div>
              <button 
                onClick={() => setShowAppsScriptExport(false)} 
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm text-slate-600 leading-relaxed font-medium">
              
              {/* STEP BY STEP GUIDE */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <h4 className="font-black text-emerald-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  📋 Panduan Deploy 3 Menit:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-emerald-900">
                  <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline text-emerald-700 font-extrabold hover:text-emerald-800">Google Apps Script (script.google.com)</a> & buat Project Baru.</li>
                  <li>Salin kode dari tab <b className="font-black">Code.gs</b> di bawah, lalu paste seluruh isinya ke editor <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">Code.gs</code>.</li>
                  <li>Buat file HTML baru bernama <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">Index</code> (tanpa ekstensi .html), salin seluruh isi file <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">Index.html</code> dari folder <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">google-apps-script/Index.html</code> di filesystem, lalu paste ke dalamnya.</li>
                  <li>Klik tombol <b className="font-bold text-emerald-800">Terapkan (Deploy)</b> di bagian atas → <b>Penerapan Baru (New Deployment)</b>.</li>
                  <li>Pilih Jenis penerapan: <b>Aplikasi Web (Web App)</b>.</li>
                  <li>Setel Akses (Who has access): <b>Siapa saja (Anyone)</b>, lalu klik <b>Terapkan</b>. Selesai!</li>
                </ol>
              </div>

              {/* TABS */}
              <div className="flex border-b border-slate-100 shrink-0">
                <button 
                  onClick={() => setGasActiveTab('code')} 
                  className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
                    gasActiveTab === 'code' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Code.gs (Backend)
                </button>
                <button 
                  onClick={() => setGasActiveTab('html')} 
                  className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
                    gasActiveTab === 'html' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Index.html (Frontend)
                </button>
              </div>

              {/* CODE CONTAINER */}
              <div className="relative">
                <button 
                  onClick={() => handleCopyGasCode(gasActiveTab === 'code' ? codeGsContent : 'Salin file `google-apps-script/Index.html` di repo Anda.')} 
                  className="absolute right-3.5 top-3.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-1.5 px-3 rounded-xl text-[11px] flex items-center gap-1.5 transition shadow-md cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Tersalin!' : 'Salin Kode'}
                </button>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl text-[10.5px] font-mono overflow-auto max-h-[300px] leading-relaxed select-all">
                  {gasActiveTab === 'code' ? codeGsContent : `Sebab file Index.html sangat detail & responsif (~1200 baris), silakan salin langsung dari file asli di project:

File Path: /google-apps-script/Index.html

Kode tersebut sudah memiliki seluruh integrasi Leaflet, Geolocation Tracker, Haversine, Bearing, Google Maps Navigation, Sound synthesis, & Simulasi Demo.`}
                </pre>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowAppsScriptExport(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
