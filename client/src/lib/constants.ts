import { Barangay, Gender } from '../types/auth';

export const MATI_BARANGAYS: Barangay[] = [
  'Badas',
  'Bobon',
  'Buso',
  'Cabuaya',
  'Central (Poblacion)',
  'Culian',
  'Dahican',
  'Danao',
  'Dawan',
  'Don Enrique Lopez',
  'Don Martin Marundan',
  'Don Salvador Lopez',
  'Langka',
  'Lawigan',
  'Libudon',
  'Luban',
  'Macambol',
  'Mamali',
  'Matiao',
  'Mayo',
  'Sainz',
  'Sanghay',
  'Tagabakid',
  'Tagbinonga',
  'Taguibo',
  'Tamisan',
];

export const GENDERS: Gender[] = ['Male', 'Female', 'Prefer not to say'];

export const THEME = {
  colors: {
    // Primary Civic Blues
    primary: '#1E3A8A', // Deep Civic Blue
    primaryDark: '#172554',
    primaryLight: '#2563EB',
    primarySoft: '#EFF6FF',

    // Yellow / Gold Accents
    accent: '#F59E0B', // Amber / Gold
    accentLight: '#FEF3C7',
    accentDark: '#D97706',
    yellowBadge: '#FACC15',

    // Clean Whites & Neutrals
    white: '#FFFFFF',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    surface: '#F1F5F9',

    // Text Colors
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E2E8F0',
    borderFocus: '#2563EB',

    // States
    error: '#EF4444',
    errorBackground: '#FEF2F2',
    success: '#10B981',
    successBackground: '#ECFDF5',
    warning: '#F59E0B',
  },
  typography: {
    titleLarge: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
    titleMedium: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
    titleSmall: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
    bodyRegular: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodyMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};
