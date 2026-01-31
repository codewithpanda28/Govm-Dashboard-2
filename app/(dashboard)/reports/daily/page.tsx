'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Calendar, FileText, Download, RefreshCw, Users, MapPin,
  ChevronLeft, Eye, ExternalLink, Clock, Building
} from 'lucide-react';
import { toast } from 'sonner';

interface FIRRecord {
  id: number;
  fir_number: string;
  incident_date: string;
  case_status: string;
  district_name: string;
  thana_name: string;
  complainant_name: string;
  created_at: string;
  accused_count?: number;
}

export default function DailyReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [firs, setFirs] = useState<FIRRecord[]>([]);
  const [stats, setStats] = useState({
    totalFirs: 0,
    totalAccused: 0,
    districts: 0,
    thanas: 0
  });

  const loadDailyReport = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const startDate = `${selectedDate}T00:00:00`;
      const endDate = `${selectedDate}T23:59:59`;

      // Get FIRs for selected date
      const { data: firData, error } = await supabase
        .from('fir_records')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!firData || firData.length === 0) {
        setFirs([]);
        setStats({ totalFirs: 0, totalAccused: 0, districts: 0, thanas: 0 });
        toast.info('No FIRs found for this date');
        return;
      }

      // Get accused counts
      const firIds = firData.map(f => f.id);
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id')
        .in('fir_id', firIds);

      const accusedMap = new Map<number, number>();
      accusedData?.forEach(a => {
        accusedMap.set(a.fir_id, (accusedMap.get(a.fir_id) || 0) + 1);
      });

      const enrichedFirs = firData.map(fir => ({
        ...fir,
        accused_count: accusedMap.get(fir.id) || 0
      }));

      setFirs(enrichedFirs);

      // Calculate stats
      const uniqueDistricts = new Set(firData.map(f => f.district_name).filter(Boolean));
      const uniqueThanas = new Set(firData.map(f => f.thana_name).filter(Boolean));

      setStats({
        totalFirs: firData.length,
        totalAccused: accusedData?.length || 0,
        districts: uniqueDistricts.size,
        thanas: uniqueThanas.size
      });

      toast.success(`Found ${firData.length} FIRs`);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (firs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['S.No.', 'FIR Number', 'Date', 'District', 'Thana', 'Complainant', 'Accused Count', 'Status'];
    const rows = firs.map((fir, index) => [
      index + 1,
      fir.fir_number || '',
      fir.incident_date || '',
      fir.district_name || '',
      fir.thana_name || '',
      fir.complainant_name || '',
      fir.accused_count || 0,
      fir.case_status || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_fir_report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Daily FIR Report</h1>
              <p className="text-muted-foreground text-sm">
                Generate FIR report for a specific date
              </p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={firs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Date Selector */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadDailyReport} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {firs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-blue-600 font-semibold">Total FIRs</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalFirs}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <p className="text-xs text-red-600 font-semibold">Total Accused</p>
                <p className="text-2xl font-bold text-red-700">{stats.totalAccused}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-xs text-green-600 font-semibold">Districts</p>
                <p className="text-2xl font-bold text-green-700">{stats.districts}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <p className="text-xs text-purple-600 font-semibold">Thanas</p>
                <p className="text-2xl font-bold text-purple-700">{stats.thanas}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FIRs Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>FIRs Registered on {formatDate(selectedDate)}</span>
              </div>
              <Badge variant="secondary">{firs.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Generating report...</p>
              </div>
            ) : firs.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No FIRs Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a date and click Generate Report
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT / THANA</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">COMPLAINANT</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ACCUSED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {firs.map((fir, index) => (
                      <tr key={fir.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 border font-mono">
                            {fir.fir_number}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-medium">{fir.district_name || '-'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {fir.thana_name || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {fir.complainant_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{fir.accused_count || 0}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{fir.case_status || 'Open'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/fir/${fir.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
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