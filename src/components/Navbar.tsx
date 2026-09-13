'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, UserCheck, LayoutDashboard, Fingerprint } from 'lucide-react';

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(user?.role);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* الشعار واسم التطبيق */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              بصمة
              <span className="text-[10px] bg-sky-500/20 text-sky-400 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">
                PWA
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Basma Attendance System</p>
          </div>
        </Link>

        {/* الروابط وأزرار التحكم */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isAdminOrManager && (
            <Link
              href="/admin"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">لوحة الإدارة</span>
            </Link>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">{user?.name || user?.email}</span>
            <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded font-mono">
              {user?.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
