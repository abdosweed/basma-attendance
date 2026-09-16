'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
      } else {
        if (data.user?.role === 'EMPLOYEE') {
          router.push('/');
        } else {
          router.push('/admin');
        }
        router.refresh();
      }
    } catch (err) {
      setError('حدث خطأ بالاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.08)] z-10">
        {/* Basma Clean Logo Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-700/20">
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">بصمة</h1>
          <p className="text-xs text-slate-500 font-medium">منظومة الحضور والانصراف الجغرافي الذكي</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">البريد الإلكتروني أو رقم الهاتف</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="mohamed@basma.com أو +2189..."
                className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-700 focus:bg-white rounded-2xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute top-3.5 right-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-11 pl-11 py-3 bg-slate-50 border border-slate-200 focus:border-blue-700 focus:bg-white rounded-2xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3.5 left-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowLeft className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 mb-3 text-center">الحسابات المعتمدة للاختبار السريع:</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => { setLogin('mohamed@basma.com'); setPassword(''); }}
              className="p-2.5 bg-slate-50 hover:bg-blue-50/50 text-blue-700 rounded-xl border border-slate-200/80 text-right transition-colors"
            >
              <div className="font-bold">👤 موظف تجريبي</div>
              <div className="text-[10px] text-slate-500 dir-ltr text-right">mohamed@basma.com</div>
            </button>

            <button
              type="button"
              onClick={() => { setLogin('admin@basma.com'); setPassword(''); }}
              className="p-2.5 bg-slate-50 hover:bg-blue-50/50 text-slate-800 rounded-xl border border-slate-200/80 text-right transition-colors"
            >
              <div className="font-bold">🔑 المدير العام</div>
              <div className="text-[10px] text-slate-500 dir-ltr text-right">admin@basma.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
