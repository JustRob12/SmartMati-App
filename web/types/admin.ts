export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface ResidentProfile {
  id: string;
  full_name: string;
  gender?: string;
  birthdate?: string;
  phone?: string;
  email: string;
  city?: string;
  barangay?: string;
  purok?: string;
  role?: string;
  avatar_url?: string;
  verification_status: VerificationStatus;
  verification_requested_at?: string;
  created_at?: string;
}

export interface AdminStats {
  totalResidents: number;
  pendingVerifications: number;
  approvedMembers: number;
  rejectedVerifications: number;
  totalReports: number;
  pendingReports: number;
  totalOffices: number;
}

export interface MunicipalOffice {
  id: string;
  name: string;
  code?: string | null;
  office_type: string;
  purpose?: string | null;
  contact_number?: string | null;
  email?: string | null;
  banner_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'resolved';
export type ReportPriority = 'high' | 'medium' | 'low';

export interface CivicReport {
  id: string;
  user_id?: string;
  resident_name: string;
  resident_avatar?: string;
  resident_phone?: string;
  resident_email?: string;
  barangay: string;
  category: string;
  office_id?: string;
  office_name?: string;
  title: string;
  description: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: ReportStatus;
  priority?: ReportPriority;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  profiles?: {
    avatar_url?: string;
    full_name?: string;
  };
  updated_at?: string;
}

