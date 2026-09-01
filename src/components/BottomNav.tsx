import { Home, Hand, Sun, LayoutGrid } from 'lucide-react';

export default function BottomNav({ active, onChange, t }: any) {
    const navItems = [
        { id: 'home', icon: Home, label: t.home },
        { id: 'zodiac', icon: (props: any) => <span style={{ fontSize: props.size }} className="leading-none drop-shadow-md">⭐</span>, label: t.zodiacBtn || 'الأبراج' },
        { id: 'palmistry', icon: Hand, label: t.palmistry },
        { id: 'tarot', icon: Sun, label: t.tarot },
        { id: 'other', icon: LayoutGrid, label: t.otherBtn || 'أخرى' },
    ];

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[calc(90px+env(safe-area-inset-bottom,0px))] bg-[#090610]/95 backdrop-blur-3xl border-t border-[#d7ad58]/25 flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom,0px)] z-50 rounded-t-[30px] shadow-[0_-12px_40px_rgba(0,0,0,.5)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-stella-gold/30 to-transparent"></div>
            {navItems.map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                    <button 
                        key={item.id}
                        onClick={() => onChange(item.id)}
                        className={`flex flex-col items-center gap-1.5 p-1 w-20 transition-all duration-500 ease-out relative group ${isActive ? 'text-[#f3d994] -translate-y-4' : 'text-[#81778a] hover:text-[#d7ad58] hover:-translate-y-1'}`}
                    >
                        <div className={`relative transition-all duration-700 ${isActive ? 'p-4 bg-[#171022] rounded-full shadow-[0_0_28px_rgba(215,173,88,.22)] border border-[#d7ad58]/50' : 'p-2'}`}>
                            {isActive && <div className="absolute inset-0 bg-stella-gold/5 rounded-full animate-pulse-slow"></div>}
                            <Icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2 : 1.5} className="relative z-10" />
                            {isActive && <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-stella-gold rounded-full shadow-sm"></div>}
                        </div>
                        <span className={`text-[10px] sm:text-[11px] font-tajawal transition-all duration-500 whitespace-nowrap mt-1 ${isActive ? 'font-bold text-stella-gold opacity-100 tracking-wider' : 'opacity-80 group-hover:opacity-100'}`}>{item.label}</span>
                    </button>
                )
            })}
        </div>
    );
}
