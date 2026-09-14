'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, UserCheck, LayoutDashboard, Fingerprint, Bell, Check, CheckCheck, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  user?: any;
  notifications?: any[];
  onRefreshNotifications?: () => void;
}

export default function Navbar({ user, notifications = [], onRefreshNotifications }: NavbarProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<any[]>(notifications);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastNotif, setToastNotif] = useState<any | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('basma_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('basma_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  useEffect(() => {
    setItems(notifications);
    const unread = notifications.filter((n) => !n.readAt && !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // الاتصال بقناة البث المباشر للإشعارات Real-Time SSE Stream
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id || data.title) {
            setItems((prev) => [data, ...prev]);
            setUnreadCount((c) => c + 1);

            // عرض Toast فوري للمستخدم
            setToastNotif(data);
            setTimeout(() => setToastNotif(null), 5000);

            if (onRefreshNotifications) onRefreshNotifications();
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date() })));
    } catch (e) {}
  };

  const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(user?.role);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800">
      {/* Toast Notification العائم */}
      {toastNotif && (
        <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900 border border-sky-500/50 shadow-2xl rounded-2xl p-4 text-white animate-in slide-in-from-top-5 duration-300 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-white mb-0.5">{toastNotif.title}</h4>
            <p className="text-slate-300 leading-relaxed">{toastNotif.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* الشعار واسم التطبيق */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              بصمة
              <span className="text-[10px] bg-sky-500/20 text-sky-400 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">
                PWA
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Basma Attendance System</p>
          </div>
        </Link>

        {/* الروابط وأزرار التحكم */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* جرس الإشعارات المباشر */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800/70 border border-slate-700/60 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* قائمة الإشعارات المنسدلة */}
            {showDropdown && (
              <div className="absolute left-0 sm:right-auto mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-sky-400" />
                    الإشعارات {unreadCount > 0 && `(${unreadCount} غير مقروء)`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div
                        key={item.id || Math.random()}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          !item.readAt && !item.isRead
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-white mb-0.5">{item.title}</div>
                        <p className="text-[11px] text-slate-400 mb-1">{item.message}</p>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-4">لا توجد إشعارات حالية.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {isAdminOrManager && (
            <div className="flex items-center gap-1.5">
              <Link
                href="/admin/shifts"
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
              >
                <span>إدارة الورديات</span>
              </Link>

              <Link
                href="/admin/devices"
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
              >
                <span>الأجهزة الموثوقة</span>
              </Link>

              <Link
                href="/admin"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">لوحة الإدارة</span>
              </Link>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">{user?.name || user?.email}</span>
            <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded font-mono">
              {user?.role}
            </span>
          </div>

          {/* زر التبديل بين الوضع الداكن والفاتح */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'التحويل للوضع الفاتح ☀️' : 'التحويل للوضع الداكن 🌙'}
            className="p-2 rounded-xl transition-all border border-slate-700/80 bg-slate-800/80 text-amber-400 hover:bg-slate-700 active:scale-95"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-sky-400" />}
          </button>

          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
