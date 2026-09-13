'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
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

  const handleQuickDemo = (demoLogin: string, demoPass: string) => {
    setLogin(demoLogin);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* خلفية ديناميكية وتأثيرات إضاءة */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-sky-500/20">
            <Fingerprint className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">تسجيل الدخول</h1>
          <p className="text-xs text-slate-400">نظام بصمة لإدارة الحضور والانصراف الجغرافي الذكي</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني أو رقم الهاتف</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute top-3.5 right-3.5" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="admin@basma.com أو +2189..."
                className="w-full pr-11 pl-4 py-3 bg-slate-800/80 border border-slate-700/80 focus:border-sky-500 rounded-2xl text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute top-3.5 right-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-11 pl-4 py-3 bg-slate-800/80 border border-slate-700/80 focus:border-sky-500 rounded-2xl text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* أزرار التجربة السريعة للـ Seed Data */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 mb-3 text-center">حسابات للتجربة السريعة (Demo):</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => handleQuickDemo('admin@basma.com', 'admin123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-700/60 text-right transition-colors"
            >
              <div className="font-bold">🔑 المدير العام</div>
              <div className="text-[10px] text-slate-400">admin@basma.com</div>
            </button>

            <button
              onClick={() => handleQuickDemo('employee@basma.com', 'emp123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 text-emerald-400 rounded-xl border border-slate-700/60 text-right transition-colors"
            >
              <div className="font-bold">👤 موظف (أحمد)</div>
              <div className="text-[10px] text-slate-400">employee@basma.com</div>
            </button>

            <button
              onClick={() => handleQuickDemo('hr@basma.com', 'hr123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 text-purple-400 rounded-xl border border-slate-700/60 text-right transition-colors"
            >
              <div className="font-bold">📋 الموارد البشرية</div>
              <div className="text-[10px] text-slate-400">hr@basma.com</div>
            </button>

            <button
              onClick={() => handleQuickDemo('manager@basma.com', 'manager123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-700/60 text-right transition-colors"
            >
              <div className="font-bold">🏢 مدير الفرع</div>
              <div className="text-[10px] text-slate-400">manager@basma.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
