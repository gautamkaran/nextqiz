'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PlusCircle, LogOut, Gamepad2, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check session on client side purely for UI state (middleware protects route)
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setUser(data.user);
            });
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const navItems = [
        { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/teacher/create', label: 'Create Quiz', icon: PlusCircle },
        { href: '/teacher/history', label: 'History', icon: History },
    ];

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-gradient-to-b from-gray-900 to-black hidden md:flex flex-col">
                {/* Logo Section */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
                            <Image
                                src="/nextQiz.svg"
                                alt="NextQiz Logo"
                                width={48}
                                height={48}
                                priority
                            />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">NextQiz</span>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-lg shadow-emerald-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg ${isActive
                                        ? 'bg-black/10'
                                        : 'bg-white/5 group-hover:bg-white/10'
                                        }`}>
                                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User Profile & Logout */}
                <div className="mt-auto p-6 border-t border-white/10 bg-black/20">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-black text-white shadow-lg">
                            {user?.username?.[0]?.toUpperCase() || 'G'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate">{user?.username || 'gautam'}</p>
                            <p className="text-xs text-emerald-400 font-medium">Teacher</p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <Button
                        variant="outline"
                        className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 group"
                        onClick={handleLogout}
                    >
                        <div className="p-1 rounded-lg bg-white/5 group-hover:bg-red-500/10 mr-2 transition-colors">
                            <LogOut size={16} />
                        </div>
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
