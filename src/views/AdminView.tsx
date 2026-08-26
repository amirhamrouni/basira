import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, BrainCircuit, LineChart, BellRing, UserCircle } from 'lucide-react';
import DashboardModule from './admin/DashboardModule';
import UsersModule from './admin/UsersModule';
import AICoreModule from './admin/AICoreModule';
import MonetizationModule from './admin/MonetizationModule';
import ContentModule from './admin/ContentModule';
import { cn } from '../utils/cn';

export default function AdminView({ t, adminPrompt, setAdminPrompt }: any) {
    const [activeModule, setActiveModule] = useState<'dashboard' | 'users' | 'ai_core' | 'revenue' | 'content'>('dashboard');

    const modules = [
        { id: 'dashboard', label: t.dashboard || 'Dashboard', icon: LineChart },
        { id: 'users', label: t.users || 'Users', icon: Users },
        { id: 'ai_core', label: t.aiCore || 'AI & Core', icon: BrainCircuit },
        { id: 'revenue', label: t.revenue || 'Economy', icon: Settings },
        { id: 'content', label: t.content || 'Content', icon: BellRing },
    ] as const;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 w-full h-full pb-10">
            {/* OS Header */}
            <div className="flex items-center justify-between mb-2 px-2 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="relative p-2.5 bg-stella-gold/10 rounded-xl border border-stella-gold/20 shadow-sm">
                        <div className="absolute inset-0 bg-stella-gold/5 animate-pulse rounded-xl" />
                        <BrainCircuit className="w-6 h-6 text-stella-gold relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 font-mono tracking-tight flex items-center gap-2">
                            OS_NEXUS
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[9px] text-green-600 font-mono tracking-widest uppercase">Live</span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">v3.0.4-edge</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 font-mono">SYS_LOAD</span>
                        <span className="text-xs text-stella-gold font-mono font-bold">42%</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Scrollable) */}
            <div className="flex overflow-x-auto scrollbar-hide gap-2 px-2 pb-2">
                {modules.map((mod) => {
                    const Icon = mod.icon;
                    const isActive = activeModule === mod.id;
                    return (
                        <button
                            key={mod.id}
                            onClick={() => setActiveModule(mod.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                                isActive 
                                    ? "bg-stella-gold/15 border-stella-gold/30 text-stella-gold shadow-sm font-bold" 
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:text-stella-gold hover:bg-stella-gold/5"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {mod.label}
                        </button>
                    );
                })}
            </div>

            {/* Module Content */}
            <div className="flex-1 w-full relative min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeModule}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full"
                    >
                        {activeModule === 'dashboard' && <DashboardModule />}
                        {activeModule === 'users' && <UsersModule />}
                        {activeModule === 'ai_core' && (
                            <AICoreModule 
                                adminPrompt={adminPrompt} 
                                setAdminPrompt={setAdminPrompt} 
                            />
                        )}
                        {activeModule === 'revenue' && <MonetizationModule />}
                        {activeModule === 'content' && <ContentModule />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
