'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import InstallPWAPrompt from '@/components/InstallPWAPrompt';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import CorrectionRequestModal from '@/components/CorrectionRequestModal';
import HourlyPermissionModal from '@/components/HourlyPermissionModal';
import { EmployeeHeroCard } from '@/components/ui/EmployeeHeroCard';
import { AttendanceActionCard } from '@/components/employee/attendance-action-card';
import { BottomNav, TabType } from '@/components/ui/BottomNav';
import { NotificationSheet } from '@/components/ui/NotificationSheet';
import { BasmaCard } from '@/components/ui/BasmaCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getOrCreateDeviceId, getDeviceInfo } from '@/lib/device-fingerprint';
import { setupOfflineAutoSync, saveOfflineAttendance } from '@/lib/offline-sync';
import { validateClientLocationQuality, detectImpossibleSpeed } from '@/lib/geo-security';
import { triggerHaptic } from '@/lib/haptics';
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
  Smartphone,
  Ban,
  User as UserIcon,
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
    message: 'جاهز للحصول على موقعك الجغرافي عند الضغط',
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

  // Polling خفيف كل 15 ثانية كـ Fallback في حالة كان الجهاز PENDING لحين الاعتماد
  useEffect(() => {
    if (deviceStatusState !== 'PENDING') return;

    const pollTimer = setInterval(() => {
      fetchDeviceStatus();
    }, 15000);

    return () => clearInterval(pollTimer);
  }, [deviceStatusState]);

  // التحديث التلقائي للإشعارات والحضور كل 25 ثانية (Live / Auto-refresh Notifications Polling)
  useEffect(() => {
    const notifTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUserData();
      }
    }, 25000);

    return () => clearInterval(notifTimer);
  }, []);

  const [verifiedAccuracy, setVerifiedAccuracy] = useState<number | null>(null);
  const [lastVerifiedTime, setLastVerifiedTime] = useState<string | null>(null);
  const [gpsQuality, setGpsQuality] = useState<'EXCELLENT' | 'GOOD' | 'POOR' | 'UNSUITABLE'>('GOOD');

  // مراقبة نطاق العمل أثناء الدوام (Work Geofence Monitoring) - تعمل فقط إذا كان الموظف CHECKED_IN
  useEffect(() => {
    if (!todayData || todayData.statusCode !== 'PRESENT') return;

    let heartbeatTimer: any = null;
    let watchId: number | null = null;

    const sendHeartbeat = (latitude: number, longitude: number, accuracy: number) => {
      // الالتزام بحرمة الخصوصية: لا يتم الإرسال إلا إذا كانت الصفحة مرئية (visible)
      if (document.visibilityState !== 'visible') return;

      fetch('/api/attendance/geofence-heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.geofenceStatus === 'OUTSIDE') {
            setGeoStatus({
              message: `⚠️ تنبيه: تم رصد تواجدك خارج نطاق العمل (${Math.round(data.distanceMeters || 0)} متر).`,
              type: 'error',
            });
          } else if (data.geofenceStatus === 'INSIDE') {
            setGeoStatus({
              message: 'أنت ضمن نطاق موقع العمل المسموح به حالياً 🟢',
              type: 'success',
            });
          }
        })
        .catch(() => {});
    };

    if (navigator.geolocation) {
      // إرسال النبضة كل 45 ثانية لتوفير البطارية
      heartbeatTimer = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendHeartbeat(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }, 45000);
    }

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
  }, [todayData]);

  // خوارزمية تثبيت وتجميع قراءات الـ GPS (GPS Stabilization)
  const handleAttendanceAction = async (actionType: 'check-in' | 'check-out' | 'break-start' | 'break-end') => {
    setActionLoading(true);
    setGeoStatus({ message: 'جاري تحديد موقعك الجغرافي...', type: 'info' });

    if (!navigator.geolocation) {
      setGeoStatus({ message: 'متصفحك لا يدعم تحديد الموقع الجغرافي (Geolocation API).', type: 'error' });
      setActionLoading(false);
      return;
    }

    const readings: Array<{ latitude: number; longitude: number; accuracy: number; timestamp: number }> = [];
    const acquisitionTimeout = 10000; // 10 ثوان كحد أقصى
    const targetAccuracy = 15; // 15 متر كدقة مستهدفة

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

      // اختيار القراءة ذات أفضل (أدنى) accuracy وتصفية القراءات القديمة والشاذة
      readings.sort((a, b) => a.accuracy - b.accuracy);
      const bestReading = readings[0];

      // 1. فحص كشف تزييف المواقع ودقة القراءة الحلية (Client Anti-Spoofing Check)
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

      // 2. كشف السرعات والتنقل المستحيل (Impossible Speed / Jump Guard)
      const speedCheck = detectImpossibleSpeed(bestReading.latitude, bestReading.longitude);
      if (speedCheck.isSuspicious) {
        setGeoStatus({ message: speedCheck.reason || 'تم تجميد البصمة بسبب رصد تنقل غير منطقي بسرعة عالية ⚠️', type: 'error' });
        setActionLoading(false);
        return;
      }

      setVerifiedAccuracy(Math.round(bestReading.accuracy));
      const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setLastVerifiedTime(nowTimeStr);

      // تقييم مؤشر جودة الموقع
      if (bestReading.accuracy <= 15) setGpsQuality('EXCELLENT');
      else if (bestReading.accuracy <= 30) setGpsQuality('GOOD');
      else if (bestReading.accuracy <= 50) setGpsQuality('POOR');
      else setGpsQuality('UNSUITABLE');

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
        // في حالة فشل الاتصال المفاجئ (Network Error)
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

    // مهلة زمنية قصوى لإنهاء التجميع
    const timeoutTimer = setTimeout(() => {
      finishAcquisition();
    }, acquisitionTimeout);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        readings.push({ latitude, longitude, accuracy, timestamp: Date.now() });

        // إذا وصلنا لـ Target Accuracy (<= 15m)، ننهي التثبيت فورا
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        user={user}
        notifications={todayData?.notifications || []}
        onRefreshNotifications={fetchUserData}
      />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 md:pb-6">
        {/* Header greeting card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs text-slate-500 font-medium">مرحباً بعودتك 👋</span>
              <h2 className="text-xl font-bold text-slate-900">{todayData?.employee?.name || user?.name}</h2>
              <p className="text-xs text-blue-700 font-semibold mt-0.5">{todayData?.employee?.jobTitle || 'موظف'}</p>
            </div>
            <div className="text-left bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                {new Date().toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          {/* حالة الحضور الحالية */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
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
                <span className="text-[10px] text-slate-500 block font-medium">حالتك الحالية اليوم</span>
                <span className="text-xs font-bold text-slate-900">{todayData?.statusText}</span>
              </div>
            </div>

            <button
              onClick={fetchUserData}
              title="تحديث البيانات"
              className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* بطاقة وحالة اعتماد الجهاز للموظف (Trusted Device Status) */}
        {deviceStatusState === 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="font-bold block text-sm">🟡 جهازك بانتظار الاعتماد من الإدارة</span>
                <span className="text-xs text-amber-200/80">
                  تم تقديم هذا الجهاز للإدارة وهو بانتظار الموافقة. يمكنك الضغط على تحديث أو الانتظار.
                </span>
              </div>
            </div>
            <button
              onClick={fetchDeviceStatus}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">تحديث الحالة</span>
            </button>
          </div>
        )}

        {deviceStatusState === 'REVOKED' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold block text-sm">🔴 تم إلغاء اعتماد هذا الجهاز</span>
                <span className="text-xs text-rose-200/80">
                  {myCurrentDevice?.reviewNote
                    ? `ملاحظة الإدارة: ${myCurrentDevice.reviewNote}`
                    : 'لم يعد هذا الجهاز معتمداً لتسجيل الحضور والانصراف. يمكنك إرسال طلب اعتماد جديد.'}
                </span>
              </div>
            </div>
            <button
              onClick={handleRequestDeviceApproval}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              <span>طلب اعتماد الجهاز</span>
            </button>
          </div>
        )}

        {/* Trusted Device Status Banner (Pending / Blocked guidance) */}
        {deviceStatusState === 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>هذا الهاتف غير معتمد بعد. يرجى طلب الاعتماد من المسؤول.</span>
            </div>
            <button
              onClick={handleRequestDeviceApproval}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shrink-0 transition-all disabled:opacity-50"
            >
              طلب الاعتماد
            </button>
          </div>
        )}

        {deviceStatusState === 'BLOCKED' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <div className="text-xs">
              <span className="font-bold block">هذا الجهاز محظور من المنظومة</span>
              <span className="text-slate-500 font-normal">تمنع السياسة تسجيل الحضور والانصراف من هذا الهاتف.</span>
            </div>
          </div>
        )}

        {/* Hero Attendance Card (Master Action & Zero Raw GPS Noise) */}
        <AttendanceActionCard
          checkInAt={todayRecord?.checkInAt ? new Date(todayRecord.checkInAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }) : null}
          checkOutAt={todayRecord?.checkOutAt ? new Date(todayRecord.checkOutAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }) : null}
          activeBreak={todayData?.activeBreak}
          shiftName={todayData?.shift?.name || 'الوردية العادية'}
          scheduledStart={todayData?.shift?.startTime || '08:00'}
          scheduledEnd={todayData?.shift?.endTime || '16:00'}
          locationStatusMessage={geoStatus.message}
          locationStatusType={geoStatus.type}
          actionLoading={actionLoading}
          onCheckIn={() => handleAttendanceAction('check-in')}
          onCheckOut={() => handleAttendanceAction('check-out')}
          onBreakStart={() => handleAttendanceAction('break-start')}
          onBreakEnd={() => handleAttendanceAction('break-end')}
          onRequestCorrection={() => setShowCorrectionModal(true)}
        />

        {/* Quick Action Grid (4 Primary Actions) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setShowLeaveModal(true)}
            className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-all shadow-sm active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">طلب إجازة 📅</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">سنوية / مرضية</span>
            </div>
          </button>

          <button
            onClick={() => setShowCorrectionModal(true)}
            className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-all shadow-sm active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">تصحيح بصمة ✍️</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">مراجعة وقت سابق</span>
            </div>
          </button>

          <button
            onClick={() => setShowPermissionModal(true)}
            className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-all shadow-sm active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">استئذان ساعي ⏱️</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">خروج مؤقت للعمل</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/reports/today')}
            className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-right flex items-center gap-3 transition-all shadow-sm active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">سجل الشهر 📊</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">تقرير الدوام كاملاً</span>
            </div>
          </button>
        </div>

        {/* Weekly Mini-Tracker (تتبع الالتزام الأسبوعي) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>📅 التزام الأيام الـ 5 الأخيرة</span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              التزام 100%
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
              <div key={i} className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{d.day}</span>
                <span
                  className={`w-3 h-3 rounded-full ${
                    d.status === 'PRESENT'
                      ? 'bg-emerald-500'
                      : d.status === 'LATE'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* بطاقات الإحصائيات الفورية والفرع */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>وقت الحضور</span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : 'لم يسجل'}
            </span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>الفرع المصرح</span>
            </div>
            <span className="text-xs font-bold text-slate-900 truncate block">
              {todayData?.employee?.primaryBranch?.name || 'الفرع الرئيسي'}
            </span>
          </div>
        </div>
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

      {/* مودال طلب الاستئذان الساعي */}
      {showPermissionModal && (
        <HourlyPermissionModal
          onClose={() => setShowPermissionModal(false)}
          onSuccess={() => fetchUserData()}
          shiftStart={todayData?.shift?.startTime || '08:00'}
          shiftEnd={todayData?.shift?.endTime || '16:00'}
        />
      )}

      {/* مودال كود التأكيد التفاعلي المزدوج */}
      {verificationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 dir-rtl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تأكيد كود البصمة المباشر</h3>
                <p className="text-xs text-slate-400">إثبات التواجد الفعلي والتفاعل المباشر</p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">موقع الفرع:</span>
                <span className="font-bold text-sky-400">{verificationModal.branchName || 'الفرع المصرح'}</span>
              </div>
              {verificationModal.distanceMeters !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">المسافة الحسابية:</span>
                  <span className="font-bold text-emerald-400">
                    {Math.round(verificationModal.distanceMeters)} متر
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800/60">
                {verificationModal.message}
              </p>
            </div>

            {verificationModal.verificationCode && (
              <div className="bg-gradient-to-r from-sky-950/60 to-blue-950/60 border border-sky-500/30 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[11px] text-sky-300 font-medium block">كود التأكيد الخاص بك:</span>
                <div className="text-3xl font-black tracking-widest text-sky-400 font-mono select-all">
                  {verificationModal.verificationCode}
                </div>
              </div>
            )}

            {verificationModal.error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium">
                {verificationModal.error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">أدخل كود التأكيد (6 أرقام):</label>
              <input
                type="text"
                maxLength={6}
                value={verificationModal.inputCode}
                onChange={(e) => setVerificationModal((prev) => ({ ...prev, inputCode: e.target.value }))}
                placeholder="123456"
                className="w-full bg-slate-950 border border-sky-500/30 rounded-2xl px-4 py-3 text-center text-xl font-bold tracking-widest text-white focus:outline-none focus:border-sky-500 transition-all dir-ltr"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={submitVerificationCode}
                disabled={verificationModal.loading}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
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
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
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
