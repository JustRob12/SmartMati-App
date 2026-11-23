import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { MATI_BARANGAY_COORDINATES } from './CreateReportModal';

// Default Mati City Hall Coordinates
const MATI_LAT = 6.951882816297195;
const MATI_LNG = 126.21633711811177;

const DEFAULT_ISSUES = [
  {
    id: 'sample-1',
    title: 'Severe Pothole & Road Cracks',
    category: 'Infrastructure, Roads, & Utilities',
    barangay: 'Dahican',
    office_name: 'City Engineering Office',
    lat: 6.942,
    lng: 126.248,
    color: '#D97706',
    status: 'Verified',
    date: '2 hrs ago',
  },
  {
    id: 'sample-2',
    title: 'Streetlight Outage (3 Poles)',
    category: 'Streetlights & Public Utilities',
    barangay: 'Matiao',
    office_name: 'City Engineering Office',
    lat: 6.968,
    lng: 126.205,
    color: '#F59E0B',
    status: 'Verified',
    date: 'Yesterday',
  },
  {
    id: 'sample-3',
    title: 'Uncollected Commercial Waste Pile',
    category: 'Environment, Trash, & Sanitation',
    barangay: 'Central (Poblacion)',
    office_name: 'City ENRO',
    lat: 6.954,
    lng: 126.218,
    color: '#059669',
    status: 'Verified',
    date: 'Today',
  },
  {
    id: 'sample-4',
    title: 'Clogged Drainage & Road Water Pooling',
    category: 'Emergencies, Disasters, & Safety',
    barangay: 'Badas',
    office_name: 'CDRRMO',
    lat: 6.931,
    lng: 126.192,
    color: '#DC2626',
    status: 'Verified',
    date: '3 days ago',
  },
];

const OPENFREEMAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .maplibregl-ctrl-attrib {
      font-size: 8.5px !important;
      background: rgba(255, 255, 255, 0.8) !important;
      border-radius: 6px;
      padding: 2px 6px;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      cursor: pointer;
    }
    .city-hall-marker {
      background: linear-gradient(135deg, #1E3A8A, #2563EB);
      width: 38px;
      height: 38px;
      border: 3px solid #F59E0B;
      box-shadow: 0 4px 14px rgba(30, 58, 138, 0.6);
      font-size: 18px;
    }

    /* Pulsing User GPS Marker */
    .user-pulse-marker {
      position: relative;
      width: 26px;
      height: 26px;
    }
    .user-core {
      width: 16px;
      height: 16px;
      background: #0284C7;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      position: absolute;
      top: 5px;
      left: 5px;
      box-shadow: 0 0 12px rgba(2, 132, 199, 0.9);
      z-index: 2;
    }
    .pulse-ring {
      width: 26px;
      height: 26px;
      background: rgba(2, 132, 199, 0.35);
      border-radius: 50%;
      position: absolute;
      top: 0;
      left: 0;
      animation: pulsate 2s infinite ease-out;
      z-index: 1;
    }
    @keyframes pulsate {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.3); opacity: 0; }
    }

    /* MapLibre Popup Styling */
    .maplibregl-popup-content {
      padding: 12px 14px;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
      border: 1px solid #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .maplibregl-popup-close-button {
      font-size: 16px;
      color: #94A3B8;
      padding: 4px 8px;
    }
    .popup-card {
      font-size: 12px;
      line-height: 1.4;
      min-width: 180px;
      max-width: 230px;
    }
    .popup-title {
      font-weight: 800;
      font-size: 13.5px;
      color: #0F172A;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    .popup-brgy {
      color: #64748B;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .popup-badge {
      display: inline-block;
      padding: 2.5px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      color: white;
    }
    .popup-office {
      font-size: 10.5px;
      color: #1E3A8A;
      font-weight: 700;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [${MATI_LNG}, ${MATI_LAT}],
      zoom: 14,
      attributionControl: true
    });

    // City Hall Landmark (Exact GPS: 6.951882816297195, 126.21633711811177)
    var cityHallEl = document.createElement('div');
    cityHallEl.className = 'custom-marker city-hall-marker';
    cityHallEl.innerHTML = '🏛️';

    var cityHallPopup = new maplibregl.Popup({ offset: 25 }).setHTML(
      '<div class="popup-card">' +
        '<div class="popup-title">🏛️ Mati City Hall</div>' +
        '<div class="popup-brgy">GPS: 6.95188°N, 126.21634°E</div>' +
        '<span class="popup-badge" style="background:#1E3A8A;">City Administration</span>' +
      '</div>'
    );

    new maplibregl.Marker({ element: cityHallEl })
      .setLngLat([${MATI_LNG}, ${MATI_LAT}])
      .setPopup(cityHallPopup)
      .addTo(map);

    // Issue Markers & Heatmap Data
    var markers = [];
    var currentIssues = ${JSON.stringify(DEFAULT_ISSUES)};
    var currentFilter = 'All';
    var currentViewMode = 'pins';
    var userMarker = null;

    function toGeoJson(issues) {
      return {
        type: 'FeatureCollection',
        features: (issues || []).map(function(item) {
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [item.lng, item.lat]
            },
            properties: {
              id: item.id,
              category: item.category,
              title: item.title,
              barangay: item.barangay
            }
          };
        })
      };
    }

    function updateHeatmapSource(issues) {
      var src = map.getSource('issues-heat-source');
      if (src) {
        src.setData(toGeoJson(issues));
      }
    }

    function setViewMode(mode) {
      currentViewMode = mode;
      if (mode === 'heat') {
        if (map.getLayer('issues-heat')) {
          map.setLayoutProperty('issues-heat', 'visibility', 'visible');
        }
        markers.forEach(function(m) {
          m.getElement().style.opacity = '0.35';
        });
      } else {
        if (map.getLayer('issues-heat')) {
          map.setLayoutProperty('issues-heat', 'visibility', 'none');
        }
        markers.forEach(function(m) {
          m.getElement().style.opacity = '1.0';
        });
      }
    }

    function renderMarkers(filter) {
      currentFilter = filter || currentFilter;
      markers.forEach(function(m) { m.remove(); });
      markers = [];

      var filtered = [];
      currentIssues.forEach(function(item) {
        if (currentFilter !== 'All') {
          var match = (item.category || '').toLowerCase().indexOf(currentFilter.toLowerCase()) !== -1 ||
                      currentFilter.toLowerCase().indexOf((item.category || '').toLowerCase()) !== -1;
          if (!match) return;
        }

        filtered.push(item);

        var markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.backgroundColor = item.color || '#D97706';
        markerEl.style.width = '28px';
        markerEl.style.height = '28px';
        markerEl.style.fontSize = '12px';
        markerEl.style.transition = 'opacity 0.25s ease';
        if (currentViewMode === 'heat') {
          markerEl.style.opacity = '0.35';
        }
        markerEl.innerHTML = '📍';

        var popupHtml = '<div class="popup-card">' +
          '<div class="popup-title">' + (item.title || 'Civic Issue') + '</div>' +
          '<div class="popup-brgy">📍 Brgy. ' + (item.barangay || 'Mati') + ' (' + Number(item.lat).toFixed(4) + '°, ' + Number(item.lng).toFixed(4) + '°)</div>' +
          '<span class="popup-badge" style="background:' + (item.color || '#1E3A8A') + ';">' + (item.status || 'Verified') + '</span>' +
          (item.office_name ? '<div class="popup-office">To be worked by: ' + item.office_name + '</div>' : '') +
        '</div>';

        var popup = new maplibregl.Popup({ offset: 20 }).setHTML(popupHtml);

        var m = new maplibregl.Marker({ element: markerEl })
          .setLngLat([item.lng, item.lat])
          .setPopup(popup)
          .addTo(map);

        markers.push(m);
      });

      updateHeatmapSource(filtered);
    }

    map.on('load', function() {
      // Add GeoJSON Heatmap Source
      map.addSource('issues-heat-source', {
        type: 'geojson',
        data: toGeoJson(currentIssues)
      });

      // Add MapLibre Native Heatmap Layer
      map.addLayer({
        id: 'issues-heat',
        type: 'heatmap',
        source: 'issues-heat-source',
        maxzoom: 18,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 1,
            13, 2.5,
            16, 4
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33, 102, 172, 0)',
            0.15, 'rgb(56, 189, 248)',
            0.35, 'rgb(34, 197, 94)',
            0.6, 'rgb(245, 158, 11)',
            0.8, 'rgb(249, 115, 22)',
            1, 'rgb(220, 38, 38)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 15,
            13, 30,
            16, 50
          ],
          'heatmap-opacity': 0.85
        }
      });

      map.setLayoutProperty('issues-heat', 'visibility', 'none');
      renderMarkers('All');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    });

    function setUserLocation(lat, lng) {
      if (userMarker) {
        userMarker.remove();
      }

      var userEl = document.createElement('div');
      userEl.className = 'user-pulse-marker';
      userEl.innerHTML = '<div class="pulse-ring"></div><div class="user-core"></div>';

      var userPopup = new maplibregl.Popup({ offset: 20 }).setHTML(
        '<div class="popup-card"><div class="popup-title">📍 You Are Here</div><div class="popup-brgy">Current GPS Location</div><span class="popup-badge" style="background:#0284C7;">Live Citizen Position</span></div>'
      );

      userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([lng, lat])
        .setPopup(userPopup)
        .addTo(map);

      map.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true
      });
    }

    // Handle React Native Bridge
    function handleBridgeMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'FILTER') {
          renderMarkers(data.category);
        } else if (data.type === 'USER_LOCATION') {
          setUserLocation(data.lat, data.lng);
        } else if (data.type === 'RECENTER_CITY') {
          map.flyTo({
            center: [${MATI_LNG}, ${MATI_LAT}],
            zoom: 14,
            essential: true
          });
        } else if (data.type === 'SET_REPORTS') {
          currentIssues = data.reports;
          updateHeatmapSource(currentIssues);
          renderMarkers(currentFilter);
        } else if (data.type === 'SET_VIEW_MODE') {
          setViewMode(data.mode);
        } else if (data.type === 'FLY_TO_COORDS') {
          map.flyTo({
            center: [data.lng, data.lat],
            zoom: data.zoom || 15.5,
            essential: true
          });
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleBridgeMessage);
    document.addEventListener('message', handleBridgeMessage);
  </script>
