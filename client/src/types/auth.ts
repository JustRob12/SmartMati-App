export type Gender = 'Male' | 'Female' | 'Prefer not to say';

export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export type Barangay =
  | 'Badas'
  | 'Bobon'
  | 'Buso'
  | 'Cabuaya'
  | 'Central (Poblacion)'
  | 'Culian'
  | 'Dahican'
  | 'Danao'
  | 'Dawan'
  | 'Don Enrique Lopez'
  | 'Don Martin Marundan'
  | 'Don Salvador Lopez'
  | 'Langka'
  | 'Lawigan'
  | 'Libudon'
  | 'Luban'
  | 'Macambol'
  | 'Mamali'
  | 'Matiao'
  | 'Mayo'
  | 'Sainz'
  | 'Sanghay'
  | 'Tagabakid'
  | 'Tagbinonga'
  | 'Taguibo'
  | 'Tamisan';

export interface RegisterFormData {
  // Step 1: Personal
  fullName: string;
  gender: Gender | '';
  birthdate: string;
  phone: string;
  email: string;

  // Step 2: Address
  city: string;
  barangay: Barangay | '';
  purok: string;

  // Step 3: Security & Consent
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  agreeToDataPrivacy: boolean;

  // Step 4: Verification Credentials
  idType?: string;
  idPhotoUrl?: string;
  residencyCertUrl?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  gender?: Gender | string;
  birthdate?: string;
  phone?: string;
  email: string;
  city: string;
  barangay: Barangay | string;
  purok?: string;
  role?: string;
  avatarUrl?: string;
  verificationStatus?: VerificationStatus;
  verificationRequestedAt?: string;
  idType?: string;
  idPhotoUrl?: string;
  residencyCertUrl?: string;
  createdAt?: string;
}

