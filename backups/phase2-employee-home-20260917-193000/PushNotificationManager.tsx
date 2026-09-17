'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, ShieldAlert, Smartphone } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as BufferSource;
}

export function PushNotificationManager({ showCardOnly = false }: { showCardOnly?: boolean }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>('');
  const [showSoftPrompt, setShowSoftPrompt] = useState<boolean>(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(false);

  useEffect(() => {
    // Check PWA Standalone status on iOS/Android
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalonePwa(!!isStandalone);

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);
    fetchPushStatus();
  }, []);

  const fetchPushStatus = async () => {
    try {
      const res = await fetch('/api/push/status');
      if (res.ok) {
        const data = await res.json();
        setVapidPublicKey(data.vapidPublicKey || '');
        setIsSubscribed(data.isSubscribed);

        // Show soft prompt if default permission and not subscribed yet
        if (Notification.permission === 'default' && !data.isSubscribed) {
          setShowSoftPrompt(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch push notification status:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('متصفحك لا يدعم الإشعارات الفورية Web Push');
      return;
    }

    setLoading(true);
    try {
      // 1. Request Native Browser Permission
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        setShowSoftPrompt(false);
        setLoading(false);
        return;
      }

      // 2. Fetch VAPID key if not loaded
      let pubKey = vapidPublicKey;
      if (!pubKey) {
        const statusRes = await fetch('/api/push/status');
        const statusData = await statusRes.json();
        pubKey = statusData.vapidPublicKey;
        setVapidPublicKey(pubKey);
      }

      if (!pubKey) {
        throw new Error('لم يتم العثور على مفتاح VAPID العام');
      }

      // 3. Register / Get Service Worker Registration
      const registration = await navigator.serviceWorker.ready;

      // 4. Subscribe via PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });

      const subJson = subscription.toJSON();

      // 5. Send to Server API
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setShowSoftPrompt(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'تعذر تفعيل الاشتراك في الخدمة');
      }
    } catch (err: any) {
      console.error('Push subscription error:', err);
      alert(err.message || 'حدث خطأ أثناء تفعيل الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (permission === 'unsupported' && showCardOnly) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-slate-500 text-sm">
        <BellOff className="w-5 h-5 text-slate-400 shrink-0" />
        <span>الإشعارات الفورية غير مدعومة على هذا المتصفح.</span>
      </div>
    );
  }

  return (
    <>
      {/* Soft Prompt Banner for Main View */}
      {!showCardOnly && showSoftPrompt && permission === 'default' && (
        <div className="bg-emerald-50/90 border border-emerald-200 text-slate-800 rounded-3xl p-5 shadow-sm mb-5 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-base text-emerald-950">تفعيل الإشعارات الفورية (PWA)</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                فعّل الإشعارات لتصلك تنبيهات اعتماد الجهاز وموافقات الحضور فورياً حتى عند إغلاق التطبيق.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >

                  {loading ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
                </button>
                <button
                  onClick={() => setShowSoftPrompt(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors font-medium"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Component */}
      {showCardOnly && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSubscribed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">إشعارات الجوال الفورية (Web Push)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {permission === 'denied'
                    ? 'الإشعارات متوقفة من إعدادات الجهاز.'
                    : isSubscribed
                    ? 'الإشعارات الفورية مفعلة ومربوطة بالجوال'
                    : 'التنبيهات الفورية متوقفة'}
                </p>
              </div>
            </div>

            <div>
              {permission === 'denied' ? (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  متوقفة بالنظام
                </span>
              ) : isSubscribed ? (
                <button
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  {loading ? 'جاري...' : 'إلغاء التفعيل'}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-500 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  {loading ? 'جاري...' : 'تفعيل'}
                </button>
              )}
            </div>
          </div>

          {/* iOS Standalone Guidance Notice */}
          {/iPhone|iPad|iPod/i.test(navigator.userAgent) && !isStandalonePwa && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/50 p-2.5 rounded-xl">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ملاحظة iPhone: لتفعيل الإشعارات يلزم إضافة التطبيق للشاشة الرئيسية (Add to Home Screen).</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
