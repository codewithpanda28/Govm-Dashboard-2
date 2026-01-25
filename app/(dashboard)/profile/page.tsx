'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Save, Loader2, Shield, Mail, Phone, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();

        if (error) throw error;
        setUser(userData);
      }
    } catch (error: any) {
      toast.error('Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const mobile = formData.get('mobile') as string;

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { error } = await supabase
          .from('users')
          .update({ full_name: fullName, mobile })
          .eq('auth_id', authUser.id);

        if (error) throw error;
        toast.success('Profile updated successfully');
        loadProfile();
      }
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">{user?.full_name || 'User Profile'}</h1>
            <p className="text-amber-100 text-lg">Manage your account information and settings</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-amber-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={user?.full_name || ''}
                  required
                  className="mt-1.5 border-2"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  defaultValue={user?.email || ''}
                  disabled
                  className="mt-1.5 bg-gray-50 border-2"
                />
              </div>
              <div>
                <Label htmlFor="mobile" className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile Number
                </Label>
                <Input
                  id="mobile"
                  name="mobile"
                  defaultValue={user?.mobile || ''}
                  type="tel"
                  className="mt-1.5 border-2"
                  placeholder="10 digit mobile number"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <div className="mt-1.5">
                  <Badge className="text-sm px-3 py-1.5 bg-amber-600 text-white">
                    {user?.role || 'N/A'}
                  </Badge>
                </div>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="p-4 border-2 rounded-lg">
              <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Account Status
              </Label>
              <div className="mt-1.5">
                <Badge variant={user?.is_active ? 'success' : 'destructive'} className="text-sm px-3 py-1.5">
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="p-4 border-2 rounded-lg">
              <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4" />
                Employee ID
              </Label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {user?.employee_id || 'N/A'}
              </p>
            </div>
            <div className="p-4 border-2 rounded-lg">
              <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4" />
                Designation
              </Label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {user?.designation || 'N/A'}
              </p>
            </div>
            <div className="p-4 border-2 rounded-lg">
              <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Account Created
              </Label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            {user?.is_first_login && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <p className="text-sm font-semibold text-amber-800">
                  ⚠️ First time login detected. Please update your password.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
