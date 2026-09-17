'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Clock,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sun,
  Moon,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  Check,
  Zap,
  Sliders,
  ArrowRight,
} from 'lucide-react';

const WEEK_DAYS = [
  { id: 'SUN', label: 'الأحد' },
  { id: 'MON', label: 'الإثنين' },
  { id: 'TUE', label: 'الثلاثاء' },
  { id: 'WED', label: 'الأربعاء' },
  { id: 'THU', label: 'الخميس' },
  { id: 'FRI', label: 'الجمعة' },
  { id: 'SAT', label: 'السبت' },
];

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal State for Shift Create/Edit
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    type: 'FIXED', // FIXED, FLEXIBLE, SPLIT
    startTime: '08:00',
    endTime: '16:00',
    splitStartTime: '17:00',
    splitEndTime: '21:00',
    requiredHours: 8.0,
    gracePeriodMins: 15,
    maxBreakMins: 60,
    isNightShift: false,
    selectedDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
  });

  // Shift Assignment State
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shifts');
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setEmployees(data.employees || []);
        if (data.shifts?.length > 0 && !selectedShiftId) {
          setSelectedShiftId(data.shifts[0].id);
        }
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

  const toggleDay = (dayId: string) => {
    setShiftForm((prev) => {
      const exists = prev.selectedDays.includes(dayId);
      const updated = exists
        ? prev.selectedDays.filter((d) => d !== dayId)
        : [...prev.selectedDays, dayId];
      return { ...prev, selectedDays: updated };
    });
  };

  const selectPresetDays = (type: 'OFFICIAL' | 'ALL' | 'WEEKEND') => {
    if (type === 'OFFICIAL') {
      setShiftForm((prev) => ({ ...prev, selectedDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'] }));
    } else if (type === 'ALL') {
      setShiftForm((prev) => ({ ...prev, selectedDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] }));
    } else {
      setShiftForm((prev) => ({ ...prev, selectedDays: ['FRI', 'SAT'] }));
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg(null);

    try {
      const method = editingShiftId ? 'PUT' : 'POST';
      const payload = {
        ...shiftForm,
        workingDays: shiftForm.selectedDays.join(','),
        id: editingShiftId || undefined,
      };

      const res = await fetch('/api/admin/shifts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية الحفظ', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تم حفظ بيانات الوردية بنجاح 🟢', type: 'success' });
        setShowShiftModal(false);
        setEditingShiftId(null);
        setShiftForm({
          name: '',
          type: 'FIXED',
          startTime: '08:00',
          endTime: '16:00',
          splitStartTime: '17:00',
          splitEndTime: '21:00',
          requiredHours: 8.0,
          gracePeriodMins: 15,
          maxBreakMins: 60,
          isNightShift: false,
          selectedDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
        });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ في الاتصال بالخادم', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignEmployees = async () => {
    if (!selectedShiftId) {
      setStatusMsg({ text: 'يرجى اختيار الوردية المستهدفة أولاً', type: 'error' });
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setStatusMsg({ text: 'يرجى تحديد موظف واحد على الأقل لتسكينه بالوردية', type: 'error' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/admin/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: selectedShiftId,
          employeeIds: selectedEmployeeIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية التسكين', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تم تسكين الموظفين بالوردية بنجاح 🟢', type: 'success' });
        setSelectedEmployeeIds([]);
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ بالاتصال أثناء تسكين الموظفين', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (shift: any) => {
    setEditingShiftId(shift.id);
    const daysArr = shift.workingDays ? shift.workingDays.split(',') : ['SUN', 'MON', 'TUE', 'WED', 'THU'];
    setShiftForm({
      name: shift.name,
      type: shift.type || 'FIXED',
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '16:00',
      splitStartTime: shift.splitStartTime || '17:00',
      splitEndTime: shift.splitEndTime || '21:00',
      requiredHours: shift.requiredHours || 8.0,
      gracePeriodMins: shift.gracePeriodMins || 15,
      maxBreakMins: shift.maxBreakMins || 60,
      isNightShift: Boolean(shift.isNightShift),
      selectedDays: daysArr,
    });
    setShowShiftModal(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const empNum = emp.employeeNumber.toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase()) || empNum.includes(searchTerm.toLowerCase());
    const matchDept = !deptFilter || emp.departmentId === deptFilter;
    return matchSearch && matchDept;
  });

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((eId) => eId !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const departmentsList = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean).map((d) => JSON.stringify(d)))
  ).map((s: any) => JSON.parse(s));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500">جاري تحميل واجهة مواعيد الدوام والورديات الحديثة 2026...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[98%] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* الترويسة العليا */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-sky-600 rounded-2xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
              title="العودة للوحة الإدارة الرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>

            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-sky-600" />
                <span>إدارة الورديات ومواعيد الدوام الذكية (2026 Shift Engine)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                تعريف أنواع الورديات، إعدادات تناوب يوم الجمعة، اختيار أيام الدوام التفاعلية وتسكين الموظفين بسهولة.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingShiftId(null);
              setShiftForm({
                name: '',
                type: 'FIXED',
                startTime: '08:00',
                endTime: '16:00',
                splitStartTime: '17:00',
                splitEndTime: '21:00',
                requiredHours: 8.0,
                gracePeriodMins: 15,
                maxBreakMins: 60,
                isNightShift: false,
                selectedDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
              });
              setShowShiftModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-sky-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ تعريف وردية جديدة</span>
          </button>
        </div>

        {/* تنبيهات الحالة */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* قسم بطاقات الورديات المعرفة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => {
            const shiftDays = shift.workingDays ? shift.workingDays.split(',') : [];
            const isAssigned = selectedShiftId === shift.id;

            return (
              <div
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                  isAssigned
                    ? 'bg-white border-sky-500 shadow-lg ring-2 ring-sky-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 mb-1 inline-block">
                      {shift.type === 'FLEXIBLE' ? '⚡ وردية مرنة' : shift.type === 'SPLIT' ? '✂️ فترتين مقسومة' : '⏱️ وردية ثابتة'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{shift.name}</h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(shift);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* تفاصيل التوقيت */}
                <div className="space-y-2 text-xs mb-4">
                  {shift.type === 'FIXED' && (
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500">ساعات الدوام:</span>
                      <span className="font-bold text-sky-700 font-mono">
                        {shift.startTime} ➔ {shift.endTime}
                      </span>
                    </div>
                  )}

                  {shift.type === 'FLEXIBLE' && (
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500">الدوام المطلوب:</span>
                      <span className="font-bold text-amber-700 font-mono">{shift.requiredHours || 8} ساعات يومياً</span>
                    </div>
                  )}

                  {shift.type === 'SPLIT' && (
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">الفترة الأولى:</span>
                        <span className="font-bold text-sky-700 font-mono">{shift.startTime} ➔ {shift.endTime}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">الفترة الثانية:</span>
                        <span className="font-bold text-emerald-700 font-mono">{shift.splitStartTime} ➔ {shift.splitEndTime}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>فترة السماح: <strong className="text-slate-800">{shift.gracePeriodMins} دقيقة</strong></span>
                    <span>الاستراحة: <strong className="text-slate-800">{shift.maxBreakMins} دقيقة</strong></span>
                  </div>
                </div>

                {/* شارات أيام العمل */}
                <div className="flex flex-wrap gap-1">
                  {WEEK_DAYS.map((d) => {
                    const active = shiftDays.includes(d.id);
                    return (
                      <span
                        key={d.id}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                          active
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    المسكنين:
                  </span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {shift._count?.employeeShifts || 0} موظف
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* قسم تسكين الموظفين في الوردية المحددة */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>تسكين الموظفين في الوردية المحددة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر الوردية من الأعلى، حدد الموظفين المطلوبين، ثم اضغط حفظ التسكين
              </p>
            </div>

            <button
              onClick={handleAssignEmployees}
              disabled={actionLoading || selectedEmployeeIds.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد تسكين ({selectedEmployeeIds.length}) موظف</span>
            </button>
          </div>

          {/* فلاتر البحث والتصفية */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث باسم الموظف أو الرقم الوظيفي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value="">جميع الأقسام ({departmentsList.length})</option>
              {departmentsList.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-700 border border-slate-200 flex items-center justify-center gap-2 transition-all"
            >
              {selectedEmployeeIds.length === filteredEmployees.length ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>تحديد الكل ({filteredEmployees.length})</span>
            </button>
          </div>

          {/* جدول الموظفين */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">اختيار</th>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">الفرع الرئيسي</th>
                  <th className="p-3">الوردية الحالية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  const currentShift = emp.employeeShifts?.[0]?.shift;

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => toggleSelectEmployee(emp.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 text-center">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-sky-600 mx-auto" /> : <Square className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.employeeNumber}</div>
                      </td>
                      <td className="p-3 text-slate-600">{emp.department?.name || 'عام'}</td>
                      <td className="p-3 text-slate-600">{emp.primaryBranch?.name || 'الفرع الرئيسي'}</td>
                      <td className="p-3">
                        {currentShift ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200">
                            {currentShift.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">بدون وردية</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal إضافة/تعديل الوردية العصري */}
        {showShiftModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-sky-600" />
                  <span>{editingShiftId ? 'تعديل بيانات الوردية' : 'تعريف وردية عمل جديدة (2026)'}</span>
                </h3>
                <button
                  onClick={() => setShowShiftModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
                {/* اسم ونوع الوردية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">اسم الوردية</label>
                    <input
                      type="text"
                      required
                      placeholder="مثل: الوردية الصباحية / الفنية"
                      value={shiftForm.name}
                      onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">نوع الوردية</label>
                    <select
                      value={shiftForm.type}
                      onChange={(e) => setShiftForm({ ...shiftForm, type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    >
                      <option value="FIXED">⏱️ وردية ثابتة (ساعات محددة)</option>
                      <option value="FLEXIBLE">⚡ وردية مرنة (ساعات دوام حر)</option>
                      <option value="SPLIT">✂️ وردية فترتين (مقسومة)</option>
                    </select>
                  </div>
                </div>

                {/* اختيار أيام الأسبوع التفاعلي */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-700 font-bold">أيام العمل الأسبوعية للوردية</label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => selectPresetDays('OFFICIAL')}
                        className="text-sky-600 hover:underline font-bold"
                      >
                        رسمي (أحد-خميس)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectPresetDays('ALL')}
                        className="text-amber-600 hover:underline font-bold"
                      >
                        كل الأيام
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = shiftForm.selectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`py-2 rounded-xl border font-bold transition-all text-center ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* توقيتات الدوام */}
                {shiftForm.type === 'FIXED' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1 font-bold">وقت الحضور (البداية)</label>
                      <input
                        type="time"
                        required
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-bold">وقت الانصراف (النهاية)</label>
                      <input
                        type="time"
                        required
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}

                {shiftForm.type === 'FLEXIBLE' && (
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">عدد ساعات الدوام المطلوبة يومياً</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={shiftForm.requiredHours}
                      onChange={(e) => setShiftForm({ ...shiftForm, requiredHours: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {shiftForm.type === 'SPLIT' && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">بداية الفترة الأولى</label>
                        <input
                          type="time"
                          value={shiftForm.startTime}
                          onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">نهاية الفترة الأولى</label>
                        <input
                          type="time"
                          value={shiftForm.endTime}
                          onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">بداية الفترة الثانية</label>
                        <input
                          type="time"
                          value={shiftForm.splitStartTime}
                          onChange={(e) => setShiftForm({ ...shiftForm, splitStartTime: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-bold">نهاية الفترة الثانية</label>
                        <input
                          type="time"
                          value={shiftForm.splitEndTime}
                          onChange={(e) => setShiftForm({ ...shiftForm, splitEndTime: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* فترة السماح والاستراحة */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">فترة السماح (بالدقائق)</label>
                    <input
                      type="number"
                      value={shiftForm.gracePeriodMins}
                      onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMins: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">أقصى استراحة مسموحة (دقائق)</label>
                    <input
                      type="number"
                      value={shiftForm.maxBreakMins}
                      onChange={(e) => setShiftForm({ ...shiftForm, maxBreakMins: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm transition-all text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ الوردية'}
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
