/**
 * محرك التغذية الراجعة الحسية والتفاعل اللمسي (Haptic Feedback Engine)
 * يفعل الاهتزاز الخفيف والذكي عند البصمات، الموافقة، والتحذيرات
 */

export type HapticPattern = 'success' | 'error' | 'warning' | 'tap';

export function triggerHaptic(pattern: HapticPattern = 'tap') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (pattern) {
      case 'success':
        // نمط اهتزاز تأكيدي قصير مزدوج [50ms, 50ms, 50ms]
        navigator.vibrate([50, 50, 50]);
        break;

      case 'error':
        // نمط تحذيري [100ms, 50ms, 100ms]
        navigator.vibrate([100, 50, 100]);
        break;

      case 'warning':
        // نمط تنبيهي متوسط [80ms, 40ms, 80ms]
        navigator.vibrate([80, 40, 80]);
        break;

      case 'tap':
      default:
        // نقرة لمسية سريعة [40ms]
        navigator.vibrate(40);
        break;
    }
  } catch (err) {
    // تجاهل في حالة عدم دعم الجهاز أو تقييد المتصفح
  }
}
