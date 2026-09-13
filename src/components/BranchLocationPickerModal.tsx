'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Compass,
  Layers,
  Building,
} from 'lucide-react';
import { calculateHaversineDistance } from '@/lib/geofence';

interface BranchLocationPickerModalProps {
  branch: {
    id: string;
    name: string;
    address?: string | null;
    latitude: number;
    longitude: number;
    geofenceRadius: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function BranchLocationPickerModal({
  branch,
  onClose,
  onSuccess,
}: BranchLocationPickerModalProps) {
  const [lat, setLat] = useState<number>(branch.latitude || 32.8872);
  const [lng, setLng] = useState<number>(branch.longitude || 13.1913);
  const [radius, setRadius] = useState<number>(branch.geofenceRadius || 100);
  const [branchName, setBranchName] = useState<string>(branch.name);
  const [branchAddress, setBranchAddress] = useState<string>(branch.address || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // 1. تهيئة خريطة Leaflet تفاعلياً داخل العميل (Client-side dynamic initialization)
  useEffect(() => {
    let isMounted = true;

    async function initLeafletMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      // استيراد ديناميكي لمكتبة Leaflet
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      // إصلاح أيقونات Leaflet الافتراضية
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // إذا كانت الخريطة مهيأة سابقاً تنظيف الحاوية
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current).setView([lat, lng], 16);
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // إنشاء Marker قابل للسحب Drag & Drop
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // إنشاء دائرة الـ Geofence الملونة
      const circle = L.circle([lat, lng], {
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.25,
        radius: radius,
      }).addTo(map);
      circleRef.current = circle;

      // عند سحب الـ Marker تعيين الإحداثيات الجديدة تلقائياً
      marker.on('dragend', (event: any) => {
        const position = event.target.getLatLng();
        setLat(Math.round(position.lat * 1000000) / 1000000);
        setLng(Math.round(position.lng * 1000000) / 1000000);
        circle.setLatLng(position);
      });

      // عند النقل بالنقر على الخريطة
      map.on('click', (e: any) => {
        const newLat = Math.round(e.latlng.lat * 1000000) / 1000000;
        const newLng = Math.round(e.latlng.lng * 1000000) / 1000000;
        setLat(newLat);
        setLng(newLng);
        marker.setLatLng([newLat, newLng]);
        circle.setLatLng([newLat, newLng]);
      });
    }

    initLeafletMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 2. تحديث الخريطة والدائرة عند تغير lat, lng, أو radius من عناصر التحكم
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current && circleRef.current) {
      const newPos = [lat, lng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos);
      circleRef.current.setRadius(radius);
      leafletMapRef.current.panTo(newPos);
    }
  }, [lat, lng, radius]);

