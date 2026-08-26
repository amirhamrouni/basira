import { Zap, TrendingUp, Users, HeartPulse, BarChart3, Magnet, Flame } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

const mockEngagementData = [
    { time: '00:00', sentiment: 40, active: 120 },
    { time: '04:00', sentiment: 30, active: 80 },
    { time: '08:00', sentiment: 60, active: 300 },
    { time: '12:00', sentiment: 85, active: 450 },
    { time: '16:00', sentiment: 75, active: 500 },
    { time: '20:00', sentiment: 90, active: 850 },
    { time: '24:00', sentiment: 65, active: 400 },
];

const mockRetentionData = [
    { day: 'D1', retention: 55 },
    { day: 'D3', retention: 40 },
    { day: 'D7', retention: 25 },
    { day: 'D14', retention: 18 },
    { day: 'D30', retention: 12 },
];

export default function DashboardModule() {
    return (
        <div className="flex flex-col gap-4">
            {/* Top Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Active Souls</span>
                        <Users className="w-4 h-4 text-stella-gold" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-800 font-mono">8,492</span>
                        <span className="text-[10px] text-green-600 font-bold">+12%</span>
                    </div>
                </div>
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">MRR</span>
                        <TrendingUp className="w-4 h-4 text-stella-amber" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-800 font-mono">$42.4k</span>
                        <span className="text-[10px] text-green-600 font-bold">+8%</span>
                    </div>
                </div>
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">7D Streak</span>
                        <Flame className="w-4 h-4 text-stella-amber" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-800 font-mono">1,204</span>
                        <span className="text-[10px] text-green-600 font-bold">Users</span>
                    </div>
                </div>
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Avg Vibe</span>
                        <HeartPulse className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-800 font-mono">84%</span>
                        <span className="text-[10px] text-green-600 font-bold">Positive</span>
                    </div>
                </div>
            </div>

            {/* Predictive Intelligence */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm space-y-4">
                <h3 className="text-stella-gold font-bold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    AI Behavioral Intel
                </h3>
                
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Churn Risk Detected</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">42 users showing drop-off patterns</span>
                        </div>
                        <button className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                            Engage Now
                        </button>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">High Conversion Potential</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">18 users primed for Adept Tier</span>
                        </div>
                        <button className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                            Deploy Offer
                        </button>
                    </div>
                </div>
            </div>

            {/* Retention Chart */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                        <Magnet className="w-4 h-4 text-blue-500" />
                        Cohort Retention Curve
                    </h3>
                </div>
                
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockRetentionData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,123,81,0.08)" vertical={false} />
                            <XAxis dataKey="day" stroke="rgba(168,123,81,0.6)" fontSize={10} tickMargin={5} />
                            <YAxis stroke="rgba(168,123,81,0.6)" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#FFF', border: '1px solid rgba(168,123,81,0.2)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                itemStyle={{ color: '#3B82F6', fontSize: '12px' }}
                            />
                            <Line type="monotone" dataKey="retention" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Emotional Engagement Chart */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-stella-gold" />
                        Emotional Engagement
                    </h3>
                    <select className="bg-gray-50 border border-gray-250 text-xs text-gray-600 rounded-md px-2 py-1 outline-none">
                        <option>24h</option>
                        <option>7d</option>
                    </select>
                </div>
                
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockEngagementData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#A87B51" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#A87B51" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,123,81,0.08)" vertical={false} />
                            <XAxis dataKey="time" stroke="rgba(168,123,81,0.6)" fontSize={10} tickMargin={5} />
                            <YAxis stroke="rgba(168,123,81,0.6)" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#FFF', border: '1px solid rgba(168,123,81,0.2)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                itemStyle={{ color: '#A87B51', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="sentiment" stroke="#A87B51" fillOpacity={1} fill="url(#colorSentiment)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
