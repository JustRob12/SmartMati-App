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

export interface CreateReportInput {
  title: string;
  description: string;
  category: string;
  office_name?: string;
  barangay: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  image_uri?: string;
}
