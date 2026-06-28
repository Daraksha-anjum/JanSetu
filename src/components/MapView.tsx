import React, { useState, useEffect } from "react";
import { MapPin, Info, ArrowRight, ShieldAlert, CheckCircle, RefreshCcw, Layers } from "lucide-react";
import { IssueReport } from "../types";

interface MapViewProps {
  reports: IssueReport[];
  selectedCommunity: string;
  onViewInFeed: (reportId: string) => void;
}

export default function MapView({ reports, selectedCommunity, onViewInFeed }: MapViewProps) {
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [showResolved, setShowResolved] = useState(true);
  const [showOpen, setShowOpen] = useState(true);

  // Geolocation tracking states
  const [userLocation, setUserLocation] = useState<{ x: string; y: string; lat?: number; lng?: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionState('granted');
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({
          x: "48%",
          y: "52%",
          lat,
          lng
        });
        setGeoLoading(false);
      },
      (error) => {
        setPermissionState('denied');
        setGeoError("Location permission denied. Showing community center fallback.");
        setGeoLoading(false);
        setUserLocation({
          x: "50%",
          y: "50%",
          lat: 17.4482,
          lng: 78.3741
        });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  useEffect(() => {
    requestGeolocation();
  }, [selectedCommunity]);

  // Filter reports matching the current community and status toggles
  const mapReports = reports.filter((r) => {
    if (r.community !== selectedCommunity) return false;
    if (r.status === "Resolved" && !showResolved) return false;
    if (r.status !== "Resolved" && !showOpen) return false;
    return true;
  });

  // Unique landmarks based on community
  const getCommunityDetails = (community: string) => {
    switch (community) {
      case "Old Bowenpally":
        return {
          landmarks: [
            { name: "Old Bowenpally Market", x: "20%", y: "30%", color: "text-amber-600 bg-amber-50" },
            { name: "Police Station", x: "80%", y: "20%", color: "text-blue-600 bg-blue-50" },
            { name: "Main Ground", x: "65%", y: "75%", color: "text-emerald-600 bg-emerald-50" },
            { name: "Sree Rama Mandiram", x: "30%", y: "60%", color: "text-orange-600 bg-orange-50" }
          ],
          streets: [
            { path: "M 0 45 L 100 45", name: "Market Main Road" },
            { path: "M 35 0 L 35 100", name: "Mandir Cross Lane" },
            { path: "M 75 0 L 75 100", name: "Station Road" }
          ]
        };
      case "Banjara Hills":
        return {
          landmarks: [
            { name: "KBR National Park", x: "25%", y: "35%", color: "text-emerald-700 bg-emerald-50" },
            { name: "Road No. 12 Circle", x: "75%", y: "65%", color: "text-slate-600 bg-slate-100" },
            { name: "GVK One Mall", x: "15%", y: "75%", color: "text-purple-600 bg-purple-50" },
            { name: "Apollo Hospital", x: "85%", y: "25%", color: "text-rose-600 bg-rose-50" }
          ],
          streets: [
            { path: "M 0 30 C 30 30, 60 70, 100 70", name: "Road No. 12" },
            { path: "M 50 0 C 50 40, 20 80, 20 100", name: "Park Circular Lane" },
            { path: "M 80 0 L 80 100", name: "Road No. 2" }
          ]
        };
      case "Kukatpally":
        return {
          landmarks: [
            { name: "Kukatpally Metro Stn", x: "40%", y: "25%", color: "text-sky-600 bg-sky-50" },
            { name: "IDPL Colony Ground", x: "70%", y: "45%", color: "text-emerald-600 bg-emerald-50" },
            { name: "Forum Sujana Mall", x: "20%", y: "75%", color: "text-pink-600 bg-pink-50" },
            { name: "JNTU Junction", x: "80%", y: "80%", color: "text-indigo-600 bg-indigo-50" }
          ],
          streets: [
            { path: "M 0 25 L 100 25", name: "Metro Corridor Hwy" },
            { path: "M 30 0 L 30 100", name: "JNTU Road" },
            { path: "M 0 70 L 100 70", name: "IDPL Link Street" }
          ]
        };
      case "Gachibowli":
        return {
          landmarks: [
            { name: "Financial District", x: "30%", y: "40%", color: "text-amber-700 bg-amber-50" },
            { name: "DLF Cyber City", x: "75%", y: "30%", color: "text-slate-700 bg-slate-50" },
            { name: "IIIT Junction", x: "50%", y: "75%", color: "text-indigo-600 bg-indigo-50" },
            { name: "Gachibowli Stadium", x: "15%", y: "80%", color: "text-emerald-600 bg-emerald-50" }
          ],
          streets: [
            { path: "M 0 35 L 100 35", name: "Gachibowli Main Rd" },
            { path: "M 50 0 L 50 100", name: "IIIT Outer Ring Road" },
            { path: "M 0 70 L 100 70", name: "DLF Corporate Lane" }
          ]
        };
      default: // Madhapur
        return {
          landmarks: [
            { name: "Cyber Towers Circle", x: "50%", y: "50%", color: "text-cyan-600 bg-cyan-50" },
            { name: "IMAGE Hospital", x: "20%", y: "25%", color: "text-rose-600 bg-rose-50" },
            { name: "NIFT Campus", x: "80%", y: "30%", color: "text-indigo-600 bg-indigo-50" },
            { name: "Inorbit Mall Road", x: "35%", y: "85%", color: "text-pink-600 bg-pink-50" }
          ],
          streets: [
            { path: "M 0 50 L 100 50", name: "Hitec City Road" },
            { path: "M 50 0 L 50 100", name: "Madhapur Main Lane" },
            { path: "M 0 15 L 100 85", name: "NIFT Flyover Road" }
          ]
        };
    }
  };

  const mapLayout = getCommunityDetails(selectedCommunity);

  // Map database reports to mock locations in our grid (0-100%)
  const getCoordinates = (report: IssueReport, idx: number) => {
    // Deterministic position based on report ID character codes so pins don't jitter
    let seed1 = 0;
    let seed2 = 0;
    for (let i = 0; i < report.id.length; i++) {
      seed1 += report.id.charCodeAt(i);
      seed2 += report.id.charCodeAt(i) * (i + 1);
    }
    const x = 15 + (seed1 % 70); // Keep pins inside 15-85% safe range
    const y = 15 + (seed2 % 70);
    return { x: `${x}%`, y: `${y}%` };
  };

  const getPinColor = (report: IssueReport) => {
    if (report.status === "Resolved") return "bg-emerald-500 border-white text-white shadow-emerald-200";
    switch (report.severity) {
      case "Critical": return "bg-rose-500 border-white text-white animate-bounce shadow-rose-200";
      case "High": return "bg-amber-500 border-white text-white shadow-amber-200";
      case "Medium": return "bg-blue-500 border-white text-white shadow-blue-200";
      default: return "bg-slate-500 border-white text-white shadow-slate-200";
    }
  };

  return (
    <div id="map-view-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24 relative select-none">
      
      {/* Top filter and legend card */}
      <div id="map-controls-card" className="bg-white p-3 border-b border-slate-100 shadow-xs sticky top-0 z-30 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-slate-800">Hyperlocal Heat Map</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-semibold">{selectedCommunity} Sector</span>
        </div>

        {/* Toggles */}
        <div className="flex gap-4 items-center text-[10px] text-slate-600 mt-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showOpen} 
              onChange={() => setShowOpen(!showOpen)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-rose-500 block"></span> Active ({mapReports.filter(r => r.status !== "Resolved").length})</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showResolved} 
              onChange={() => setShowResolved(!showResolved)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Resolved ({mapReports.filter(r => r.status === "Resolved").length})</span>
          </label>
        </div>

        {/* Geolocation Status Indicator Banner */}
        <div id="geo-status-banner" className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {geoLoading ? (
              <>
                <RefreshCcw className="w-3 h-3 text-emerald-600 animate-spin shrink-0" />
                <span className="text-slate-500 truncate font-mono">Requesting device GPS...</span>
              </>
            ) : permissionState === 'granted' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse shrink-0"></span>
                <span className="text-slate-700 font-mono truncate font-semibold">GPS Linked • {userLocation?.lat?.toFixed(4)}° N, {userLocation?.lng?.toFixed(4)}° E</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-amber-700 truncate font-semibold">GPS Access Blocked (Using Simulated GPS)</span>
              </>
            )}
          </div>
          {permissionState !== 'granted' && (
            <button 
              type="button"
              onClick={requestGeolocation}
              className="text-emerald-600 font-extrabold hover:underline uppercase tracking-wider text-[9px] shrink-0"
            >
              Enable Live GPS
            </button>
          )}
        </div>
      </div>

      {/* SVG-Based Grid Map Area */}
      <div id="vector-map-canvas" className="relative flex-1 w-full bg-[#f4f7f6] aspect-square overflow-hidden border-b border-slate-100 min-h-[400px]">
        {/* User Live Location Blue Pulse Marker */}
        {userLocation && (
          <div 
            id="user-live-location-marker"
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center pointer-events-none"
            style={{ left: userLocation.x, top: userLocation.y }}
          >
            <span className="absolute inline-flex h-8 w-8 rounded-full bg-sky-400 opacity-60 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-sky-500 border-2 border-white shadow-md"></span>
          </div>
        )}
        {/* Background Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Road networks */}
        <svg className="absolute inset-0 w-full h-full text-slate-200 stroke-[12] stroke-linecap-round pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {mapLayout.streets.map((street, idx) => (
            <path key={idx} d={street.path} fill="none" />
          ))}
        </svg>
        {/* Double-layered thin road core */}
        <svg className="absolute inset-0 w-full h-full text-white stroke-[8] stroke-linecap-round pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {mapLayout.streets.map((street, idx) => (
            <path key={idx} d={street.path} fill="none" />
          ))}
        </svg>

        {/* Street labels */}
        {mapLayout.streets.map((street, idx) => (
          <div 
            key={idx} 
            className="absolute text-[8px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none bg-white/40 px-1 rounded transform -translate-x-1/2"
            style={{ 
              left: idx === 0 ? "50%" : idx === 1 ? "35%" : "75%", 
              top: idx === 0 ? "41%" : idx === 1 ? "52%" : "48%"
            }}
          >
            {street.name}
          </div>
        ))}

        {/* Local Landmarks */}
        {mapLayout.landmarks.map((landmark, idx) => (
          <div
            key={idx}
            className={`absolute px-2.5 py-1.5 rounded-lg border border-slate-200/50 shadow-xs text-[9px] font-bold ${landmark.color} flex items-center gap-1 -translate-x-1/2 -translate-y-1/2`}
            style={{ left: landmark.x, top: landmark.y }}
          >
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span>{landmark.name}</span>
          </div>
        ))}

        {/* Interactive Pins representing database issues */}
        {mapReports.map((report, idx) => {
          const coords = getCoordinates(report, idx);
          const isSelected = selectedReport?.id === report.id;

          return (
            <button
              id={`map-pin-${report.id}`}
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 p-1 rounded-full border-2 transition-all hover:scale-125 z-20 ${getPinColor(report)} ${
                isSelected ? "ring-4 ring-emerald-600/30 scale-120 z-30" : "shadow-md"
              }`}
              style={{ left: coords.x, top: coords.y }}
            >
              <MapPin className="w-4 h-4 fill-current stroke-[2]" />
            </button>
          );
        })}
      </div>

      {/* Pop-up detail drawer for selected pin */}
      {selectedReport && (
        <div 
          id="map-detail-card" 
          className="absolute bottom-18 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 p-3.5 shadow-xl flex gap-3.5 z-30 animate-slide-up"
        >
          {selectedReport.image && (
            <img 
              src={selectedReport.image} 
              alt="Issue thumbnail" 
              className="w-18 h-18 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                {selectedReport.category}
              </span>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                selectedReport.status === "Resolved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                {selectedReport.status}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 truncate mt-1">{selectedReport.title}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Verified by {selectedReport.verificationCount} neighbors</p>
            
            <button
              onClick={() => onViewInFeed(selectedReport.id)}
              className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 hover:underline"
            >
              <span>View Details in Feed</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <button 
            onClick={() => setSelectedReport(null)}
            className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 font-mono text-xs px-1.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Floating map hint */}
      {!selectedReport && mapReports.length > 0 && (
        <div id="map-interaction-hint" className="absolute bottom-18 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-semibold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-md pointer-events-none z-10">
          <Info className="w-3 h-3 text-emerald-400" />
          <span>Tap pins on the map to inspect neighborhood issues</span>
        </div>
      )}

    </div>
  );
}
