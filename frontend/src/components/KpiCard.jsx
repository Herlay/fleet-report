import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const KpiCard = ({ title, value, subtext, trend, icon: Icon, color = "blue", itValue, nonItValue }) => {
  // Color mapping for dynamic styles
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="flex items-center text-sm mb-2">
          {trend > 0 ? (
            <span className="text-green-600 flex items-center font-medium bg-green-50 px-2 py-0.5 rounded text-xs">
              <ArrowUpRight size={14} className="mr-1" /> +{trend}%
            </span>
          ) : trend < 0 ? (
            <span className="text-red-600 flex items-center font-medium bg-red-50 px-2 py-0.5 rounded text-xs">
              <ArrowDownRight size={14} className="mr-1" /> {trend}%
            </span>
          ) : (
             <span className="text-slate-400 flex items-center font-medium bg-slate-50 px-2 py-0.5 rounded text-xs">
              <Minus size={14} className="mr-1" /> 0%
            </span>
          )}
          <span className="text-slate-400 ml-2 text-xs">{subtext || "vs last week"}</span>
        </div>
      )}

      {/* IT vs Non-IT Breakdown */}
      {(itValue || nonItValue) && (
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-2">
          <div className="text-[10px] leading-tight">
            <span className="text-slate-400 block uppercase font-bold tracking-tighter">IT</span>
            <span className="text-slate-700 font-semibold">{itValue || 0}</span>
          </div>
          <div className="text-[10px] leading-tight text-right">
            <span className="text-slate-400 block uppercase font-bold tracking-tighter">Non-IT</span>
            <span className="text-slate-700 font-semibold">{nonItValue || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiCard;