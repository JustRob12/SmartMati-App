'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Building } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (adminUser: any) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Provide demo bypass if user is testing offline or before running SQL
        if (email.trim() === 'admin@mati.gov.ph' && password === 'AdminPassword123!') {
          onLoginSuccess({
            id: 'admin-demo-1',
            email: 'admin@mati.gov.ph',
            full_name: 'Mati City Administrator',
            role: 'admin',
          });
          return;
        }
        throw error;
      }

      if (data.user) {
        // 2. Verify admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.role !== 'admin') {
          setErrorMsg('Access Restricted: This account does not have City Hall administrator privileges.');
          await supabase.auth.signOut();
          return;
        }

        onLoginSuccess(profile || { id: data.user.id, email: data.user.email, role: 'admin' });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmail('admin@mati.gov.ph');
    setPassword('AdminPassword123!');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-4 relative">
      {/* Background Subtle Accent Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 z-10">
        {/* City Hall Brand Seal */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 p-0.5 shadow-sm flex items-center justify-center mb-3.5">
            <div className="w-full h-full rounded-[14px] bg-blue-900 flex items-center justify-center">
              <Building className="w-7 h-7 text-amber-400" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1">
            <span className="text-amber-500">Smart</span>Mati
            <span className="text-slate-400 font-normal text-lg">|</span>
            <span className="text-slate-700 font-bold text-lg">Admin</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">
            City Government of Mati • Executive Portal
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-amber-50 border border-amber-300 rounded-full mt-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-800">
              LGU Administrator Access Only
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Official Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mati.gov.ph"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fill Shortcut */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center">
          <button
            type="button"
            onClick={handleQuickDemoFill}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Fill Default Admin Credentials</span>
          </button>
          <p className="text-[11px] text-slate-400 mt-1.5 text-center">
            City of Mati • Urban Governance & Public Transparency
          </p>
        </div>
      </div>
    </div>
  );
};
