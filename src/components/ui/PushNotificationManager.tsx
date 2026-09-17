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
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        setShowSoftPrompt(false);
        setLoading(false);
        return;
      }

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

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });

      const subJson = subscription.toJSON();
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
    return null;
  }

  // If already subscribed on main screen, hide card to prevent cluttering attendance hero
  if (showCardOnly && isSubscribed) {
    return null;
  }

  return (
    <>
      {/* Secondary Compact Prompt Banner */}
      {showCardOnly && !isSubscribed && (
        <div className="bg-sky-50/70 border border-sky-200/80 text-slate-800 rounded-2xl p-3 shadow-xs mb-3 dir-rtl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">فعّل إشعارات بصمة 🔔</h4>
                <p className="text-[11px] text-slate-600">
                  {permission === 'denied'
                    ? 'الإشعارات غير مفعّلة من إعدادات الجهاز'
                    : 'استلم تنبيهات الحضور والطلبات فورياً'}
                </p>
              </div>
            </div>

            {permission !== 'denied' && (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all shrink-0 shadow-xs disabled:opacity-50"
              >
                {loading ? 'جاري التفعيل...' : 'تفعيل'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
