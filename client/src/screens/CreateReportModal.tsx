import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { THEME, MATI_BARANGAYS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { supabase } from '../lib/supabase';
import { ConfirmationModal, ConfirmationModalProps } from '../components/ConfirmationModal';
import { DropdownModal } from '../components/DropdownModal';
import { StepperIndicator, StepItem } from '../components/StepperIndicator';
import { CivicReport } from '../types/report';

// Safe RFC4122 v4 UUID generator for React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const MATI_BARANGAY_COORDINATES: Record<string, { lat: number; lng: number }> = {
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

export interface OfficeCategoryOption {
  id: string;
  name: string;
  officeName: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  desc: string;
  quickSuggestions: string[];
}

export const REPORT_CATEGORIES: OfficeCategoryOption[] = [
  {
    id: 'infra',
    name: 'Infrastructure, Roads, & Utilities',
    officeName: 'City Engineering Office (CEO)',
    icon: 'construct',
    color: '#D97706',
    desc: 'Road cracks, potholes, broken bridges, water leaks, low water pressure, power line hazards',
    quickSuggestions: ['Deep Road Pothole', 'Damaged Bridge Railing', 'Water Main Leak', 'Broken Street Drainage'],
  },
  {
    id: 'lights',
    name: 'Streetlights & Public Utilities',
    officeName: 'City Engineering & Electric Coop',
    icon: 'flashlight',
    color: '#F59E0B',
    desc: 'Dark road sections, damaged lamp posts, burnt-out streetlights',
    quickSuggestions: ['Burnt Out Streetlight', 'Flickering Lamp Post', 'Unlit Road Corner'],
  },
  {
    id: 'enro',
    name: 'Environment, Trash, & Sanitation',
    officeName: 'City ENRO & Health Office',
    icon: 'trash',
    color: '#059669',
    desc: 'Uncollected garbage, illegal dumping piles, severe canal odors, sanitation hazards',
    quickSuggestions: ['Uncollected Trash Pile', 'Illegal Waste Dumping', 'Foul Canal Odor'],
  },
  {
    id: 'safety',
    name: 'Emergencies, Disasters, & Safety',
    officeName: 'CDRRMO / BFP / PNP',
    icon: 'warning',
    color: '#DC2626',
    desc: 'Fallen trees, flash flooding, road blockages, landslide risks, urgent fire hazards',
    quickSuggestions: ['Fallen Tree on Road', 'Severe Road Flooding', 'Hazardous Debris'],
  },
  {
    id: 'vet',
    name: 'Animal Welfare & Health',
    officeName: 'Office of the City Veterinarian',
    icon: 'paw',
    color: '#7C3AED',
    desc: 'Stray aggressive animals, injured street animals, rabies concerns',
    quickSuggestions: ['Stray Aggressive Pack', 'Injured Street Dog', 'Animal Welfare Concern'],
  },
  {
    id: 'cmo',
    name: 'Centralized & Public Order',
    officeName: "City Mayor's Office / Barangay Hall",
    icon: 'business',
    color: '#2563EB',
    desc: 'General community requests, public order concerns, minor neighborhood disputes',
    quickSuggestions: ['Community Noise Disturbance', 'Public Walkway Obstruction', 'Barangay Assistance Request'],
  },
];

const REPORT_STEPS: StepItem[] = [
  { number: 1, title: 'Photo (Req)', icon: 'camera' },
  { number: 2, title: 'Details & Pin', icon: 'location' },
  { number: 3, title: 'Category & Submit', icon: 'business' },
];

export type LocationOption = 'live_gps' | 'custom_location';

interface CreateReportModalProps {
  visible: boolean;
  onClose: () => void;
  onReportCreated?: () => void;
  initialCategoryName?: string;
  editReport?: CivicReport | null;
}

const buildMiniMapHtml = (initialLat: number, initialLng: number) => `
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
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #EF4444;
      color: white;
      font-size: 18px;
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
      cursor: grab;
      user-select: none;
    }
    .custom-marker:active {
      cursor: grabbing;
    }
    .maplibregl-ctrl-attrib {
      font-size: 8px !important;
      background: rgba(255, 255, 255, 0.8) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    var currentLat = ${initialLat};
    var currentLng = ${initialLng};

    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [currentLng, currentLat],
      zoom: 15,
      attributionControl: true
    });

    var markerEl = document.createElement('div');
    markerEl.className = 'custom-marker';
    markerEl.innerHTML = '📍';

    var marker = new maplibregl.Marker({
      element: markerEl,
      draggable: true
    })
      .setLngLat([currentLng, currentLat])
      .addTo(map);

    function notifyReactNative(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PIN_MOVED',
          lat: lat,
          lng: lng
        }));
      }
    }

    marker.on('dragend', function() {
      var pos = marker.getLngLat();
      notifyReactNative(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      notifyReactNative(e.lngLat.lat, e.lngLat.lng);
    });

    function handleBridgeMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'SET_CENTER') {
          map.flyTo({
            center: [data.lng, data.lat],
            zoom: 16,
            essential: true
          });
          marker.setLngLat([data.lng, data.lat]);
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleBridgeMessage);
    document.addEventListener('message', handleBridgeMessage);
  </script>
</body>
</html>
`;

export const parseReportImages = (imageUrl?: string | null): string[] => {
  if (!imageUrl) return [];
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === 'string' && u.length > 0);
    } catch {}
  }
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
  }
  return [trimmed];
};

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  visible,
  onClose,
  onReportCreated,
  initialCategoryName,
  editReport,
}) => {
  const isEditing = !!editReport;
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);

  // Active Step (1: Image, 2: Description & Location, 3: Category & Dispatch)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Up to 4 Photos (REQUIRED: at least 1)
  const [imageUris, setImageUris] = useState<string[]>([]);

  // Step 2: Location Option ('live_gps' or 'custom_location')
  const [locationMode, setLocationMode] = useState<LocationOption>('live_gps');

  // Automatic GPS Location & Mini-map coords
  const [locatingGps, setLocatingGps] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>('Detecting your GPS location...');
  const [gpsSuccess, setGpsSuccess] = useState<boolean>(false);

  // Description & Location Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState(user?.barangay || 'Central (Poblacion)');
  const [barangayDropdownOpen, setBarangayDropdownOpen] = useState(false);
  const [addressDetail, setAddressDetail] = useState('');

  // Step 3: Category
  const [selectedCategory, setSelectedCategory] = useState<OfficeCategoryOption>(() => {
    if (initialCategoryName) {
      const match = REPORT_CATEGORIES.find(
        (c) =>
          c.name.toLowerCase().includes(initialCategoryName.toLowerCase()) ||
          c.desc.toLowerCase().includes(initialCategoryName.toLowerCase())
      );
      if (match) return match;
    }
    return REPORT_CATEGORIES[0];
  });

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<ConfirmationModalProps | null>(null);

  // Initialize or reset form when modal becomes visible or editReport changes
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);

      if (editReport) {
        // Pre-fill existing data from editReport
        if (editReport.status !== 'pending') {
          Alert.alert(
            'Report Locked',
            'This report has already been reviewed/approved by City Hall and cannot be edited.'
          );
          onClose();
          return;
        }

        setImageUris(editReport.image_url ? parseReportImages(editReport.image_url) : []);
        setTitle(editReport.title || '');
        setDescription(editReport.description || '');
        setSelectedBarangay(editReport.barangay || user?.barangay || 'Central (Poblacion)');
        setAddressDetail(editReport.address || '');

        if (editReport.latitude && editReport.longitude) {
          setCoords({ latitude: editReport.latitude, longitude: editReport.longitude });
          setGpsSuccess(true);
          setGpsStatusText(`${editReport.latitude.toFixed(5)}°N, ${editReport.longitude.toFixed(5)}°E`);
        }

        const matchedCategory = REPORT_CATEGORIES.find(
          (c) =>
            c.name.toLowerCase() === (editReport.category || '').toLowerCase() ||
            c.officeName.toLowerCase() === (editReport.office_name || '').toLowerCase()
        );
        if (matchedCategory) {
          setSelectedCategory(matchedCategory);
        }
      } else {
        // Reset form for fresh submission
        setImageUris([]);
        setTitle('');
        setDescription('');
        setSelectedBarangay(user?.barangay || 'Central (Poblacion)');
        setAddressDetail('');
        detectUserGPS();
      }
    }
  }, [visible, editReport]);

  useEffect(() => {
    if (initialCategoryName && !editReport) {
      const match = REPORT_CATEGORIES.find(
        (c) =>
          c.name.toLowerCase().includes(initialCategoryName.toLowerCase()) ||
          c.desc.toLowerCase().includes(initialCategoryName.toLowerCase())
      );
      if (match) {
        setSelectedCategory(match);
      }
    }
  }, [initialCategoryName, editReport]);

  const resolveMatiStreetOnly = async (latitude: number, longitude: number) => {
    let detectedStreet = '';

    try {
      const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseResults && reverseResults.length > 0) {
        const first = reverseResults[0];
        if (first.street) {
          detectedStreet = first.street;
          if (first.name && first.name !== first.street && !first.street.includes(first.name)) {
            detectedStreet = `${first.street}, ${first.name}`;
          }
        } else if (first.name) {
          detectedStreet = first.name;
        } else if (first.formattedAddress) {
          detectedStreet = first.formattedAddress;
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding warning:', err);
    }

    return detectedStreet;
  };

  const detectUserGPS = async () => {
    setLocatingGps(true);
    setGpsStatusText('Requesting high-precision GPS coordinates...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatusText('GPS permission denied.');
        setGpsSuccess(false);
        setLocatingGps(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });

      // Automatically display street or extension only
      const street = await resolveMatiStreetOnly(latitude, longitude);
      if (street) {
        setAddressDetail(street);
      }

      setGpsSuccess(true);
      setGpsStatusText(`${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E`);
    } catch (err: any) {
      console.warn('GPS detection failure:', err);
      setGpsStatusText('6.95188°N, 126.21634°E (Mati City)');
      setCoords({ latitude: 6.9518828, longitude: 126.2163371 });
      setGpsSuccess(false);
    } finally {
      setLocatingGps(false);
    }
  };

  const handleSelectCustomBarangay = (brgyName: string) => {
    setSelectedBarangay(brgyName);
    setBarangayDropdownOpen(false);
    // Note: Do NOT change coordinates or reposition the map
  };

  // Mini-map webview message handler (When user taps or drags pin on map)
  const handleMiniMapMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PIN_MOVED' && data.lat && data.lng) {
        setCoords({ latitude: data.lat, longitude: data.lng });

        // Automatically display street or extension only
        const street = await resolveMatiStreetOnly(data.lat, data.lng);
        if (street) {
          setAddressDetail(street);
        }
      }
    } catch (e) {}
  };

  const handleCenterMiniMapOnUser = async () => {
    if (coords) {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'SET_CENTER',
          lat: coords.latitude,
          lng: coords.longitude,
        })
      );
    } else {
      detectUserGPS();
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const remainingSlots = 4 - imageUris.length;
      if (remainingSlots <= 0) {
        Alert.alert('Maximum Limit', 'You can upload up to 4 photos per report.');
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow photo gallery access in your device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selected = result.assets.map((a) => a.uri);
        setImageUris((prev) => [...prev, ...selected].slice(0, 4));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not select photo.');
    }
  };

  const handleTakePhotoWithCamera = async () => {
    try {
      if (imageUris.length >= 4) {
        Alert.alert('Maximum Limit', 'You can upload up to 4 photos per report.');
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow camera access in your device settings to take live incident photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUris((prev) => [...prev, result.assets[0].uri].slice(0, 4));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not launch camera.');
    }
  };

  const removeImageAt = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 1 -> Step 2 (MANDATORY PHOTO ENFORCEMENT)
  const handleProceedFromStep1 = () => {
    if (imageUris.length === 0) {
      Alert.alert(
        'Photo Evidence Required',
        'At least 1 photo is required for City Hall verification before dispatch. Please take a live photo or select one from your device gallery.'
      );
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 -> Step 3
  const handleProceedFromStep2 = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your report before proceeding.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide a detailed description of the issue.');
      return;
    }

    if (locationMode === 'custom_location' && !addressDetail.trim()) {
      Alert.alert(
        'Missing Location Detail',
        'Please specify the street, purok, or landmark of the issue so the department can find it.'
      );
      return;
    }

    setCurrentStep(3);
  };

  // Final Submit (Creates new or updates pending report)
  const handleSubmitReport = async () => {
    if (imageUris.length === 0) {
      Alert.alert('Photo Required', 'Please attach at least one photo of the issue before submitting.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    try {
      // Upload all local images to Cloudinary concurrently
      const uploadPromises = imageUris.map(async (uri) => {
        if (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph:')) {
          return await uploadImageToCloudinary(uri, 'smartmati_reports');
        }
        return uri;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const hostedImageUrl = uploadedUrls.length === 1 ? uploadedUrls[0] : JSON.stringify(uploadedUrls);

      const finalLatitude = coords ? coords.latitude : 6.9554;
      const finalLongitude = coords ? coords.longitude : 126.2166;
      const finalBarangay = selectedBarangay || 'Central (Poblacion)';

      if (isEditing && editReport) {
        // Update existing pending report
        const { error } = await supabase
          .from('reports')
          .update({
            title: title.trim(),
            description: description.trim(),
            category: selectedCategory.name,
            office_name: selectedCategory.officeName,
            barangay: finalBarangay,
            address: addressDetail.trim() || null,
            image_url: hostedImageUrl,
            latitude: finalLatitude,
            longitude: finalLongitude,
            resident_avatar: user?.avatarUrl || editReport.resident_avatar || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editReport.id)
          .eq('status', 'pending');

        if (error) throw error;

        setDialogConfig({
          visible: true,
          type: 'success',
          icon: 'checkmark-circle',
          title: 'Report Updated! ✨',
          subtitle: 'Under City Hall Admin Review',
          message:
            'Your pending report edits have been saved and sent to Mati City Hall administrators for review and dispatch.',
          details: [
            { label: 'Category', value: selectedCategory.name },
            { label: 'Barangay', value: `Brgy. ${finalBarangay}` },
            { label: 'Coordinates', value: `${finalLatitude.toFixed(5)}°N, ${finalLongitude.toFixed(5)}°E` },
            { label: 'Photos', value: `${uploadedUrls.length} Photo(s) Attached` },
            { label: 'Status', value: 'Pending Admin Review' },
          ],
          confirmText: 'Done',
          onConfirm: () => {
            setDialogConfig(null);
            onClose();
            if (onReportCreated) onReportCreated();
          },
        });
      } else {
        // Create new report
        const reportId = generateUUID();
        const reportPayload = {
          id: reportId,
          user_id: user?.id || null,
          resident_name: user?.fullName || 'Verified Resident',
          resident_phone: user?.phone || null,
          resident_email: user?.email || null,
          resident_avatar: user?.avatarUrl || null,
          barangay: finalBarangay,
          category: selectedCategory.name,
          office_name: selectedCategory.officeName,
          title: title.trim(),
          description: description.trim(),
          image_url: hostedImageUrl,
          latitude: finalLatitude,
          longitude: finalLongitude,
          address: addressDetail.trim() || null,
          status: 'pending',
        };

        const { error } = await supabase.from('reports').insert(reportPayload);
        if (error) throw error;

        setDialogConfig({
          visible: true,
          type: 'success',
          icon: 'checkmark-circle',
          title: 'Report Submitted! 🚀',
          subtitle: 'Under City Hall Admin Review',
          message:
            'Your civic report has been submitted to Mati City Hall administrators for review. Once verified and assigned to an office, it will appear on the community feed.',
          details: [
            { label: 'Category', value: selectedCategory.name },
            { label: 'Coordinates', value: `${finalLatitude.toFixed(5)}°N, ${finalLongitude.toFixed(5)}°E` },
            { label: 'Photos', value: `${uploadedUrls.length} Photo(s) Attached` },
            { label: 'Status', value: 'Pending Admin Review' },
          ],
          confirmText: 'Done',
          onConfirm: () => {
            setDialogConfig(null);
            onClose();
            if (onReportCreated) onReportCreated();
          },
        });
      }

      // Reset form
      setTitle('');
      setDescription('');
      setImageUris([]);
      setAddressDetail('');
      setCurrentStep(1);
    } catch (err: any) {
      console.error('Report submission error:', err);
      setDialogConfig({
        visible: true,
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Submission Failed',
        message: err.message || 'Could not save report. Please check your connection and try again.',
        confirmText: 'OK',
        onConfirm: () => setDialogConfig(null),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const initialMiniMapLat = coords?.latitude || 6.9554;
  const initialMiniMapLng = coords?.longitude || 126.2166;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Pending Report' : 'Submit Civic Report'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentStep === 1
                ? 'Step 1: Upload Photo (Required)'
                : currentStep === 2
                ? 'Step 2: Details & Mini-Map Pin'
                : 'Step 3: Select Office Category'}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Stepper Progress Indicator */}
        <StepperIndicator currentStep={currentStep} steps={REPORT_STEPS} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= STEP 1: IMAGE (REQUIRED) ================= */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderCard}>
                <View style={styles.stepHeaderIconCircle}>
                  <Ionicons name="camera" size={22} color={THEME.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.requiredTagRow}>
                    <Text style={styles.stepHeaderTitle}>
                      {isEditing ? 'Update Photo Evidence' : 'Capture / Upload Photo'}
                    </Text>
                    <View style={styles.requiredPill}>
                      <Text style={styles.requiredPillText}>REQUIRED</Text>
                    </View>
                  </View>
                  <Text style={styles.stepHeaderSubtitle}>
                    A clear photo of the hazard or issue is required so City Hall teams can verify and dispatch proper equipment.
                  </Text>
                </View>
              </View>

              {/* Photo Area: 0 to 4 Photos */}
              {imageUris.length > 0 ? (
                <View style={styles.multiPhotoSection}>
                  {/* Counter Header */}
                  <View style={styles.photoCountHeader}>
                    <Text style={styles.photoCountTitle}>
                      Attached Photos ({imageUris.length}/4)
                    </Text>
                    <Text style={styles.photoCountHint}>
                      {imageUris.length === 4 ? 'Maximum 4 reached' : `Can add ${4 - imageUris.length} more`}
                    </Text>
                  </View>

                  {/* 2x2 or Grid of Selected Photos */}
                  <View style={styles.multiPhotoGrid}>
                    {imageUris.map((uri, index) => (
                      <View key={index} style={styles.multiPhotoCard}>
                        <Image source={{ uri }} style={styles.multiPhotoThumb} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.multiPhotoDeleteBtn}
                          onPress={() => removeImageAt(index)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexText}>{index + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Add more buttons if < 4 */}
                  {imageUris.length < 4 && (
                    <View style={styles.addMorePhotosRow}>
                      <TouchableOpacity
                        style={styles.addMorePhotoBtn}
                        onPress={handleTakePhotoWithCamera}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="camera" size={16} color={THEME.colors.primary} />
                        <Text style={styles.addMorePhotoBtnText}>Take Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.addMorePhotoBtn}
                        onPress={handlePickFromGallery}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="images" size={16} color="#D97706" />
                        <Text style={styles.addMorePhotoBtnText}>Add From Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.photoActionGroup}>
                  <TouchableOpacity
                    style={styles.photoActionCardPrimary}
                    onPress={handleTakePhotoWithCamera}
                    activeOpacity={0.85}
                  >
                    <View style={styles.photoActionIconCircle}>
                      <Ionicons name="camera" size={32} color={THEME.colors.primary} />
                    </View>
                    <Text style={styles.photoActionCardTitle}>Take Live Photo with Camera *</Text>
                    <Text style={styles.photoActionCardDesc}>
                      Capture the hazard or issue right now with your phone camera
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoActionCardSecondary}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.photoActionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="images" size={26} color="#D97706" />
                    </View>
                    <Text style={styles.photoActionCardTitle}>Choose from Photo Gallery (Up to 4) *</Text>
                    <Text style={styles.photoActionCardDesc}>
                      Select up to 4 images already saved in your device library
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Photo Status Guidance Banner */}
              <View style={[styles.guidanceBox, imageUris.length === 0 && styles.guidanceBoxWarning]}>
                <Ionicons
                  name={imageUris.length > 0 ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={imageUris.length > 0 ? '#059669' : '#D97706'}
                />
                <Text style={[styles.guidanceText, imageUris.length === 0 && { color: '#B45309' }]}>
                  {imageUris.length > 0
                    ? `${imageUris.length} Photo(s) attached! You can attach up to 4 photos.`
                    : 'At least 1 photo is required. Please capture a live photo or select from gallery to continue.'}
                </Text>
              </View>

              {/* Step 1 Navigation Button */}
              <TouchableOpacity
                style={[styles.primaryNavBtn, imageUris.length === 0 && styles.primaryNavBtnDisabled]}
                onPress={handleProceedFromStep1}
                disabled={imageUris.length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryNavBtnText}>
                  {imageUris.length > 0 ? 'Continue to Details & Location Pin' : 'Take or Select a Photo to Proceed'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 2: DESCRIPTION & LOCATION (WITH MINIMAP PIN PICKER) ================= */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              {/* 1. TOP SECTION: Description & Title */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="document-text" size={18} color={THEME.colors.primary} />
                  <Text style={styles.sectionCardTitle}>REPORT TITLE & DESCRIPTION *</Text>
                </View>

                {/* Quick Suggestion Chips */}
                <Text style={styles.suggestionTitle}>Quick Title Ideas:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
                  {selectedCategory.quickSuggestions.map((sug) => (
                    <TouchableOpacity
                      key={sug}
                      style={styles.suggestionChip}
                      onPress={() => setTitle(sug)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ISSUE TITLE *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Deep pothole causing vehicular hazard"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DETAILED DESCRIPTION *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the hazard level, exact landmark, and how long it has been present..."
                    placeholderTextColor={THEME.colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* 2. BARANGAY & STREET / EXTENSION LOCATION CARD */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="business" size={18} color={THEME.colors.primary} />
                  <Text style={styles.sectionCardTitle}>BARANGAY & STREET / EXTENSION *</Text>
                </View>
                <Text style={styles.sectionHelp}>
                  Select your barangay from the dropdown. The street/extension is automatically filled from your location pin.
                </Text>

                {/* Barangay Dropdown Button */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>BARANGAY *</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => setBarangayDropdownOpen(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons name="business-outline" size={18} color={THEME.colors.primary} />
                      <Text style={styles.dropdownSelectorText}>Brgy. {selectedBarangay}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={THEME.colors.textMuted} />
                  </TouchableOpacity>

                  <DropdownModal
                    visible={barangayDropdownOpen}
                    title="Select Barangay"
                    options={MATI_BARANGAYS}
                    selectedValue={selectedBarangay}
                    onSelect={handleSelectCustomBarangay}
                    onClose={() => setBarangayDropdownOpen(false)}
                    searchable={true}
                  />
                </View>

                {/* Street / Extension / Landmark Input */}
                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.inputLabel}>STREET / EXTENSION / LANDMARK</Text>
                    <Text style={{ fontSize: 10, color: THEME.colors.primary, fontWeight: '700' }}>
                      Auto-detected from map
                    </Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={addressDetail}
                    onChangeText={setAddressDetail}
                    placeholder="e.g. Rizal Extension, Purok 3, Near City Hall..."
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
              </View>

              {/* 3. BOTTOM SECTION: Location Mode Selector Card (2 Options) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="location" size={18} color={THEME.colors.primary} />
                  <Text style={styles.sectionCardTitle}>LOCATION SELECTION (COORDINATES ONLY) *</Text>
                </View>
                <Text style={styles.sectionHelp}>
                  Choose your live GPS coordinates or interactively pan/zoom the mini-map to drop a pin.
                </Text>

                {/* 2 Option Toggle Tabs */}
                <View style={styles.locationModeToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.locationModeTab,
                      locationMode === 'live_gps' && styles.locationModeTabActive,
                    ]}
                    onPress={() => {
                      setLocationMode('live_gps');
                      detectUserGPS();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="navigate"
                      size={16}
                      color={locationMode === 'live_gps' ? '#FFFFFF' : THEME.colors.primary}
                    />
                    <Text
                      style={[
                        styles.locationModeTabText,
                        locationMode === 'live_gps' && styles.locationModeTabTextActive,
                      ]}
                    >
                      Use Live GPS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.locationModeTab,
                      locationMode === 'custom_location' && styles.locationModeTabActive,
                    ]}
                    onPress={() => {
                      setLocationMode('custom_location');
                      if (!coords) {
                        setCoords({ latitude: 6.9518828, longitude: 126.2163371 });
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="map-outline"
                      size={16}
                      color={locationMode === 'custom_location' ? '#FFFFFF' : THEME.colors.primary}
                    />
                    <Text
                      style={[
                        styles.locationModeTabText,
                        locationMode === 'custom_location' && styles.locationModeTabTextActive,
                      ]}
                    >
                      Pin on Mini-Map
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* OPTION A: Live GPS Info Card (Coordinates Only) */}
                {locationMode === 'live_gps' && (
                  <View style={styles.liveGpsWrapper}>
                    <View style={styles.sectionCardHeader}>
                      <View style={styles.sectionTitleRow}>
                        <Ionicons name="radio" size={16} color="#059669" />
                        <Text style={[styles.sectionCardTitle, { color: '#059669' }]}>
                          DEVICE GPS COORDINATES
                        </Text>
                      </View>
                      <TouchableOpacity onPress={detectUserGPS} disabled={locatingGps} style={styles.reDetectBtn}>
                        {locatingGps ? (
                          <ActivityIndicator size="small" color={THEME.colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={12} color={THEME.colors.primary} />
                            <Text style={styles.reDetectText}>Re-detect GPS</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* GPS Live Status: pure coordinates only, no barangay */}
                    <View style={[styles.gpsCard, gpsSuccess ? styles.gpsCardSuccess : styles.gpsCardPending]}>
                      <View style={[styles.gpsIconCircle, gpsSuccess ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons
                          name={gpsSuccess ? 'navigate' : 'location-outline'}
                          size={18}
                          color={gpsSuccess ? '#059669' : THEME.colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gpsTitle}>
                          {gpsSuccess ? 'Live GPS Location Locked' : 'Detecting GPS Coordinates'}
                        </Text>
                        <Text style={styles.gpsDesc}>
                          {coords ? `${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E` : gpsStatusText}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* OPTION B: INTERACTIVE MINIMAP PIN PICKER */}
                {locationMode === 'custom_location' && (
                  <View style={styles.customLocationWrapper}>
                    <View style={styles.miniMapInstructionBar}>
                      <Ionicons name="finger-print-outline" size={16} color="#B45309" />
                      <Text style={styles.miniMapInstructionText}>
                        Pan & zoom map. <Text style={{ fontWeight: '800' }}>Tap anywhere</Text> or drag the red pin 📍 to save exact coordinates.
                      </Text>
                    </View>

                    {/* Interactive OpenFreeMap Mini-Map WebView */}
                    <View style={styles.miniMapContainer}>
                      <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: buildMiniMapHtml(initialMiniMapLat, initialMiniMapLng) }}
                        style={styles.miniMapWebView}
                        onMessage={handleMiniMapMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        nestedScrollEnabled={true}
                      />

                      {/* Floating Mini-Map Center Controls */}
                      <View style={styles.miniMapFloatingControls}>
                        <TouchableOpacity
                          style={styles.miniMapControlBtn}
                          onPress={handleCenterMiniMapOnUser}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="locate" size={16} color={THEME.colors.primary} />
                          <Text style={styles.miniMapControlBtnText}>My GPS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.miniMapControlBtn}
                          onPress={() => {
                            if (webViewRef.current) {
                              webViewRef.current.postMessage(
                                JSON.stringify({
                                  type: 'SET_CENTER',
                                  lat: 6.9554,
                                  lng: 126.2166,
                                })
                              );
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="map" size={14} color={THEME.colors.primary} />
                          <Text style={styles.miniMapControlBtnText}>Mati Center</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Pinned Coordinates Pill */}
                    <View style={styles.approxCoordsCard}>
                      <Ionicons name="pin" size={15} color="#EF4444" />
                      <Text style={styles.approxCoordsText}>
                        Pinned Coordinates: {coords ? `${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E` : 'Tap on map'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Step 2 Navigation Buttons */}
              <View style={styles.stepButtonsRow}>
                <TouchableOpacity
                  style={styles.secondaryNavBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={THEME.colors.textPrimary} />
                  <Text style={styles.secondaryNavBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryNavBtnFlex}
                  onPress={handleProceedFromStep2}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryNavBtnText}>Select Category</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 3: CATEGORY & DISPATCH ================= */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="business" size={18} color={THEME.colors.primary} />
                  <Text style={styles.sectionCardTitle}>SELECT REPORT CATEGORY *</Text>
                </View>
                <Text style={styles.sectionHelp}>
                  The category determines which official municipal office will receive and resolve this report.
                </Text>

                {/* Categories Grid */}
                <View style={styles.categoriesGrid}>
                  {REPORT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryFullCard,
                          isSelected && { borderColor: cat.color, backgroundColor: '#F8FAFC' },
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.categoryCardHeader}>
                          <View style={[styles.categoryIconCircle, { backgroundColor: cat.color + '15' }]}>
                            <Ionicons name={cat.icon} size={20} color={cat.color} />
                          </View>
                          {isSelected && (
                            <View style={[styles.selectedCheck, { backgroundColor: cat.color }]}>
                              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                            </View>
                          )}
                        </View>

                        <Text style={[styles.categoryName, isSelected && { color: THEME.colors.textPrimary, fontWeight: '800' }]}>
                          {cat.name}
                        </Text>
                        <Text style={styles.categoryOfficeSnippet}>
                          Target: {cat.officeName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* City Hall Dispatch Review Banner */}
                <View style={styles.targetOfficeCard}>
                  <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.targetOfficeLabel}>CITY HALL DISPATCH REVIEW</Text>
                    <Text style={styles.targetOfficeName}>Mati City Administration</Text>
                    <Text style={styles.targetOfficeDesc}>City Hall administrators will check this report and assign the responsible department upon approval.</Text>
                  </View>
                </View>
              </View>

              {/* Review Summary Card */}
              <View style={styles.summaryReviewCard}>
                <Text style={styles.summaryReviewTitle}>
                  {isEditing ? 'UPDATED REPORT SUMMARY' : 'REPORT SUBMISSION SUMMARY'}
                </Text>

                <View style={styles.summaryContentRow}>
                  {imageUris.length > 0 ? (
                    <Image source={{ uri: imageUris[0] }} style={styles.summaryThumb} />
                  ) : (
                    <View style={styles.summaryNoThumb}>
                      <Ionicons name="image-outline" size={20} color={THEME.colors.textMuted} />
                      <Text style={{ fontSize: 9, color: THEME.colors.textMuted, marginTop: 2 }}>No Photo</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.summaryTitle} numberOfLines={2}>{title || 'Civic Report'}</Text>
                    <Text style={styles.summaryLocation}>
                      📍 {coords ? `${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E` : 'GPS Coordinates'}
                    </Text>
                    <Text style={styles.summaryCategory}>
                      📁 Category: {selectedCategory.name}
                    </Text>
                    <Text style={styles.summaryLocationMode}>
                      {locationMode === 'live_gps' ? '🟢 Live GPS Locked' : '🗺️ Map Pin Placed'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Step 3 Navigation Buttons */}
              <View style={styles.stepButtonsRow}>
                <TouchableOpacity
                  style={styles.secondaryNavBtn}
                  onPress={() => setCurrentStep(2)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={THEME.colors.textPrimary} />
                  <Text style={styles.secondaryNavBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtnFlex, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitReport}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        {isEditing ? 'Saving Changes...' : 'Submitting...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name={isEditing ? 'save-outline' : 'send'} size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        {isEditing ? 'Save Changes' : 'Submit to City Hall'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimerText}>
                Reports are routed to Mati City Hall administrators and verified before public broadcasting. Emergency hotlines (CDRRMO: 0917-814-6284, PNP: 0998-598-7254) should be called for active life emergencies.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Universal Confirmation Modal */}
        {dialogConfig && <ConfirmationModal {...dialogConfig} />}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 16,
  },

  // Step 1 Styles
  stepHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeaderIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  requiredPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  stepHeaderSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  photoActionGroup: {
    gap: 12,
  },
  photoActionCardPrimary: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  photoActionCardSecondary: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  photoActionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoActionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  photoActionCardDesc: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  multiPhotoSection: {
    gap: 10,
  },
  photoCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  photoCountTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoCountHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  multiPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiPhotoCard: {
    width: '48.5%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  multiPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  multiPhotoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addMorePhotosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addMorePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 10,
  },
  addMorePhotoBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  imagePreviewContainer: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  imageControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  imageControlBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  guidanceBoxWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  guidanceText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },

  // Step 2 Styles
  sectionCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  sectionHelp: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: -4,
  },

  // Location Mode 2-Option Tabs
  locationModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  locationModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  locationModeTabActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  locationModeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  locationModeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  liveGpsWrapper: {
    gap: 12,
  },
  customLocationWrapper: {
    gap: 12,
  },
  miniMapInstructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  miniMapInstructionText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  miniMapContainer: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  miniMapWebView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  miniMapFloatingControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  miniMapControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  miniMapControlBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  approxCoordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  approxCoordsText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },

  reDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  reDetectText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  gpsCardSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  gpsCardPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  gpsDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoSyncBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  detectedBarangayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  detectedBarangayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detectedBarangayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  detectedBarangayLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  detectedBarangayValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownSelectorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginLeft: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  textArea: {
    minHeight: 85,
    lineHeight: 18,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  suggestionScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
  },

  // Categories Grid (Step 3)
  categoriesGrid: {
    gap: 8,
  },
  categoryFullCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.colors.white,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 17,
  },
  categoryOfficeSnippet: {
    fontSize: 10.5,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  selectedCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetOfficeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  targetOfficeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  targetOfficeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 1,
  },
  targetOfficeDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },

  // Summary Review Card
  summaryReviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  summaryReviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  summaryContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  summaryNoThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryLocation: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  summaryCategory: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  summaryLocationMode: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },

  // Navigation Buttons
  primaryNavBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryNavBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
    shadowOpacity: 0,
  },
  primaryNavBtnFlex: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryNavBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryNavBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryNavBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stepButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitBtnFlex: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disclaimerText: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 8,
  },
});
