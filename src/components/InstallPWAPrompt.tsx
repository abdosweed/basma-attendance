'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Check } from 'lucide-react';

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. فحص هل التطبيق مفتوح بالفعل كـ Standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. كشف أجهزة iOS / Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. الاستماع لحدث beforeinstallprompt في Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      {/* زر التثبيت العائم الذكي */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm">
        <div className="flex items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg border border-sky-500/30">
              ب
            </div>
            <div>
              <h4 className="text-sm font-bold">تثبيت تطبيق بصمة</h4>
              <p className="text-xs text-slate-300">استخدمه كتطبيق مستقل بدون متصفح</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" />
            تثبيت
          </button>
        </div>
      </div>

      {/* مودال إرشادات التثبيت لـ iPhone / Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-md border border-slate-800 shadow-2xl relative animate-in fade-in slide-in-from-bottom duration-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-xl">
                
              </div>
              <div>
                <h3 className="text-lg font-bold">تثبيت بصمة على iPhone</h3>
                <p className="text-xs text-slate-400">إضافة التطبيق إلى الشاشة الرئيسية</p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div className="text-xs leading-relaxed">
                  اضغط على زر <strong className="text-sky-400">المشاركة (Share)</strong>{' '}
                  <Share className="w-4 h-4 inline mx-1 text-sky-400" /> في أسفل شاشة Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div className="text-xs leading-relaxed">
                  انزل للقائمة واختر <strong className="text-sky-400">"إضافة إلى الشاشة الرئيسية"</strong>{' '}
                  <PlusSquare className="w-4 h-4 inline mx-1 text-sky-400" /> (Add to Home Screen).
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div className="text-xs leading-relaxed">
                  اضغط على <strong className="text-emerald-400">"إضافة" (Add)</strong> في أعلى الزاوية.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}
