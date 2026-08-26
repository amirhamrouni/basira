import { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, UserCheck, UserX, MoreVertical, Award, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { db } from '../../firebase';
import { collection, query, limit, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';

const availableBadges = [
    { id: 'old_soul', label: 'عارف قديم', color: 'text-stella-gold', bg: 'bg-stella-gold/15' },
    { id: 'golden_seeker', label: 'باحث ذهبي', color: 'text-yellow-600', bg: 'bg-yellow-500/15' },
    { id: 'pure_spirit', label: 'روح نقية', color: 'text-purple-650', bg: 'bg-purple-500/15' },
    { id: 'top_contributor', label: 'مساهم مميز', color: 'text-blue-650', bg: 'bg-blue-500/15' }
];

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    energy: number;
    badges: string[];
    emotionalProfile: string;
    vipProbability: number;
    vipStatus: string;
}

export default function UsersModule() {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserForBadge, setSelectedUserForBadge] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Real DB pull
                const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);
                const fetchedUsers: UserData[] = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedUsers.push({
                        id: doc.id,
                        name: data.displayName || 'Unknown Soul',
                        email: data.email || 'hidden',
                        role: data.vipStatus !== 'none' ? 'VIP' : 'Free',
                        status: 'Active',
                        energy: data.energy || 0,
                        badges: data.badges || [],
                        emotionalProfile: data.emotionalProfile || 'Seeker',
                        vipProbability: Math.floor(Math.random() * 100), // AI placeholder
                        vipStatus: data.vipStatus || 'none'
                    });
                });
                
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Failed to load user CRM", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const toggleBadge = async (userId: string, badgeLabel: string) => {
        const user = users.find(u => u.id === userId);
        if(!user) return;
        const hasBadge = user.badges.includes(badgeLabel);
        const newBadges = hasBadge ? user.badges.filter(b => b !== badgeLabel) : [...user.badges, badgeLabel];
        
        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, badges: newBadges } : u));
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                badges: newBadges
            });
        } catch (error) {
            console.error("Failed to secure badge update", error);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3" />
                    <input 
                        type="text" 
                        placeholder="Search souls..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-stella-gold/50 transition-colors font-tajawal"
                    />
                </div>
                <button className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors">
                    <Filter className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 text-stella-gold animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 font-tajawal">No souls discovered yet.</div>
                ) : users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                    <div key={user.id} className="glass-card p-5 border-gray-100 bg-white flex flex-col gap-3 group relative shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-stella-gold/10 flex items-center justify-center border border-stella-gold/20">
                                    <span className="font-bold text-stella-gold text-sm">{user.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800">{user.name}</h4>
                                    <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end gap-1 text-right">
                                    <span className={cn(
                                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                                        user.role === 'VIP' ? "bg-purple-50 text-purple-650 border border-purple-200/60" : 
                                        user.role === 'Premium' ? "bg-stella-gold/5 text-stella-gold border border-stella-border/60" : 
                                        "bg-gray-50 text-gray-550 border border-gray-200"
                                    )}>
                                        {user.role}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            user.status === 'Active' ? "bg-green-500" :
                                            user.status === 'Warning' ? "bg-yellow-500" : "bg-red-500"
                                        )} />
                                        <span className="text-[10px] text-gray-400">{user.status}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setSelectedUserForBadge(user.id)}
                                        className="p-1.5 text-gray-400 hover:bg-stella-gold/10 hover:text-stella-gold rounded-lg transition-colors"
                                        title="إدارة الأوسمة"
                                    >
                                        <Award className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 text-gray-400 hover:bg-gray-55 rounded-lg transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[10px] uppercase font-bold tracking-wider",
                                    user.emotionalProfile === 'Seeker' ? 'text-blue-600' :
                                    user.emotionalProfile === 'Devout' ? 'text-purple-650' :
                                    user.emotionalProfile === 'Skeptic' ? 'text-orange-600' : 'text-red-600'
                                )}>{user.emotionalProfile}</span>
                                <span className="text-[10px] text-gray-400">Profile</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-450">VIP Probability:</span>
                                <span className={cn(
                                    "text-xs font-mono font-bold",
                                    (user.vipProbability || 0) > 80 ? 'text-green-600' :
                                    (user.vipProbability || 0) > 40 ? 'text-yellow-600' : 'text-gray-500'
                                )}>{(user.vipProbability || 0)}%</span>
                            </div>
                        </div>

                        {user.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {user.badges.map(badgeLabel => {
                                    const bInfo = availableBadges.find(b => b.label === badgeLabel);
                                    return (
                                        <span key={badgeLabel} className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1",
                                            bInfo ? `${bInfo.bg} ${bInfo.color} border-${bInfo.color.split('-')[1]}-200/50` : "bg-gray-50 text-gray-600 border-gray-200"
                                        )}>
                                            <Award className="w-3 h-3" />
                                            {badgeLabel}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bulk Actions */}
            <div className="mt-2 p-4 glass-card border-gray-150 bg-white flex justify-between items-center shadow-sm rounded-xl">
                <span className="text-xs text-gray-500 font-tajawal">Moderation Tools</span>
                <div className="flex gap-2">
                    <button className="p-2 bg-red-50 rounded-lg text-red-650 hover:bg-red-100 transition-colors" title="Ban Selected">
                        <UserX className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-yellow-55 rounded-lg text-yellow-650 hover:bg-yellow-100 transition-colors" title="Warn Selected">
                        <ShieldAlert className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-green-50 rounded-lg text-green-650 hover:bg-green-100 transition-colors" title="Approve Selected">
                        <UserCheck className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Badge Management Modal */}
            {selectedUserForBadge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-150 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 font-amiri text-lg">
                                <Award className="w-4 h-4 text-stella-gold" />
                                إدارة الأوسمة
                            </h3>
                            <button onClick={() => setSelectedUserForBadge(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                            {(() => {
                                const user = users.find(u => u.id === selectedUserForBadge);
                                if (!user) return null;
                                return availableBadges.map(badge => {
                                    const isAwarded = user.badges.includes(badge.label);
                                    return (
                                        <div 
                                            key={badge.id}
                                            onClick={() => toggleBadge(user.id, badge.label)}
                                            className={cn(
                                                "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                                                isAwarded 
                                                    ? `bg-stella-gold/5 ${badge.color.replace('text-', 'border-')}/30`
                                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm", badge.bg)}>
                                                    <Award className={cn("w-4 h-4", badge.color)} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 font-tajawal">{badge.label}</span>
                                            </div>
                                            {isAwarded ? (
                                                <X className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Plus className="w-4 h-4 text-green-600" />
                                            )}
                                        </div>
                                    )
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
