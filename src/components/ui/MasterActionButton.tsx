import React from 'react';

export type ActionType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';

interface MasterActionButtonProps {
  actionType: ActionType;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}

export const MasterActionButton: React.FC<MasterActionButtonProps> = ({
  actionType,
  onClick,
  isLoading = false,
  disabled = false,
  disabledReason,
  className = '',
}) => {
  const getStyle = () => {
    if (disabled) {
      return 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none';
    }
    switch (actionType) {
      case 'CHECK_IN':
        return 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-[0_8px_24px_-4px_rgba(5,150,105,0.4)] border-emerald-500';
      case 'CHECK_OUT':
        return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-[0_8px_24px_-4px_rgba(220,38,38,0.4)] border-rose-500';
      case 'BREAK_START':
        return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-[0_8px_24px_-4px_rgba(217,119,6,0.4)] border-amber-500';
      case 'BREAK_END':
        return 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-[0_8px_24px_-4px_rgba(30,64,175,0.4)] border-blue-500';
      default:
        return 'bg-blue-700 hover:bg-blue-800 text-white shadow-lg border-blue-600';
    }
  };

  const getLabel = () => {
    if (isLoading) return 'جارٍ المعالجة...';
    switch (actionType) {
      case 'CHECK_IN':
        return 'تسجيل الحضور';
      case 'CHECK_OUT':
        return 'تسجيل الانصراف';
      case 'BREAK_START':
        return 'بدء الاستراحة';
      case 'BREAK_END':
        return 'إنهاء الاستراحة';
      default:
        return 'تنفيذ الإجراء';
    }
  };

  const getIcon = () => {
    if (isLoading) {
      return <span className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full ml-3" />;
    }
    switch (actionType) {
      case 'CHECK_IN':
        return (
          <svg className="w-6 h-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'CHECK_OUT':
        return (
          <svg className="w-6 h-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      case 'BREAK_START':
      case 'BREAK_END':
        return (
          <svg className="w-6 h-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center transition-all duration-200 active:scale-[0.98] border select-none ${getStyle()} ${className}`}
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </button>
      {disabled && disabledReason && (
        <p className="text-xs text-center text-slate-500 mt-2 font-medium">{disabledReason}</p>
      )}
    </div>
  );
};
