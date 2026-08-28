import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../lib/constants';
import { supabase } from '../lib/supabase';

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

    // Issue Markers
    var markers = [];
    var currentIssues = ${JSON.stringify(DEFAULT_ISSUES)};
    var currentFilter = 'All';
    var userMarker = null;

    function renderMarkers(filter) {
      currentFilter = filter || currentFilter;
      markers.forEach(function(m) { m.remove(); });
      markers = [];

      currentIssues.forEach(function(item) {
        if (currentFilter !== 'All') {
          var match = (item.category || '').toLowerCase().indexOf(currentFilter.toLowerCase()) !== -1 ||
                      currentFilter.toLowerCase().indexOf((item.category || '').toLowerCase()) !== -1;
          if (!match) return;
        }

        var markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.backgroundColor = item.color || '#D97706';
        markerEl.style.width = '28px';
        markerEl.style.height = '28px';
        markerEl.style.fontSize = '12px';
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
    }

    map.on('load', function() {
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
          renderMarkers(currentFilter);
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
      }
    } catch (e) {}
  };

  return (
    <View style={styles.fullScreenContainer}>
      {/* Fullscreen OpenFreeMap Vector Map View */}
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

      {/* FLOATING LEGEND */}
      <View style={styles.floatingLegendContainer}>
        <TouchableOpacity
          style={styles.legendCard}
          onPress={() => setLegendCollapsed(!legendCollapsed)}
          activeOpacity={0.9}
        >
          <View style={styles.legendHeaderRow}>
            <View style={styles.legendTitleRow}>
              <Ionicons name="map" size={13} color={THEME.colors.primary} />
              <Text style={styles.legendTitle}>Map Legend</Text>
            </View>
            <Ionicons
              name={legendCollapsed ? 'chevron-down' : 'chevron-up'}
              size={14}
              color={THEME.colors.textMuted}
            />
          </View>

          {!legendCollapsed && (
            <View style={styles.legendBody}>
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
  topFilterBar: {
    position: 'absolute',
    top: 14,
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
  floatingLegendContainer: {
    position: 'absolute',
    top: 14,
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
