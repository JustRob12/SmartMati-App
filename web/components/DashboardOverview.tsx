'use client';

import React from 'react';
import { ResidentProfile, CivicReport } from '../types/admin';
import {
  Users,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  Building,
  Building2,
  Shield,
  ArrowUpRight,
  UserCheck,
  FileCheck2,
  MapPin,
} from 'lucide-react';

interface DashboardOverviewProps {
  residents: ResidentProfile[];
  officesCount: number;
  reports?: CivicReport[];
  onNavigateToApproveMembers: () => void;
  onNavigateToApproveReports: () => void;
  onNavigateToOffices: () => void;
  onNavigateToMap?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  residents,
  officesCount,
  reports = [],
  onNavigateToApproveMembers,
  onNavigateToApproveReports,
  onNavigateToOffices,
  onNavigateToMap,
}) => {
  const totalResidents = residents.length;
  const pendingVerifications = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'pending'
  ).length;
  const approvedMembers = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'approved'
  ).length;

  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const approvedReports = reports.filter((r) => r.status === 'approved' || r.status === 'in_progress' || r.status === 'resolved').length;

  const recentPendingResidents = residents
    .filter((r) => (r.verification_status || '').toLowerCase() === 'pending')
    .slice(0, 4);

  const recentPendingReports = reports
    .filter((r) => r.status === 'pending')
    .slice(0, 4);

  return (
    <div className="space-y-5 w-full">
      {/* Top Clean White Banner */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-300 rounded-full text-amber-800 text-[11px] font-bold mb-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>City Government of Mati</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Executive Governance Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
            Real-time monitoring of resident verifications, public community reports, and municipal urban services across all 26 barangays in Mati City.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Live Map ({reports.length})</span>
            </button>
          )}

          <button
            onClick={onNavigateToApproveMembers}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Verifications ({pendingVerifications})</span>
          </button>

          <button
            onClick={onNavigateToApproveReports}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Reports ({pendingReports})</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Residents */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Residents
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalResidents}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold mt-2.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{approvedMembers} Verified Citizens</span>
          </div>
        </div>

        {/* Card 2: Pending Verifications */}
        <div
          onClick={onNavigateToApproveMembers}
          className="bg-white rounded-2xl p-4.5 border border-amber-300 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all bg-gradient-to-br from-amber-50/40 to-white cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Pending Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-200">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {pendingVerifications}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold mt-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Awaiting Verification</span>
          </div>
        </div>

        {/* Card 3: Community Reports */}
        <div
          onClick={onNavigateToApproveReports}
          className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Citizen Reports
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {reports.length}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-2.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{pendingReports} Pending Dispatch</span>
          </div>
        </div>

        {/* Card 4: Municipal Offices */}
        <div
          onClick={onNavigateToOffices}
          className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Municipal Offices
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{officesCount}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold mt-2.5">
            <span>5 Dispatch Categories</span>
          </div>
        </div>
      </div>

      {/* Grid: Pending Reports & Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Reports Queue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Incoming Citizen Reports</span>
                {pendingReports > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {pendingReports} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Civic issues awaiting review and department dispatch
              </p>
            </div>
            <button
              onClick={onNavigateToApproveReports}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPendingReports.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">
                All Reports Dispatched!
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No civic reports are currently waiting for admin approval.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPendingReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/70 flex items-center justify-between transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {rep.image_url ? (
                      <img
                        src={rep.image_url}
                        alt={rep.title}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {rep.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>Brgy. {rep.barangay} • By {rep.resident_name}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onNavigateToApproveReports}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Resident Verifications Queue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Pending Resident Verifications</span>
                {pendingVerifications > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {pendingVerifications}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Citizen profiles awaiting LGU ID validation
              </p>
            </div>
            <button
              onClick={onNavigateToApproveMembers}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPendingResidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">
                All Verifications Cleared!
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No resident verification requests pending right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPendingResidents.map((res) => (
                <div
                  key={res.id}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/70 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {res.avatar_url ? (
                      <img
                        src={res.avatar_url}
                        alt={res.full_name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                        {res.full_name ? res.full_name.charAt(0) : 'R'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {res.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Brgy. {res.barangay || 'Central'} • {res.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onNavigateToApproveMembers}
                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
