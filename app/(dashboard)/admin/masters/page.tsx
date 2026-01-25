'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, Plus, Edit, RefreshCw, Shield, Train, Building, MapPin, Map } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminMastersPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('stations');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();

  // Check Access
  const checkAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();
        if (data?.role !== 'super_admin') {
          router.push('/dashboard');
        } else {
          setUserRole(data.role);
        }
      }
    } catch (error) {
      console.error('Access check error:', error);
      router.push('/dashboard');
    }
  }, [supabase, router]);

  // Load Districts for dropdown
  const loadDistricts = async () => {
    const { data } = await supabase.from('railway_districts').select('id, name').order('name');
    if (data) setDistricts(data);
  };

  // ✅ Fixed: Load Items with correct order column
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let tableName = '';
      let orderColumn = 'name';

      switch (activeTab) {
        case 'stations':
          tableName = 'police_stations';
          orderColumn = 'name';
          break;
        case 'districts':
          tableName = 'railway_districts';
          orderColumn = 'name';
          break;
        case 'states':
          tableName = 'states';
          orderColumn = 'name';
          break;
        case 'trains':
          tableName = 'trains';
          orderColumn = 'train_number'; // ✅ Fixed: trains has train_number, not name
          break;
        default:
          return;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderColumn);

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error('Failed to load data: ' + error.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeTab]);

  useEffect(() => {
    checkAccess();
    loadDistricts();
  }, [checkAccess]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      loadItems();
    }
  }, [loadItems, userRole, activeTab]);

  // ✅ Fixed: Handle Save with all tabs including states
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    let tableName = '';
    let data: any = {};

    switch (activeTab) {
      case 'stations':
        tableName = 'police_stations';
        data = {
          name: formData.get('name'),
          code: formData.get('code') || null,
          railway_district_id: formData.get('railway_district_id') 
            ? parseInt(formData.get('railway_district_id') as string) 
            : null,
          address: formData.get('address') || null,
          contact_number: formData.get('contact_number') || null,
          is_active: true,
        };
        break;
      case 'districts':
        tableName = 'railway_districts';
        data = {
          name: formData.get('name'),
          code: formData.get('code') || null,
          is_active: true,
        };
        break;
      case 'states':
        tableName = 'states';
        data = {
          name: formData.get('name'),
          code: formData.get('code') || null,
          is_active: true,
        };
        break;
      case 'trains':
        tableName = 'trains';
        data = {
          train_number: formData.get('train_number'),
          train_name: formData.get('train_name'),
          is_active: true,
        };
        break;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update(data)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Updated successfully!');
      } else {
        const { error } = await supabase.from(tableName).insert(data);
        if (error) throw error;
        toast.success('Created successfully!');
      }
      setShowDialog(false);
      setEditingItem(null);
      loadItems();
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (item: any) => {
    let tableName = '';
    switch (activeTab) {
      case 'stations':
        tableName = 'police_stations';
        break;
      case 'districts':
        tableName = 'railway_districts';
        break;
      case 'states':
        tableName = 'states';
        break;
      case 'trains':
        tableName = 'trains';
        break;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(item.is_active ? 'Deactivated' : 'Activated');
      loadItems();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  // Get Dialog Title
  const getDialogTitle = () => {
    const action = editingItem ? 'Edit' : 'Add New';
    switch (activeTab) {
      case 'stations': return `${action} Police Station`;
      case 'districts': return `${action} District`;
      case 'states': return `${action} State`;
      case 'trains': return `${action} Train`;
      default: return action;
    }
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mt-2">Super admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Master Data Management</h1>
            <p className="text-amber-100 text-lg">Manage system master data tables</p>
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowDialog(true);
            }}
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            Master Data Tables
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="stations" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Police Stations
              </TabsTrigger>
              <TabsTrigger value="districts" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Districts
              </TabsTrigger>
              <TabsTrigger value="states" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                States
              </TabsTrigger>
              <TabsTrigger value="trains" className="flex items-center gap-2">
                <Train className="h-4 w-4" />
                Trains
              </TabsTrigger>
            </TabsList>

            {/* ===================== POLICE STATIONS TAB ===================== */}
            <TabsContent value="stations" className="mt-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      <tr>
                        <th className="p-3 text-left font-bold">Name</th>
                        <th className="p-3 text-left font-bold">Code</th>
                        <th className="p-3 text-left font-bold">District</th>
                        <th className="p-3 text-left font-bold">Contact</th>
                        <th className="p-3 text-left font-bold">Status</th>
                        <th className="p-3 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            No police stations found. Click "Add New" to create.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3">{item.code || 'N/A'}</td>
                            <td className="p-3">
                              {districts.find((d) => d.id === item.railway_district_id)?.name || 'N/A'}
                            </td>
                            <td className="p-3">{item.contact_number || 'N/A'}</td>
                            <td className="p-3">
                              <Badge className={item.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {item.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowDialog(true);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(item)}
                                  className="text-orange-600 hover:bg-orange-50"
                                  title="Toggle Status"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ===================== DISTRICTS TAB ===================== */}
            <TabsContent value="districts" className="mt-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      <tr>
                        <th className="p-3 text-left font-bold">District Name</th>
                        <th className="p-3 text-left font-bold">Code</th>
                        <th className="p-3 text-left font-bold">Status</th>
                        <th className="p-3 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-500">
                            No districts found. Click "Add New" to create.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3">{item.code || 'N/A'}</td>
                            <td className="p-3">
                              <Badge className={item.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {item.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowDialog(true);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(item)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ===================== STATES TAB ===================== */}
            <TabsContent value="states" className="mt-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      <tr>
                        <th className="p-3 text-left font-bold">State Name</th>
                        <th className="p-3 text-left font-bold">Code</th>
                        <th className="p-3 text-left font-bold">Status</th>
                        <th className="p-3 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-500">
                            No states found. Click "Add New" to create.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3">{item.code || 'N/A'}</td>
                            <td className="p-3">
                              <Badge className={item.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {item.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowDialog(true);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(item)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ===================== TRAINS TAB ===================== */}
            <TabsContent value="trains" className="mt-6">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      <tr>
                        <th className="p-3 text-left font-bold">Train Number</th>
                        <th className="p-3 text-left font-bold">Train Name</th>
                        <th className="p-3 text-left font-bold">Status</th>
                        <th className="p-3 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-500">
                            No trains found. Click "Add New" to create.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="p-3 font-mono font-bold text-blue-600">{item.train_number}</td>
                            <td className="p-3 font-medium">{item.train_name}</td>
                            <td className="p-3">
                              <Badge className={item.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {item.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowDialog(true);
                                  }}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(item)}
                                  className="text-orange-600 hover:bg-orange-50"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ===================== ADD/EDIT DIALOG ===================== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* Police Station Form */}
            {activeTab === 'stations' && (
              <>
                <div>
                  <Label>Station Name *</Label>
                  <Input
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    required
                    placeholder="Railway PS East Zone"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Code</Label>
                    <Input
                      name="code"
                      defaultValue={editingItem?.code || ''}
                      placeholder="RPS-E1"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Railway District *</Label>
                    <select
                      name="railway_district_id"
                      defaultValue={editingItem?.railway_district_id || ''}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    >
                      <option value="">Select District</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    name="address"
                    defaultValue={editingItem?.address || ''}
                    placeholder="Near Railway Station"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Contact Number</Label>
                  <Input
                    name="contact_number"
                    defaultValue={editingItem?.contact_number || ''}
                    placeholder="0612-2345678"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* District Form */}
            {activeTab === 'districts' && (
              <>
                <div>
                  <Label>District Name *</Label>
                  <Input
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    required
                    placeholder="East"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    name="code"
                    defaultValue={editingItem?.code || ''}
                    placeholder="E"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* State Form */}
            {activeTab === 'states' && (
              <>
                <div>
                  <Label>State Name *</Label>
                  <Input
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    required
                    placeholder="Jharkhand"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>State Code</Label>
                  <Input
                    name="code"
                    defaultValue={editingItem?.code || ''}
                    placeholder="JH"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Train Form */}
            {activeTab === 'trains' && (
              <>
                <div>
                  <Label>Train Number *</Label>
                  <Input
                    name="train_number"
                    defaultValue={editingItem?.train_number || ''}
                    required
                    placeholder="12301"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Train Name *</Label>
                  <Input
                    name="train_name"
                    defaultValue={editingItem?.train_name || ''}
                    required
                    placeholder="Rajdhani Express"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={actionLoading}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {actionLoading ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  editingItem ? 'Update' : 'Create'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}