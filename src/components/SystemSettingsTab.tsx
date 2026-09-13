'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, Clock, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SystemSettingsTab() {
  const [companyName, setCompanyName] = useState('شركة بصمة لتكنولوجيا المعلومات');
  const [timezone, setTimezone] = useState('Africa/Tripoli');
  const [maxAcceptedGpsAccuracy, setMaxAcceptedGpsAccuracy] = useState(50);
  const [suspiciousLocationPolicy, setSuspiciousLocationPolicy] = useState('BLOCK');
  const [trustedDevicesPolicy, setTrustedDevicesPolicy] = useState('MULTI');
  const [overtimePolicy, setOvertimePolicy] = useState('AUTO_APPROVE');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.company) {
            setCompanyName(data.company.name || '');
            setTimezone(data.company.timezone || 'Africa/Tripoli');
          }
          if (data.settings) {
            setMaxAcceptedGpsAccuracy(data.settings.maxAcceptedGpsAccuracy || 50);
            setSuspiciousLocationPolicy(data.settings.suspiciousLocationPolicy || 'BLOCK');
            setTrustedDevicesPolicy(data.settings.trustedDevicesPolicy || 'MULTI');
            setOvertimePolicy(data.settings.overtimePolicy || 'AUTO_APPROVE');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          timezone,
          maxAcceptedGpsAccuracy,
          suspiciousLocationPolicy,
          trustedDevicesPolicy,
          overtimePolicy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشل حفظ الإعدادات');
      } else {
        setStatusMsg('تم حفظ إعدادات المنظومة وسيرفر الـ Geofence بنجاح!');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ بالاتصال بالسيرفر لحفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">جاري تحميل إعدادات النظام...</div>;
  }

  return (
    <form onSubmit={handleSave} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <span>الإعدادات المركزية وسياسات الجغرافيا والأجهزة</span>
          </h3>
          <p className="text-xs text-slate-400">التحكم في حدود دقة الـ GPS، سياسات الـ Fake GPS، والأجهزة الموثوقة</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <h4 className="font-bold text-white text-xs flex items-center gap-2 text-sky-400">
            <Globe className="w-4 h-4" />
            <span>بيانات الشركة والمنطقة الزمنية</span>
          </h4>

          <div>
            <label className="block font-bold text-slate-300 mb-1">اسم المؤسسة / الشركة</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">المنطقة الزمنية المعتمدة (Timezone)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none font-mono"
            >
              <option value="Africa/Tripoli">Africa/Tripoli (طرابلس GMT+2)</option>
              <option value="Asia/Riyadh">Asia/Riyadh (الرياض GMT+3)</option>
              <option value="Africa/Cairo">Africa/Cairo (القاهرة GMT+2)</option>
              <option value="Asia/Dubai">Asia/Dubai (دبي GMT+4)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <h4 className="font-bold text-white text-xs flex items-center gap-2 text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>سياسات الموقع الجغرافي والـ Geofence</span>
          </h4>

          <div>
            <label className="block font-bold text-slate-300 mb-1">حد دقة الـ GPS المسموح به (بالمتر)</label>
            <input
              type="number"
              min="10"
              max="500"
              value={maxAcceptedGpsAccuracy}
              onChange={(e) => setMaxAcceptedGpsAccuracy(parseInt(e.target.value) || 50)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">إذا كانت دقة GPS الموظف أسوأ من هذه القيمة، سيتم حظر الحضور فوراً</p>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">سياسة التعامل مع المحاولات المشبوهة / Fake GPS</label>
            <select
              value={suspiciousLocationPolicy}
              onChange={(e) => setSuspiciousLocationPolicy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none font-bold"
            >
              <option value="BLOCK">⛔ منع التسجيل تماماً مع التوثيق في سجل المخاطر</option>
              <option value="WARNING">⚠️ السماح التسجيل مع وضع علامة تحذيرية للإدارة</option>
              <option value="APPROVAL">📋 طلب موافقة المدير المباشر اعتماد العملية</option>
            </select>
          </div>
        </div>
      </div>
    </form>
  );
}
