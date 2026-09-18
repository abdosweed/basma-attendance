'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, LogOut } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {}
    }
    checkUser();
  }, []);

  // Live Password Policy Validation Rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('يرجى إدخال كلمة المرور الحالية');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasDigit) {
      setError('كلمة المرور الجديدة لا تستوفي جميع الشروط الأمنية المطلوب تحققها');
      return;
    }

    if (!isMatch) {
      setError('تأكيد كلمة المرور الجديدة غير متطابق');
      return;
    }

    if (currentPassword === newPassword) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل تغيير كلمة المرور');
      } else {
        setSuccess('تم تغيير كلمة المرور بنجاح! جاري التوجيه...');
        setTimeout(() => {
          const destination = user?.role === 'EMPLOYEE' ? '/' : '/admin';
          router.push(destination);
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans" dir="rtl">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.08)] z-10 space-y-6">
        {/* Header Icon & Copy */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">يجب تغيير كلمة المرور 🔐</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            لحماية حسابك، قم بتعيين كلمة مرور جديدة قبل متابعة استخدام بصمة.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Current Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">كلمة المرور الحالية</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute top-3 left-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">كلمة المرور الجديدة</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute top-3 left-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Policy Checklist */}
          {newPassword.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>8 أحرف على الأقل</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>حرف كبير (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasLower ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>حرف صغير (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasDigit ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>رقم (0-9)</span>
              </div>
            </div>
          )}

          {/* Field 3: Confirm New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">تأكيد كلمة المرور الجديدة</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-2xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute top-3 left-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !isMatch && (
              <span className="text-[10px] text-rose-600 font-medium block">تأكيد كلمة المرور غير متطابق</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !hasMinLength || !hasUpper || !hasLower || !hasDigit || !isMatch}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري حفظ كلمة المرور...</span>
              </>
            ) : (
              <>
                <span>تأكيد وحفظ كلمة المرور</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Logout Action */}
        <div className="pt-4 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج والعودة لاحقاً</span>
          </button>
        </div>
      </div>
    </div>
  );
}
