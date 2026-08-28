'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CivicReport, MunicipalOffice, ReportPriority, ReportStatus } from '../types/admin';
import { supabase } from '../lib/supabase';
import { parseReportImages } from './ApproveReportsView';
import {
  MapPin,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
  Shield,
} from 'lucide-react';

const MATI_CITY_HALL_LAT = 6.951882816297195;
const MATI_CITY_HALL_LNG = 126.21633711811177;

const BARANGAY_FALLBACK_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Central (Poblacion)': { lat: 6.9518828, lng: 126.2163371 },
  'Dahican': { lat: 6.9420, lng: 126.2480 },
  'Matiao': { lat: 6.9680, lng: 126.2050 },
  'Badas': { lat: 6.9310, lng: 126.1920 },
  'Bobon': { lat: 6.8950, lng: 126.2950 },
  'Mayo': { lat: 7.0250, lng: 126.2800 },
  'Tamisan': { lat: 6.8800, lng: 126.2700 },
  'Tagabakid': { lat: 6.9200, lng: 126.1800 },
  'Sainz': { lat: 6.9620, lng: 126.2150 },
  'Macambol': { lat: 6.7800, lng: 126.2100 },
  'Dungguan': { lat: 6.9450, lng: 126.2100 },
  'Busuang': { lat: 6.9100, lng: 126.2300 },
  'Cabuaya': { lat: 6.7200, lng: 126.2500 },
  'Dawan': { lat: 6.9750, lng: 126.1700 },
  'Lanca': { lat: 6.9150, lng: 126.2600 },
  'Luban': { lat: 6.8100, lng: 126.2600 },
  'Mamali': { lat: 7.0100, lng: 126.1900 },
  'Sanghay': { lat: 6.9900, lng: 126.2500 },
  'Tagbinonga': { lat: 6.9400, lng: 126.1500 },
  'Taguibo': { lat: 7.0400, lng: 126.1600 },
  'Lawigan': { lat: 6.8500, lng: 126.2800 },
  'Badis': { lat: 6.9300, lng: 126.2000 },
  'Don Enrique Lopez': { lat: 6.9800, lng: 126.2300 },
  'Don Martin Marundan': { lat: 6.9600, lng: 126.1800 },
  'Don Salvador Lopez': { lat: 6.9900, lng: 126.2100 },
  'Libudon': { lat: 6.9400, lng: 126.2300 },
};

export function getReportPinConfig(report: CivicReport) {
  const status = (report.status || '').toLowerCase().trim();
  const priority = (report.priority || '').toLowerCase().trim();

  // If done / resolved -> blue
  if (status === 'resolved' || status === 'completed') {
    return {
      type: 'done',
      label: 'Done / Resolved',
      color: '#2563EB', // Blue
      pulseColor: 'rgba(37, 99, 235, 0.45)',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      iconText: '✓',
    };
  }

  // Priority-based colors
  if (priority === 'high' || priority === 'urgent' || priority === 'critical') {
    return {
      type: 'high',
      label: 'High Priority',
      color: '#EF4444', // Red
      pulseColor: 'rgba(239, 68, 68, 0.55)',
      badgeBg: 'bg-red-100 text-red-800 border-red-200',
      iconText: '!',
    };
  }

  if (priority === 'medium' || priority === 'normal') {
    return {
      type: 'normal',
      label: 'Normal Priority',
      color: '#EAB308', // Normal Yellow / Amber
      pulseColor: 'rgba(234, 179, 8, 0.55)',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      iconText: '•',
    };
  }

  // Minimal / Low Priority
  return {
    type: 'minimal',
    label: 'Minimal Priority',
    color: '#FACC15', // Minimal Yellow
    pulseColor: 'rgba(250, 204, 21, 0.55)',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconText: '•',
  };
}

interface AdminMapViewProps {
  reports: CivicReport[];
  offices?: MunicipalOffice[];
  adminUser?: any;
  onRefresh?: () => void;
  onReportsChange?: (updated: CivicReport[]) => void;
}

