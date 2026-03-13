import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import { Filter, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

/**
 * @param {Function} onFilterChange - Callback function
 * @param {Boolean} hideCustom - If true, hides the custom range toggle (useful for fixed-week reports)
 */
const FilterBar = ({ onFilterChange, hideCustom = false }) => {
  const [scope, setScope] = useState('weekly');
  const [year] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(1);
  
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const weeksArray = useMemo(() => Array.from({ length: 52 }, (_, i) => i + 1), []);

  const getFirstFridayOfYear = (targetYear) => {
    let date = new Date(targetYear, 0, 1);
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const getWeekRange = (targetYear, weekNo) => {
    const firstFriday = getFirstFridayOfYear(targetYear);
    const start = addDays(firstFriday, (weekNo - 1) * 7);
    const end = addDays(start, 6);
    return { start, end };
  };

  useEffect(() => {
    let start, end, label, absoluteWeek;

    // Safety check: if hideCustom is true, force scope to 'weekly'
    const activeScope = hideCustom ? 'weekly' : scope;

    if (activeScope === 'weekly') {
      const range = getWeekRange(year, week);
      start = range.start;
      end = range.end;
      absoluteWeek = week;
      label = `WEEK ${week}`;
    } else {
      start = startOfDay(new Date(customStart));
      end = startOfDay(new Date(customEnd));
      
      if (isBefore(end, start)) {
        end = start;
      }

      absoluteWeek = null; 
      label = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }

    onFilterChange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      label,
      absoluteWeek,
      isCustom: activeScope === 'custom'
    });
  }, [scope, year, week, customStart, customEnd, onFilterChange, hideCustom]);

  return (
    <div className="mt-6 bg-white w-full p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 no-print transition-all"> 
      
      {/* Scope Indicator */}
      <div className="flex items-center px-3 py-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
        <Filter size={14} className="mr-2 text-blue-600" />
        <span className="font-bold text-[10px] uppercase tracking-widest">Reporting Period</span>
      </div>

      {/* Toggle Buttons - Hidden if hideCustom is true */}
      {!hideCustom ? (
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['weekly', 'custom'].map((type) => (
            <button
              key={type}
              onClick={() => setScope(type)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                scope === type ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === 'weekly' ? 'Fixed Weeks' : 'Custom Range'}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-1.5 text-xs font-bold text-blue-700 bg-white border border-slate-200 rounded-lg shadow-sm">
          Fixed Weeks
        </div>
      )}

      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />

      {/* Conditional Inputs */}
      {/* If hideCustom is true, it only ever shows the weekly selector */}
      {(hideCustom || scope === 'weekly') ? (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Week No.</span>
            <select 
              value={week} 
              onChange={(e) => setWeek(Number(e.target.value))} 
              className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
            >
              {weeksArray.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center text-slate-400 gap-2">
            <ChevronRight size={14} />
            <span className="text-[11px] font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
              {format(getWeekRange(year, week).start, 'MMM d')} — {format(getWeekRange(year, week).end, 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-blue-500" />
            <input 
              type="date" 
              value={customStart} 
              onChange={(e) => setCustomStart(e.target.value)} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 cursor-pointer" 
            />
            <span className="text-slate-300 font-bold">to</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 cursor-pointer" 
            />
          </div>
          
          <div className="flex flex-col border-l border-slate-100 pl-3">
             <span className="text-[9px] text-emerald-600 font-bold leading-tight uppercase flex items-center gap-1">
               Strict Range
             </span>
             <span className="text-[9px] text-slate-400 italic">
               (Calendar Based)
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;