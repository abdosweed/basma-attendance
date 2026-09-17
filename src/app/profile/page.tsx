'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { BottomNav } from '@/components/ui/BottomNav';
import { getOrCreateDeviceId } from '@/lib/device-fingerprint';
import {
  User,
  Building,
  Smartphone,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Clock,
  Briefcase,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());

    const savedTheme = (localStorage.getItem('basma_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);

    async function loadUserData() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);

        const todayRes = await fetch('/api/attendance/today');
        if (todayRes.ok) {
          const tData = await todayRes.json();
          setTodayData(tData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [router]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('basma_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل بيانات حسابك...</p>
        </div>
      </div>
    );
  }

  const employee = todayData?.employee || user;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 md:pb-6">
        {/* User Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-emerald-500 mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-sky-500/20">
            {employee?.name ? employee.name.slice(0, 2) : 'مو'}
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{employee?.name || user?.email}</h2>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
              {employee?.jobTitle || 'موظف مصرح'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>حساب موثق وملتزم بالبصمة</span>
          </div>
        </div>

        {/* Employee Details List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">البيانات الوظيفية والجهاز</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                <Building className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>الفرع المصرح:</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {employee?.primaryBranch?.name || 'الفرع الرئيسي'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>رقم الجهاز المرخص:</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                {deviceId ? `${deviceId.slice(0, 14)}...` : 'معتمد'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>الوردية المعتمدة:</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {todayData?.shift?.name || 'الوردية العادية (08:00 - 16:00)'}
              </span>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">تفضيلات الواجهة</h3>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold transition-all"
          >
            <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-sky-500" />}
              <span>المظهر العام للتطبيق</span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              {theme === 'dark' ? 'الوضع الداكن 🌙' : 'الوضع الفاتح ☀️'}
            </span>
          </button>
        </div>

        {/* Security & Logout */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">أمان الحساب</h3>

          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الحساب</span>
          </button>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab="profile"
        onTabChange={(tab) => {
          if (tab === 'home') router.push('/');
          if (tab === 'history') router.push('/admin/reports/today');
          if (tab === 'notifications') router.push('/?tab=notifications');
        }}
      />
    </div>
  );
}