export const AdminMapView: React.FC<AdminMapViewProps> = ({
  reports,
  offices = [],
  adminUser,
  onRefresh,
  onReportsChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'normal' | 'minimal' | 'done'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [selectedBarangay, setSelectedBarangay] = useState('All');
  const [showLegend, setShowLegend] = useState(true);

  // Selected Report Modal state
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Lightbox Image Modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Filtered reports for mapping
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (r.title || '').toLowerCase().includes(q);
        const matchesBrgy = (r.barangay || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesCategory = (r.category || '').toLowerCase().includes(q);
        const matchesOffice = (r.office_name || '').toLowerCase().includes(q);
        const matchesResident = (r.resident_name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesBrgy && !matchesDesc && !matchesCategory && !matchesOffice && !matchesResident) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) {
        return false;
      }

      // 3. Barangay Filter
      if (selectedBarangay !== 'All' && r.barangay !== selectedBarangay) {
        return false;
      }

      // 4. Priority / Done Filter
      const pinCfg = getReportPinConfig(r);
      if (priorityFilter !== 'all' && pinCfg.type !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [reports, searchQuery, statusFilter, selectedBarangay, priorityFilter]);

  // Statistics
  const stats = useMemo(() => {
    let high = 0;
    let normal = 0;
    let minimal = 0;
    let done = 0;

    reports.forEach((r) => {
      const cfg = getReportPinConfig(r);
      if (cfg.type === 'done') done++;
      else if (cfg.type === 'high') high++;
      else if (cfg.type === 'normal') normal++;
      else minimal++;
    });

    return { total: reports.length, high, normal, minimal, done };
  }, [reports]);

  // Available Barangays
  const uniqueBarangays = useMemo(() => {
    const brgySet = new Set<string>();
    reports.forEach((r) => {
      if (r.barangay) brgySet.add(r.barangay);
    });
    return Array.from(brgySet).sort();
  }, [reports]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [MATI_CITY_HALL_LAT, MATI_CITY_HALL_LNG],
        zoom: 14,
        zoomControl: true,
      });

      // Standard High-Quality OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // LayerGroup for incidents
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Mati City Hall Landmark Marker
      const cityHallIcon = L.divIcon({
        className: 'admin-leaflet-marker-wrapper',
        html: `
          <div class="city-hall-admin-marker">
            <div class="city-hall-pulse-ring"></div>
            <div class="city-hall-core">🏛️</div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -22],
      });

      const cityHallMarker = L.marker([MATI_CITY_HALL_LAT, MATI_CITY_HALL_LNG], {
        icon: cityHallIcon,
        title: 'Mati City Hall',
      }).addTo(map);

      cityHallMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">🏛️ Mati City Hall</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">GPS: 6.95188°N, 126.21634°E</div>
          <span style="display:inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: #1e3a8a; color: white;">
            City Administration Headquarters
          </span>
        </div>
      `);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers whenever filteredReports change
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    filteredReports.forEach((report) => {
      let lat = report.latitude != null ? Number(report.latitude) : NaN;
      let lng = report.longitude != null ? Number(report.longitude) : NaN;

      // Fallback to barangay coordinate if report coordinates are missing
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        const fb = BARANGAY_FALLBACK_COORDINATES[report.barangay || ''];
        if (fb) {
          lat = fb.lat;
          lng = fb.lng;
        } else {
          return; // Skip if no coordinate possible
        }
      }

      const pinCfg = getReportPinConfig(report);
      const images = parseReportImages(report.image_url);

      const customIcon = L.divIcon({
        className: 'admin-leaflet-marker-wrapper',
        html: `
          <div class="admin-incident-marker" style="--pin-color: ${pinCfg.color}; --pulse-color: ${pinCfg.pulseColor};">
            <div class="marker-pulse-wave" style="border-color: ${pinCfg.color};"></div>
            <div class="marker-pin-head" style="background-color: ${pinCfg.color};">
              <span class="marker-pin-icon">${pinCfg.iconText}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: inherit; padding: 2px; min-width: 190px; max-width: 240px;">
          ${images.length > 0 ? `<img src="${images[0]}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />` : ''}
          <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; line-height: 1.3; margin-bottom: 2px;">
            ${report.title}
          </div>
          <div style="font-size: 10.5px; color: #64748b; margin-bottom: 6px;">
            📍 Brgy. ${report.barangay} • ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
            <span style="padding: 2px 7px; border-radius: 6px; font-size: 9.5px; font-weight: 800; background: ${pinCfg.color}20; color: ${pinCfg.color}; border: 1px solid ${pinCfg.color}40;">
              ${pinCfg.label}
            </span>
            <span style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">
              ${report.status || 'Pending'}
            </span>
          </div>
          <div style="font-size: 9.5px; color: #2563eb; font-weight: 700; margin-top: 5px; text-align: center;">
            👉 Click pin for full details
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        handleOpenReportModal(report);
      });

      layer.addLayer(marker);
    });
  }, [filteredReports]);

  // Open Report Modal
  const handleOpenReportModal = (report: CivicReport) => {
    setSelectedReport(report);
    setAdminNoteInput(report.admin_notes || '');
    setSelectedOfficeId(report.office_id || '');
    setCopiedCoords(false);
  };

  // Close Report Modal
  const handleCloseReportModal = () => {
    setSelectedReport(null);
  };

  // Open Lightbox
  const handleOpenLightbox = (images: string[], initialIndex: number = 0) => {
    setLightboxImages(images);
    setActiveImageIndex(initialIndex);
    setLightboxOpen(true);
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % lightboxImages.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  // Copy coordinates
  const handleCopyCoordinates = (lat?: number, lng?: number) => {
    if (lat != null && lng != null) {
      navigator.clipboard.writeText(`${lat}, ${lng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
    }
  };

  // Recenter Map to City Hall
  const handleRecenterCityHall = () => {
    mapInstanceRef.current?.setView([MATI_CITY_HALL_LAT, MATI_CITY_HALL_LNG], 14, {
      animate: true,
    });
  };

  // Focus on specific report
  const handleFocusReportOnMap = (report: CivicReport) => {
    let lat = report.latitude != null ? Number(report.latitude) : NaN;
    let lng = report.longitude != null ? Number(report.longitude) : NaN;

    if (isNaN(lat) || isNaN(lng)) {
      const fb = BARANGAY_FALLBACK_COORDINATES[report.barangay || ''];
      if (fb) {
        lat = fb.lat;
        lng = fb.lng;
      }
    }

    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current?.setView([lat, lng], 16, { animate: true });
    }
  };

  // Update Status & Office from Modal
  const handleUpdateReport = async (newStatus: ReportStatus, newPriority?: ReportPriority) => {
    if (!selectedReport) return;
    setIsUpdatingStatus(true);

    try {
      const officeObj = offices.find((o) => o.id === selectedOfficeId);
      const updates: Partial<CivicReport> = {
        status: newStatus,
        admin_notes: adminNoteInput.trim() || undefined,
        reviewed_by: adminUser?.email || 'Admin',
        reviewed_at: new Date().toISOString(),
      };

      if (newPriority) {
        updates.priority = newPriority;
      }

      if (officeObj) {
        updates.office_id = officeObj.id;
        updates.office_name = officeObj.name;
      }

      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Update local state
      const updatedList = reports.map((r) =>
        r.id === selectedReport.id ? { ...r, ...updates } : r
      );

      if (onReportsChange) onReportsChange(updatedList);
      setSelectedReport((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err: any) {
      console.error('Failed to update report:', err);
      alert(`Could not update report: ${err.message || 'Database error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const selectedReportImages = selectedReport ? parseReportImages(selectedReport.image_url) : [];

  return (
    <div className="relative w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg antialiased">
      {/* ================= INLINE CSS FOR LEAFLET MARKERS & WAVE ANIMATIONS ================= */}
      <style jsx global>{`
        .admin-leaflet-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }

        .admin-incident-marker {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
        }

        .marker-pin-head {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 13px;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          position: relative;
          z-index: 2;
          transition: transform 0.15s ease;
        }

        .admin-incident-marker:hover .marker-pin-head {
          transform: scale(1.22);
        }

        .marker-pulse-wave {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border-width: 2.5px;
          border-style: solid;
          opacity: 0.8;
          animation: admin-map-pulse-wave 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: 1;
        }

        @keyframes admin-map-pulse-wave {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          70% {
            transform: scale(2.4);
            opacity: 0.25;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        /* City Hall Landmark Marker */
        .city-hall-admin-marker {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .city-hall-core {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          border: 3px solid #f59e0b;
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          position: relative;
          z-index: 2;
        }

        .city-hall-pulse-ring {
          position: absolute;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.3);
          border: 2px solid #f59e0b;
          animation: admin-map-pulse-wave 2.5s infinite;
          z-index: 1;
        }

        /* Leaflet popup styling override */
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
        }
      `}</style>

      {/* ================= TOP COMMAND & FILTER BAR ================= */}
      <div className="absolute top-3 left-3 right-3 z-1000 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left Filter & Search Hub */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/80">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, barangay, office..."
              className="pl-9 pr-3 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-blue-500 focus:outline-none transition-all w-48 sm:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Priority Quick Chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
            <button
              onClick={() => setPriorityFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                priorityFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-200">
                {stats.total}
              </span>
            </button>

            {/* Red = High */}
            <button
              onClick={() => setPriorityFilter('high')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                priorityFilter === 'high'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
              }`}
              title="High Priority Incident Hazards"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>High</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-700 text-white">
                {stats.high}
              </span>
            </button>

            {/* Yellow = Normal */}
            <button
              onClick={() => setPriorityFilter('normal')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                priorityFilter === 'normal'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
              }`}
              title="Normal Priority Community Works"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Normal</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white">
                {stats.normal}
              </span>
            </button>

            {/* Yellow = Minimal */}
            <button
              onClick={() => setPriorityFilter('minimal')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                priorityFilter === 'minimal'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm shadow-yellow-400/30'
                  : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200/60'
              }`}
              title="Minimal Priority Requests"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Minimal</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-yellow-500 text-slate-950 font-bold">
                {stats.minimal}
              </span>
            </button>

            {/* Blue = Done */}
            <button
              onClick={() => setPriorityFilter('done')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                priorityFilter === 'done'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
              title="Resolved & Completed Reports"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Done</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-700 text-white">
                {stats.done}
              </span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          {/* Barangay Dropdown */}
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-200/80 focus:outline-none cursor-pointer hidden lg:block"
          >
            <option value="All">All Barangays ({uniqueBarangays.length})</option>
            {uniqueBarangays.map((b) => (
              <option key={b} value={b}>
                Brgy. {b}
              </option>
            ))}
          </select>
        </div>

        {/* Right Tools: Recenter, Refresh, Legend Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200/80">
          <button
            onClick={handleRecenterCityHall}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-blue-200/60"
            title="Recenter view to Mati City Hall"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">City Hall</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              showLegend ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Map Legend"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= LEAFLET CONTAINER ================= */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ================= FLOATING MAP LEGEND HUD ================= */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-1000 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-200/90 max-w-[280px] animate-fade-in text-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                Priority Status Legend
              </h4>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-xs flex items-center justify-center text-[8px] font-black text-white">
                  !
                </span>
                <span className="font-bold text-slate-800">High Priority</span>
              </div>
              <span className="text-[11px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Red Pin ({stats.high})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                <span className="font-bold text-slate-800">Normal Priority</span>
              </div>
              <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Yellow ({stats.normal})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-white shadow-xs" />
                <span className="font-bold text-slate-800">Minimal Priority</span>
              </div>
              <span className="text-[11px] font-extrabold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                Yellow ({stats.minimal})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs flex items-center justify-center text-[8px] font-black text-white">
                  ✓
                </span>
                <span className="font-bold text-slate-800">Done / Resolved</span>
              </div>
              <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Blue Pin ({stats.done})
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏛️</span>
                <span className="font-semibold text-slate-700">Mati City Hall</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">6.9518°N, 126.2163°E</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPREHENSIVE REPORT DETAILS MODAL ================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-white shadow-sm ${
                    getReportPinConfig(selectedReport).type === 'done'
                      ? 'bg-blue-600'
                      : getReportPinConfig(selectedReport).type === 'high'
                      ? 'bg-red-600'
                      : getReportPinConfig(selectedReport).type === 'normal'
                      ? 'bg-amber-500'
                      : 'bg-yellow-400 text-slate-950'
                  }`}
                >
                  {getReportPinConfig(selectedReport).iconText}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Incident #{selectedReport.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                        getReportPinConfig(selectedReport).badgeBg
                      }`}
                    >
                      {getReportPinConfig(selectedReport).label}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-tight truncate max-w-md">
                    {selectedReport.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleCloseReportModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Image Preview Grid with Click-to-Maximize */}
              {selectedReportImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Attached Photos ({selectedReportImages.length})
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> Click image to zoom & view next
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedReportImages.map((imgUrl, index) => (
                      <div
                        key={index}
                        onClick={() => handleOpenLightbox(selectedReportImages, index)}
                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer shadow-xs hover:shadow-md transition-all"
                      >
                        <img
                          src={imgUrl}
                          alt={`Incident evidence ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/70 text-white font-mono text-[9px] font-bold">
                          {index + 1}/{selectedReportImages.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Resident Description
                </span>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedReport.description}
                </p>
              </div>

              {/* Location & GPS Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                    📍 Incident Location
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    Brgy. {selectedReport.barangay || 'Mati City'}
                  </p>
                  {selectedReport.address && (
                    <p className="text-[11px] text-slate-600">{selectedReport.address}</p>
                  )}
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Exact GPS Coordinates
                    </span>
                    {selectedReport.latitude && selectedReport.longitude && (
                      <button
                        onClick={() =>
                          handleCopyCoordinates(selectedReport.latitude, selectedReport.longitude)
                        }
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCoords ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <p className="font-mono text-xs font-bold text-slate-800">
                    {selectedReport.latitude != null && selectedReport.longitude != null
                      ? `${Number(selectedReport.latitude).toFixed(6)}°N, ${Number(selectedReport.longitude).toFixed(6)}°E`
                      : 'Barangay Center Fallback'}
                  </p>

                  {selectedReport.latitude != null && selectedReport.longitude != null && (
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <ExternalLink className="w-3 h-3" /> Google Maps
                      </a>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => {
                          handleFocusReportOnMap(selectedReport);
                          handleCloseReportModal();
                        }}
                        className="text-amber-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" /> Center on Map
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Citizen & Department Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Citizen Reporter
                  </span>
                  <p className="text-xs font-black text-slate-800">
                    {selectedReport.resident_name || 'Verified Citizen'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedReport.resident_phone || selectedReport.resident_email || 'No phone provided'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    To Be Worked By (Municipal Office)
                  </span>
                  <select
                    value={selectedOfficeId}
                    onChange={(e) => setSelectedOfficeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white text-xs font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Department Assigned --</option>
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} ({off.code || off.office_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Notes Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  City Hall Action Notes & Public Remarks
                </label>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Enter dispatch notes, contractor updates, or citizen guidance..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 rounded-2xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Set Priority:</span>
                <button
                  onClick={() => handleUpdateReport(selectedReport.status, 'high')}
                  disabled={isUpdatingStatus}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                    selectedReport.priority === 'high'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  🔴 High
                </button>
                <button
                  onClick={() => handleUpdateReport(selectedReport.status, 'medium')}
                  disabled={isUpdatingStatus}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                    selectedReport.priority === 'medium'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  🟡 Normal
                </button>
                <button
                  onClick={() => handleUpdateReport(selectedReport.status, 'low')}
                  disabled={isUpdatingStatus}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                    selectedReport.priority === 'low'
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                  }`}
                >
                  🟡 Minimal
                </button>
              </div>

              {/* Status Update Buttons */}
              <div className="flex items-center gap-2">
                {selectedReport.status !== 'in_progress' && selectedReport.status !== 'resolved' && (
                  <button
                    onClick={() => handleUpdateReport('in_progress')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Set In Progress
                  </button>
                )}

                {selectedReport.status !== 'resolved' ? (
                  <button
                    onClick={() => handleUpdateReport('resolved')}
                    disabled={isUpdatingStatus}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Done</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateReport('in_progress')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    Re-open Incident
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= FULL-SCREEN ZOOMABLE LIGHTBOX MODAL ================= */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-3000 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between animate-fade-in">
          {/* Lightbox Header */}
          <div className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/30">
                Photo {activeImageIndex + 1} of {lightboxImages.length}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Use arrow keys ← → or buttons to navigate
              </span>
            </div>

            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Main Stage */}
          <div className="relative flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
            {/* Previous Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() =>
                  setActiveImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
                }
                className="absolute left-4 z-10 p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer shadow-2xl hover:scale-110"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Active Image */}
            <img
              src={lightboxImages[activeImageIndex]}
              alt={`Evidence ${activeImageIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-all select-none"
            />

            {/* Next Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() => setActiveImageIndex((prev) => (prev + 1) % lightboxImages.length)}
                className="absolute right-4 z-10 p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer shadow-2xl hover:scale-110"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Carousel */}
          {lightboxImages.length > 1 && (
            <div className="p-3 bg-slate-950/70 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto">
              {lightboxImages.map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === activeImageIndex
                      ? 'border-amber-400 scale-105 shadow-lg shadow-amber-400/20'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
