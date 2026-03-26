import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Activity } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface MetricChartProps {
  data: any[];
  type: 'cpu' | 'memory' | 'network' | 'disk';
  title: string;
  color?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({ data, type, title, color = '#10b981' }) => {
  const { theme } = useAppStore();
  const lastValue = data[data.length - 1]?.value || 0;
  const avgValue = data.reduce((acc, d) => acc + d.value, 0) / (data.length || 1);

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="h-full min-h-[560px] flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-md dark:shadow-none transition-all hover:border-emerald-500/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">{title}</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {lastValue.toFixed(1)}
            </span>
            <span className="text-lg font-semibold text-zinc-400">{type === 'network' ? 'MB/s' : '%'}</span>
          </div>
        </div>
        
        <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
          <div className={cn("w-3 h-3 rounded-full animate-pulse", {
            "bg-emerald-500": lastValue < 80,
            "bg-amber-500": lastValue >= 80 && lastValue < 95,
            "bg-red-500": lastValue >= 95,
          })} />
        </div>
      </div>

      <div className="mt-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Average</span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          {avgValue.toFixed(1)}{type === 'network' ? ' MB/s' : '%'}
        </span>
      </div>
      
      <div className="h-[260px] w-full flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="timestamp" 
              hide 
            />
            <YAxis 
              domain={[0, type === 'network' ? 'auto' : 100]} 
              hide 
            />
            <Tooltip 
              cursor={{ stroke: theme === 'dark' ? '#ffffff10' : '#00000010', strokeWidth: 2 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-zinc-900 dark:bg-white border border-white/10 dark:border-zinc-200 p-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
                    >
                      <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-2">
                        {format(payload[0].payload.timestamp, 'HH:mm:ss')}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-2xl font-black text-white dark:text-zinc-950 tracking-tighter">
                          {(payload[0].value as number).toFixed(2)}
                          <span className="text-xs ml-1 font-bold opacity-50">{type === 'network' ? ' MB/s' : '%'}</span>
                        </p>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#gradient-${type})`} 
              strokeWidth={4}
              isAnimationActive={true}
              animationDuration={1500}
              dot={false}
              activeDot={{ r: 8, strokeWidth: 4, stroke: theme === 'dark' ? '#18181b' : '#ffffff', fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/10 grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Minimum</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">
              {data.length > 0 ? Math.min(...data.map(d => d.value)).toFixed(1) : '0.0'}
              <span className="text-base ml-1 text-zinc-400">{type === 'network' ? 'MB/s' : '%'}</span>
            </span>
          </div>
          <div className="w-px h-10 bg-zinc-200 dark:bg-white/10 justify-self-center" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Maximum</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">
              {data.length > 0 ? Math.max(...data.map(d => d.value)).toFixed(1) : '0.0'}
              <span className="text-base ml-1 text-zinc-400">{type === 'network' ? 'MB/s' : '%'}</span>
            </span>
          </div>
        </div>
        
        <div
          aria-hidden="true"
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};
