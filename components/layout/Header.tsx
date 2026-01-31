'use client';

import { Bell, Search, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Header() {
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('full_name, role')
            .eq('auth_id', user.id)
            .single();
          if (data) {
            setUserName(data.full_name);
            setUserRole(data.role);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }
    getUser();
    loadNotifications();
  }, [supabase]);

  const loadNotifications = async () => {
    try {
      // Get recent audit logs as notifications
      const { data } = await supabase
        .from('audit_logs')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(
          data.map((log) => ({
            id: log.id,
            message: `${log.users?.full_name || 'User'} ${log.action} ${log.table_name}`,
            time: log.created_at,
            type: log.action,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="">
      {/* <div className="flex flex-1 items-center gap-2 md:gap-4">
        <div className="relative hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
          <Input
            placeholder="Search reports, FIRs, accused..."
            className="pl-10 h-9 bg-white/90 border-amber-300 focus:bg-white"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-full p-2.5 hover:bg-white/20 transition-colors">
              <Bell className="h-5 w-5 text-white" />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-amber-400" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {notifications.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {notifications.length}
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No new notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start p-3 cursor-pointer"
                  onClick={() => setShowNotifications(true)}
                >
                  <p className="text-sm font-medium">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.time).toLocaleString('en-IN')}
                  </p>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNotifications(true)} className="cursor-pointer">
              View All Notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l-2 border-white/30 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-amber-600 text-sm font-bold shadow-lg">
                {userName ? getInitials(userName) : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-white">{userName || 'User'}</p>
                <p className="text-xs text-amber-100 capitalize">{userRole || 'User'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-semibold">{userName || 'User'}</span>
              <span className="text-xs text-gray-500 font-normal">{userRole}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center">
                <UserIcon className="mr-2 h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.time).toLocaleString('en-IN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog> */}
    </header>
  );
}
