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
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [deviceId, setDeviceId] = useState<string>('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('يرجى إدخال كلمة المرور الحالية');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasDigit) {
      setPassError('كلمة المرور الجديدة لا تستوفي جميع الشروط الأمنية المطلوب تحققها');
      return;
    }

    if (!isMatch) {
      setPassError('تأكيد كلمة المرور الجديدة غير متطابق');
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPassError(data.error || 'فشل تغيير كلمة المرور');
      } else {
        setPassSuccess('تم تغيير كلمة المرور بنجاح 🟢');
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPassSuccess('');
        }, 1500);
      }
    } catch (err) {
      setPassError('حدث خطأ بالاتصال بالسيرفر');
    } finally {
      setPassLoading(false);
    }
  };

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500">جاري تحميل بيانات حسابك...</p>
        </div>
      </div>
    );
  }

  const employee = todayData?.employee || user;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 md:pb-6">
        {/* User Profile Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-emerald-500 mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-sky-500/20">
            {employee?.name ? employee.name.slice(0, 2) : 'مو'}
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{employee?.name || user?.email}</h2>
            <p className="text-xs text-sky-600 font-semibold mt-0.5">
              {employee?.jobTitle || 'موظف مصرح'}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>حساب موثق وملتزم بالبصمة</span>
          </div>
        </div>

        {/* Employee Details List */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">البيانات الوظيفية والجهاز</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <Building className="w-4 h-4 text-sky-600" />
                <span>الفرع المصرح:</span>
              </div>
              <span className="font-bold text-slate-900">
                {employee?.primaryBranch?.name || 'الفرع الرئيسي'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>رقم الجهاز المرخص:</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dir-ltr">
                {deviceId ? `${deviceId.slice(0, 14)}...` : 'معتمد'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                <Briefcase className="w-4 h-4 text-amber-600" />
                <span>الوردية المعتمدة:</span>
              </div>
              <span className="font-bold text-slate-900">
                {todayData?.shift?.name || 'الوردية العادية (08:00 - 16:00)'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Logout */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">أمان الحساب</h3>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/90 rounded-2xl text-xs font-bold transition-all flex items-center justify-between shadow-2xs active:scale-98"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-sky-600" />
              <span>تغيير كلمة المرور</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">اختياري</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-98"
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
      {/* Voluntary Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">تغيير كلمة المرور</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {passError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-4 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute top-3 left-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-4 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute top-3 left-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1 text-[10px]">
                  <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>8 أحرف على الأقل</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>حرف كبير (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLower ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>حرف صغير (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${hasDigit ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasDigit ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>رقم (0-9)</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-4 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute top-3 left-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={passLoading || !hasMinLength || !hasUpper || !hasLower || !hasDigit || !isMatch}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {passLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
