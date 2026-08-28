'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ResidentProfile, VerificationStatus } from '../types/admin';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ApproveMembersViewProps {
  residents: ResidentProfile[];
  loading: boolean;
  onRefresh: () => void;
  onStatusChange?: (residentId: string, newStatus: VerificationStatus) => void;
}

export const ApproveMembersView: React.FC<ApproveMembersViewProps> = ({
  residents,
  loading,
  onRefresh,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [barangayFilter, setBarangayFilter] = useState('All');
  const [selectedResident, setSelectedResident] = useState<ResidentProfile | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleUpdateStatus = async (
    residentId: string,
    newStatus: VerificationStatus,
    residentName: string
  ) => {
    setProcessingId(residentId);
    try {
      // 1. Direct update to Supabase profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: newStatus,
        })
        .eq('id', residentId);

      if (error) {
        console.error('Supabase profiles update error:', error);
        throw error;
      }

      // 2. Also try updating user_verifications if table exists
      try {
        await supabase
          .from('user_verifications')
          .update({ status: newStatus })
          .eq('user_id', residentId);
      } catch (e) {
        // Optional table
      }

      // 3. Immediately notify parent to update local state
      if (onStatusChange) {
        onStatusChange(residentId, newStatus);
      }

      showToast(
        'success',
        newStatus === 'approved'
          ? `Resident "${residentName}" has been successfully approved!`
          : `Resident "${residentName}" verification was rejected.`
      );

      if (selectedResident && selectedResident.id === residentId) {
        setSelectedResident({
          ...selectedResident,
          verification_status: newStatus,
        });
      }

      // 4. Trigger database re-fetch to sync
      onRefresh();
    } catch (err: any) {
      console.error('Status update failed:', err);
      showToast('error', err?.message || 'Could not update resident status in database.');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter list
  const filteredResidents = residents.filter((r) => {
    const status = (r.verification_status || 'unverified').toLowerCase();
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : status === statusFilter;

    const matchesBarangay =
      barangayFilter === 'All'
        ? true
        : (r.barangay || '').toLowerCase() === barangayFilter.toLowerCase();

    const matchesSearch =
      searchTerm.trim() === ''
        ? true
        : (r.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.phone || '').includes(searchTerm) ||
          (r.barangay || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesBarangay && matchesSearch;
  });

  const pendingCount = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'pending'
  ).length;
  const approvedCount = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'approved'
  ).length;
  const rejectedCount = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'rejected'
  ).length;

  return (
    <div className="space-y-5 w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold animate-slide-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-emerald-900/10'
              : 'bg-red-50 text-red-900 border-red-300 shadow-red-900/10'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Clean White Top Header Banner */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-300 rounded-full text-amber-800 text-[11px] font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Mati Resident Registry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Approve Resident Members
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Review resident identity profiles. Approving updates the database and unlocks reporting access for citizens.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-800" />
            <span>Pending Review</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-blue-600 text-white shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved Members</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'approved' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'rejected' ? 'bg-red-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>All Residents ({residents.length})</span>
          </button>
        </div>

        {/* Search & Barangay Selector */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by resident name, email, phone number, or barangay..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="w-full md:w-56 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Barangays (Mati City)</option>
              <option value="Badas">Brgy. Badas</option>
              <option value="Central (Poblacion)">Brgy. Central (Poblacion)</option>
              <option value="Dahican">Brgy. Dahican</option>
              <option value="Danao">Brgy. Danao</option>
              <option value="Dawan">Brgy. Dawan</option>
              <option value="Matiao">Brgy. Matiao</option>
              <option value="Mayo">Brgy. Mayo</option>
              <option value="Sainz">Brgy. Sainz</option>
              <option value="Tagbinonga">Brgy. Tagbinonga</option>
              <option value="Tamisan">Brgy. Tamisan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Residents Table / List */}
      {loading && residents.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-700">Loading resident submissions...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Connecting to City Hall Supabase database</p>
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 border border-slate-200 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
            <UserCheck className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            No Resident Submissions Found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {statusFilter === 'pending'
              ? 'There are currently no resident verification requests waiting for review.'
              : 'No residents matching your active search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Resident</th>
                  <th className="py-3 px-4">Location (Mati)</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidents.map((res) => {
                  const status = (res.verification_status || 'unverified').toLowerCase();
                  const isPending = status === 'pending';
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Resident Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {res.avatar_url ? (
                            <img
                              src={res.avatar_url}
                              alt={res.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                              {res.full_name
                                ? res.full_name.charAt(0).toUpperCase()
                                : 'R'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                              {res.full_name || 'Anonymous Resident'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {res.gender || 'Not specified'} •{' '}
                              {res.birthdate || 'No birthdate'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold">
                            Brgy. {res.barangay || 'Central'}
                          </span>
                        </div>
                        {res.purok && (
                          <p className="text-[11px] text-slate-400 pl-5">
                            {res.purok}
                          </p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="font-medium truncate max-w-[150px]">
                            {res.email}
                          </span>
                        </div>
                        {res.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{res.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            <span>Unverified</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedResident(res)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Full Resident Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(res.id, 'approved', res.full_name)
                                }
                                disabled={processingId === res.id}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleUpdateStatus(res.id, 'rejected', res.full_name)
                                }
                                disabled={processingId === res.id}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resident Details Modal */}
      {selectedResident && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5">
              <div className="flex items-center gap-3.5">
                {selectedResident.avatar_url ? (
                  <img
                    src={selectedResident.avatar_url}
                    alt={selectedResident.full_name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-700 text-lg shadow-sm">
                    {selectedResident.full_name
                      ? selectedResident.full_name.charAt(0).toUpperCase()
                      : 'R'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedResident.full_name}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Brgy. {selectedResident.barangay || 'Central'}, Mati City
                  </p>
                  <div className="mt-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                      {selectedResident.verification_status || 'unverified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body Info */}
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">
                    Gender
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedResident.gender || 'Not specified'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">
                    Birthdate
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedResident.birthdate || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">
                  Registered Email
                </p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedResident.email}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">
                  Mobile Contact
                </p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedResident.phone || 'No phone provided'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[10px]">
                  Purok / Address
                </p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedResident.purok
                    ? `${selectedResident.purok}, Brgy. ${selectedResident.barangay}, Mati City`
                    : `Brgy. ${selectedResident.barangay}, Mati City`}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedResident(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleUpdateStatus(
                      selectedResident.id,
                      'rejected',
                      selectedResident.full_name
                    )
                  }
                  disabled={processingId === selectedResident.id}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors cursor-pointer"
                >
                  Reject Verification
                </button>

                <button
                  onClick={() =>
                    handleUpdateStatus(
                      selectedResident.id,
                      'approved',
                      selectedResident.full_name
                    )
                  }
                  disabled={processingId === selectedResident.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  Approve Resident Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
