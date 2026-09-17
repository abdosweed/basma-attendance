'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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
    startTime: '09:00',
    endTime: '16:00',
    gracePeriodMins: 15,
    isNightShift: false,
    maxBreaksPerShift: 1,
    workingDays: 'SUN,MON,TUE,WED,THU',
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

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg(null);

    try {
      const method = editingShiftId ? 'PUT' : 'POST';
      const bodyPayload = editingShiftId ? { ...shiftForm, id: editingShiftId } : shiftForm;

      const res = await fetch('/api/admin/shifts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
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
          startTime: '09:00',
          endTime: '16:00',
          gracePeriodMins: 15,
          isNightShift: false,
          maxBreaksPerShift: 1,
          workingDays: 'SUN,MON,TUE,WED,THU',
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

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    }
  };

  const toggleSelectEmployee = (empId: string) => {
    if (selectedEmployeeIds.includes(empId)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== empId));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, empId]);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase()) || emp.employeeNumber.includes(searchTerm);
    const matchDept = !deptFilter || emp.departmentId === deptFilter;
    return matchSearch && matchDept;
  });

  const openEditModal = (shift: any) => {
    setEditingShiftId(shift.id);
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMins: shift.gracePeriodMins,
      isNightShift: shift.isNightShift,
      maxBreaksPerShift: shift.maxBreaksPerShift,
      workingDays: shift.workingDays,
    });
    setShowShiftModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 dir-rtl">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500">جاري تحميل واجهة مواعيد الورديات...</p>
        </div>
      </div>
    );
  }

  const departmentsList = Array.from(
    new Set(employees.map((e) => JSON.stringify({ id: e.departmentId, name: e.department?.name })))
  )
    .map((s) => JSON.parse(s))
    .filter((d) => d.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col dir-rtl">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* الهيدر والعنوان الرئيسي */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-700">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">إدارة الورديات وتسكين الموظفين</h1>
              <p className="text-xs text-slate-500 mt-1">
                تعريف مواعيد الدوام الرسمية وتعيين الموظفين في وردياتهم المعتمدة
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingShiftId(null);
              setShiftForm({
                name: '',
                startTime: '09:00',
                endTime: '16:00',
                gracePeriodMins: 15,
                isNightShift: false,
                maxBreaksPerShift: 1,
                workingDays: 'SUN,MON,TUE,WED,THU',
              });
              setShowShiftModal(true);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وردية جديدة</span>
          </button>
        </div>

        {/* تنبيه الحالة */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* كروت الورديات المتاحة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shifts.map((shift) => {
            const isNight = shift.isNightShift;
            const assignedCount = shift._count?.employeeShifts || 0;

            return (
              <div
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id)}
                className={`bg-white border rounded-3xl p-5 space-y-4 cursor-pointer transition-all ${
                  selectedShiftId === shift.id
                    ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isNight ? (
                      <Moon className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Sun className="w-5 h-5 text-sky-600" />
                    )}
                    <span className="font-bold text-sm text-slate-900">{shift.name}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(shift);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">توقيت العمل:</span>
                    <span className="font-bold text-slate-900 dir-ltr inline-block mt-0.5">
                      {shift.startTime} → {shift.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">فترة السماح:</span>
                    <span className="font-bold text-emerald-700 inline-block mt-0.5">
                      {shift.gracePeriodMins} دقيقة
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>الموظفين المسكنين:</span>
                  </span>
                  <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full font-bold">
                    {assignedCount} موظف
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* واجهة تسكين الموظفين بالوردية */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>تسكين الموظفين في الوردية المحددة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                اختر الوردية أعلاه، حدد الموظفين المطلوبين، ثم اضغط حفظ التسكين
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleAssignEmployees}
                disabled={actionLoading || selectedEmployeeIds.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>اعتماد تسكين ({selectedEmployeeIds.length}) موظف</span>
              </button>
            </div>
          </div>

          {/* الفلاتر والبحث */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
              <input
                type="text"
                placeholder="ابحث باسم الموظف أو الرقم الوظيفي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value="">جميع الأقسام</option>
              {departmentsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              onClick={toggleSelectAll}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-200"
            >
              {selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-sky-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>تحديد الكل ({filteredEmployees.length})</span>
            </button>
          </div>

          {/* جدول الموظفين */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-12 text-center">اختيار</th>
                  <th className="p-4">الموظف</th>
                  <th className="p-4">القسم</th>
                  <th className="p-4">الفرع الرئيسي</th>
                  <th className="p-4">الوردية الحالية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  const currentShift = emp.employeeShifts[0]?.shift;

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => toggleSelectEmployee(emp.id)}
                      className={`hover:bg-slate-50 transition-all cursor-pointer ${
                        isSelected ? 'bg-sky-50/60' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600 inline" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 inline" />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeNumber}</div>
                      </td>
                      <td className="p-4 text-slate-700">{emp.department?.name || 'غير محدد'}</td>
                      <td className="p-4 text-slate-700">{emp.primaryBranch?.name || 'الفرع الرئيسي'}</td>
                      <td className="p-4">
                        {currentShift ? (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                            {currentShift.name} ({currentShift.startTime} - {currentShift.endTime})
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px]">
                            لم يتم التسكين
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* مودال إنشاء / تعديل الوردية */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-sky-600" />
              <span>{editingShiftId ? 'تعديل بيانات الوردية' : 'إضافة وردية دوام جديدة'}</span>
            </h3>

            <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الوردية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثل: الوردية الصباحية"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت البداية (HH:mm):</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وقت النهاية (HH:mm):</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">فترة السماح (بالدقائق):</label>
                  <input
                    type="number"
                    min={0}
                    value={shiftForm.gracePeriodMins}
                    onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMins: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحد الأقصى للاستراحات:</label>
                  <input
                    type="number"
                    min={1}
                    value={shiftForm.maxBreaksPerShift}
                    onChange={(e) => setShiftForm({ ...shiftForm, maxBreaksPerShift: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <input
                  type="checkbox"
                  id="isNightShift"
                  checked={shiftForm.isNightShift}
                  onChange={(e) => setShiftForm({ ...shiftForm, isNightShift: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-0"
                />
                <label htmlFor="isNightShift" className="text-slate-700 font-bold cursor-pointer">
                  وردية ليلية تتجاوز منتصف الليل (مثال: 23:00 إلى 07:00)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>حفظ الوردية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
