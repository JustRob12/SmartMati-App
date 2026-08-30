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

// Curated high quality citizen portrait photos for users who have not yet uploaded a custom photo
export const DEFAULT_CITIZEN_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const getDefaultCitizenAvatar = (name: string): string => {
  if (!name) return DEFAULT_CITIZEN_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_CITIZEN_AVATARS.length;
  return DEFAULT_CITIZEN_AVATARS[index];
};
