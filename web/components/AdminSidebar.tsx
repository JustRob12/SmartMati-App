'use client';

import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  UserCheck,
  FileCheck2,
  Building2,
  LogOut,
  Building,
  X,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'map' | 'approve-members' | 'approve-reports' | 'offices';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingMembersCount: number;
  pendingReportsCount: number;
  officesCount: number;
  adminUser: any;
  onLogout: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingMembersCount,
  pendingReportsCount,
  officesCount,
  adminUser,
  onLogout,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Overview',
      subtitle: 'Analytics & Activity',
      icon: LayoutDashboard,
    },
    {
      id: 'map' as AdminTab,
      label: 'City Incidents Map',
      subtitle: 'Live Problem Locator',
      icon: MapPin,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-extrabold',
    },
    {
      id: 'approve-members' as AdminTab,
      label: 'Approve Members',
      subtitle: 'Resident Verifications',
      icon: UserCheck,
      badge: pendingMembersCount > 0 ? pendingMembersCount : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-black',
    },
    {
      id: 'approve-reports' as AdminTab,
      label: 'Approve Reports',
      subtitle: 'Citizen Issue Submissions',
      icon: FileCheck2,
      badge: pendingReportsCount > 0 ? pendingReportsCount : '0',
      badgeColor: 'bg-slate-100 text-slate-600 font-semibold',
    },
    {
      id: 'offices' as AdminTab,
      label: 'Municipal Offices',
      subtitle: 'Departments & Types',
      icon: Building2,
      badge: officesCount > 0 ? officesCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 font-bold',
    },
  ];

  const handleItemClick = (id: AdminTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 w-64 bg-white flex flex-col justify-between border-r border-slate-200 shadow-sm shrink-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & City Brand */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-300 p-0.5 shadow-sm flex items-center justify-center">
                <div className="w-full h-full rounded-[9px] bg-blue-900 flex items-center justify-center">
                  <Building className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-0.5">
                  <span className="text-amber-500">Smart</span>Mati
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5 inline-block" />
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  City Administrator
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mx-4 mt-3 px-3 py-1 bg-blue-50/80 border border-blue-100 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-900">
              Live Governance Portal
            </span>
          </div>

          {/* Navigation Menu */}
          <div className="px-3 py-4">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Command Center
            </p>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs block leading-tight">{item.label}</span>
                        <span
                          className={`text-[10px] block leading-tight mt-0.5 ${
                            isActive ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] shadow-sm ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Administrator Profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 flex items-center justify-center font-black text-blue-950 text-xs shadow-sm border border-white">
              ADM
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {adminUser?.full_name || 'City Hall Admin'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {adminUser?.email || 'admin@mati.gov.ph'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
};
