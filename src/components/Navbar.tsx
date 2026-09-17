'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, UserCheck, LayoutDashboard, Fingerprint, Bell, Check, CheckCheck, Sun, Moon, Activity, CheckSquare } from 'lucide-react';

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
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('basma_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    }
  };

  useEffect(() => {
    setItems(notifications);
    const unread = notifications.filter((n) => !n.readAt && !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // الاتصال بقناة البث المباشر للإشعارات Real-Time SSE Stream مع دعم التعافي والـ Fallback Polling
  const processedIdsRef = React.useRef<Set<string>>(new Set());
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const backoffDelayRef = React.useRef<number>(1000);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    let isUnmounted = false;

    const connectSSE = () => {
      if (isUnmounted || document.hidden) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const es = new EventSource('/api/notifications/stream');
        eventSourceRef.current = es;

        es.onopen = () => {
          setSseConnected(true);
          backoffDelayRef.current = 1000; // Reset backoff on success
        };

        const handleNotificationPayload = (eventData: any) => {
          if (!eventData || (!eventData.id && !eventData.title)) return;

          // Duplicate protection check using eventId / notificationId
          const eventId = String(eventData.id || `${eventData.title}_${eventData.createdAt}`);
          if (processedIdsRef.current.has(eventId)) {
            return;
          }
          processedIdsRef.current.add(eventId);
          if (processedIdsRef.current.size > 200) {
            const firstItem = processedIdsRef.current.values().next().value;
            if (firstItem) processedIdsRef.current.delete(firstItem);
          }

          // Latency logging
          if (eventData.createdAt) {
            const latency = Date.now() - new Date(eventData.createdAt).getTime();
            if (latency > 0) {
              console.log(`[SSE Latency] Received notification in ${latency}ms`);
            }
          }

          setItems((prev) => {
            if (prev.some((item) => String(item.id) === eventId)) return prev;
            return [eventData, ...prev];
          });
          setUnreadCount((c) => c + 1);

          // Toast preview for live notification
          setToastNotif(eventData);
          setTimeout(() => setToastNotif(null), 5000);

          if (onRefreshNotifications) onRefreshNotifications();
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleNotificationPayload(data);
          } catch (e) {}
        };

        // Event listener for typed notification events
        es.addEventListener('notification', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            handleNotificationPayload(data);
          } catch (e) {}
        });

        es.addEventListener('ping', () => {
          setSseConnected(true);
        });

        es.onerror = () => {
          setSseConnected(false);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }

          if (!isUnmounted && !document.hidden) {
            // Reconnect Backoff with Jitter (1s -> 2s -> 5s -> 10s -> 30s max)
            const currentDelay = backoffDelayRef.current;
            const nextDelay = Math.min(currentDelay * 2, 30000);
            backoffDelayRef.current = nextDelay;
            const jitter = Math.random() * 500;

            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(connectSSE, currentDelay + jitter);
          }
        };
      } catch (e) {
        setSseConnected(false);
      }
    };

    connectSSE();

    // Visibility Listener: Resume SSE stream on focus if disconnected
    const handleVisibilityChange = () => {
      if (!document.hidden && !sseConnected && !eventSourceRef.current) {
        backoffDelayRef.current = 1000;
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Smart Fallback Polling (30s interval): Runs only when SSE stream is disconnected
    const fallbackInterval = setInterval(async () => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        try {
          const res = await fetch('/api/notifications');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.notifications)) {
              setItems(data.notifications);
              const unread = data.notifications.filter((n: any) => !n.readAt && !n.isRead).length;
              setUnreadCount(unread);
            }
          }
        } catch (err) {}
      }
    }, 30000);

    return () => {
      isUnmounted = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(fallbackInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user]);

  const handleLogout = async () => {
    // Immediate teardown of active SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSseConnected(false);
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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800">
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

      <div className="max-w-[98%] mx-auto px-2 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* الشعار واسم التطبيق */}
        <a href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              بصمة
              <span className="text-[9px] bg-sky-500/20 text-sky-700 dark:text-sky-400 font-semibold px-1.5 py-0.2 rounded-full border border-sky-500/30">
                PWA
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">Basma Attendance</p>
          </div>
        </a>

        {/* الروابط وأزرار التحكم */}
        <div className="flex items-center gap-1.5 sm:gap-3 py-1">
          {isAdminOrManager && (
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <a
                href="/admin/approvals"
                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900/90 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>الاعتمادات</span>
              </a>

              <a
                href="/admin/shifts"
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-slate-200 dark:border-slate-700"
              >
                <span>الورديات</span>
              </a>

              <a
                href="/admin/tasks"
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-slate-200 dark:border-slate-700"
              >
                <span>المهام</span>
              </a>

              <a
                href="/admin/devices"
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-slate-200 dark:border-slate-700"
              >
                <span>الأجهزة</span>
              </a>

              <a
                href="/admin/system-health"
                className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/90 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">صحة النظام</span>
              </a>

              <a
                href="/admin"
                className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900/90 text-sky-700 dark:text-sky-400 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border border-sky-200 dark:border-sky-800/60 flex items-center gap-1"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden md:inline">لوحة الإدارة</span>
              </a>
            </div>
          )}

          {/* جرس الإشعارات المباشر (يظهر فقط على الشاشات الكبيرة لمنع الازدواجية مع الشريط السفلي للجوال) */}
          <div className="hidden md:block relative shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* قائمة الإشعارات المنسدلة */}
            {showDropdown && (
              <div className="absolute left-0 sm:right-auto mt-2 w-72 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    الإشعارات {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3 h-3" />
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div
                        key={item.id || Math.random()}
                        className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                          !item.readAt && !item.isRead
                            ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-200'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white mb-0.5">{item.title}</div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">{item.message}</p>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-3">لا توجد إشعارات حالية.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300 font-medium max-w-[120px] truncate">{user?.name || user?.email}</span>
            <span className="text-[9px] text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-1 py-0.5 rounded font-mono">
              {user?.role}
            </span>
          </div>

          {/* أزرار الثيم والخروج تظهر على الشاشات الكبيرة فقط (تنقل للحساب الشخصي في الجوال) */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'التحويل للوضع الفاتح ☀️' : 'التحويل للوضع الداكن 🌙'}
              className="p-1.5 rounded-xl transition-all border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-sky-500" />}
            </button>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
