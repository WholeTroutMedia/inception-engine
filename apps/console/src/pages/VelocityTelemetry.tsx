import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Activity, Terminal, GitCommit, GitMerge, Cpu, Eye, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody as CardContent } from '@inception/ui';

// High density mock representation of actual local/dispatch execution data
const performanceData = [
  { time: '04:00', inception: 1200, human: 40, variance: 1160 },
  { time: '04:10', inception: 1800, human: 42, variance: 1758 },
  { time: '04:20', inception: 2600, human: 75, variance: 2525 },
  { time: '04:30', inception: 4100, human: 110, variance: 3990 },
  { time: '04:40', inception: 5800, human: 135, variance: 5665 },
  { time: '04:50', inception: 6400, human: 150, variance: 6250 },
  { time: '05:00', inception: 7021, human: 155, variance: 6866 },
];

const commitDistribution = [
  { category: 'Feature Code', payload: 4500 },
  { category: 'Refactoring', payload: 409 },
  { category: 'Tests / QA', payload: 1200 },
  { category: 'Infrastructure', payload: 912 },
];

export default function VelocityTelemetry() {
  return (
    <div className="p-8 pb-32 animate-fade-in flex flex-col gap-6 max-w-[1600px] mx-auto text-slate-100 font-sans tracking-tight">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono tracking-wider text-xs px-2.5 py-0.5 rounded-sm inline-flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-2 inline-block" />
              TELEMETRY: LIVE
            </div>
            <div className="text-xs text-slate-500 font-mono">ID: T-20260309-VEL</div>
          </div>
          <h1 className="text-3xl font-medium tracking-tight">Execution Velocity</h1>
          <p className="text-slate-400 text-sm mt-1">Quantitative analysis of autonomous capability vs. human dev squad baseline (60-min window).</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-mono text-slate-500">NET LOC DENSITY</span>
            <span className="text-2xl font-mono text-indigo-400 font-semibold flex items-center gap-2">
              7,021 <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </span>
          </div>
          <div className="h-10 w-px bg-slate-800 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-sm font-mono text-slate-500">BASELINE VARIANCE</span>
            <span className="text-2xl font-mono text-emerald-400 font-semibold">+4,429%</span>
          </div>
        </div>
      </div>

      {/* Top Level Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Autonomous Commits", value: "8", target: "12", unit: "operations", icon: GitCommit, trend: "+12%" },
          { label: "Unique Files Handled", value: "63", target: "100", unit: "nodes", icon: Terminal, trend: "+55%" },
          { label: "Lines Retracted", value: "409", target: "500", unit: "lines", icon: GitMerge, trend: "-5%" },
          { label: "QA Integrity Pass", value: "100", target: "100", unit: "percent", icon: Activity, trend: "0%" }
        ].map((metric, i) => (
          <Card key={i} className="bg-[#0b0c10] border-slate-800/60 shadow-xl relative overflow-hidden group">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold font-mono text-slate-100">{metric.value}</div>
                <div className="text-xs text-slate-500 font-mono">{metric.unit}</div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-indigo-500/80 rounded-full" 
                  style={{ width: `${(parseInt(metric.value) / parseInt(metric.target)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                <span>TREND</span>
                <span className={metric.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{metric.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Primary Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Main Line Chart: Autonomous vs Human */}
        <Card className="lg:col-span-2 bg-[#0b0c10] border-slate-800/60 shadow-xl flex flex-col">
          <CardHeader className="p-5 border-b border-slate-800/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm tracking-wide font-medium text-slate-200">Execution Trajectory</CardTitle>
              <div className="text-xs text-slate-500 mt-1">LOC generated over a 60-minute window</div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <span className="text-xs font-mono text-slate-400">Creative Liberation Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="text-xs font-mono text-slate-400">Human Squad</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInception" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHuman" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inception" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorInception)" 
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#818cf8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="human" 
                  stroke="#64748b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHuman)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deep Dive Breakdown */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 bg-[#0b0c10] border-slate-800/60 shadow-xl">
            <CardHeader className="p-5 border-b border-slate-800/60">
              <CardTitle className="text-sm tracking-wide font-medium text-slate-200">Load Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-5 w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitDistribution} layout="vertical" margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#1e293b', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Bar dataKey="payload" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0b0c10] border-slate-800/60 shadow-xl">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Cpu className="w-4 h-4 text-emerald-400"/> Core Utilization</span>
                <span className="font-mono text-slate-200">92%</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden max-w-full">
                <div className="h-full bg-emerald-500 w-[92%]"></div>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-slate-400 flex items-center gap-2"><Eye className="w-4 h-4 text-blue-400"/> Context Saturation</span>
                <span className="font-mono text-slate-200">114k / 128k</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden max-w-full">
                <div className="h-full bg-blue-500 w-[89%]"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
