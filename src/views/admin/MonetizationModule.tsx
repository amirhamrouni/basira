import { useState } from 'react';
import { Zap, Gem, Flame, ArrowRight, Settings2, PlayCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function MonetizationModule() {
    const [features, setFeatures] = useState({
        adsEnabled: true,
        premiumOnlyTarot: false,
        premiumOnlyPalm: true,
        requireLogin: false,
        streakBonuses: true,
        mysteryDrops: true
    });

    const [economyConfig, setEconomyConfig] = useState({
        baseEnergy: 50,
        energyRefillRate: 10, // per hour
        adRewardEnergy: 15,
        adRewardStardust: 5,
        stardustToEnergyRatio: 10
    });

    const toggleFeature = (key: keyof typeof features) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const updateEconomy = (key: keyof typeof economyConfig, value: number) => {
        setEconomyConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Top Metrics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 relative overflow-hidden group bg-white shadow-sm">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-stella-gold/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Avg LTV</span>
                    <span className="text-2xl font-bold text-stella-gold z-10 font-mono">$18.40</span>
                </div>
                <div className="glass-card p-4 border-stella-border flex flex-col gap-2 relative overflow-hidden group bg-white shadow-sm">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Ad eCPM</span>
                    <span className="text-2xl font-bold text-blue-500 z-10 font-mono">$12.50</span>
                </div>
            </div>

            {/* Virtual Economy Config */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm space-y-4">
                <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <Gem className="w-4 h-4 text-stella-gold" />
                    Virtual Economy Matrix
                </h3>
                
                <div className="space-y-3">
                    <div className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-700 font-bold">Base Max Energy</span>
                            <span className="text-xs font-mono font-bold text-stella-gold">{economyConfig.baseEnergy}</span>
                        </div>
                        <input type="range" min="20" max="100" step="5" value={economyConfig.baseEnergy} onChange={(e) => updateEconomy('baseEnergy', parseInt(e.target.value))} className="w-full h-1 bg-gray-200 accent-stella-gold rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-700 font-bold">Energy Refill Rate (per hr)</span>
                            <span className="text-xs font-mono font-bold text-stella-gold">+{economyConfig.energyRefillRate}</span>
                        </div>
                        <input type="range" min="1" max="25" step="1" value={economyConfig.energyRefillRate} onChange={(e) => updateEconomy('energyRefillRate', parseInt(e.target.value))} className="w-full h-1 bg-gray-200 accent-stella-gold rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* Rewarded Ads Psychology Engine */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm space-y-4">
                <h3 className="text-stella-gold font-bold text-sm flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Rewarded Ads Mechanics
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase font-tajawal">Energy Reward</span>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-stella-gold font-mono">+{economyConfig.adRewardEnergy} <Zap className="w-3 h-3 inline text-blue-500" /></span>
                            <Settings2 className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-stella-gold transition-colors" />
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase font-tajawal">Stardust Reward</span>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-stella-gold font-mono">+{economyConfig.adRewardStardust} ✨</span>
                            <Settings2 className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-stella-gold transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <h4 className="text-xs font-bold text-gray-800">Global Ads Enable</h4>
                        <span className="text-[10px] text-gray-500">Master kill-switch for ad networks</span>
                    </div>
                    <button 
                        onClick={() => toggleFeature('adsEnabled')}
                        className={cn("w-10 h-5 rounded-full transition-colors relative border", features.adsEnabled ? 'bg-stella-gold border-stella-gold' : 'bg-gray-200 border-gray-350')}
                    >
                        <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[1px] transition-transform shadow-sm", features.adsEnabled ? 'translate-x-6' : 'translate-x-[2px]')} />
                    </button>
                </div>
            </div>

            {/* Psychological Hooks & Progression */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm space-y-4">
                <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2">
                    <Flame className="w-4 h-4 text-stella-amber" />
                    Growth & Retention
                </h3>

                <div className="space-y-2">
                    {[
                        { id: 'streakBonuses', label: 'Daily Streak Multipliers', desc: 'Exponential XP for returning users' },
                        { id: 'mysteryDrops', label: 'Random Mystery Unlocks', desc: 'Psychological variable rewards' },
                        { id: 'premiumOnlyPalm', label: 'Gated Palmistry', desc: 'Convert users on high-value feature' },
                    ].map(feat => (
                        <div key={feat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div>
                                <h4 className="text-xs font-bold text-gray-800">{feat.label}</h4>
                                <span className="text-[10px] text-gray-500">{feat.desc}</span>
                            </div>
                            <button 
                                onClick={() => toggleFeature(feat.id as keyof typeof features)}
                                className={cn("w-10 h-5 rounded-full transition-colors relative border", features[feat.id as keyof typeof features] ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-350')}
                            >
                                <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[1px] transition-transform shadow-sm", features[feat.id as keyof typeof features] ? 'translate-x-6' : 'translate-x-[2px]')} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* VIP Tiers Config Link */}
            <button className="w-full p-4 glass-card border-stella-border bg-gradient-to-r from-stella-gold/5 to-transparent flex items-center justify-between group hover:from-stella-gold/10 hover:border-stella-gold/40 transition-all rounded-xl mt-2 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-stella-gold" />
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-stella-gold">Manage VIP Subscriptions</h4>
                        <span className="text-[10px] text-gray-500">Configure tiers, pricing, and perks</span>
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stella-gold/50 group-hover:text-stella-gold group-hover:translate-x-1 transition-all" />
            </button>
        </div>
    );
}
