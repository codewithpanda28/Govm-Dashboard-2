'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import { Download, ScrollText, Eye, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/lib/export';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    action: '',
    userId: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();

  const checkAccess = useCallback(async () => {
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

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('id, full_name, email').order('full_name');
    if (data) setUsers(data);
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59);
        query = query.lte('created_at', endDate.toISOString());
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Logs query error:', error);
        throw error;
      }
      setLogs(data || []);
    } catch (error: any) {
      toast.error('Failed to load logs: ' + error.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    checkAccess();
    loadUsers();
  }, [checkAccess]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      loadLogs();
    }
  }, [loadLogs, userRole]);

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportToCSV(
      logs,
      [
        { header: 'Timestamp', key: 'created_at' },
        { header: 'User', key: 'users.full_name' },
        { header: 'Action', key: 'action' },
        { header: 'Table', key: 'table_name' },
        { header: 'Record ID', key: 'record_id' },
        { header: 'IP Address', key: 'ip_address' },
      ],
      'Audit_Logs'
    );
    toast.success('Exported successfully');
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
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Audit Logs</h1>
            <p className="text-amber-100 text-lg">View and track all system activities</p>
          </div>
          <Button
            onClick={handleExport}
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-amber-600" />
            Filter Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                max={filters.dateTo || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Date To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                min={filters.dateFrom}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Action Type</Label>
              <Select
                value={filters.action || undefined}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                  <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                  <SelectItem value="EXPORT">EXPORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">User</Label>
              <Select
                value={filters.userId || undefined}
                onValueChange={(value) => setFilters({ ...filters, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                setFilters({ dateFrom: '', dateTo: '', action: '', userId: '' });
              }}
              variant="outline"
              size="sm"
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-amber-600" />
              Audit Logs
            </div>
            <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
              {logs.length} Records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border-2 border-amber-100">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <tr>
                  <th className="p-3 text-left font-bold">Timestamp</th>
                  <th className="p-3 text-left font-bold">User</th>
                  <th className="p-3 text-left font-bold">Action</th>
                  <th className="p-3 text-left font-bold">Table</th>
                  <th className="p-3 text-left font-bold">Record ID</th>
                  <th className="p-3 text-left font-bold">IP Address</th>
                  <th className="p-3 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <ScrollText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 font-semibold text-lg">No Logs Found</p>
                      <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-amber-50 transition-colors">
                      <td className="p-3 font-mono text-xs">{formatDateTime(log.created_at)}</td>
                      <td className="p-3 font-medium">{log.users?.full_name || 'Unknown'}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            log.action === 'CREATE'
                              ? 'success'
                              : log.action === 'UPDATE'
                              ? 'warning'
                              : log.action === 'DELETE'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3">{log.table_name || 'N/A'}</td>
                      <td className="p-3 font-mono text-xs">{log.record_id || 'N/A'}</td>
                      <td className="p-3 font-mono text-xs">{log.ip_address || 'N/A'}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">Timestamp</Label>
                  <p className="text-lg font-semibold mt-1">{formatDateTime(selectedLog.created_at)}</p>
                </div>
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">User</Label>
                  <p className="text-lg font-semibold mt-1">
                    {selectedLog.users?.full_name || 'Unknown'}
                  </p>
                </div>
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">Action</Label>
                  <p className="text-lg font-semibold mt-1">
                    <Badge>{selectedLog.action}</Badge>
                  </p>
                </div>
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">Table</Label>
                  <p className="text-lg font-semibold mt-1">{selectedLog.table_name || 'N/A'}</p>
                </div>
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">Record ID</Label>
                  <p className="text-lg font-semibold mt-1 font-mono">
                    {selectedLog.record_id || 'N/A'}
                  </p>
                </div>
                <div className="p-4 border-2 rounded-lg">
                  <Label className="text-xs text-gray-500">IP Address</Label>
                  <p className="text-lg font-semibold mt-1 font-mono">
                    {selectedLog.ip_address || 'N/A'}
                  </p>
                </div>
              </div>
              {selectedLog.old_values && (
                <div className="p-4 border-2 rounded-lg bg-gray-50">
                  <Label className="text-xs text-gray-500">Old Values</Label>
                  <pre className="text-sm mt-2 overflow-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_values && (
                <div className="p-4 border-2 rounded-lg bg-green-50">
                  <Label className="text-xs text-gray-500">New Values</Label>
                  <pre className="text-sm mt-2 overflow-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
