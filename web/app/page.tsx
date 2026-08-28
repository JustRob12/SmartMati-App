'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ResidentProfile, VerificationStatus, MunicipalOffice, CivicReport } from '../types/admin';
import { AdminLogin } from '../components/AdminLogin';
import { AdminSidebar, AdminTab } from '../components/AdminSidebar';
import dynamic from 'next/dynamic';
import { DashboardOverview } from '../components/DashboardOverview';
import { ApproveMembersView } from '../components/ApproveMembersView';
import { ApproveReportsView } from '../components/ApproveReportsView';
import { OfficesView } from '../components/OfficesView';
import { Menu, Building } from 'lucide-react';

const AdminMapView = dynamic(
  () => import('../components/AdminMapView').then((mod) => mod.AdminMapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] bg-slate-900 rounded-2xl flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading Mati City Incident Map...</p>
        </div>
      </div>
    ),
  }
);

const STORAGE_KEY = 'smartmati_admin_session';

const INITIAL_OFFICES: MunicipalOffice[] = [
  // 1. Centralized "Catch-All" & Public Order Offices
  {
    id: 'office-1',
    name: "City Mayor's Office",
    code: 'CMO',
    office_type: 'Centralized & Public Order',
    purpose: 'Receives general community requests, official citizen grievances, or complex complaints that span multiple departments.',
    contact_number: '(087) 388-3101',
    email: 'cmo@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-2',
    name: 'Your Local Barangay Hall',
    code: 'BRGY',
    office_type: 'Centralized & Public Order',
    purpose: 'Handles all initial neighborhood-level reports, local disputes, minor road repairs, and community cleanliness before escalating them to the city hall.',
    contact_number: '0917-000-BRGY',
    email: 'barangay@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-3',
    name: 'Public Safety Office',
    code: 'PSO',
    office_type: 'Centralized & Public Order',
    purpose: 'Manages public order, traffic nuisances, or local community disruptions that do not require full police intervention.',
    contact_number: '(087) 388-3150',
    email: 'pso@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-4',
    name: "Hotline 8888 (National Citizens' Complaint Center)",
    code: '8888',
    office_type: 'Centralized & Public Order',
    purpose: 'A national, anonymous phone hotline to report slow local government actions, corruption, or unresolved city hazards.',
    contact_number: '8888',
    email: 'complaints@8888.gov.ph',
    is_active: true,
  },

  // 2. Infrastructure, Roads, & Utilities
  {
    id: 'office-5',
    name: 'City Engineering Office',
    code: 'CEO',
    office_type: 'Infrastructure, Roads, & Utilities',
    purpose: 'Repairs road cracks, potholes, and drainage blockages on local city streets and subdivision roads.',
    contact_number: '(087) 388-3140',
    email: 'ceo@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-6',
    name: 'DPWH Davao Oriental 2nd District Engineering Office',
    code: 'DPWH',
    office_type: 'Infrastructure, Roads, & Utilities',
    purpose: 'Maintains and repairs major cracks, pits, or damages on national highways (e.g., Mati Diversion Road).',
    contact_number: '(087) 811-0234',
    email: 'dpwh.davor2@dpwh.gov.ph',
    is_active: true,
  },
  {
    id: 'office-7',
    name: 'Mati City Water District (MCWD) / Local Electric Cooperative',
    code: 'MCWD/COOP',
    office_type: 'Infrastructure, Roads, & Utilities',
    purpose: 'Resolves broken water main pipes, leaks, low water pressure, or hanging/damaged power lines.',
    contact_number: '(087) 388-3200',
    email: 'services@mcwd.mati.gov.ph',
    is_active: true,
  },

  // 3. Environment, Trash, & Sanitation
  {
    id: 'office-8',
    name: 'City Environment and Natural Resources Office',
    code: 'City ENRO',
    office_type: 'Environment, Trash, & Sanitation',
    purpose: 'Clears massive roadside trash piles, coordinates garbage trucks, and penalizes illegal dumping.',
    contact_number: '(087) 388-3160',
    email: 'enro@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-9',
    name: 'City Health Office',
    code: 'CHO',
    office_type: 'Environment, Trash, & Sanitation',
    purpose: 'Investigates severe sanitation hazards, foul odors, or pest infestations caused by neglected trash piles near residential areas.',
    contact_number: '(087) 388-3121',
    email: 'cho@mati.gov.ph',
    is_active: true,
  },

  // 4. Emergencies, Disasters, & Safety
  {
    id: 'office-10',
    name: 'City Disaster Risk Reduction and Management Office',
    code: 'CDRRMO',
    office_type: 'Emergencies, Disasters, & Safety',
    purpose: 'Operates 24/7 to clear fallen trees, respond to floods, track extreme weather hazards, and dispatch emergency medical rescues.',
    contact_number: '0917-814-6284',
    email: 'cdrrmo@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-11',
    name: 'Philippine National Police - Mati City Station',
    code: 'PNP',
    office_type: 'Emergencies, Disasters, & Safety',
    purpose: 'Handles active criminal activities, theft, physical fights, and filing official police blotters.',
    contact_number: '0998-598-7254',
    email: 'pnp.mati@pnp.gov.ph',
    is_active: true,
  },
  {
    id: 'office-12',
    name: 'Bureau of Fire Protection - Mati',
    code: 'BFP',
    office_type: 'Emergencies, Disasters, & Safety',
    purpose: 'Extinguishes fires, handles structural collapses, and responds to vehicular accidents.',
    contact_number: '(087) 388-3111',
    email: 'bfp.mati@bfp.gov.ph',
    is_active: true,
  },

  // 5. Animal Welfare & Health
  {
    id: 'office-13',
    name: 'Office of the City Veterinarian',
    code: 'City VET',
    office_type: 'Animal Welfare & Health',
    purpose: 'Manages stray animal impounding, handles pet vaccination schedules, and coordinates local animal health concerns.',
    contact_number: '(087) 388-3175',
    email: 'vet@mati.gov.ph',
    is_active: true,
  },
  {
    id: 'office-14',
    name: 'PNP / Barangay Council (Animal Welfare Act Enforcement)',
    code: 'AWA-ENF',
    office_type: 'Animal Welfare & Health',
    purpose: 'Enforces criminal charges and arrests individuals for active animal cruelty or severe abuse cases.',
    contact_number: '0998-598-7254',
    email: 'animalwelfare@mati.gov.ph',
    is_active: true,
  },
];

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [offices, setOffices] = useState<MunicipalOffice[]>(INITIAL_OFFICES);
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [loadingOffices, setLoadingOffices] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 1. Check existing session on mount from localStorage AND Supabase
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && (parsed.role === 'admin' || parsed.email === 'admin@mati.gov.ph')) {
          setAdminUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Local session read error:', e);
    }

    const checkSupabaseSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.role === 'admin') {
            setAdminUser(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.warn('Supabase session check error:', err);
      } finally {
        setInitialized(true);
      }
    };

    checkSupabaseSession();
  }, []);

  // 2. Fetch resident profiles
  const fetchResidents = useCallback(async () => {
    setLoadingResidents(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profiles from Supabase:', error);
      }

      if (data && data.length > 0) {
        setResidents(data);
      }
    } catch (err) {
      console.warn('Profiles fetch failure:', err);
    } finally {
      setLoadingResidents(false);
    }
  }, []);

  // 3. Fetch municipal offices
  const fetchOffices = useCallback(async () => {
    setLoadingOffices(true);
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('created_at', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching offices from Supabase:', error);
      }

      if (data && data.length > 0) {
        setOffices(data);
      } else {
        setOffices(INITIAL_OFFICES);
      }
    } catch (err) {
      console.warn('Offices fetch error:', err);
      setOffices(INITIAL_OFFICES);
    } finally {
      setLoadingOffices(false);
    }
  }, []);

  // 4. Fetch civic reports
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching reports from Supabase:', error);
      }

      if (data && data.length > 0) {
        setReports(data);
      }
    } catch (err) {
      console.warn('Reports fetch error:', err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // 5. Fetch when admin is active & listen to Realtime changes
  useEffect(() => {
    if (adminUser) {
      fetchResidents();
      fetchOffices();
      fetchReports();

      // Realtime subscription to profiles, offices, and reports table
      const profileChannel = supabase
        .channel('admin-profiles-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            fetchResidents();
          }
        )
        .subscribe();

      const officesChannel = supabase
        .channel('admin-offices-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'offices' },
          () => {
            fetchOffices();
          }
        )
        .subscribe();

      const reportsChannel = supabase
        .channel('admin-reports-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          () => {
            fetchReports();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(officesChannel);
        supabase.removeChannel(reportsChannel);
      };
    }
  }, [adminUser, fetchResidents, fetchOffices, fetchReports]);

  // 6. Optimistic status update handler for residents
  const handleStatusChange = (residentId: string, newStatus: VerificationStatus) => {
    setResidents((prev) =>
      prev.map((r) =>
        r.id === residentId ? { ...r, verification_status: newStatus } : r
      )
    );
  };

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAdminUser(user);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    } finally {
      setAdminUser(null);
    }
  };

  // If initial load in progress and no local user
  if (!initialized && !adminUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated as admin, render Login UI
  if (!adminUser) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingMembersCount = residents.filter(
    (r) => (r.verification_status || '').toLowerCase() === 'pending'
  ).length;

  const pendingReportsCount = reports.filter(
    (r) => (r.status || '').toLowerCase() === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col lg:flex-row w-full antialiased">
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 font-black shadow-xs">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">
              <span className="text-amber-500">Smart</span>Mati
            </h1>
            <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Admin Portal
            </p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar Navigation */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingMembersCount={pendingMembersCount}
        pendingReportsCount={pendingReportsCount}
        officesCount={offices.length}
        adminUser={adminUser}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto w-full min-w-0">
        <div className="w-full mx-auto space-y-6">
          {currentTab === 'dashboard' && (
            <DashboardOverview
              residents={residents}
              officesCount={offices.length}
              reports={reports}
              onNavigateToApproveMembers={() => setCurrentTab('approve-members')}
              onNavigateToApproveReports={() => setCurrentTab('approve-reports')}
              onNavigateToOffices={() => setCurrentTab('offices')}
              onNavigateToMap={() => setCurrentTab('map')}
            />
          )}

          {currentTab === 'map' && (
            <AdminMapView
              reports={reports}
              offices={offices}
              adminUser={adminUser}
              onRefresh={fetchReports}
              onReportsChange={setReports}
            />
          )}

          {currentTab === 'approve-members' && (
            <ApproveMembersView
              residents={residents}
              loading={loadingResidents}
              onRefresh={fetchResidents}
              onStatusChange={handleStatusChange}
            />
          )}

          {currentTab === 'approve-reports' && (
            <ApproveReportsView
              reports={reports}
              loading={loadingReports}
              onRefresh={fetchReports}
              onReportsChange={setReports}
              adminUser={adminUser}
              offices={offices}
            />
          )}

          {currentTab === 'offices' && (
            <OfficesView
              offices={offices}
              loading={loadingOffices}
              onRefresh={fetchOffices}
              onOfficesChange={setOffices}
              reports={reports}
              onReportsChange={setReports}
              adminUser={adminUser}
            />
          )}
        </div>
      </main>
    </div>
  );
}
