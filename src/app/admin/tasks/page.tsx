'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  CheckSquare,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Check,
  ListTodo,
  Clock,
  User,
  Zap,
  ArrowRight,
} from 'lucide-react';

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    selectedEmployeeIds: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, empRes] = await Promise.all([
        fetch('/api/admin/tasks'),
        fetch('/api/employees'),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          employeeIds: taskForm.selectedEmployeeIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية حفظ المهمة', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تم إسناد المهمة بنجاح 📋', type: 'success' });
        setShowTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          priority: 'MEDIUM',
          dueDate: '',
          selectedEmployeeIds: [],
        });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ بالاتصال أثناء حفظ المهمة', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectEmployee = (id: string) => {
    setTaskForm((prev) => {
      const exists = prev.selectedEmployeeIds.includes(id);
      const updated = exists
        ? prev.selectedEmployeeIds.filter((eId) => eId !== id)
        : [...prev.selectedEmployeeIds, id];
      return { ...prev, selectedEmployeeIds: updated };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-xs text-slate-500">جاري تحميل واجهة إدارة وتكليف المهام 2026...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[98%] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* الترويسة الرئيسية */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-sky-600 rounded-2xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
              title="العودة للوحة الإدارة الرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ListTodo className="w-6 h-6 text-sky-600" />
                <span>إدارة وتكليف مهام الموظفين (Task Engine 2026)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                إسناد المسؤوليات والمهام اليومية للموظفين ومتابعة نسبة الإنجاز والربط ببصمة الحضور والانصراف.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTaskModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-sky-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ إسناد مهمة جديدة</span>
          </button>
        </div>

        {/* رسائل التنبيه */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
            <span className="font-bold">{statusMsg.text}</span>
          </div>
        )}

        {/* قائمة المهام المسندة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-sm">
              <div className="flex items-start justify-between">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    task.priority === 'URGENT'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : task.priority === 'HIGH'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  {task.priority === 'URGENT' ? '🚨 طارئة جداً' : task.priority === 'HIGH' ? '⚡ عالية الأهمية' : '📋 عادية'}
                </span>

                <span className="text-[10px] text-slate-500 font-mono">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-LY') : 'بدون تاريخ'}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
              {task.description && <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>}

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">الموظفون المكلفون ({task.assignments?.length || 0}):</span>
                <div className="flex flex-wrap gap-1">
                  {task.assignments?.map((a: any) => (
                    <span
                      key={a.id}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1"
                    >
                      <User className="w-3 h-3 text-sky-600" />
                      {a.employee?.firstName} {a.employee?.lastName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal إسناد مهمة جديدة */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-sky-600" />
                  <span>إسناد مهمة جديدة لموظف أو مجموعة</span>
                </h3>
                <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">عنوان المهمة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثل: مراجعة كشوفات التقارير الشهرية"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">تفاصيل ووصف المهمة</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب التوجيهات أو الملاحظات الخاصة بالمهمة..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">درجة الأهمية</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    >
                      <option value="LOW">📋 عادية</option>
                      <option value="MEDIUM">⚡ متوسطة</option>
                      <option value="HIGH">🔥 عالية</option>
                      <option value="URGENT">🚨 طارئة جداً</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">تاريخ التسليم المتوقع</label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* اختيار الموظفين المكلفين */}
                <div>
                  <label className="block text-slate-700 mb-1.5 font-bold">الموظفون المكلفون بإنجاز المهمة</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1.5 bg-slate-50">
                    {employees.map((emp) => {
                      const isSelected = taskForm.selectedEmployeeIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleSelectEmployee(emp.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-sky-100 border-sky-300 text-sky-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{emp.firstName} {emp.lastName} ({emp.employeeNumber})</span>
                          {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
                    إلغاء
                  </button>
                  <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg">
                    {actionLoading ? 'جاري الحفظ...' : 'إسناد المهمة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
