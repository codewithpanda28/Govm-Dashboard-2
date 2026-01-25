'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  UserCog,
  Database,
  ScrollText,
  User,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Search, label: 'Smart Search', href: '/search' },
  { icon: FileText, label: 'All FIRs', href: '/fir/all' },
  { icon: Users, label: 'Accused Database', href: '/accused/all' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

const adminItems = [
  { icon: UserCog, label: 'User Management', href: '/admin/users' },
  { icon: Database, label: 'Master Data', href: '/admin/masters' },
  { icon: ScrollText, label: 'Audit Logs', href: '/admin/logs' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();
          if (data) setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    }
    getUserRole();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="flex h-20 items-center gap-3 border-b-2 border-amber-300 px-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
          <BarChart3 className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <span className="text-lg font-bold text-white block">Railway Police</span>
          <p className="text-xs text-amber-100">Analytics Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-4 overflow-y-auto bg-white">
        <div className="mb-4">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-3 mb-2">Main Menu</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all mb-1',
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {userRole === 'super_admin' && (
          <>
            <div className="my-4 border-t-2 border-amber-200" />
            <div className="mb-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-3 mb-2">Administration</p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all mb-1',
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <div className="my-4 border-t-2 border-amber-200" />
        
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all mb-1',
            pathname === '/profile'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
              : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
          )}
        >
          <User className="h-5 w-5" />
          <span>My Profile</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-red-50 hover:text-red-600 mb-1"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-white shadow-xl border-2 border-amber-300"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="hidden md:flex h-screen w-72 flex-col border-r-2 border-amber-300 bg-white shadow-2xl">
        <SidebarContent />
      </div>

      <div
        className={cn(
          'md:hidden fixed left-0 top-0 z-50 h-full w-72 flex-col border-r-2 border-amber-300 bg-white shadow-2xl transform transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
