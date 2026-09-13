'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import InstallPWAPrompt from '@/components/InstallPWAPrompt';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import CorrectionRequestModal from '@/components/CorrectionRequestModal';
import {
  Fingerprint,
  MapPin,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Calendar,
  Building,
  Bell,
  PlusCircle,
} from 'lucide-react';

export default function EmployeePortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const [geoStatus, setGeoStatus] = useState<{ message: string; type: 'info' | 'error' | 'success' }>({
    message: 'جاهز للحصول على موقعك الجغرافي عند الضغط',
    type: 'info',
  });

  const fetchUserData = async () => {
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
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleAttendanceAction = async (actionType: 'check-in' | 'check-out' | 'break-start' | 'break-end') => {
    setActionLoading(true);
    setGeoStatus({ message: 'جاري تحديد موقعك الجغرافي الحالي بدقة عالية...', type: 'info' });

    if (!navigator.geolocation) {
      setGeoStatus({ message: 'متصفحك لا يدعم تحديد الموقع الجغرافي (Geolocation API).', type: 'error' });
      setActionLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGeoStatus({
          message: `تم جلب إحداثياتك (الدقة: ${Math.round(accuracy)} متر). جاري التحقق الخادم...`,
          type: 'info',
        });

        try {
          let url = '/api/attendance/check-in';
          if (actionType === 'check-out') url = '/api/attendance/check-out';
          if (actionType === 'break-start') url = '/api/attendance/break/start';
          if (actionType === 'break-end') url = '/api/attendance/break/end';

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy,
              deviceId: navigator.userAgent,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setGeoStatus({ message: data.error || 'فشلت العملية', type: 'error' });
          } else {
            setGeoStatus({ message: data.message || 'تمت العملية بنجاح', type: 'success' });
            await fetchUserData();
          }
        } catch (err) {
          setGeoStatus({ message: 'حدث خطأ بالاتصال بالسيرفر أثناء معالجة الحضور', type: 'error' });
        } finally {
          setActionLoading(false);
        }
      },
      (geoError) => {
        setActionLoading(false);
        let errorMsg = 'تعذر الحصول على الموقع الجغرافي.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          errorMsg = 'يرجى إعطاء إذن الوصول للموقع الجغرافي من المتصفح لتسجيل الحضور.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          errorMsg = 'يرجى تفعيل خدمات الموقع GPS على هاتفك.';
        } else if (geoError.code === geoError.TIMEOUT) {
          errorMsg = 'انتهت مهلة تحديد الموقع، حاول مرة أخرى.';
        }
        setGeoStatus({ message: errorMsg, type: 'error' });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل نظام بصمة...</p>
        </div>
      </div>
    );
  }

  const statusCode = todayData?.statusCode || 'NOT_CHECKED_IN';
  const todayRecord = todayData?.todayRecord;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* بطاقة الترحيب واليوم والتاريخ */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">مرحباً بعودتك 👋</span>
              <h2 className="text-lg font-black text-white">{todayData?.employee?.name || user?.name}</h2>
              <p className="text-xs text-sky-400 font-medium">{todayData?.employee?.jobTitle || 'موظف'}</p>
            </div>
            <div className="text-left bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                {new Date().toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          {/* حالة الحضور الحالية */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    statusCode === 'PRESENT' || statusCode === 'LATE'
                      ? 'bg-emerald-400'
                      : statusCode === 'ON_BREAK'
                      ? 'bg-orange-400'
                      : 'bg-red-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    statusCode === 'PRESENT' || statusCode === 'LATE'
                      ? 'bg-emerald-500'
                      : statusCode === 'ON_BREAK'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block">حالتك الحالية اليوم</span>
                <span className="text-xs font-bold text-white">{todayData?.statusText}</span>
              </div>
            </div>

            <button
              onClick={fetchUserData}
              title="تحديث البيانات"
              className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* رسالة حالة الـ GPS والـ Geofence الحالية */}
        <div
          className={`p-4 rounded-2xl text-xs border flex items-start gap-3 transition-all ${
            geoStatus.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : geoStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
          }`}
        >
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block mb-0.5">الحالة الجغرافية (Server Geofence):</span>
            {geoStatus.message}
          </div>
        </div>

        {/* أزرار الحضور والانصراف الكبيرة للاستخدام المباشر من الهاتف */}
        <div className="space-y-3">
          {statusCode === 'NOT_CHECKED_IN' && (
            <button
              onClick={() => handleAttendanceAction('check-in')}
              disabled={actionLoading}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-3xl shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 text-base active:scale-98 transition-all disabled:opacity-50"
            >
              {actionLoading ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-7 h-7 animate-pulse" />
                  <span>تسجيل الحضور الآن</span>
                </>
              )}
            </button>
          )}

          {(statusCode === 'PRESENT' || statusCode === 'LATE') && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAttendanceAction('break-start')}
                disabled={actionLoading}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-2xl border border-amber-500/30 flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
              >
                <Coffee className="w-5 h-5" />
                <span>بدء الاستراحة</span>
              </button>

              <button
                onClick={() => handleAttendanceAction('check-out')}
                disabled={actionLoading}
                className="py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الانصراف</span>
              </button>
            </div>
          )}

          {statusCode === 'ON_BREAK' && (
            <button
              onClick={() => handleAttendanceAction('break-end')}
              disabled={actionLoading}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 text-sm active:scale-98 transition-all"
            >
              <Coffee className="w-6 h-6" />
              <span>إنهاء الاستراحة والعوّدة للعمل</span>
            </button>
          )}

          {statusCode === 'CHECKED_OUT' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>تم إكمال يوم الدوام بنجاح. شكراً لك!</span>
            </div>
          )}
        </div>

        {/* أزرار الخدمات السريعة (طلب إجازة / تصحيح بصمة) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowLeaveModal(true)}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">طلب إجازة</span>
              <span className="text-[10px] text-slate-400">تقديم طلب إجازة سنوية أو مرضية</span>
            </div>
          </button>

          <button
            onClick={() => setShowCorrectionModal(true)}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">تصحيح بصمة</span>
              <span className="text-[10px] text-slate-400">تصحيح وقت حضور/انصراف مفقود</span>
            </div>
          </button>
        </div>

        {/* بطاقات الإحصائيات الفورية والفرع */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-1">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>وقت الحضور</span>
            </div>
            <span className="text-sm font-bold text-white">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : 'لم يسجل'}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-1">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>الفرع المصرح</span>
            </div>
            <span className="text-xs font-bold text-white truncate block">
              {todayData?.employee?.primaryBranch?.name || 'الفرع الرئيسي'}
            </span>
          </div>
        </div>

        {/* الإشعارات التنبيهية للموظف */}
        {todayData?.notifications?.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-3">
              <Bell className="w-4 h-4 text-sky-400" />
              <span>أحدث الإشعارات</span>
            </div>

            <div className="space-y-2">
              {todayData.notifications.map((n: any) => (
                <div key={n.id} className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs">
                  <div className="font-bold text-white mb-0.5">{n.title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* مودال طلب الإجازة */}
      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onSuccess={() => fetchUserData()}
        />
      )}

      {/* مودال تصحيح البصمة */}
      {showCorrectionModal && (
        <CorrectionRequestModal
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={() => fetchUserData()}
        />
      )}

      <InstallPWAPrompt />
    </div>
  );
}
