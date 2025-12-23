'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  Library,
  Bookmark,
  CreditCard,
  Wand2,
  Settings,
  LogOut,
  Users,
  Loader2,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState } from 'react';

const navigation = [
  { name: 'Prompt Library', href: '/dashboard', icon: Library },
  { name: 'My Saved Prompts', href: '/dashboard/saved', icon: Bookmark },
  { name: 'Upgrade', href: '/dashboard/upgrade', icon: CreditCard },
  { name: 'Prompt Builder', href: '/dashboard/builder', icon: Wand2, comingSoon: true },
  { name: 'Team Features', href: '/dashboard/team', icon: Users, comingSoon: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    try {
      await api.resendVerification(user.email);
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage('Failed to send. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">PromptStack</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/dashboard' && pathname === '/dashboard');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.comingSoon && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Email verification banner */}
        {!user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">
                  Please verify your email address to access all features.
                </span>
              </div>
              <div className="flex items-center gap-3">
                {resendMessage && (
                  <span className="text-sm text-amber-700">{resendMessage}</span>
                )}
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-sm font-medium text-amber-800 hover:text-amber-900 flex items-center gap-1"
                >
                  {resendLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Resend email
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
