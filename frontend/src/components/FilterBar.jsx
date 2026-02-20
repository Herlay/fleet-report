import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { Filter, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

const FilterBar = ({ onFilterChange }) => {
  const [scope, setScope] = useState('weekly');
  const [year] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(1);
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const weeksArray = Array.from({ length: 52 }, (_, i) => i + 1);

  const getWeekRange = (targetYear, weekNo) => {
  
    let date = new Date(targetYear, 0, 1);
    
   
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1);
    }
    
    const start = addDays(date, (weekNo - 1) * 7);
    const end = addDays(start, 6); 
    
    return { start, end };
  };

  
   //If a user picks a random date in custom mode, will find the nearest Friday to maintain reporting consistency.
  
  const snapToBusinessFriday = (selectedDate) => {
    const date = new Date(selectedDate);
    const day = date.getDay(); 
 
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    const friday = subDays(date, diff);
    return friday;
  };

  useEffect(() => {
    let start, end, label, absoluteWeek;

    if (scope === 'weekly') {
      const range = getWeekRange(year, week);
      start = range.start;
      end = range.end;
      absoluteWeek = week;
      label = `WEEK ${week}`;
    } else {
     
      const fridayStart = snapToBusinessFriday(customStart);
      start = new Date(customStart);
      end = new Date(customEnd);
      absoluteWeek = null; 
      label = `Range: ${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
    }

    onFilterChange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      label,
      absoluteWeek,
      isCustom: scope === 'custom'
    });
  }, [scope, year, week, customStart, customEnd]);

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 no-print transition-all">
 
      <div className="flex items-center px-3 py-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
        <Filter size={16} className="mr-2 text-blue-600" />
        <span className="font-bold text-[10px] uppercase tracking-widest">Select Range</span>
      </div>

   
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setScope('weekly')}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
            scope === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setScope('custom')}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
            scope === 'custom' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Date Range
        </button>
      </div>

      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block" />

     
      {scope === 'weekly' ? (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Select Week</span>
            <select 
              value={week} 
              onChange={(e) => setWeek(Number(e.target.value))} 
              className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none" 
            />
            <span className="text-slate-300 font-bold">/</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={(e) => setCustomEnd(e.target.value)} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none" 
            />
          </div>
          <span className="text-[9px] text-slate-400 italic font-medium leading-tight hidden lg:block">
            Snapped to business cycle<br/>(Fri - Thu)
          </span>
        </div>
      )}
    </div>
  );
};

export default FilterBar;