</body>
</html>
`;

const MAP_FILTERS = ['All', 'Roads', 'Lights', 'Sanitation', 'Safety'];

export const MapScreen: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);
  const [reportsCount, setReportsCount] = useState(0);
  const [allReports, setAllReports] = useState<any[]>(DEFAULT_ISSUES);
  const [viewMode, setViewMode] = useState<'pins' | 'heat' | 'breakdown'>('pins');

  // Fetch approved reports and push to map
  useEffect(() => {
    fetchApprovedReportsForMap();
    detectUserGPS();
  }, []);

  const fetchApprovedReportsForMap = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Map reports fetch warning:', error);
        return;
      }

      if (data && data.length > 0) {
        const approvedReports = data.filter((r) => {
          const rawStatus = (r.status || '').toLowerCase().trim().replace(/[\s-]/g, '_');
          return (
            (rawStatus === 'approved' || rawStatus === 'in_progress' || rawStatus === 'resolved') &&
            r.latitude != null &&
            r.longitude != null &&
            !isNaN(Number(r.latitude)) &&
            !isNaN(Number(r.longitude))
          );
        });

        const mappedReports = approvedReports.map((r) => {
          const rawStatus = (r.status || '').toLowerCase().trim().replace(/[\s-]/g, '_');
          const isResolved = rawStatus === 'resolved';
          const isInProgress = rawStatus === 'in_progress';

          const isInfra = (r.category || '').includes('Infrastructure') || (r.category || '').includes('Roads');
          const isLights = (r.category || '').includes('Streetlights');
          const isSanitation = (r.category || '').includes('Environment') || (r.category || '').includes('Trash');
          const isSafety = (r.category || '').includes('Emergencies') || (r.category || '').includes('Safety') || (r.category || '').includes('Disaster');

          const color = isInfra
            ? '#D97706'
            : isLights
            ? '#F59E0B'
            : isSanitation
            ? '#059669'
            : isSafety
            ? '#DC2626'
            : '#2563EB';

          return {
            id: r.id,
            title: r.title,
            category: r.category,
            barangay: r.barangay,
            office_name: r.office_name || 'City Hall Department',
            lat: Number(r.latitude),
            lng: Number(r.longitude),
            color,
            status: isResolved ? 'Resolved' : isInProgress ? 'In Progress' : 'Verified',
            date: r.created_at
              ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Recent',
          };
        });

        setReportsCount(mappedReports.length);
        setAllReports(mappedReports);

        if (mappedReports.length > 0) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'SET_REPORTS',
              reports: mappedReports,
            })
          );
        }
      }
    } catch (err) {
      console.warn('Map reports error:', err);
    }
  };

  const barangayDensity = useMemo(() => {
    const counts: Record<
      string,
      { count: number; categories: Record<string, number>; lat: number; lng: number }
    > = {};

    allReports.forEach((rep) => {
      const brgy = rep.barangay || 'Central (Poblacion)';
      if (!counts[brgy]) {
        const coords = MATI_BARANGAY_COORDINATES[brgy] || { lat: MATI_LAT, lng: MATI_LNG };
        counts[brgy] = { count: 0, categories: {}, lat: coords.lat, lng: coords.lng };
      }
      counts[brgy].count += 1;

      const catKey = (rep.category || 'Other').split(',')[0].trim();
      counts[brgy].categories[catKey] = (counts[brgy].categories[catKey] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, data]) => ({
      barangay: name,
      ...data,
    }));

    return list.sort((a, b) => b.count - a.count);
  }, [allReports]);

  const detectUserGPS = async () => {
    setLocating(true);
    setGpsStatusText('Locating your GPS position in Mati City...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatusText('GPS permission denied.');
        setTimeout(() => setGpsStatusText(null), 3000);
        setLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setGpsStatusText(`GPS Locked: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);

      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'USER_LOCATION',
          lat: latitude,
          lng: longitude,
        })
      );

      setTimeout(() => setGpsStatusText(null), 4000);
    } catch (err: any) {
      console.warn('GPS detection error:', err);
      setGpsStatusText('Could not get GPS signal.');
      setTimeout(() => setGpsStatusText(null), 3000);
    } finally {
      setLocating(false);
    }
  };

  const handleSelectFilter = (filter: string) => {
    setSelectedFilter(filter);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'FILTER', category: filter })
    );
  };

  const handleSelectViewMode = (mode: 'pins' | 'heat' | 'breakdown') => {
    setViewMode(mode);
    if (mode === 'pins' || mode === 'heat') {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'SET_VIEW_MODE', mode })
      );
    }
  };

  const handleFlyToBarangay = (lat: number, lng: number) => {
    setViewMode('heat');
    setTimeout(() => {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'SET_VIEW_MODE', mode: 'heat' })
      );
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'FLY_TO_COORDS', lat, lng, zoom: 15.5 })
      );
    }, 200);
  };

  const handleRecenterCity = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'RECENTER_CITY' })
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent?.data || '{}');
      if (msg.type === 'MAP_READY') {
        fetchApprovedReportsForMap();
        if (userLocation) {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'USER_LOCATION',
              lat: userLocation.lat,
              lng: userLocation.lng,
            })
          );
        }
        if (viewMode === 'heat') {
          webViewRef.current?.postMessage(
            JSON.stringify({ type: 'SET_VIEW_MODE', mode: 'heat' })
          );
        }
      }
    } catch (e) {}
  };

  return (
    <View style={styles.fullScreenContainer}>
      {/* 1. TOP VIEW MODE SWITCHER (Pins, Heatmap, Alternative Breakdown) */}
      <View style={styles.viewModeHeaderContainer}>
        <View style={styles.viewModeSwitcher}>
          <TouchableOpacity
            style={[styles.viewModeTab, viewMode === 'pins' && styles.viewModeTabActive]}
            onPress={() => handleSelectViewMode('pins')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="location"
              size={14}
              color={viewMode === 'pins' ? '#FFFFFF' : THEME.colors.textSecondary}
            />
            <Text style={[styles.viewModeTabText, viewMode === 'pins' && styles.viewModeTabTextActive]}>
              Pins View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeTab, viewMode === 'heat' && styles.viewModeTabActive]}
            onPress={() => handleSelectViewMode('heat')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flame"
              size={14}
              color={viewMode === 'heat' ? '#FFFFFF' : '#EF4444'}
            />
            <Text style={[styles.viewModeTabText, viewMode === 'heat' && styles.viewModeTabTextActive]}>
              Heatmap Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeTab, viewMode === 'breakdown' && styles.viewModeTabActive]}
            onPress={() => handleSelectViewMode('breakdown')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="stats-chart"
              size={14}
              color={viewMode === 'breakdown' ? '#FFFFFF' : THEME.colors.primary}
            />
            <Text style={[styles.viewModeTabText, viewMode === 'breakdown' && styles.viewModeTabTextActive]}>
              Hotspots Breakdown
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. ALTERNATIVE VIEW FOR HEATMAP: Ranked Hotspot Analysis & Breakdown */}
      {viewMode === 'breakdown' ? (
        <ScrollView style={styles.breakdownContainer} contentContainerStyle={styles.breakdownContent}>
          {/* Header Card */}
          <View style={styles.breakdownHeaderCard}>
            <View style={styles.breakdownHeaderIcon}>
              <Ionicons name="flame" size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.breakdownHeaderTitle}>Mati Incident Hotspots & Density</Text>
              <Text style={styles.breakdownHeaderSubtitle}>
                Spatial cluster analysis of civic reports across Mati City barangays
              </Text>
            </View>
          </View>

          {/* Quick Metrics KPI Row */}
          <View style={styles.hotspotMetricsRow}>
            <View style={styles.hotspotMetricCard}>
              <Text style={styles.hotspotMetricValue}>{allReports.length}</Text>
              <Text style={styles.hotspotMetricLabel}>Total Incidents</Text>
            </View>
            <View style={styles.hotspotMetricCard}>
              <Text style={[styles.hotspotMetricValue, { color: '#EF4444' }]} numberOfLines={1}>
                {barangayDensity[0]?.barangay || 'Central'}
              </Text>
              <Text style={styles.hotspotMetricLabel}>Top Hotspot</Text>
            </View>
            <View style={styles.hotspotMetricCard}>
              <Text style={[styles.hotspotMetricValue, { color: '#D97706' }]}>
                {barangayDensity.filter((b) => b.count >= 2).length}
              </Text>
              <Text style={styles.hotspotMetricLabel}>Active Clusters</Text>
            </View>
          </View>

          {/* Heatmap Density Scale Card */}
          <View style={styles.scaleCard}>
            <View style={styles.scaleTitleRow}>
              <Ionicons name="color-palette-outline" size={14} color={THEME.colors.primary} />
              <Text style={styles.scaleCardTitle}>HEATMAP DENSITY SCALE</Text>
            </View>
            <View style={styles.scaleGradientBar}>
              <View style={[styles.scaleStop, { backgroundColor: 'rgb(56, 189, 248)' }]} />
              <View style={[styles.scaleStop, { backgroundColor: 'rgb(34, 197, 94)' }]} />
              <View style={[styles.scaleStop, { backgroundColor: 'rgb(245, 158, 11)' }]} />
              <View style={[styles.scaleStop, { backgroundColor: 'rgb(249, 115, 22)' }]} />
              <View style={[styles.scaleStop, { backgroundColor: 'rgb(220, 38, 38)' }]} />
            </View>
            <View style={styles.scaleLabelsRow}>
              <Text style={styles.scaleLabelText}>Low Density (1)</Text>
              <Text style={styles.scaleLabelText}>Moderate (2-3)</Text>
              <Text style={styles.scaleLabelText}>Critical Hotspot (4+)</Text>
            </View>
          </View>

          {/* Ranked Barangay Hotspots List */}
          <View style={styles.rankedListContainer}>
            <View style={styles.rankedListHeaderRow}>
              <Text style={styles.rankedListHeader}>BARANGAY RANKING BY INCIDENT DENSITY</Text>
              <Text style={styles.rankedListCount}>{barangayDensity.length} Barangays</Text>
            </View>

            {barangayDensity.map((b, idx) => {
              const maxCount = barangayDensity[0]?.count || 1;
              const ratio = Math.min(b.count / maxCount, 1);
              const isHigh = b.count >= 3;
              const isMid = b.count === 2;
              const color = isHigh ? '#DC2626' : isMid ? '#F59E0B' : '#0284C7';
              const tierLabel = isHigh ? 'Critical Cluster' : isMid ? 'Moderate' : 'Low Density';

              return (
                <View key={b.barangay} style={styles.rankedBrgyCard}>
                  <View style={styles.rankedBrgyTop}>
                    <View style={styles.rankedBrgyTitleRow}>
                      <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                        <Text style={[styles.rankBadgeText, idx === 0 && styles.rankBadgeTextFirst]}>
                          #{idx + 1}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.rankedBrgyName}>Brgy. {b.barangay}</Text>
                        <Text style={styles.rankedBrgyCoordText}>
                          {b.lat.toFixed(4)}°N, {b.lng.toFixed(4)}°E • {tierLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.incidentCountBadge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
                      <Text style={[styles.incidentCountText, { color }]}>
                        {b.count} {b.count === 1 ? 'Incident' : 'Incidents'}
                      </Text>
                    </View>
                  </View>

                  {/* Intensity Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.round(ratio * 100)}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>

                  {/* Categories Breakdown & Locate on Map Action */}
                  <View style={styles.rankedBrgyBottomRow}>
                    <View style={styles.catPillRow}>
                      {Object.entries(b.categories).map(([cat, count]) => (
                        <View key={cat} style={styles.catPill}>
                          <Text style={styles.catPillText}>
                            {cat}: {count}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.locateBtn}
                      onPress={() => handleFlyToBarangay(b.lat, b.lng)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="map" size={12} color="#FFFFFF" />
                      <Text style={styles.locateBtnText}>Locate on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* 3. VECTOR MAP VIEW (WITH HEATMAP OR PINS) */
        <>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: OPENFREEMAP_HTML }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => {
              setLoading(false);
              fetchApprovedReportsForMap();
              if (userLocation) {
                webViewRef.current?.postMessage(
                  JSON.stringify({
                    type: 'USER_LOCATION',
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                  })
                );
              }
              if (viewMode === 'heat') {
                webViewRef.current?.postMessage(
                  JSON.stringify({ type: 'SET_VIEW_MODE', mode: 'heat' })
                );
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderCenter}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loaderText}>Loading Mati Vector Map (OpenFreeMap)...</Text>
              </View>
            )}
          />

          {/* Floating Top Filter Pills (Left Side) */}
          <View style={styles.topFilterBar}>
            {MAP_FILTERS.map((f) => {
              const isSelected = f === selectedFilter;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => handleSelectFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Heatmap Active Overlay Indicator */}
          {viewMode === 'heat' && (
            <View style={styles.heatmapActiveBadge}>
              <Ionicons name="flame" size={14} color="#EF4444" />
              <Text style={styles.heatmapActiveText}>Heatmap Density Active</Text>
            </View>
          )}

          {/* FLOATING LEGEND */}
          <View style={styles.floatingLegendContainer}>
            <TouchableOpacity
              style={styles.legendCard}
              onPress={() => setLegendCollapsed(!legendCollapsed)}
              activeOpacity={0.9}
            >
              <View style={styles.legendHeaderRow}>
                <View style={styles.legendTitleRow}>
                  <Ionicons
                    name={viewMode === 'heat' ? 'flame' : 'map'}
                    size={13}
                    color={viewMode === 'heat' ? '#EF4444' : THEME.colors.primary}
                  />
                  <Text style={styles.legendTitle}>
                    {viewMode === 'heat' ? 'Heatmap' : 'Map Legend'}
                  </Text>
                </View>
                <Ionicons
                  name={legendCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={14}
                  color={THEME.colors.textMuted}
                />
              </View>

              {!legendCollapsed && (
                <View style={styles.legendBody}>
                  {viewMode === 'heat' ? (
                    <>
                      <View style={styles.legendHeatRampRow}>
                        <View style={[styles.heatRampBlock, { backgroundColor: 'rgb(56, 189, 248)' }]} />
                        <View style={[styles.heatRampBlock, { backgroundColor: 'rgb(34, 197, 94)' }]} />
                        <View style={[styles.heatRampBlock, { backgroundColor: 'rgb(245, 158, 11)' }]} />
                        <View style={[styles.heatRampBlock, { backgroundColor: 'rgb(249, 115, 22)' }]} />
                        <View style={[styles.heatRampBlock, { backgroundColor: 'rgb(220, 38, 38)' }]} />
                      </View>
                      <View style={styles.legendHeatLabelsRow}>
                        <Text style={styles.legendHeatLabelText}>Low</Text>
                        <Text style={styles.legendHeatLabelText}>Med</Text>
                        <Text style={styles.legendHeatLabelText}>High</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#0284C7' }]} />
                        <Text style={styles.legendLabel}>My Location</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#1E3A8A' }]} />
                        <Text style={styles.legendLabel}>City Hall</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#D97706' }]} />
                        <Text style={styles.legendLabel}>Road Hazard</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.legendLabel}>Streetlight</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#059669' }]} />
                        <Text style={styles.legendLabel}>Sanitation</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
                        <Text style={styles.legendLabel}>Safety & Floods</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Floating GPS Status Toast */}
          {gpsStatusText && (
            <View style={styles.gpsToast}>
              <Ionicons name="navigate-circle" size={16} color={THEME.colors.primary} />
              <Text style={styles.gpsToastText}>{gpsStatusText}</Text>
            </View>
          )}

          {/* Floating Action Controls on Bottom-Right */}
          <View style={styles.floatingActionGroup}>
            {/* GPS Locate Me Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.gpsBtn]}
              onPress={detectUserGPS}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Ionicons name="navigate" size={20} color={THEME.colors.primary} />
              )}
            </TouchableOpacity>

            {/* Recenter to Mati City Hall */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleRecenterCity}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={20} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  loaderCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },

  // 1. Top View Mode Switcher
  viewModeHeaderContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 40,
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    padding: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 13,
  },
  viewModeTabActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  viewModeTabTextActive: {
    color: '#FFFFFF',
  },

  // 2. Alternative View (Hotspots Breakdown)
  breakdownContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 58,
  },
  breakdownContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  breakdownHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.white,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  breakdownHeaderSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  hotspotMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hotspotMetricCard: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hotspotMetricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  hotspotMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  scaleCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  scaleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  scaleGradientBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scaleStop: {
    flex: 1,
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabelText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  rankedListContainer: {
    gap: 10,
  },
  rankedListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  rankedListHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  rankedListCount: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  rankedBrgyCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  rankedBrgyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankedBrgyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  rankBadgeTextFirst: {
    color: '#DC2626',
  },
  rankedBrgyName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  rankedBrgyCoordText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  incidentCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  incidentCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankedBrgyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  catPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  locateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 3. Floating Filter Bar & Legend (On Map)
  topFilterBar: {
    position: 'absolute',
    top: 58,
    left: 12,
    right: 145,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.colors.white,
  },
  heatmapActiveBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 144 : 134,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 25,
  },
  heatmapActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  floatingLegendContainer: {
    position: 'absolute',
    top: 58,
    right: 12,
    width: 125,
    zIndex: 20,
  },
  legendCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  legendBody: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 5,
  },
  legendHeatRampRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  heatRampBlock: {
    flex: 1,
  },
  legendHeatLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  legendHeatLabelText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  gpsToast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 144 : 134,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 25,
  },
  gpsToastText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  floatingActionGroup: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 86,
    right: 16,
    gap: 10,
    zIndex: 15,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  gpsBtn: {
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
});
