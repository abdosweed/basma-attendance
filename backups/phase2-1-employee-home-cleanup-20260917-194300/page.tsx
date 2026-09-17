'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import InstallPWAPrompt from '@/components/InstallPWAPrompt';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import CorrectionRequestModal from '@/components/CorrectionRequestModal';
import HourlyPermissionModal from '@/components/HourlyPermissionModal';
import { AttendanceActionCard } from '@/components/employee/attendance-action-card';
import { BottomNav, TabType } from '@/components/ui/BottomNav';
import { NotificationSheet } from '@/components/ui/NotificationSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PushNotificationManager } from '@/components/ui/PushNotificationManager';
import { MetricCard } from '@/components/ui/metric-card';
import { getOrCreateDeviceId, getDeviceInfo } from '@/lib/device-fingerprint';
import { setupOfflineAutoSync, saveOfflineAttendance } from '@/lib/offline-sync';
import { validateClientLocationQuality, detectImpossibleSpeed } from '@/lib/geo-security';
import { triggerHaptic } from '@/lib/haptics';
import {
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Building,
  Smartphone,
  FileText,
} from 'lucide-react';

export default function EmployeePortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    actionType: 'check-in' | 'check-out' | 'break-start' | 'break-end' | null;
    verificationId: string | null;
    verificationCode: string | null;
    inputCode: string;
    bestReading: any;
    message: string;
    expiresInSeconds: number;
    distanceMeters?: number;
    branchName?: string;
    loading: boolean;
    error?: string;
  }>({
    isOpen: false,
    actionType: null,
    verificationId: null,
    verificationCode: null,
    inputCode: '',
    bestReading: null,
    message: '',
    expiresInSeconds: 120,
    loading: false,
  });

  const [geoStatus, setGeoStatus] = useState<{ message: string; type: 'info' | 'error' | 'success' }>({
    message: 'جاهز للحصول على موقعك الجغرافي عند الضغط 📍',
    type: 'info',
  });

  const submitVerificationCode = async () => {
    if (!verificationModal.inputCode || verificationModal.inputCode.length !== 6) {
      setVerificationModal((prev) => ({ ...prev, error: 'يرجى إدخال كود تأكيد مكون من 6 أرقام' }));
      return;
    }

    setVerificationModal((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      let url = '/api/attendance/check-in';
      if (verificationModal.actionType === 'check-out') url = '/api/attendance/check-out';
      if (verificationModal.actionType === 'break-start') url = '/api/attendance/break/start';
      if (verificationModal.actionType === 'break-end') url = '/api/attendance/break/end';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: verificationModal.bestReading?.latitude,
          longitude: verificationModal.bestReading?.longitude,
          accuracy: verificationModal.bestReading?.accuracy,
          deviceId: navigator.userAgent,
          trustedDeviceId: getOrCreateDeviceId(),
          deviceInfo: getDeviceInfo(),
          verificationId: verificationModal.verificationId,
          verificationCode: verificationModal.inputCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerificationModal((prev) => ({ ...prev, loading: false, error: data.error || 'فشل التحقق من الكود' }));
      } else {
        setVerificationModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        setGeoStatus({ message: data.message || 'تمت العملية بنجاح 🟢', type: 'success' });
        await fetchUserData();
      }
    } catch (err) {
      setVerificationModal((prev) => ({ ...prev, loading: false, error: 'حدث خطأ بالاتصال بالسيرفر أثناء التحقق' }));
    }
  };

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

  const [deviceStatusState, setDeviceStatusState] = useState<'PENDING' | 'APPROVED' | 'REVOKED' | 'BLOCKED' | 'NOT_FOUND'>('APPROVED');
  const [myCurrentDevice, setMyCurrentDevice] = useState<any>(null);

  const fetchDeviceStatus = async () => {
    try {
      const res = await fetch('/api/employees/me/devices');
      if (res.ok) {
        const data = await res.json();
        const currentDevId = getOrCreateDeviceId();

        if (data.devices && data.devices.length > 0) {
          const matched = data.devices.find((d: any) => d.deviceId === currentDevId);
          if (matched) {
            setMyCurrentDevice(matched);
            setDeviceStatusState(matched.status);
          } else {
            const approved = data.devices.find((d: any) => d.status === 'APPROVED');
            setMyCurrentDevice(approved || data.devices[0]);
            setDeviceStatusState(approved ? 'APPROVED' : data.devices[0].status);
          }
        } else {
          setDeviceStatusState('NOT_FOUND');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestDeviceApproval = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/employees/me/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trustedDeviceId: getOrCreateDeviceId(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeoStatus({ message: data.message || 'تم إرسال طلب اعتماد الجهاز بنجاح 🟢', type: 'info' });
        await fetchDeviceStatus();
      } else {
        setGeoStatus({ message: data.error || 'فشل إرسال طلب الاعتماد', type: 'error' });
      }
    } catch (e) {
      setGeoStatus({ message: 'حدث خطأ بالاتصال أثناء إرسال طلب الاعتماد', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchDeviceStatus();

    const cleanupSync = setupOfflineAutoSync((syncedCount) => {
      setGeoStatus({
        message: `تمت مزامنة ${syncedCount} حركة بصمة كانت محفوظة محلياً بنجاح 🟢`,
        type: 'success',
      });
      fetchUserData();
    });

    return () => cleanupSync();
  }, []);

  useEffect(() => {
    if (deviceStatusState !== 'PENDING') return;

    const pollTimer = setInterval(() => {
      fetchDeviceStatus();
    }, 15000);

    return () => clearInterval(pollTimer);
  }, [deviceStatusState]);

  useEffect(() => {
    const notifTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUserData();
      }
    }, 25000);

    return () => clearInterval(notifTimer);
  }, []);

  const handleAttendanceAction = async (actionType: 'check-in' | 'check-out' | 'break-start' | 'break-end') => {
    setActionLoading(true);
    setGeoStatus({ message: 'جاري تحديد موقعك الجغرافي...', type: 'info' });

    if (!navigator.geolocation) {
      setGeoStatus({ message: 'متصفحك لا يدعم تحديد الموقع الجغرافي (Geolocation API).', type: 'error' });
      setActionLoading(false);
      return;
    }

    const readings: Array<{ latitude: number; longitude: number; accuracy: number; timestamp: number }> = [];
    const acquisitionTimeout = 10000;
    const targetAccuracy = 15;

    let watchId: number | null = null;
    let finished = false;

    setGeoStatus({ message: 'جاري تحسين دقة الموقع واختيار أفضل قراءة...', type: 'info' });

    const finishAcquisition = async () => {
      if (finished) return;
      finished = true;

      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      if (readings.length === 0) {
        setGeoStatus({ message: 'تعذر الحصول على قراءات موقع دقيقة. يرجى تفعيل الـ GPS.', type: 'error' });
        setActionLoading(false);
        return;
      }

      readings.sort((a, b) => a.accuracy - b.accuracy);
      const bestReading = readings[0];

      const qualityCheck = validateClientLocationQuality({
        latitude: bestReading.latitude,
        longitude: bestReading.longitude,
        accuracy: bestReading.accuracy,
        isMock: (bestReading as any).isMock || (bestReading as any).mocked,
      });

      if (!qualityCheck.isValid) {
        setGeoStatus({ message: qualityCheck.reason || 'تم رفض البصمة لعدم استيفاء معايير أمان الموقع 🛑', type: 'error' });
        setActionLoading(false);
        return;
      }

      const speedCheck = detectImpossibleSpeed(bestReading.latitude, bestReading.longitude);
      if (speedCheck.isSuspicious) {
        setGeoStatus({ message: speedCheck.reason || 'تم تجميد البصمة بسبب رصد تنقل غير منطقي بسرعة عالية ⚠️', type: 'error' });
        setActionLoading(false);
        return;
      }

      setGeoStatus({
        message: `تم تثبيت الموقع بدقة ±${Math.round(bestReading.accuracy)} متر. جاري التحقق الخادم...`,
        type: 'info',
      });

      try {
        if (typeof window !== 'undefined' && !navigator.onLine) {
          saveOfflineAttendance(
            actionType === 'check-out' ? 'CHECK_OUT' : actionType === 'break-start' ? 'BREAK_START' : actionType === 'break-end' ? 'BREAK_END' : 'CHECK_IN',
            { latitude: bestReading.latitude, longitude: bestReading.longitude, accuracy: bestReading.accuracy },
            { deviceId: navigator.userAgent, trustedDeviceId: getOrCreateDeviceId() }
          );
          setGeoStatus({
            message: '⚠️ تم حفظ البصمة محلياً (OFFLINE_PENDING)، وسيتم المزامنة تلقائياً فور توفر الشبكة 📶',
            type: 'info',
          });
          setActionLoading(false);
          return;
        }

        let url = '/api/attendance/check-in';
        if (actionType === 'check-out') url = '/api/attendance/check-out';
        if (actionType === 'break-start') url = '/api/attendance/break/start';
        if (actionType === 'break-end') url = '/api/attendance/break/end';

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: bestReading.latitude,
            longitude: bestReading.longitude,
            accuracy: bestReading.accuracy,
            deviceId: navigator.userAgent,
            trustedDeviceId: getOrCreateDeviceId(),
            deviceInfo: getDeviceInfo(),
          }),
        });

        const data = await res.json();

        if (data.requiresVerification) {
          setVerificationModal({
            isOpen: true,
            actionType,
            verificationId: data.verificationId,
            verificationCode: data.verificationCode,
            inputCode: data.verificationCode || '',
            bestReading,
            message: data.message || 'أدخل كود التأكيد التفاعلي لإتمام العملية',
            expiresInSeconds: data.expiresInSeconds || 120,
            distanceMeters: data.distanceMeters,
            branchName: data.branchName,
            loading: false,
          });
          setGeoStatus({ message: 'أدخل كود التأكيد المباشر في النافذة لإتمام البصمة 🔐', type: 'info' });
          setActionLoading(false);
          return;
        }

        if (!res.ok) {
          triggerHaptic('error');
          setGeoStatus({ message: data.error || 'فشلت العملية', type: 'error' });
        } else {
          triggerHaptic('success');
          setGeoStatus({ message: data.message || 'تمت العملية بنجاح', type: 'success' });
          await fetchUserData();
        }
      } catch (err) {
        triggerHaptic('warning');
        saveOfflineAttendance(
          actionType === 'check-out' ? 'CHECK_OUT' : actionType === 'break-start' ? 'BREAK_START' : actionType === 'break-end' ? 'BREAK_END' : 'CHECK_IN',
          { latitude: bestReading.latitude, longitude: bestReading.longitude, accuracy: bestReading.accuracy },
          { deviceId: navigator.userAgent, trustedDeviceId: getOrCreateDeviceId() }
        );
        setGeoStatus({
          message: '⚠️ متعذر الاتصال بالشبكة. تم حفظ البصمة محلياً وسيتم مزامنتها تلقائياً عند عودة الإنترنت 📶',
          type: 'info',
        });
      } finally {
        setActionLoading(false);
      }
    };

    const timeoutTimer = setTimeout(() => {
      finishAcquisition();
    }, acquisitionTimeout);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        readings.push({ latitude, longitude, accuracy, timestamp: Date.now() });

        if (accuracy <= targetAccuracy) {
          clearTimeout(timeoutTimer);
          finishAcquisition();
        }
      },
      (err) => {
        clearTimeout(timeoutTimer);
        finishAcquisition();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">جاري تحميل نظام بصمة...</p>
        </div>
      </div>
    );
  }

  const todayRecord = todayData?.todayRecord;
  const employeeName = todayData?.employee?.name || user?.name || 'الموظف';
  const jobTitle = todayData?.employee?.jobTitle || 'موظف';
  const branchName = todayData?.employee?.primaryBranch?.name || 'الفرع الرئيسي';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        user={user}
        notifications={todayData?.notifications || []}
        onRefreshNotifications={fetchUserData}
      />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 md:pb-6">
        {/* Header Greeting Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs text-slate-500 font-medium">مرحباً بعودتك 👋</span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{employeeName}</h1>
              <p className="text-xs text-sky-700 font-semibold mt-0.5">{jobTitle} • {branchName}</p>
            </div>
            <div className="text-left bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 shrink-0">
              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                {new Date().toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={todayData?.statusCode || 'ABSENT'} label={todayData?.statusText} size="sm" />
            </div>

            <button
              onClick={fetchUserData}
              title="تحديث البيانات"
              className="p-1.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Device Trust Status Alerts */}
        {deviceStatusState === 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">جهازك بانتظار الاعتماد من الإدارة 🟡</span>
                <span className="text-amber-700">تم تقديم هذا الهاتف للإدارة قيد الموافقة.</span>
              </div>
            </div>
            <button
              onClick={fetchDeviceStatus}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold border border-amber-300 flex items-center gap-1 shrink-0 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>تحديث</span>
            </button>
          </div>
        )}

        {deviceStatusState === 'REVOKED' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">تم إلغاء اعتماد هذا الجهاز 🔴</span>
                <span className="text-rose-700">يمكنك طلب إعادة الاعتماد من الإدارة.</span>
              </div>
            </div>
            <button
              onClick={handleRequestDeviceApproval}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all disabled:opacity-50"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>طلب الاعتماد</span>
            </button>
          </div>
        )}

        {deviceStatusState === 'BLOCKED' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">هذا الجهاز محظور من المنظومة</span>
              <span className="text-slate-500 font-normal">يرجى مراجعة إدارة النظام لتوضيح سبب الحظر.</span>
            </div>
          </div>
        )}

        {/* Soft Push Notification Activation Prompt */}
        <PushNotificationManager showCardOnly />

        {/* Hero Attendance Action Area */}
        <AttendanceActionCard
          checkInAt={todayRecord?.checkInAt ? new Date(todayRecord.checkInAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }) : null}
          checkOutAt={todayRecord?.checkOutAt ? new Date(todayRecord.checkOutAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }) : null}
          activeBreak={todayData?.activeBreak}
          shiftName={todayData?.shift?.name || 'الوردية العادية'}
          scheduledStart={todayData?.shift?.startTime || '08:00'}
          scheduledEnd={todayData?.shift?.endTime || '16:00'}
          branchName={branchName}
          locationStatusMessage={geoStatus.message}
          locationStatusType={geoStatus.type}
          actionLoading={actionLoading}
          onCheckIn={() => handleAttendanceAction('check-in')}
          onCheckOut={() => handleAttendanceAction('check-out')}
          onBreakStart={() => handleAttendanceAction('break-start')}
          onBreakEnd={() => handleAttendanceAction('break-end')}
          onRequestCorrection={() => setShowCorrectionModal(true)}
        />

        {/* Quick Action Grid (Ordered by Daily Usefulness: 1. استئذان, 2. إجازة, 3. سجل الشهر, 4. تصحيح) */}
        <div className="space-y-2 pt-1" dir="rtl">
          <h3 className="text-xs font-bold text-slate-700 px-1">الخدمات والإجراءات السريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowPermissionModal(true)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-right flex items-center gap-3 transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center font-bold shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">استئذان ساعي ⏱️</span>
                <span className="text-[10px] text-slate-500 font-medium">خروج مؤقت لعمل</span>
              </div>
            </button>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-right flex items-center gap-3 transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/60 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">طلب إجازة 📅</span>
                <span className="text-[10px] text-slate-500 font-medium">سنوية / مرضية</span>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/reports/today')}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-right flex items-center gap-3 transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">سجل الشهر 📊</span>
                <span className="text-[10px] text-slate-500 font-medium">متابعة الأيام</span>
              </div>
            </button>

            <button
              onClick={() => setShowCorrectionModal(true)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-right flex items-center gap-3 transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">تصحيح بصمة ✍️</span>
                <span className="text-[10px] text-slate-500 font-medium">مراجعة استثنائية</span>
              </div>
            </button>
          </div>
        </div>

        {/* Compact Today Summary Card */}
        <div className="space-y-2" dir="rtl">
          <h3 className="text-xs font-bold text-slate-700 px-1">ملخص دوام اليوم</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title="وقت الدخول الفعلي"
              value={
                todayRecord?.checkInAt
                  ? new Date(todayRecord.checkInAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : 'لم يتم التسجيل'
              }
              variant={todayRecord?.checkInAt ? 'emerald' : 'default'}
              subtitle={todayRecord?.checkInAt ? 'موقع جغرافي مؤكد' : 'بانتظار البصمة'}
            />
            <MetricCard
              title="وقت الانصراف الفعلي"
              value={
                todayRecord?.checkOutAt
                  ? new Date(todayRecord.checkOutAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : todayRecord?.checkInAt
                  ? 'في العمل الآن'
                  : 'لم يتم التسجيل'
              }
              variant={todayRecord?.checkOutAt ? 'emerald' : todayRecord?.checkInAt ? 'sky' : 'default'}
              subtitle={todayRecord?.checkOutAt ? 'منصرف رسمياً' : todayRecord?.checkInAt ? 'دوام قائم' : '—'}
            />
          </div>
        </div>

        {/* Weekly Mini-Tracker (تتبع الالتزام الأسبوعي) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2" dir="rtl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>📅 التزام الأيام الـ 5 الأخيرة</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              التزام ممتاز
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-1">
            {[
              { day: 'الأحد', status: 'PRESENT', label: 'حاضر' },
              { day: 'الإثنين', status: 'PRESENT', label: 'حاضر' },
              { day: 'الثلاثاء', status: 'LATE', label: 'تأخير' },
              { day: 'الأربعاء', status: 'PRESENT', label: 'حاضر' },
              { day: 'الخميس', status: 'PRESENT', label: 'اليوم' },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 rounded-xl text-center border border-slate-100">
                <span className="text-[10px] text-slate-500 font-medium">{d.day}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    d.status === 'PRESENT'
                      ? 'bg-emerald-500'
                      : d.status === 'LATE'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[9px] font-bold text-slate-700">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      {showLeaveModal && (
        <LeaveRequestModal
          onClose={() => setShowLeaveModal(false)}
          onSuccess={() => fetchUserData()}
        />
      )}

      {showCorrectionModal && (
        <CorrectionRequestModal
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={() => fetchUserData()}
        />
      )}

      {showPermissionModal && (
        <HourlyPermissionModal
          onClose={() => setShowPermissionModal(false)}
          onSuccess={() => fetchUserData()}
          shiftStart={todayData?.shift?.startTime || '08:00'}
          shiftEnd={todayData?.shift?.endTime || '16:00'}
        />
      )}

      {/* Verification Code Interactive Dialog */}
      {verificationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-sky-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد كود البصمة المباشر</h3>
                <p className="text-xs text-slate-600">إثبات التواجد الفعلي والتفاعل المباشر</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">موقع الفرع:</span>
                <span className="font-bold text-sky-700">{verificationModal.branchName || branchName}</span>
              </div>
              {verificationModal.distanceMeters !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">المسافة الحسابية:</span>
                  <span className="font-bold text-emerald-700">
                    {Math.round(verificationModal.distanceMeters)} متر
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-700 leading-relaxed pt-1 border-t border-slate-200">
                {verificationModal.message}
              </p>
            </div>

            {verificationModal.verificationCode && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[11px] text-sky-700 font-medium block">كود التأكيد الخاص بك:</span>
                <div className="text-3xl font-black tracking-widest text-sky-800 font-mono select-all">
                  {verificationModal.verificationCode}
                </div>
              </div>
            )}

            {verificationModal.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                {verificationModal.error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">أدخل كود التأكيد (6 أرقام):</label>
              <input
                type="text"
                maxLength={6}
                value={verificationModal.inputCode}
                onChange={(e) => setVerificationModal((prev) => ({ ...prev, inputCode: e.target.value }))}
                placeholder="123456"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-900 focus:outline-none focus:border-sky-600 transition-all dir-ltr"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={submitVerificationCode}
                disabled={verificationModal.loading}
                className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {verificationModal.loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التأكيد...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد واعتماد البصمة</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setVerificationModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={verificationModal.loading}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <InstallPWAPrompt />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'notifications') {
            setShowNotificationSheet(true);
          } else if (tab === 'profile') {
            router.push('/profile');
          } else if (tab === 'history') {
            router.push('/admin/reports/today');
          }
        }}
        unreadNotificationsCount={(todayData?.notifications || []).filter((n: any) => !n.isRead && !n.readAt).length}
      />

      {/* Notification Sheet Drawer */}
      <NotificationSheet
        isOpen={showNotificationSheet}
        onClose={() => setShowNotificationSheet(false)}
        notifications={(todayData?.notifications || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'INFO',
          createdAt: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن',
          isRead: Boolean(n.isRead || n.readAt),
        }))}
        onMarkRead={async (id) => {
          try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
            await fetchUserData();
          } catch (e) {}
        }}
        onMarkAllRead={async () => {
          try {
            await fetch('/api/notifications/read-all', { method: 'POST' });
            await fetchUserData();
          } catch (e) {}
        }}
      />
    </div>
  );
}
