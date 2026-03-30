import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import { Filter, CalendarDays, ChevronRight, CalendarRange } from 'lucide-react';

const FilterBar = ({ onFilterChange, hideCustom = false }) => {
  // --- STATE MANAGEMENT ---
  const [scope, setScope] = useState(hideCustom ? 'weekly' : 'weekly');
  const [year] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(1);
  
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const weeksArray = useMemo(() => Array.from({ length: 52 }, (_, i) => i + 1), []);

  // --- LOGIC HELPERS ---
  const getWeekRange = useCallback((targetYear, weekNo) => {
    let date = new Date(targetYear, 0, 1);
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1);
    }
    const start = addDays(date, (weekNo - 1) * 7);
    const end = addDays(start, 6);
    return { start, end };
  }, []);

  // --- EFFECT ---
  useEffect(() => {
    let finalStart, finalEnd, finalLabel, finalAbsoluteWeek;
    const activeScope = hideCustom ? 'weekly' : scope;

    if (activeScope === 'weekly') {
      const range = getWeekRange(year, week);
      finalStart = range.start;
      finalEnd = range.end;
      finalAbsoluteWeek = week;
      finalLabel = `WEEK ${week}`;
    } else {
      let startD = startOfDay(new Date(customStart));
      let endD = startOfDay(new Date(customEnd));
      
      if (isBefore(endD, startD)) {
        endD = startD;
        setCustomEnd(format(startD, 'yyyy-MM-dd'));
      }

      finalStart = startD;
      finalEnd = endD;
      finalAbsoluteWeek = null; 
      finalLabel = `${format(startD, 'MMM d')} - ${format(endD, 'MMM d, yyyy')}`;
    }

    onFilterChange({
      startDate: format(finalStart, 'yyyy-MM-dd'),
      endDate: format(finalEnd, 'yyyy-MM-dd'),
      label: finalLabel,
      absoluteWeek: finalAbsoluteWeek,
      isCustom: activeScope === 'custom'
    });
    
  }, [scope, year, week, customStart, customEnd, onFilterChange, getWeekRange, hideCustom]); 

  // --- RENDER ---
  return (
    // ARCHITECT FIX: Added bg-white, border-slate-200, rounded-lg, shadow-sm, and padding (p-3 sm:px-4 sm:py-3)
    <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded-lg shadow-sm no-print font-sans"> 
      
      {/* 1. LABEL & TOGGLE WRAPPER */}
      <div className="flex items-center gap-3">
        {/* Subtle Icon Label */}
        <div className="flex items-center gap-1.5 text-slate-500">
          <Filter size={14} className="text-indigo-500" />
          <span className="font-semibold text-xs uppercase tracking-wider">Filter By</span>
        </div>

        {/* Segmented Control (macOS Style) */}
        {!hideCustom && (
          <div className="flex bg-slate-100/80 p-0.5 rounded-md border border-slate-200/60 shadow-inner">
            {['weekly', 'custom'].map((type) => (
              <button
                key={type}
                onClick={() => setScope(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all capitalize duration-200 ${
                  scope === type 
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/30 border border-transparent'
                }`}
              >
                {type === 'weekly' ? <CalendarDays size={13} /> : <CalendarRange size={13} />}
                {type === 'weekly' ? 'Fixed Weeks' : 'Custom Range'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden sm:block h-5 w-px bg-slate-200" />

      {/* 2. DYNAMIC INPUT CONTROLS */}
      {(hideCustom || scope === 'weekly') ? (
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
          
          {/* Week Dropdown */}
          <div className="relative">
            <select 
              value={week} 
              onChange={(e) => setWeek(Number(e.target.value))} 
              className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-bold py-1.5 pl-3 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:bg-slate-50 cursor-pointer"
            >
              {weeksArray.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
            {/* Custom Caret for Select */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>
          
          {/* Display actual dates as a quiet badge */}
          <div className="flex items-center bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="text-xs font-medium text-slate-500">
              {format(getWeekRange(year, week).start, 'MMM d')} <span className="mx-1 text-slate-300">→</span> {format(getWeekRange(year, week).end, 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
          <div className="flex items-center bg-white border border-slate-300 rounded-md shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all hover:border-slate-400">
            
            {/* Start Date */}
            <input 
              type="date" 
              value={customStart} 
              onChange={(e) => setCustomStart(e.target.value)} 
              className="bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer" 
            />
            
            <div className="bg-slate-100 h-full px-2 flex items-center border-x border-slate-200">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">To</span>
            </div>
            
            {/* End Date */}
            <input 
              type="date" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
              className="bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;