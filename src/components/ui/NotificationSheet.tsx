import React from 'react';

export interface NotificationItemData {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItemData[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationSheet: React.FC<NotificationSheetProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const uniqueNotifications = Array.from(
    new Map(notifications.map(item => [item.id, item])).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col pb-safe">
        {/* Sheet Handle Accent Bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">الإشعارات</h3>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {notifications.filter(n => !n.isRead).length} غير مقروء
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={onMarkAllRead}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
              >
                تحديد الكل كمقروء
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifications List Body */}
        <div className="overflow-y-auto flex-1 my-3 space-y-2 pr-1">
          {uniqueNotifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            uniqueNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkRead(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  item.isRead
                    ? 'bg-slate-50/60 border-slate-100 opacity-80'
                    : 'bg-blue-50/40 border-blue-100/80 shadow-sm'
                }`}
              >
                <div className={`p-2 rounded-lg text-white mt-0.5 ${
                  item.type === 'DEVICE_APPROVED' || item.type === 'CHECK_IN' ? 'bg-emerald-500' :
                  item.type === 'LOCATION_WARNING' || item.type === 'DEVICE_REJECTED' ? 'bg-amber-500' : 'bg-blue-600'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{item.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 self-center" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
