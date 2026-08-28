'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CivicReport, ReportStatus, ReportPriority, MunicipalOffice } from '../types/admin';
import {
  FileCheck2,
  Search,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  Eye,
  Check,
  X,
  Trash2,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Maximize2,
  RotateCcw,
  Flame,
  ArrowRightLeft,
  AlertOctagon,
  ArrowUpDown,
  Copy,
  CheckCheck,
} from 'lucide-react';

interface ApproveReportsViewProps {
  reports: CivicReport[];
  loading: boolean;
  onRefresh: () => void;
  onReportsChange?: (reports: CivicReport[]) => void;
  adminUser?: any;
  offices?: MunicipalOffice[];
}

export const PRIORITY_CONFIG: Record<
  ReportPriority,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  high: {
    label: 'High Priority',
    bg: 'bg-red-50 text-red-700 border-red-300',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: '🔴',
  },
  medium: {
    label: 'Normal',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: '🟡',
  },
  low: {
    label: 'Minimal',
    bg: 'bg-lime-50 text-lime-800 border-lime-300',
    text: 'text-lime-800',
    border: 'border-lime-300',
    icon: '🟢',
  },
};

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

export const ApproveReportsView: React.FC<ApproveReportsViewProps> = ({
  reports,
  loading,
  onRefresh,
  onReportsChange,
  adminUser,
  offices = [],
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'all' | ReportStatus>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

  // Status Action Modal State
  const [actionModal, setActionModal] = useState<{
    report: CivicReport;
    action: ReportStatus;
  } | null>(null);
  const [actionPriority, setActionPriority] = useState<ReportPriority>('medium');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Reassignment Modal State
  const [reassignModal, setReassignModal] = useState<CivicReport | null>(null);
  const [targetOfficeName, setTargetOfficeName] = useState<string>('');
  const [reassignNote, setReassignNote] = useState<string>('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Map Modal State
  const [mapModalReport, setMapModalReport] = useState<CivicReport | null>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Status Counts
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const approvedCount = reports.filter((r) => r.status === 'approved').length;
  const inProgressCount = reports.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const rejectedCount = reports.filter((r) => r.status === 'rejected').length;
  const highPriorityCount = reports.filter(
    (r) => r.priority === 'high' || (r.priority as any) === 'urgent'
  ).length;

  // Categories available in existing reports
  const allCategories = Array.from(
    new Set(['All', ...reports.map((r) => r.category).filter(Boolean)])
  );

  // Filtered & Sorted Reports (High Priority first)
  const filteredReports = reports
    .filter((r) => {
      const matchesStatus =
        selectedStatus === 'all' ? true : r.status === selectedStatus;
      const matchesCategory =
        selectedCategory === 'All' ? true : r.category === selectedCategory;
      const reportPriority =
        (r.priority as any) === 'urgent' ? 'high' : r.priority || 'medium';
      const matchesPriority =
        selectedPriority === 'All' ? true : reportPriority === selectedPriority;

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term === ''
          ? true
          : r.title?.toLowerCase().includes(term) ||
            r.description?.toLowerCase().includes(term) ||
            r.resident_name?.toLowerCase().includes(term) ||
            r.barangay?.toLowerCase().includes(term) ||
            r.office_name?.toLowerCase().includes(term) ||
            r.id?.toLowerCase().includes(term) ||
            r.resident_email?.toLowerCase().includes(term) ||
            r.resident_phone?.includes(term) ||
            r.address?.toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      // Prioritize high priority reports
      const priorityOrder: Record<string, number> = {
        urgent: 3,
        high: 3,
        medium: 2,
        low: 1,
      };
      const pA = priorityOrder[a.priority || 'medium'] || 2;
      const pB = priorityOrder[b.priority || 'medium'] || 2;
      return pB - pA;
    });

  const handleOpenActionModal = (report: CivicReport, action: ReportStatus) => {
    setActionModal({ report, action });
    const normalizedPriority: ReportPriority =
      (report.priority as any) === 'urgent' ? 'high' : report.priority || 'medium';
    setActionPriority(normalizedPriority);
    if (action === 'approved') {
      setAdminNoteInput(
        `Approved and dispatched to ${report.office_name || 'the responsible municipal office'} for resolution.`
      );
    } else if (action === 'rejected') {
      setAdminNoteInput('Report could not be processed. Please provide clearer details or verify location.');
    } else if (action === 'in_progress') {
      setAdminNoteInput('Field personnel have been dispatched to inspect and resolve.');
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

      // Optimistic update
      if (onReportsChange) {
        onReportsChange(
          reports.map((r) => (r.id === report.id ? { ...r, ...updatedFields } : r))
        );
      }

      if (selectedReport?.id === report.id) {
        setSelectedReport({ ...selectedReport, ...updatedFields });
      }

      const actionText =
        action === 'approved'
          ? 'Approved & Dispatched'
          : action === 'rejected'
          ? 'Rejected'
          : action === 'in_progress'
          ? 'Marked In Progress'
          : action === 'resolved'
          ? 'Marked Resolved'
          : 'Status Updated';

      showToast('success', `Report "${report.title}" updated.`);
      setActionModal(null);
      onRefresh();
    } catch (err: any) {
      console.error('Report status update failure:', err);
      showToast('error', err?.message || 'Could not update report status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Quick Priority Change directly
  const handleQuickChangePriority = async (report: CivicReport, newPriority: ReportPriority) => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(report.id)) {
        const { error } = await supabase
          .from('reports')
          .update({ priority: newPriority, updated_at: new Date().toISOString() })
          .eq('id', report.id);
        if (error) throw error;
      }

      if (onReportsChange) {
        onReportsChange(
          reports.map((r) => (r.id === report.id ? { ...r, priority: newPriority } : r))
        );
      }

      if (selectedReport?.id === report.id) {
        setSelectedReport({ ...selectedReport, priority: newPriority });
      }

      showToast('success', `Priority set to ${PRIORITY_CONFIG[newPriority].label}.`);
    } catch (err: any) {
      console.error('Change priority error:', err);
      showToast('error', err?.message || 'Could not change priority.');
    }
  };

  // Reassignment Execution
  const handleOpenReassignModal = (report: CivicReport) => {
    setReassignModal(report);
    setTargetOfficeName(report.office_name || (offices.length > 0 ? offices[0].name : ''));
    setReassignNote(`Reassigned from ${report.office_name || 'initial department'} for proper jurisdiction.`);
  };

  const handleExecuteReassignment = async () => {
    if (!reassignModal || !targetOfficeName) return;
    const report = reassignModal;

    setSubmittingReassign(true);
    try {
      const nowIso = new Date().toISOString();
      const matchedOffice = offices.find((o) => o.name === targetOfficeName);
      const newCategory = matchedOffice ? matchedOffice.office_type : report.category;
      const newOfficeId = matchedOffice ? matchedOffice.id : report.office_id;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isSupabaseReport = report.id && uuidRegex.test(report.id);

      const updatedFields: Partial<CivicReport> = {
        office_name: targetOfficeName,
        office_id: newOfficeId,
        category: newCategory,
        admin_notes: reassignNote.trim() ? `${report.admin_notes ? report.admin_notes + ' | ' : ''}${reassignNote.trim()}` : report.admin_notes,
        updated_at: nowIso,
      };

      if (isSupabaseReport) {
        const { error } = await supabase
          .from('reports')
          .update({
            office_name: targetOfficeName,
            office_id: newOfficeId && uuidRegex.test(newOfficeId) ? newOfficeId : null,
            category: newCategory,
            admin_notes: updatedFields.admin_notes || null,
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

      if (selectedReport?.id === report.id) {
        setSelectedReport({ ...selectedReport, ...updatedFields });
      }

      showToast('success', `Report successfully reassigned to ${targetOfficeName}.`);
      setReassignModal(null);
      onRefresh();
    } catch (err: any) {
      console.error('Reassignment error:', err);
      showToast('error', err?.message || 'Could not reassign report.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleDeleteReport = async (reportId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the report "${title}"?`)) return;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(reportId)) {
        const { error } = await supabase.from('reports').delete().eq('id', reportId);
        if (error) throw error;
      }

      if (onReportsChange) {
        onReportsChange(reports.filter((r) => r.id !== reportId));
      }

      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }

      showToast('success', `Report "${title}" removed.`);
      onRefresh();
    } catch (err: any) {
      console.error('Delete report error:', err);
      showToast('error', err?.message || 'Could not delete report.');
    }
  };

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
              Mati City Hall • Civic Dispatch Center
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Civic Reports Verification & Dispatch
          </h1>
          <p className="text-xs text-blue-100 font-medium leading-relaxed">
            Review incoming public reports, assign priority urgency, route to municipal offices, and broadcast status updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 w-full md:w-auto">
          <button
            onClick={onRefresh}
            className="w-full md:w-auto p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="md:hidden text-xs">Refresh Reports</span>
          </button>
        </div>

        {/* Decorative Background Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
      </div>

      {/* Analytics Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Reports</span>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-1">{reports.length}</p>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-amber-200/80 bg-amber-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Pending Review</span>
          <p className="text-base sm:text-lg font-black text-amber-600 mt-1">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-red-200/80 bg-red-50/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase">High Priority</span>
            <span className="text-xs">🔴</span>
          </div>
          <p className="text-base sm:text-lg font-black text-red-600 mt-1">{highPriorityCount}</p>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-blue-200/80 bg-blue-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase">Approved</span>
          <p className="text-base sm:text-lg font-black text-blue-600 mt-1">{approvedCount}</p>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-indigo-200/80 bg-indigo-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase">In Progress</span>
          <p className="text-base sm:text-lg font-black text-indigo-600 mt-1">{inProgressCount}</p>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-emerald-200/80 bg-emerald-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
          <p className="text-base sm:text-lg font-black text-emerald-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {(['all', 'pending', 'approved', 'in_progress', 'resolved', 'rejected'] as const).map((st) => {
              const count =
                st === 'all'
                  ? reports.length
                  : st === 'pending'
                  ? pendingCount
                  : st === 'approved'
                  ? approvedCount
                  : st === 'in_progress'
                  ? inProgressCount
                  : st === 'resolved'
                  ? resolvedCount
                  : rejectedCount;

              const isActive = selectedStatus === st;

              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/80'
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
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports, resident, purok..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Priority & Category Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Filters:</span>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Normal</option>
              <option value="low">🟢 Minimal (Yellow-Green)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate cursor-pointer"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading && reports.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 sm:p-16 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-700">Loading civic reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Reports Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No citizen reports match your selected status, priority, or search term.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {filteredReports.map((report) => {
            const isResolved = report.status === 'resolved';
            const isPending = report.status === 'pending';
            const isApproved = report.status === 'approved';
            const isInProgress = report.status === 'in_progress';
            const isRejected = report.status === 'rejected';

            const statusBg = isResolved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isApproved
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isInProgress
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : isRejected
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

            const normalizedPriority: ReportPriority =
              (report.priority as any) === 'urgent' ? 'high' : report.priority || 'medium';
            const priorityBadge = PRIORITY_CONFIG[normalizedPriority] || PRIORITY_CONFIG.medium;

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-blue-400 transition-all flex flex-col lg:flex-row items-start justify-between gap-4 sm:gap-5"
              >
                {/* Left Column: Image + Core Info */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                  {(() => {
                    const reportImages = parseReportImages(report.image_url);
                    if (reportImages.length > 0) {
                      return (
                        <div
                          onClick={() => setPreviewImage(reportImages[0])}
                          className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 cursor-zoom-in group shadow-xs"
                        >
                          <img
                            src={reportImages[0]}
                            alt={report.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {reportImages.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                              +{reportImages.length - 1}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 text-slate-400 gap-1">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[9px] font-bold">No Photo</span>
                      </div>
                    );
                  })()}

                  <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                    {/* Status & Priority Badge Row */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-black border uppercase tracking-wider ${statusBg}`}>
                        {report.status.replace('_', ' ')}
                      </span>

                      {/* Urgency Priority Pill */}
                      <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-black border flex items-center gap-1 ${priorityBadge.bg}`}>
                        <span>{priorityBadge.icon}</span>
                        <span>{priorityBadge.label}</span>
                      </span>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {report.created_at
                          ? new Date(report.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    {/* Report Title */}
                    <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-snug">
                      {report.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>

                    {/* Location & Routing Details with Clickable Coordinates */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-[11px] sm:text-xs text-slate-500 pt-0.5">
                      {/* GPS Coordinates Badge (Click to open Map Modal) */}
                      {report.latitude != null && report.longitude != null ? (
                        <button
                          type="button"
                          onClick={() => setMapModalReport(report)}
                          className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-all cursor-pointer shadow-2xs group"
                          title="Click to view exact location pin on map"
                        >
                          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>{Number(report.latitude).toFixed(5)}°N, {Number(report.longitude).toFixed(5)}°E</span>
                          <span className="text-[10px] text-blue-600 font-extrabold underline ml-0.5">View Map</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Brgy. {report.barangay}</span>
                        </div>
                      )}

                      {/* Barangay Tag */}
                      {report.barangay && report.latitude != null && (
                        <div className="flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <span>Brgy. {report.barangay}</span>
                        </div>
                      )}

                      {/* Assigned Office */}
                      <div className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 truncate max-w-full">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">Office: {report.office_name || report.category}</span>
                      </div>
                    </div>

                    {/* Resident Info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] sm:text-[11px] text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-800">{report.resident_name || 'Resident'}</span>
                      </div>

                      {report.resident_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{report.resident_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Feedback Notes */}
                    {report.admin_notes && (
                      <div className="p-2 sm:p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed mt-1.5">
                        <span className="font-bold block text-[10px] text-amber-900 uppercase">
                          City Hall Feedback Note:
                        </span>
                        {report.admin_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Priority Picker, Reassign, & Status Actions */}
                <div className="flex flex-row flex-wrap lg:flex-col items-stretch gap-1.5 sm:gap-2 shrink-0 w-full lg:w-48 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {/* Quick Priority Dropdown */}
                  <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200 text-[10.5px] flex-1 lg:flex-none min-w-[140px]">
                    <span className="text-slate-500 font-bold px-1.5">Priority:</span>
                    <select
                      value={normalizedPriority}
                      onChange={(e) =>
                        handleQuickChangePriority(report, e.target.value as ReportPriority)
                      }
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Normal</option>
                      <option value="low">🟢 Minimal</option>
                    </select>
                  </div>

                  {/* Reassign Department Button */}
                  <button
                    onClick={() => handleOpenReassignModal(report)}
                    className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 flex-1 lg:flex-none"
                    title="Reassign to another department"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reassign</span>
                  </button>

                  {/* Workflow Action Buttons */}
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleOpenActionModal(report, 'approved')}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer flex-1 lg:flex-none"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Dispatch</span>
                      </button>

                      <button
                        onClick={() => handleOpenActionModal(report, 'rejected')}
                        className="py-1.5 px-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 lg:flex-none"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {report.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handleOpenActionModal(report, 'in_progress')}
                        className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex-1 lg:flex-none"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Set In Progress</span>
                      </button>

                      <button
                        onClick={() => handleOpenActionModal(report, 'resolved')}
                        className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 lg:flex-none"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    </>
                  )}

                  {report.status === 'in_progress' && (
                    <button
                      onClick={() => handleOpenActionModal(report, 'resolved')}
                      className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-teal-600/20 transition-all cursor-pointer flex-1 lg:flex-none"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}

                  {report.status === 'rejected' && (
                    <button
                      onClick={() => handleOpenActionModal(report, 'approved')}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 lg:flex-none"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Re-Approve</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteReport(report.id, report.title)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-center"
                    title="Delete Report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Approval / Rejection Modal with Priority Selection */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    actionModal.action === 'approved'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : actionModal.action === 'rejected'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {actionModal.action === 'approved' ? (
                    <Check className="w-5 h-5" />
                  ) : actionModal.action === 'rejected' ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 capitalize">
                    {actionModal.action === 'approved'
                      ? 'Approve & Dispatch Report'
                      : actionModal.action === 'rejected'
                      ? 'Reject Report'
                      : actionModal.action === 'resolved'
                      ? 'Mark Issue Resolved'
                      : 'Update Report Status'}
                  </h3>
                  <p className="text-slate-400 text-xs truncate max-w-[240px]">
                    {actionModal.report.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                <p>
                  <strong className="text-slate-900">Reporter:</strong> {actionModal.report.resident_name} (Brgy. {actionModal.report.barangay})
                </p>
                <p>
                  <strong className="text-slate-900">Target Office:</strong> {actionModal.report.office_name || actionModal.report.category}
                </p>
              </div>

              {/* Set 3-Tier Priority in Action Modal (High, Normal, Minimal) */}
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
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Admin Feedback / Dispatch Note
                </label>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Enter dispatch assignment, instructions, or rejection explanation for the resident..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteStatusUpdate}
                  disabled={submittingAction}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    actionModal.action === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : actionModal.action === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {submittingAction
                      ? 'Processing...'
                      : actionModal.action === 'approved'
                      ? 'Confirm & Dispatch'
                      : actionModal.action === 'rejected'
                      ? 'Confirm Rejection'
                      : 'Update Status'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Reassign Report Department
                  </h3>
                  <p className="text-slate-400 text-xs truncate max-w-[240px]">
                    {reassignModal.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReassignModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                <p>
                  <strong className="text-slate-900">Current Office:</strong> {reassignModal.office_name || reassignModal.category}
                </p>
                <p>
                  <strong className="text-slate-900">Location:</strong> Brgy. {reassignModal.barangay}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Select New Municipal Department *
                </label>
                <select
                  value={targetOfficeName}
                  onChange={(e) => setTargetOfficeName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {offices.map((off) => (
                    <option key={off.id} value={off.name}>
                      {off.name} ({off.office_type})
                    </option>
                  ))}
                  <option value="City Engineering Office (CEO)">City Engineering Office (CEO)</option>
                  <option value="City ENRO & Health Office">City ENRO & Health Office</option>
                  <option value="CDRRMO / BFP / PNP">CDRRMO / BFP / PNP (Emergencies)</option>
                  <option value="Office of the City Veterinarian">Office of the City Veterinarian</option>
                  <option value="City Mayor's Office / Barangay Hall">City Mayor's Office / Barangay Hall</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                  Reassignment Reason / Transfer Notes
                </label>
                <textarea
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  placeholder="Reason for transferring issue to this department..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteReassignment}
                  disabled={submittingReassign}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingReassign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Transfer</span>
                </button>
              </div>
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
                      Mati City Incident Map Pin
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
                  title="Close Map (Esc)"
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

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={previewImage}
              alt="Report Full Preview"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
