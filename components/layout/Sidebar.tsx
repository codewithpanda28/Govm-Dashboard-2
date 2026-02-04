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
  Settings,
  MapPin,
  Map,
  Building,
  Home,
  Gavel,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Search, label: 'Smart Search', href: '/search' },
  // { icon: FileText, label: 'FIR Management', href: '/fir/list' },
  // { icon: Users, label: 'Accused Database', href: '/accused/all' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

const settingsItems = [
  { icon: MapPin, label: 'Manage State', href: '/settings/states' },
  { icon: Map, label: 'Manage Zone', href: '/settings/zones' },
  { icon: Building, label: 'Manage District', href: '/settings/districts' },
  { icon: Home, label: 'Manage Thana', href: '/settings/thanas' },
  { icon: UserCog, label: 'Manage IO', href: '/settings/ios' },
  { icon: Gavel, label: 'Manage Court', href: '/settings/courts' },
  { icon: Users, label: 'Manage Crime', href: '/settings/crime' },
  { icon: Users, label: 'Manage Users', href: '/settings/users' },
];

const adminItems = [
  { icon: ScrollText, label: 'Audit Logs', href: '/admin/logs' },
  { icon: Database, label: 'System Backup', href: '/admin/backup' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true); // Keep settings expanded by default
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
            .select('role, full_name')
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

  // Auto expand settings if on settings page
  useEffect(() => {
    if (pathname.startsWith('/settings/')) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'district_admin';

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex h-20 items-center gap-3 border-b-2 border-amber-300 px-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <span className="text-lg font-bold text-white block">Railway Police</span>
          <p className="text-xs text-amber-100">Crime Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-4 overflow-y-auto bg-white">
        {/* Main Menu */}
        <div className="mb-4">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-3 mb-2">
            MAIN MENU
          </p>
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

        {/* Settings Section - For Admin Users */}
        {isAdmin && (
          <>
            <div className="my-4 border-t-2 border-amber-200" />
            <div className="mb-4">
              {/* Settings Header with Dropdown */}
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between px-3 mb-2 cursor-pointer hover:bg-amber-50 rounded-lg py-2"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    SETTINGS
                  </span>
                </div>
                {settingsOpen ? (
                  <ChevronDown className="h-4 w-4 text-amber-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-amber-600" />
                )}
              </button>

              {/* Settings Items */}
              {settingsOpen && (
                <div className="space-y-1 pl-2">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Super Admin Section */}
        {/* {userRole === 'super_admin' && (
          <>
            <div className="my-4 border-t-2 border-amber-200" />
            <div className="mb-4">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-3 mb-2">
                SUPER ADMIN
              </p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
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
        )} */}

        {/* User Section */}
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

        {/* Footer Info */}
        <div className="mt-auto pt-4 pb-2 px-3 border-t">
          <p className="text-xs text-gray-500 text-center">
            Railway Protection Force
          </p>
          <p className="text-xs text-gray-400 text-center">
            © 2024 Ministry of Railways
          </p>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
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

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-72 flex-col border-r-2 border-amber-300 bg-white shadow-2xl">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
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