'use client';

import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { MunicipalOffice, CivicReport, ReportStatus, ReportPriority } from '../types/admin';
import { PRIORITY_CONFIG } from './ApproveReportsView';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Phone,
  Mail,
  AlertTriangle,
  RefreshCw,
  Power,
  ImageIcon,
  Upload,
  X,
  Link as LinkIcon,
  Loader2,
  ArrowLeft,
  FileCheck2,
  Clock,
  MapPin,
  User,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  Check,
  CheckCheck,
  FolderOpen,
  Flame,
  AlertOctagon,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Copy,
} from 'lucide-react';

export const DEFAULT_OFFICE_TYPES = [
  'Centralized & Public Order',
  'Infrastructure, Roads, & Utilities',
  'Environment, Trash, & Sanitation',
  'Emergencies, Disasters, & Safety',
  'Animal Welfare & Health',
];

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

interface OfficesViewProps {
  offices: MunicipalOffice[];
  loading: boolean;
  onRefresh: () => void;
  onOfficesChange?: (offices: MunicipalOffice[]) => void;
  reports?: CivicReport[];
  onReportsChange?: (reports: CivicReport[]) => void;
  adminUser?: any;
}

export const OfficesView: React.FC<OfficesViewProps> = ({
  offices,
  loading,
  onRefresh,
  onOfficesChange,
  reports = [],
  onReportsChange,
  adminUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<MunicipalOffice | null>(null);

  // Dedicated Office Reports Page State
  const [selectedOfficeForReports, setSelectedOfficeForReports] = useState<MunicipalOffice | null>(null);
  const [officeReportsSearch, setOfficeReportsSearch] = useState('');
  const [officeReportsStatusFilter, setOfficeReportsStatusFilter] = useState<'all' | ReportStatus>('all');
  const [selectedReportDetail, setSelectedReportDetail] = useState<CivicReport | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Status Action Modal
  const [actionModal, setActionModal] = useState<{
    report: CivicReport;
    action: ReportStatus;
  } | null>(null);
  const [actionPriority, setActionPriority] = useState<ReportPriority>('medium');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState(DEFAULT_OFFICE_TYPES[0]);
  const [formCustomType, setFormCustomType] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mapModalReport, setMapModalReport] = useState<CivicReport | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper to accurately match a report to a specific municipal office
  const isReportForOffice = (report: CivicReport, office: MunicipalOffice) => {
    // 1. Explicit office_id match
    if (report.office_id && office.id) {
      if (report.office_id === office.id) return true;
      return false;
    }

    const oName = (office.name || '').trim().toLowerCase();
    const oCode = (office.code || '').trim().toLowerCase();

    // 2. Specific office_name on the report
    if (report.office_name && report.office_name.trim()) {
      const rName = report.office_name.trim().toLowerCase();

      if (rName === oName) return true;

      if (oCode) {
        if (
          rName === oCode ||
          rName.includes(`(${oCode})`) ||
          rName.includes(`[${oCode}]`) ||
          rName.startsWith(oCode + ' ') ||
          rName.endsWith(' ' + oCode)
        ) {
          return true;
        }
      }

      // Department-specific keyword disambiguation
      if (oName.includes('dpwh')) return rName.includes('dpwh');
      if (rName.includes('dpwh')) return oName.includes('dpwh');

      if (oName.includes('water') || oName.includes('mcwd') || oName.includes('electric') || oName.includes('coop')) {
        return rName.includes('water') || rName.includes('mcwd') || rName.includes('electric') || rName.includes('coop');
      }
      if (rName.includes('water') || rName.includes('mcwd') || rName.includes('electric') || rName.includes('coop')) {
        return oName.includes('water') || oName.includes('mcwd') || oName.includes('electric') || oName.includes('coop');
      }

      if (oName.includes('city engineering') || oCode === 'ceo') {
        return (
          rName.includes('city engineering') ||
          rName.includes('ceo') ||
          (rName.includes('engineering') && !rName.includes('dpwh'))
        );
      }

      if (oName.includes('enro') || oName.includes('environment') || oName.includes('sanitation')) {
        return rName.includes('enro') || rName.includes('environment') || rName.includes('trash') || rName.includes('sanitation');
      }

      if (oName.includes('cdrrmo') || oName.includes('safety') || oName.includes('disaster') || oName.includes('emergency')) {
        return (
          rName.includes('cdrrmo') ||
          rName.includes('bfp') ||
          rName.includes('pnp') ||
          rName.includes('emergency') ||
          rName.includes('disaster') ||
          rName.includes('safety')
        );
      }

      if (oName.includes('veterinarian') || oName.includes('animal')) {
        return rName.includes('vet') || rName.includes('animal');
      }

      if (oName.includes('mayor') || oName.includes('barangay')) {
        return rName.includes('mayor') || rName.includes('barangay');
      }

      return rName.includes(oName) || oName.includes(rName);
    }

    // 3. Fallback ONLY if report has NO office_name and NO office_id
    if (report.category) {
      const rCat = report.category.toLowerCase();
      const isInfra = rCat.includes('infrastructure') || rCat.includes('road') || rCat.includes('utility');
      const isEnviro = rCat.includes('environment') || rCat.includes('trash') || rCat.includes('sanitation');
      const isEmergency = rCat.includes('emergenc') || rCat.includes('safety') || rCat.includes('disaster');
      const isAnimal = rCat.includes('animal') || rCat.includes('vet');
      const isPublicOrder = rCat.includes('public order') || rCat.includes('central');

      if (isInfra && (oCode === 'ceo' || oName.includes('city engineering'))) return true;
      if (isEnviro && (oCode === 'enro' || oName.includes('enro') || oName.includes('environment'))) return true;
      if (isEmergency && (oCode === 'cdrrmo' || oName.includes('cdrrmo'))) return true;
      if (isAnimal && (oCode === 'vet' || oName.includes('veterinarian'))) return true;
      if (isPublicOrder && (oCode === 'cmo' || oName.includes('mayor'))) return true;
    }

    return false;
  };

  // Compute reports stats map per office
  const officeStatsMap = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        resolved: number;
        approved: number;
        inProgress: number;
        pending: number;
        rejected: number;
        activeProblems: number;
        rate: number;
      }
    > = {};

    offices.forEach((office) => {
      const officeReports = reports.filter((r) => isReportForOffice(r, office));
      const total = officeReports.length;
      const resolved = officeReports.filter((r) => r.status === 'resolved').length;
      const approved = officeReports.filter((r) => r.status === 'approved').length;
      const inProgress = officeReports.filter((r) => r.status === 'in_progress').length;
      const pending = officeReports.filter((r) => r.status === 'pending').length;
      const rejected = officeReports.filter((r) => r.status === 'rejected').length;
      const activeProblems = pending + approved + inProgress;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      stats[office.id] = {
        total,
        resolved,
        approved,
        inProgress,
        pending,
        rejected,
        activeProblems,
        rate,
      };
    });

    return stats;
  }, [offices, reports]);

  const handleOpenCreateModal = () => {
    setEditingOffice(null);
    setFormName('');
    setFormCode('');
    setFormType(DEFAULT_OFFICE_TYPES[0]);
    setFormCustomType('');
    setFormPurpose('');
    setFormPhone('');
    setFormEmail('');
    setFormBannerUrl('');
    setFormIsActive(true);
    setUploadingBanner(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (office: MunicipalOffice) => {
    setEditingOffice(office);
    setFormName(office.name);
    setFormCode(office.code || '');
    if (DEFAULT_OFFICE_TYPES.includes(office.office_type)) {
      setFormType(office.office_type);
      setFormCustomType('');
    } else {
      setFormType('Custom');
      setFormCustomType(office.office_type);
    }
    setFormPurpose(office.purpose || '');
    setFormPhone(office.contact_number || '');
    setFormEmail(office.email || '');
    setFormBannerUrl(office.banner_url || '');
    setFormIsActive(office.is_active !== false);
    setUploadingBanner(false);
    setModalOpen(true);
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file (PNG, JPG, WEBP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image file size must be less than 10MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadImageToCloudinary(file, 'smartmati_offices');
      setFormBannerUrl(url);
      showToast('success', 'Banner image uploaded to Cloudinary successfully!');
    } catch (err: any) {
      console.error('Banner upload error:', err);
      showToast('error', err?.message || 'Failed to upload banner image.');
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBanner = () => {
    setFormBannerUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('error', 'Please enter the office name.');
      return;
    }

    const finalType = formType === 'Custom' ? formCustomType.trim() || 'General' : formType;
    if (!finalType) {
      showToast('error', 'Please specify an office type / category.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase() || null,
        office_type: finalType,
        purpose: formPurpose.trim() || null,
        contact_number: formPhone.trim() || null,
        email: formEmail.trim().toLowerCase() || null,
        banner_url: formBannerUrl || null,
        is_active: formIsActive,
        updated_at: new Date().toISOString(),
      };

      if (editingOffice) {
        const { error } = await supabase
          .from('offices')
          .update(payload)
          .eq('id', editingOffice.id);

        if (error) throw error;

        if (onOfficesChange) {
          onOfficesChange(
            offices.map((o) => (o.id === editingOffice.id ? { ...o, ...payload } : o))
          );
        }
        showToast('success', `Office "${formName}" updated successfully.`);
      } else {
        const { data, error } = await supabase
          .from('offices')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (onOfficesChange && data) {
          onOfficesChange([...offices, data]);
        }
        showToast('success', `Office "${formName}" created successfully.`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error('Save office error:', err);
      showToast('error', err?.message || 'Could not save office.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (office: MunicipalOffice) => {
    const nextState = office.is_active === false ? true : false;
    try {
      const { error } = await supabase
        .from('offices')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', office.id);

      if (error) throw error;

      if (onOfficesChange) {
        onOfficesChange(
          offices.map((o) => (o.id === office.id ? { ...o, is_active: nextState } : o))
        );
      }

      showToast(
        'success',
        `Office "${office.name}" ${nextState ? 'activated' : 'disabled'}.`
      );
      onRefresh();
    } catch (err: any) {
      console.error('Toggle active error:', err);
      showToast('error', err?.message || 'Could not update office status.');
    }
  };

  const handleDeleteOffice = async (officeId: string, officeName: string) => {
    if (!confirm(`Are you sure you want to delete "${officeName}"?`)) return;

    try {
      const { error } = await supabase.from('offices').delete().eq('id', officeId);
      if (error) throw error;

      if (onOfficesChange) {
        onOfficesChange(offices.filter((o) => o.id !== officeId));
      }

      showToast('success', `Office "${officeName}" deleted.`);
      onRefresh();
    } catch (err: any) {
      console.error('Delete office error:', err);
      showToast('error', err?.message || 'Could not delete office.');
    }
  };

  // Report status update handler inside office view
  const handleOpenActionModal = (report: CivicReport, action: ReportStatus) => {
    setActionModal({ report, action });
    const normalizedPriority: ReportPriority =
      (report.priority as any) === 'urgent' ? 'high' : report.priority || 'medium';
    setActionPriority(normalizedPriority);
    if (action === 'approved') {
      setAdminNoteInput('Report verified and dispatched to field workers.');
    } else if (action === 'in_progress') {
      setAdminNoteInput('Municipal personnel deployed on-site.');
    } else if (action === 'resolved') {
      setAdminNoteInput('Issue has been resolved and verified by municipal inspectors.');
    } else {
      setAdminNoteInput('');
    }
  };

  const handleExecuteStatusUpdate = async () => {
    if (!actionModal) return;
    const { report, action } = actionModal;

    setSubmittingAction(true);
    try {
      const nowIso = new Date().toISOString();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validAdminUserId =
        adminUser?.id && uuidRegex.test(adminUser.id) ? adminUser.id : null;
      const isSupabaseReport = report.id && uuidRegex.test(report.id);

      const updatedFields: Partial<CivicReport> = {
        status: action,
        priority: actionPriority,
        admin_notes: adminNoteInput.trim() || undefined,
        reviewed_by: validAdminUserId || undefined,
        reviewed_at: nowIso,
        updated_at: nowIso,
      };

      if (isSupabaseReport) {
        const { error } = await supabase
          .from('reports')
          .update({
            status: action,
            priority: actionPriority,
            admin_notes: adminNoteInput.trim() || null,
            reviewed_by: validAdminUserId,
            reviewed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', report.id);

        if (error) throw error;
      }

      if (onReportsChange) {
        onReportsChange(
          reports.map((r) => (r.id === report.id ? { ...r, ...updatedFields } : r))
        );
      }

      if (selectedReportDetail?.id === report.id) {
        setSelectedReportDetail({ ...selectedReportDetail, ...updatedFields });
      }

      showToast('success', `Report "${report.title}" updated.`);
      setActionModal(null);
      onRefresh();
    } catch (err: any) {
      console.error('Status update error:', err);
      showToast('error', err?.message || 'Could not update report status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered offices for main directory
  const allTypes = Array.from(new Set(['All Types', ...offices.map((o) => o.office_type)]));

  const filteredOffices = offices.filter((o) => {
    const matchesType = selectedType === 'All Types' ? true : o.office_type === selectedType;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === ''
        ? true
        : o.name.toLowerCase().includes(term) ||
          (o.code && o.code.toLowerCase().includes(term)) ||
          o.office_type.toLowerCase().includes(term) ||
          (o.purpose && o.purpose.toLowerCase().includes(term));

    return matchesType && matchesSearch;
  });

  // Separate High-Problem Offices from Other Offices
  const highProblemOffices = filteredOffices
    .filter((o) => {
      const stats = officeStatsMap[o.id];
      return stats && stats.activeProblems > 0;
    })
    .sort((a, b) => {
      const pA = officeStatsMap[a.id]?.activeProblems || 0;
      const pB = officeStatsMap[b.id]?.activeProblems || 0;
      return pB - pA;
    });

  const standardOffices = filteredOffices.filter((o) => {
    const stats = officeStatsMap[o.id];
    return !stats || stats.activeProblems === 0;
  });

  // Render a Single Sleek, Modern Card (NO description, ultra-clean design)
  const renderOfficeCard = (office: MunicipalOffice, isHighProblem = false) => {
    const isActive = office.is_active !== false;
    const stats = officeStatsMap[office.id] || {
      total: 0,
      resolved: 0,
      approved: 0,
      inProgress: 0,
      pending: 0,
      rejected: 0,
      activeProblems: 0,
      rate: 0,
    };

    return (
      <div
        key={office.id}
        className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group ${
          isHighProblem
            ? 'border-amber-200/90 ring-1 ring-amber-300/40 hover:border-amber-400'
            : isActive
            ? 'border-slate-200/90 hover:border-blue-400'
            : 'border-slate-200 bg-slate-50/70 opacity-75'
        }`}
      >
        {/* Optional Banner Image */}
        {office.banner_url ? (
          <div className="relative h-28 w-full overflow-hidden bg-slate-900">
            <img
              src={office.banner_url}
              alt={office.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              {office.code && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm">
                  {office.code}
                </span>
              )}
              {isHighProblem && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white shadow-sm flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {stats.activeProblems} Active
                </span>
              )}
            </div>

            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/10">
              <button
                onClick={() => handleToggleActive(office)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'text-emerald-400 hover:bg-white/20' : 'text-slate-400 hover:bg-white/20'
                }`}
                title={isActive ? 'Active (Click to disable)' : 'Disabled (Click to activate)'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleOpenEditModal(office)}
                className="p-1.5 text-white/80 hover:text-blue-300 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title="Edit Office Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteOffice(office.id, office.name)}
                className="p-1.5 text-white/80 hover:text-red-300 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title="Delete Office"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Top Toolbar when No Banner */
          <div className="p-3.5 pb-2 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center font-bold">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              {office.code && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                  {office.code}
                </span>
              )}
              {isHighProblem && (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-red-600 text-white shadow-xs flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  {stats.activeProblems} Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleToggleActive(office)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-200'
                }`}
                title={isActive ? 'Active (Click to disable)' : 'Disabled (Click to activate)'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleOpenEditModal(office)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Office Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteOffice(office.id, office.name)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Office"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-full">
              {office.office_type}
            </span>

            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
              {office.name}
            </h3>
          </div>

          {/* REPORT COUNTER & RESOLUTION STATS STRIP */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-500 uppercase tracking-tight">Allocated Reports</span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-black">
                {stats.total} Total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="flex items-center gap-1 text-emerald-700 font-extrabold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{stats.resolved} Resolved</span>
              </div>

              <div className="flex items-center gap-1 text-amber-700 font-extrabold justify-end">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{stats.activeProblems} Active</span>
              </div>
            </div>

            {/* Resolution Progress Bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>

          {/* Contact Info & Button to Dedicated Office Reports Page */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10.5px] text-slate-600 font-medium">
              <div className="flex items-center gap-1 truncate">
                <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">{office.contact_number || 'No hotline'}</span>
              </div>

              {office.email && (
                <div className="flex items-center gap-1 truncate text-slate-400">
                  <Mail className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{office.email}</span>
                </div>
              )}
            </div>

            {/* View Office Reports Action Button */}
            <button
              onClick={() => setSelectedOfficeForReports(office)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group/btn active:scale-[0.98]"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>View Office Reports ({stats.total})</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // DEDICATED OFFICE REPORTS DRILL-DOWN PAGE
  // =========================================================================
  if (selectedOfficeForReports) {
    const office = selectedOfficeForReports;
    const stats = officeStatsMap[office.id] || {
      total: 0,
      resolved: 0,
      approved: 0,
      inProgress: 0,
      pending: 0,
      rejected: 0,
      activeProblems: 0,
      rate: 0,
    };

    const officeReports = reports.filter((r) => isReportForOffice(r, office));

    const filteredDedicatedReports = officeReports.filter((r) => {
      const matchesStatus =
        officeReportsStatusFilter === 'all' ? true : r.status === officeReportsStatusFilter;
      const term = officeReportsSearch.trim().toLowerCase();
      const matchesSearch =
        term === ''
          ? true
          : r.title?.toLowerCase().includes(term) ||
            r.description?.toLowerCase().includes(term) ||
            r.resident_name?.toLowerCase().includes(term) ||
            r.barangay?.toLowerCase().includes(term) ||
            r.address?.toLowerCase().includes(term) ||
            r.id?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });

    return (
      <div className="space-y-5 sm:space-y-6 animate-fade-in">
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`fixed top-4 right-4 sm:top-5 sm:right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-slide-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Back Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedOfficeForReports(null)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Offices
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => handleOpenEditModal(office)}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Office Info</span>
            </button>
          </div>
        </div>

        {/* Office Hero Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {office.banner_url ? (
            <div className="relative h-36 sm:h-48 w-full bg-slate-900 overflow-hidden">
              <img
                src={office.banner_url}
                alt={office.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
                <div className="flex items-center gap-2 mb-1">
                  {office.code && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] sm:text-[10px] font-black bg-white/90 text-slate-900 backdrop-blur-md">
                      {office.code}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold uppercase bg-blue-600 text-white tracking-wider">
                    {office.office_type}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white">{office.name}</h1>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white">
              <div className="flex items-center gap-2 mb-2">
                {office.code && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white/20 text-white backdrop-blur-md">
                    {office.code}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 text-white tracking-wider">
                  {office.office_type}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black">{office.name}</h1>
            </div>
          )}

          {/* Office Metadata Strip */}
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-slate-100 bg-slate-50/50 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Office Purpose & Scope
              </span>
              <p className="text-slate-700 font-medium mt-0.5">
                {office.purpose || 'Receives citizen requests and resolves municipal issues.'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hotline / Contact
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-bold">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                {office.contact_number || 'Not specified'}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-bold">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                {office.email || 'Not specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Office Reports Analytics Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Reports</span>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-amber-200/80 bg-amber-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Pending</span>
            <p className="text-base sm:text-lg font-black text-amber-600 mt-0.5">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-blue-200/80 bg-blue-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Approved</span>
            <p className="text-base sm:text-lg font-black text-blue-600 mt-0.5">{stats.approved}</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-indigo-200/80 bg-indigo-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-indigo-700 uppercase">In Progress</span>
            <p className="text-base sm:text-lg font-black text-indigo-600 mt-0.5">{stats.inProgress}</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
            <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">{stats.resolved}</p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Resolution Rate</span>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{stats.rate}%</p>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {(['all', 'pending', 'approved', 'in_progress', 'resolved', 'rejected'] as const).map(
              (st) => {
                const count =
                  st === 'all'
                    ? stats.total
                    : st === 'pending'
                    ? stats.pending
                    : st === 'approved'
                    ? stats.approved
                    : st === 'in_progress'
                    ? stats.inProgress
                    : st === 'resolved'
                    ? stats.resolved
                    : stats.rejected;

                const isActive = officeReportsStatusFilter === st;

                return (
                  <button
                    key={st}
                    onClick={() => setOfficeReportsStatusFilter(st)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'all'
                      ? 'All'
                      : st === 'in_progress'
                      ? 'In Progress'
                      : st.charAt(0).toUpperCase() + st.slice(1)}{' '}
                    ({count})
                  </button>
                );
              }
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports..."
              value={officeReportsSearch}
              onChange={(e) => setOfficeReportsSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Reports Dedicated List */}
        {filteredDedicatedReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-12 border border-slate-200 text-center flex flex-col items-center justify-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-3">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Reports in this Category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Citizen reports submitted for {office.name} will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredDedicatedReports.map((report) => {
              const isResolved = report.status === 'resolved';
              const isPending = report.status === 'pending';
              const isApproved = report.status === 'approved';
              const isInProg = report.status === 'in_progress';
              const isRejected = report.status === 'rejected';

              const statusBg = isResolved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isApproved
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : isInProg
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : isRejected
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

              const normalizedPriority: ReportPriority =
                (report.priority as any) === 'urgent' ? 'high' : report.priority || 'medium';
              const priorityCfg = PRIORITY_CONFIG[normalizedPriority] || PRIORITY_CONFIG.medium;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-blue-400 transition-all gap-3"
                >
                  <div className="space-y-2">
                    {/* Header: Status + Priority + Date */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border uppercase ${statusBg}`}>
                          {report.status.replace('_', ' ')}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black border flex items-center gap-1 ${priorityCfg.bg}`}>
                          <span>{priorityCfg.icon}</span>
                          <span>{priorityCfg.label}</span>
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    {/* Image & Title */}
                    <div className="flex items-start gap-3">
                      {(() => {
                        const reportImages = parseReportImages(report.image_url);
                        if (reportImages.length > 0) {
                          return (
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                              <img
                                src={reportImages[0]}
                                alt={report.title}
                                onClick={() => setPreviewImage(reportImages[0] || null)}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              />
                              {reportImages.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-black px-1 rounded">
                                  +{reportImages.length - 1}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                            <Building2 className="w-5 h-5" />
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {report.title}
                        </h4>
                        {report.latitude != null && report.longitude != null ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setMapModalReport(report)}
                              className="flex items-center gap-1 text-blue-700 hover:underline cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                              title="Click to view exact location on Map"
                            >
                              <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                              <span>{Number(report.latitude).toFixed(5)}°N, {Number(report.longitude).toFixed(5)}°E</span>
                              <span className="text-[10px] text-blue-600 underline ml-0.5 font-extrabold">View Map</span>
                            </button>
                            {report.barangay && <span className="text-slate-400 font-normal">• Brgy. {report.barangay}</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-red-600 font-bold mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">Brgy. {report.barangay}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11.5px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg">
                      {report.description}
                    </p>

                    {/* Resident Submitter */}
                    <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        {report.resident_name || 'Resident'}
                      </span>
                      {report.resident_phone && (
                        <span>• {report.resident_phone}</span>
                      )}
                    </div>

                    {/* Admin Feedback Notes */}
                    {report.admin_notes && (
                      <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 text-[10.5px] text-amber-800">
                        <span className="font-bold block">City Hall Note:</span>
                        {report.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedReportDetail(report)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>

                    <div className="flex items-center gap-1">
                      {isPending && (
                        <button
                          onClick={() => handleOpenActionModal(report, 'approved')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleOpenActionModal(report, 'in_progress')}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          Mark Progress
                        </button>
                      )}

                      {(isApproved || isInProg) && (
                        <button
                          onClick={() => handleOpenActionModal(report, 'resolved')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Modal for Status Updates */}
        {actionModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl animate-scale-up space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">
                  Update Status: {actionModal.action.toUpperCase()}
                </h3>
                <button
                  onClick={() => setActionModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Set Priority in In-Office Action Modal (High, Normal, Minimal) */}
              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1.5">
                  Set Urgency & Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map((pr) => {
                    const cfg = PRIORITY_CONFIG[pr];
                    const isSel = actionPriority === pr;
                    return (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => setActionPriority(pr)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSel
                            ? `${cfg.bg} ring-2 ring-blue-500 font-black shadow-xs`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">{cfg.icon}</span>
                        <span className="text-[10.5px] block leading-tight font-bold">
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Administrator Notes / Instructions
                </label>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Enter dispatch notes or inspection result..."
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteStatusUpdate}
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Update
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Interactive Coordinates Map Modal (Large & Immersive) */}
        {mapModalReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
            <div className="bg-white rounded-2xl md:rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl border border-slate-200/80 overflow-hidden animate-scale-up flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-xs shrink-0">
                    <MapPin className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Department Incident Map Pin
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                        {mapModalReport.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                      <span className="font-mono font-bold text-slate-700">
                        {Number(mapModalReport.latitude).toFixed(6)}°N, {Number(mapModalReport.longitude).toFixed(6)}°E
                      </span>
                      {mapModalReport.barangay && (
                        <span className="text-slate-500">• Brgy. {mapModalReport.barangay}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${mapModalReport.latitude}, ${mapModalReport.longitude}`);
                      showToast('success', 'GPS Coordinates copied to clipboard!');
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer"
                    title="Copy Latitude & Longitude"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy GPS</span>
                  </button>

                  <button
                    onClick={() => setMapModalReport(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                    title="Close Map"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Incident Overview Bar + Big Map Canvas */}
              <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3 min-h-0 bg-slate-100/50">
                {/* Incident Header Strip */}
                <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {mapModalReport.image_url && (
                      <img
                        src={parseReportImages(mapModalReport.image_url)[0]}
                        alt={mapModalReport.title}
                        onClick={() => setPreviewImage(parseReportImages(mapModalReport.image_url)[0] || null)}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                        title="Click to view full photo"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {mapModalReport.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {mapModalReport.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                    <div className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Office: {mapModalReport.office_name || mapModalReport.category}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-800">{mapModalReport.resident_name || 'Resident'}</span>
                    </div>
                  </div>
                </div>

                {/* Huge Interactive OpenStreetMap / Vector Map Canvas */}
                <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-300 relative bg-slate-200 shadow-md">
                  <iframe
                    title="Incident Location Map"
                    width="100%"
                    height="100%"
                    className="w-full h-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(mapModalReport.longitude) - 0.007}%2C${Number(mapModalReport.latitude) - 0.005}%2C${Number(mapModalReport.longitude) + 0.007}%2C${Number(mapModalReport.latitude) + 0.005}&layer=mapnik&marker=${mapModalReport.latitude}%2C${mapModalReport.longitude}`}
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapModalReport.latitude},${mapModalReport.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-102"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={`https://www.openstreetmap.org/?mlat=${mapModalReport.latitude}&mlon=${mapModalReport.longitude}#map=17/${mapModalReport.latitude}/${mapModalReport.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-102"
                    >
                      <span>Open in OpenStreetMap</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMapModalReport(null)}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Close Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Image Preview */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-2xl w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
              <img
                src={previewImage}
                alt="Report Full Photo"
                className="w-full h-full object-contain max-h-[80vh]"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN OFFICES DIRECTORY VIEW WITH HIGH-PROBLEM SEPARATOR
  // =========================================================================
  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 sm:top-5 sm:right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-slide-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 text-white tracking-wider backdrop-blur-md">
              Department Routing & Reports
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Municipal Offices & Report Allocation
          </h1>
          <p className="text-xs text-blue-100 font-medium leading-relaxed">
            Monitor active department case loads, track resolution rates, and inspect dedicated reports for each municipal office.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 w-full md:w-auto">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh Offices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-700" />
            Add Municipal Office
          </button>
        </div>

        {/* Decorative Background Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap gap-1 sm:gap-1.5 w-full sm:w-auto">
          {allTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search offices, code, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Offices Main Content */}
      {loading && offices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 sm:p-16 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-700">Loading municipal offices...</p>
        </div>
      ) : filteredOffices.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Offices Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No municipal offices match your active filter or search term.
          </p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* SECTION 1: HIGH-PROBLEM / HIGH-ATTENTION OFFICES */}
          {highProblemOffices.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 border border-amber-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                      🔥 High-Attention Departments (Active Citizen Problems)
                    </h2>
                    <p className="text-[10.5px] text-slate-600 font-medium hidden sm:block">
                      Offices with pending or in-progress issues requiring municipal action
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white shadow-xs">
                  {highProblemOffices.length} Departments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
                {highProblemOffices.map((office) => renderOfficeCard(office, true))}
              </div>
            </div>
          )}

          {/* SECTION 2: SEPARATOR & OTHER MUNICIPAL OFFICES */}
          {standardOffices.length > 0 && (
            <div className="space-y-3.5">
              {highProblemOffices.length > 0 && (
                <div className="relative flex items-center justify-center my-4 sm:my-6">
                  <div className="border-t border-slate-200 w-full absolute" />
                  <div className="relative bg-slate-50 px-3.5 py-1 rounded-full border border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Other Municipal Offices & Departments</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
                {standardOffices.map((office) => renderOfficeCard(office, false))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Office Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up my-8">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {editingOffice ? 'Edit Municipal Office' : 'Create New Municipal Office'}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Configure office details, report dispatch category & optional banner
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffice} className="p-4 sm:p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Optional Office Banner Image Upload */}
              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Office Banner Image (Optional)
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-normal">Cloudinary Powered</span>
                </label>

                {formBannerUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-900 h-32">
                    <img
                      src={formBannerUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingBanner}
                        className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Replace Image
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
                  >
                    {uploadingBanner ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <span className="text-slate-600 font-bold text-xs">Uploading to Cloudinary...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-slate-800 font-bold text-xs">
                          Click to upload office banner image
                        </span>
                        <span className="text-slate-400 text-[10.5px]">
                          PNG, JPG, WEBP up to 10MB (Stored on Cloudinary)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileUpload}
                  className="hidden"
                />
              </div>

              {/* Office Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Official Office Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. City Engineering Office"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Office Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. CEO, ENRO"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Office Type / Category */}
              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Report Routing Category / Type *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                >
                  {DEFAULT_OFFICE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Category...</option>
                </select>

                {formType === 'Custom' && (
                  <input
                    type="text"
                    required
                    value={formCustomType}
                    onChange={(e) => setFormCustomType(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="w-full mt-2 p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Purpose & Description (for admin reference in modal) */}
              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Office Mandate & Scope
                </label>
                <textarea
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="Describe types of issues handled..."
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Hotline & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Emergency Hotline / Tel
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. (087) 388-3140"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. ceo@mati.gov.ph"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="officeIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="officeIsActive"
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Active Office (Available in citizen mobile apps and report routing)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || uploadingBanner}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingOffice ? 'Save Changes' : 'Create Office'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
