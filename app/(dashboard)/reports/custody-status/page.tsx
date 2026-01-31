'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Download, RefreshCw, ChevronLeft, User, Scale, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function CustodyStatusReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [accused, setAccused] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (!accusedData) {
        setAccused([]);
        return;
      }

      const firIds = [...new Set(accusedData.map(a => a.fir_id))];
      const { data: firData } = await supabase
        .from('fir_records')
        .select('id, fir_number, district_name, thana_name')
        .in('id', firIds);

      const firMap = new Map(firData?.map(f => [f.id, f]) || []);

      const enriched = accusedData.map(acc => ({
        ...acc,
        fir_number: firMap.get(acc.fir_id)?.fir_number,
        district_name: firMap.get(acc.fir_id)?.district_name,
        thana_name: firMap.get(acc.fir_id)?.thana_name,
      }));

      setAccused(enriched);

    } catch (error: any) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const filteredAccused = accused.filter(acc => {
    if (filter === 'all') return true;
    return acc.accused_type === filter;
  });

  const stats = {
    arrested: accused.filter(a => a.accused_type === 'arrested').length,
    bailed: accused.filter(a => a.accused_type === 'bailed').length,
    absconding: accused.filter(a => a.accused_type === 'absconding').length,
    unknown: accused.filter(a => !a.accused_type || a.accused_type === 'unknown').length,
  };

  const handleExport = () => {
    if (filteredAccused.length === 0) return;

    const headers = ['S.No.', 'Name', 'Father', 'Mobile', 'FIR Number', 'District', 'Status'];
    const rows = filteredAccused.map((a, i) => [
      i + 1, a.name, a.father_name || '', a.mobile || '', a.fir_number || '', a.district_name || '', a.accused_type || 'unknown'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custody_status_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  const getStatusBadge = (type: string) => {
    const config: Record<string, string> = {
      arrested: 'bg-red-100 text-red-700 border-red-300',
      bailed: 'bg-green-100 text-green-700 border-green-300',
      absconding: 'bg-orange-100 text-orange-700 border-orange-300',
      unknown: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return config[type] || config.unknown;
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Custody Status Report</h1>
              <p className="text-muted-foreground text-sm">Current status of all accused persons</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={filteredAccused.length === 0}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button onClick={loadReport} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'arrested' ? 'ring-2 ring-red-500' : ''} bg-red-50 border-red-200`}
            onClick={() => setFilter(filter === 'arrested' ? 'all' : 'arrested')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Lock className="h-5 w-5 text-red-600" />
                <p className="text-2xl font-bold text-red-700">{stats.arrested}</p>
              </div>
              <p className="text-xs text-red-600 font-semibold mt-2">Arrested</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'bailed' ? 'ring-2 ring-green-500' : ''} bg-green-50 border-green-200`}
            onClick={() => setFilter(filter === 'bailed' ? 'all' : 'bailed')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Scale className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold text-green-700">{stats.bailed}</p>
              </div>
              <p className="text-xs text-green-600 font-semibold mt-2">Bailed</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'absconding' ? 'ring-2 ring-orange-500' : ''} bg-orange-50 border-orange-200`}
            onClick={() => setFilter(filter === 'absconding' ? 'all' : 'absconding')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold text-orange-700">{stats.absconding}</p>
              </div>
              <p className="text-xs text-orange-600 font-semibold mt-2">Absconding</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'unknown' ? 'ring-2 ring-gray-500' : ''} bg-gray-50 border-gray-200`}
            onClick={() => setFilter(filter === 'unknown' ? 'all' : 'unknown')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <User className="h-5 w-5 text-gray-600" />
                <p className="text-2xl font-bold text-gray-700">{stats.unknown}</p>
              </div>
              <p className="text-xs text-gray-600 font-semibold mt-2">Unknown</p>
            </CardContent>
          </Card>
        </div>

        {filter !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
            Clear Filter
          </Button>
        )}

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Accused List {filter !== 'all' && `(${filter.toUpperCase()})`}</span>
              <Badge variant="secondary">{filteredAccused.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : filteredAccused.length === 0 ? (
              <div className="py-12 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p>No Records Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAccused.map((acc, index) => (
                      <tr key={acc.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{acc.name || 'Unknown'}</p>
                          {acc.father_name && (
                            <p className="text-xs text-muted-foreground">S/o {acc.father_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 border font-mono">
                            {acc.fir_number || '-'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {acc.district_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`${getStatusBadge(acc.accused_type)} border`}>
                            {(acc.accused_type || 'unknown').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => router.push(`/fir/${acc.fir_id}`)}>
                            <FileText className="h-3 w-3 mr-1" />View FIR
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}