import { useState } from 'react';
import { Send, BellPlus, Sparkles, Smartphone, History, Check, CalendarDays, Zap, Settings2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ContentModule() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all');
    const [sent, setSent] = useState(false);
    const [aiMode, setAiMode] = useState(false);

    const handleSend = () => {
        setSent(true);
        setTimeout(() => setSent(false), 2000);
        setTitle('');
        setBody('');
    };

    const handleAiGenerate = () => {
        setAiMode(true);
        setTitle("✨ A Shift in the Cosmos");
        let i = 0;
        const text = "Your spiritual energy is peaking today. Connect now to discover the reading that awaits your transition.";
        setBody("");
        const interval = setInterval(() => {
            setBody(prev => prev + text[i]);
            i++;
            if (i >= text.length - 1) {
                clearInterval(interval);
                setAiMode(false);
            }
        }, 30);
    };

    return (
        <div className="flex flex-col gap-4">
            
            {/* Live Event Orchestration */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm space-y-4">
                <h3 className="text-stella-gold font-bold text-sm flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Live Event Orchestration
                </h3>
                
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Global Lunar Eclipse Event</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">Trigger special reading mode + 2x XP</span>
                        </div>
                        <button className="w-10 h-5 rounded-full bg-stella-gold border border-stella-gold relative transition-colors">
                            <div className="w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] right-[2px] shadow-sm" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 opacity-60">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Mercury Retrograde Protocol</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">Adjust AI prompts for introspection</span>
                        </div>
                        <button className="w-10 h-5 rounded-full bg-gray-200 border border-gray-300 relative transition-colors">
                            <div className="w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] left-[2px] shadow-sm" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Push Notification Panel */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stella-gold/5 rounded-bl-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-stella-gold font-bold text-sm flex items-center gap-2">
                        <BellPlus className="w-4 h-4" />
                        Dynamic Push Intelligence
                    </h3>
                    <button 
                        onClick={handleAiGenerate}
                        className={cn("px-2.5 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 transition-all border", aiMode ? "bg-stella-gold/10 text-stella-gold border-stella-gold/20 animate-pulse" : "bg-gray-50 text-gray-600 border-gray-250 hover:bg-gray-100")}
                    >
                        <Zap className="w-3 h-3" />
                        {aiMode ? 'Generating...' : 'AI Auto-Draft'}
                    </button>
                </div>

                <div className="space-y-4 relative z-10">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block font-tajawal">Target Audience</label>
                            <Settings2 className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <select 
                            value={audience} 
                            onChange={(e) => setAudience(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none focus:border-stella-gold/50"
                        >
                            <option value="all">Global (All Users)</option>
                            <option value="active">Active this week</option>
                            <option value="churn_risk">High Churn Risk (AI Predicted)</option>
                            <option value="premium">VIP Subscribers only</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1 block font-tajawal">Title</label>
                        <input 
                            type="text" 
                            placeholder="e.g. The stars align tonight 🌙"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none focus:border-stella-gold/50"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1 block font-tajawal">Message Body</label>
                        <textarea 
                            placeholder="The cosmos have a special message for you..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none focus:border-stella-gold/50 min-h-[100px]"
                        />
                    </div>

                    <button 
                        onClick={handleSend}
                        disabled={!title || !body || sent}
                        className={cn(
                            "w-full flex justify-center items-center gap-2 py-3.5 rounded-xl transition-all font-bold text-sm",
                            sent ? "bg-green-50 text-green-600 border border-green-200" :
                            (!title || !body) ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" :
                            "bg-stella-gold text-white shadow-sm hover:bg-stella-amber"
                        )}
                    >
                        {sent ? (
                            <><Check className="w-4 h-4" /> Dispatched Successfully</>
                        ) : (
                            <><Send className="w-4 h-4" /> Dispatch Payload</>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification Preview */}
            <div className="glass-card p-5 border-stella-border bg-white shadow-sm">
                <h3 className="text-gray-800 font-bold text-sm flex items-center gap-2 mb-4">
                    <Smartphone className="w-4 h-4 text-stella-gold" />
                    Device Preview
                </h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex gap-3 items-start shadow-sm max-w-[300px] mx-auto">
                    <div className="w-8 h-8 rounded-lg bg-stella-gold flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] text-gray-400 font-medium">Spirit Portal</span>
                            <span className="text-[9px] text-gray-400 font-mono">now</span>
                        </div>
                        <h4 className="text-[12px] font-bold text-gray-800 truncate">{title || "Notification Title"}</h4>
                        <p className="text-[11px] text-gray-500 leading-tight line-clamp-2 mt-0.5">{body || "Your message body will appear here on the user's lock screen."}</p>
                    </div>
                </div>
            </div>

            {/* Campaign History Button */}
            <div className="glass-card p-4 border-stella-border bg-white flex items-center justify-between group cursor-pointer hover:bg-gray-50 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-stella-gold/10 rounded-lg text-stella-gold">
                        <History className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">Campaign History</h4>
                        <span className="text-xs text-gray-500">View performance metrics</span>
                    </div>
                </div>
                <span className="text-stella-gold text-xs font-bold px-2.5 py-1 bg-stella-gold/5 rounded-full border border-stella-gold/20">Active: 2</span>
            </div>
        </div>
    );
}
