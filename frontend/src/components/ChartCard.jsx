import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend
);

const ChartCard = ({ title, type = 'bar', data, options }) => {
  const isDoughnut = type === 'doughnut';

  const finalOptions = useMemo(() => {
    const isHorizontal = options?.indexAxis === 'y';
    const baseScales = isDoughnut ? {} : {
      x: {
        beginAtZero: true,
        grid: { display: isHorizontal, color: '#f1f5f9' },
        ticks: { font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { display: !isHorizontal, color: '#f1f5f9' },
        ticks: { font: { size: 10, weight: isHorizontal ? 'bold' : 'normal' } }
      }
    };

    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: options?.indexAxis || 'x',
      ...options,
      scales: isDoughnut ? {} : {
        x: { ...baseScales.x, ...options?.scales?.x },
        y: { ...baseScales.y, ...options?.scales?.y }
      }
    };
  }, [options, isDoughnut]);

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 h-96 flex items-center justify-center">
        <p className="text-slate-400 text-xs animate-pulse">AWAITING DATA...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
      <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase">{title}</h3>
      <div className="flex-1 w-full relative min-h-[250px]">
        {type === 'bar' && (
          <Bar 
            key={`bar-${data.labels.length}`} 
            data={data} 
            options={finalOptions} 
            redraw={true} 
          />
        )}
        {type === 'doughnut' && (
          <Doughnut 
            key={`doughnut-${data.labels.length}`} 
            data={data} 
            options={{ ...finalOptions, cutout: '70%' }} 
            redraw={true} 
          />
        )}
      </div>
    </div>
  );
};

export default ChartCard;