import { useState } from 'react';
import { Thermometer, Brain, GitBranch, History, Terminal, RefreshCw, Activity, Target, Workflow, Settings2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function AICoreModule({ adminPrompt, setAdminPrompt }: { adminPrompt: string, setAdminPrompt: any }) {
    const [temperature, setTemperature] = useState<number>(0.7);
    const [persona, setPersona] = useState('mystic_sage');
    const activeVersion = 'v2.1.4-prod';
    const [abTestingEnabled, setAbTestingEnabled] = useState(true);

    return (
        <div className="flex flex-col gap-4">
            
            {/* Real-time Quality Analytics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-5 border-stella-border flex flex-col gap-2 relative overflow-hidden bg-white shadow-sm">
                    <div className="flex justify-between items-center z-10">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Avg Quality Score</span>
                        <Target className="w-4 h-4 text-stella-gold" />
                    </div>
                    <div className="z-10 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-800 font-mono">94.2</span>
                        <span className="text-[10px] text-gray-400">/ 100</span>
                    </div>
                </div>
                <div className="glass-card p-5 border-stella-border flex flex-col gap-2 relative overflow-hidden bg-white shadow-sm">
                    <div className="flex justify-between items-center z-10">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Emotional Resonance</span>
                        <Activity className="w-4 h-4 text-stella-amber" />
                    </div>
                    <div className="z-10 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-800 font-mono">High</span>
                        <span className="text-[10px] font-bold text-green-600">+12%</span>
                    </div>
                </div>
            </div>

            {/* AI Response Observatory */}
            <div className="glass-card p-5 border-stella-border bg-white flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        Live Observation Stream
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600 border border-green-200 uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Live
                    </span>
                </div>
                
                <div className="flex flex-col gap-2 h-32 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/85 pointer-events-none z-10" />
                    
                    <div className="flex flex-col gap-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center text-[9px] text-gray-400 uppercase">
                            <span>User: usr_xyz1</span>
                            <span className="text-blue-600">Persona: Mystic Sage</span>
                        </div>
                        <span className="text-xs text-gray-700 font-mono italic truncate">"Your aura suggests a profound transition..."</span>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-green-600 font-bold">+15% Resonance</span>
                            <span className="text-[10px] text-gray-400">22ms response</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
                        <div className="flex justify-between items-center text-[9px] text-gray-400 uppercase">
                            <span>User: usr_xyz2</span>
                            <span className="text-purple-600">Persona: Truth Teller</span>
                        </div>
                        <span className="text-xs text-gray-700 font-mono italic truncate">"Denial will not shield you from the inevitable..."</span>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-red-500 font-bold">-5% Resonance</span>
                            <span className="text-[10px] text-gray-400">18ms response</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Persona Config */}
            <div className="glass-card p-5 border-stella-border bg-white flex flex-col gap-4 shadow-sm">
                <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-stella-gold" />
                    Dynamic Personality Matrix
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'mystic_sage', label: 'Mystic Sage', desc: 'Deep & Abstract' },
                        { id: 'compassionate', label: 'Empath', desc: 'Warm & Healing' },
                        { id: 'direct_truth', label: 'Truth Teller', desc: 'Blunt & Direct' },
                        { id: 'cosmic_guide', label: 'Cosmic Guide', desc: 'Astrological Focus' }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPersona(p.id)}
                            className={cn(
                                "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left relative overflow-hidden",
                                persona === p.id 
                                    ? "bg-stella-gold/10 border-stella-gold/40 shadow-sm" 
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {persona === p.id && <div className="absolute top-0 left-0 w-1 h-full bg-stella-gold" />}
                            <span className={cn("text-sm font-bold pl-1", persona === p.id ? "text-stella-gold" : "text-gray-700")}>{p.label}</span>
                            <span className="text-[10px] text-gray-450 pl-1">{p.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Inference Tuning */}
            <div className="glass-card p-5 border-stella-border flex flex-col gap-4 bg-white shadow-sm">
                <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-stella-amber" />
                    Inference Tuning
                </h3>

                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-550 uppercase tracking-wider font-tajawal">Creativity (Temperature)</span>
                        <span className="text-xs text-stella-gold font-bold font-mono">{temperature.toFixed(2)}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="1.5" step="0.05" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-200 accent-stella-gold rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-mono">
                        <span>Precise</span>
                        <span>Balanced</span>
                        <span>Creative</span>
                    </div>
                </div>
            </div>

            {/* Prompt Engineering Environment */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm flex flex-col gap-4">
                
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150">
                        <h3 className="text-stella-gold font-bold text-sm flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            Live Prompt Runtime
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-55 text-green-600 border border-green-200 uppercase tracking-wider">Prod Engine</span>
                        </div>
                    </div>

                    {/* Version Control & A/B Config */}
                    <div className="flex justify-between items-center py-2">
                        <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 border border-gray-200 transition-colors">
                                <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                                {activeVersion}
                            </button>
                            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 border border-gray-200 transition-colors" title="Rollback History">
                                <History className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">A/B Test</span>
                            <button 
                                onClick={() => setAbTestingEnabled(!abTestingEnabled)}
                                className={cn("w-8 h-4 rounded-full transition-colors relative border", abTestingEnabled ? 'bg-stella-gold border-stella-gold' : 'bg-gray-200 border-gray-300')}
                            >
                                <div className={cn("w-2.5 h-2.5 bg-white rounded-full absolute top-[1px] transition-transform shadow-sm", abTestingEnabled ? 'translate-x-[16px]' : 'translate-x-[2px]')} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <ContextPill text="User Name" />
                        <ContextPill text="Astro Chart" />
                    </div>
                    <textarea 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pt-12 text-[13px] font-mono text-gray-700 min-h-[220px] focus:outline-none focus:border-stella-gold/50 shadow-inner"
                        style={{ direction: 'ltr' }}
                        value={adminPrompt}
                        onChange={(e) => setAdminPrompt(e.target.value)}
                        placeholder="Enter the core system instructions..."
                    />
                </div>

                {/* Chaining and Injection Modules */}
                <div className="flex gap-2 mb-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-stella-gold hover:bg-stella-gold/5 transition-colors">
                        <Workflow className="w-3.5 h-3.5 text-stella-gold" />
                        Prompt Chaining
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-stella-gold hover:bg-stella-gold/5 transition-colors">
                        <Settings2 className="w-3.5 h-3.5 text-stella-amber" />
                        Dynamic Injection
                    </button>
                </div>
                
                <button 
                    onClick={() => {}}
                    className="w-full flex justify-center items-center gap-2 bg-stella-gold text-white py-3.5 rounded-xl hover:bg-stella-amber transition-all text-sm font-bold shadow-sm"
                >
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    Commit to Edge Fleet
                </button>
            </div>
        </div>
    );
}

function ContextPill({ text }: { text: string }) {
    return (
        <span className="px-2 py-1 bg-white border border-gray-200 rounded-full text-[9px] text-gray-500 font-mono tracking-tight pointer-events-none shadow-sm">
            &#123;&#123;{text}&#125;&#125;
        </span>
    );
}
