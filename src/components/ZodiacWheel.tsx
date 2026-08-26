import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Planet {
    name: string;
    symbol: string;
    angle: number;
    color: string;
}

export default function ZodiacWheel({ zodiacId }: { zodiacId: string | null }) {
    // Generate a deterministically random position for planets based on today's date
    const planets: Planet[] = useMemo(() => {
        const dateSeed = new Date().toDateString();
        const getSeededAngle = (salt: string) => {
            const hash = Array.from(dateSeed + (zodiacId || 'all') + salt).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return hash % 360;
        };

        return [
            { name: 'الشمس', symbol: '☀️', angle: getSeededAngle('sun'), color: '#D4A373' },
            { name: 'القمر', symbol: '🌙', angle: getSeededAngle('moon'), color: '#A87B51' },
            { name: 'عطارد', symbol: '☿', angle: getSeededAngle('mercury'), color: '#8E8E93' },
            { name: 'الزهرة', symbol: '♀', angle: getSeededAngle('venus'), color: '#FF69B4' },
            { name: 'المريخ', symbol: '♂', angle: getSeededAngle('mars'), color: '#FF3B30' },
            { name: 'المشتري', symbol: '♃', angle: getSeededAngle('jupiter'), color: '#E5A93C' },
            { name: 'زحل', symbol: '♄', angle: getSeededAngle('saturn'), color: '#8B572A' },
        ];
    }, [zodiacId]);

    const zodiacSigns = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

    return (
        <div className="relative w-full max-w-[300px] h-[300px] mx-auto my-8 flex items-center justify-center">
            {/* Outer space background */}
            <div className="absolute inset-0 rounded-full border border-stella-gold/20 bg-white/90 shadow-[0_4px_20px_rgba(168,123,81,0.06)]"></div>
            
            {/* Concentric circles */}
            <div className="absolute inset-4 rounded-full border border-stella-gold/10"></div>
            <div className="absolute inset-10 rounded-full border border-stella-gold/10 border-dashed animate-[spin_120s_linear_infinite]"></div>
            
            {/* Zodiac sign markers on the outer edge */}
            {zodiacSigns.map((symbol, i) => {
                const angle = (i * 30) - 90; // Start at top
                const rad = (angle * Math.PI) / 180;
                const radius = 135;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                
                return (
                    <div 
                        key={i}
                        className="absolute text-stella-gold/40 text-sm font-bold transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                    >
                        {symbol}
                    </div>
                );
            })}

            {/* Planets */}
            {planets.map((planet, i) => {
                const innerRadius = 50 + (i * 10);
                const rad = (planet.angle * Math.PI) / 180;
                const x = Math.cos(rad) * innerRadius;
                const y = Math.sin(rad) * innerRadius;

                return (
                    <motion.div
                        key={planet.name}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 1, type: "spring" }}
                        className="absolute flex items-center justify-center w-6 h-6 rounded-full bg-white border border-stella-gold/30 shadow-sm z-10 custom-planet"
                        style={{ 
                            left: `calc(50% + ${x}px)`, 
                            top: `calc(50% + ${y}px)`,
                            transform: 'translate(-50%, -50%)',
                            color: planet.color
                        }}
                        title={planet.name}
                    >
                        {planet.symbol}
                    </motion.div>
                );
            })}

            {/* Center Eye / Core */}
            <div className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-stella-gold/10 to-transparent border border-stella-gold/30 flex items-center justify-center overflow-hidden z-20 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-stella-gold/5 flex items-center justify-center animate-pulse">
                    <span className="text-stella-gold text-lg">✨</span>
                </div>
            </div>

            {/* Scanning line effect */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t border-stella-gold/30 opacity-50 z-0"
                style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }}
            />
        </div>
    );
}