  // 3. زر "استخدام موقعي الحالي"
  const handleUseCurrentLocation = () => {
    setStatusMsg('جاري جلب موقعك الحقيقي عبر الـ GPS...');
    setErrorMsg('');

    if (!navigator.geolocation) {
      setErrorMsg('متصفحك لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const newLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setLat(newLat);
        setLng(newLng);
        setStatusMsg(`تم وضع العلامة في موقعك الحالي (الدقة: ${Math.round(pos.coords.accuracy)}m). اضغط حفظ التعديلات للتأكيد.`);
      },
      (err) => {
        setErrorMsg('تعذر الحصول على موقعك الحالي. يرجى التأكد من تشغيل الـ GPS وإعطاء الإذن للمتصفح.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 4. البحث عن موقع بواسطة Nominatim OpenStreetMap Geocoding API
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);
    setErrorMsg('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&accept-language=ar`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
      } else {
        setErrorMsg('لم يتم العثور على نتائج لهذا العنوان.');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء البحث عن العنوان.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const newLat = Math.round(parseFloat(result.lat) * 1000000) / 1000000;
    const newLng = Math.round(parseFloat(result.lon) * 1000000) / 1000000;
    setLat(newLat);
    setLng(newLng);
    setSearchResults([]);
    setSearchQuery(result.display_name);
    setStatusMsg('تم الانتقال إلى العنوان المحدد.');
  };

  // 5. حفظ البيانات والتحقق الخادم والمسافة المعقولة
  const handleSave = async () => {
    setErrorMsg('');
    setStatusMsg('');

    // التحقق من القيم المدخلة
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      setErrorMsg('يرجى تحديد موقع صحيح للفرع على الخريطة.');
      return;
    }

    if (radius <= 0) {
      setErrorMsg('نطاق السماح (Geofence Radius) يجب أن يكون أكبر من 0 متر.');
      return;
    }

    // فحص المسافة بين الموقع القديم والجديد لتنبيه المدير إذا انتقل بمقدار كبير جدًا
    const distShiftMeters = calculateHaversineDistance(
      branch.latitude,
      branch.longitude,
      lat,
      lng
    );

    if (distShiftMeters > 5000) {
      // تغيير بمسافة أكبر من 5 كيلومتر
      const confirmed = window.confirm(
        `تنبيه: لقد قمت بنقل موقع الفرع بمسافة كبيرة جداً (${Math.round(
          distShiftMeters / 1000
        )} كم). هل أنت متأكد من اعتماد الموقع الجديد؟`
      );
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName,
          address: branchAddress,
          latitude: lat,
          longitude: lng,
          geofenceRadius: radius,
          reason: 'تعديل الموقع الجغرافي ونطاق الـ Geofence من لوحة الإدارة',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشل حفظ موقع الفرع');
      } else {
        setStatusMsg('تم حفظ الموقع الجغرافي ونطاق الحضور بنجاح!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg('حدث خطأ بالاتصال بالسيرفر أثناء حفظ التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* الترويسة */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تعديل موقع الفرع ونطاق الحضور</h3>
              <p className="text-xs text-slate-400">إدارة الإحداثيات الجغرافية ودائرة الـ Geofence لـ: {branch.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم المودال الخيارات والخريطة */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* اسم وعنوان الفرع */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم الفرع</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">العنوان الوصفي</label>
              <input
                type="text"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="مثال: طرابلس - وسط المدينة"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* شريط البحث و زر استخدام موقعي الحالي */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearchLocation} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن موقع أو عنوان على الخريطة..."
                className="w-full pr-10 pl-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute left-1.5 top-1.5 bottom-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] transition-colors"
              >
                {searching ? 'جاري البحث...' : 'بحث'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all shrink-0 active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              <span>استخدام موقعي الحالي</span>
            </button>
          </div>

          {/* قائمة نتائج البحث إن وجدت */}
          {searchResults.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 max-h-40 overflow-y-auto space-y-1 text-xs">
              <div className="text-[10px] text-slate-400 font-bold px-2 py-1">نتائج البحث المتاحة:</div>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full p-2 hover:bg-slate-800 text-right rounded-lg text-slate-300 text-xs transition-colors block truncate"
                >
                  📍 {item.display_name}
                </button>
              ))}
            </div>
          )}

          {/* حاوية الخريطة التفاعلية Leaflet */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner h-64 sm:h-80 bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              💡 اضغط على أي نقطة أو اسحب الـ Marker لتغيير الموقع
            </div>
          </div>

          {/* خيارات نطاق الـ Geofence والإحداثيات والمعاينة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">خط العرض (Latitude)</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">خط الطول (Longitude)</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">نطاق السماح (Geofence Radius)</label>
              <div className="space-y-2">
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 outline-none font-bold"
                />
                <div className="flex items-center gap-1.5">
                  {[30, 50, 100, 200].map((rVal) => (
                    <button
                      key={rVal}
                      type="button"
                      onClick={() => setRadius(rVal)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        radius === rVal
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {rVal}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* بطاقة المعاينة النهائية */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-bold">الحالة: تم تحديد إحداثيات الفرع والدائرة بنجاح</span>
            </div>
            <div className="font-mono text-slate-400 text-[11px]">
              {lat.toFixed(5)}, {lng.toFixed(5)} ({radius}m)
            </div>
          </div>
        </div>

        {/* أزرار الحفظ والإغلاق في الأسفل */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-600/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ موقع الفرع ونطاق الحضور</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
