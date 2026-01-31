'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('auth_id', authData.user.id)
          .single();

        if (userError) {
          console.error('User data error:', userError);
          throw new Error('User account not found. Please contact administrator.');
        }

        if (!userData) {
          await supabase.auth.signOut();
          throw new Error('User account not found. Please contact administrator.');
        }

        if (!userData.is_active) {
          await supabase.auth.signOut();
          toast.error('Your account is deactivated. Please contact administrator.');
          return;
        }

        const role = userData.role;
        console.log('User role:', role); // Debug log

        // Data entry roles - redirect to different portal
        if (role === 'station_officer' || role === 'data_operator') {
          await supabase.auth.signOut();
          toast.error('Access denied. Use Data Entry Portal.');
          return;
        }

        // ✅ FIXED: Added 'admin' to allowed roles
        const allowedRoles = ['super_admin', 'district_admin', 'admin', 'viewer'];
        
        if (!allowedRoles.includes(role)) {
          await supabase.auth.signOut();
          toast.error('Access denied. Insufficient permissions.');
          return;
        }

        // Log login (optional - don't block if fails)
        try {
          await supabase.from('audit_logs').insert({
            user_id: userData.id,
            action: 'LOGIN',
            table_name: 'users',
            ip_address: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
          });
        } catch (logError) {
          console.error('Failed to log login:', logError);
        }

        toast.success(`Welcome, ${userData.full_name || 'Admin'}!`);
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Railway Police
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-600">
              Analytics Dashboard
            </CardDescription>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-gray-500">Secure Government Portal</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 border-2 focus:border-blue-500 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 border-2 focus:border-blue-500 text-base"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                Authorized personnel only. All access is logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}