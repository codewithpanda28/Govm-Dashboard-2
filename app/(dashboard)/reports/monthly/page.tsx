'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  BarChart3, FileText, Download, RefreshCw, Users, MapPin,
  ChevronLeft, Calendar, Building, TrendingUp, Scale
} from 'lucide-react';
import { toast } from 'sonner';

interface MonthlyStat {
  district_name: string;
  thana_name: string;
  total_firs: number;
  total_accused: number;
  arrested: number;
  bailed: number;
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [summary, setSummary] = useState({
    totalFirs: 0,
    totalAccused: 0,
    totalArrested: 0,
    totalBailed: 0,
    totalDistricts: 0,
    totalThanas: 0
  });

  const loadMonthlyReport = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get FIRs for selected month
      const { data: firData, error } = await supabase
        .from('fir_records')
        .select('id, district_name, thana_name')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (error) throw error;

      if (!firData || firData.length === 0) {
        setStats([]);
        setSummary({
          totalFirs: 0, totalAccused: 0, totalArrested: 0, 
          totalBailed: 0, totalDistricts: 0, totalThanas: 0
        });
        toast.info('No data found for this month');
        return;
      }

      // Get accused data
      const firIds = firData.map(f => f.id);
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id, accused_type')
        .in('fir_id', firIds);

      // Group by district/thana
      const groupedStats = new Map<string, MonthlyStat>();

      firData.forEach(fir => {
        const key = `${fir.district_name || 'Unknown'}-${fir.thana_name || 'Unknown'}`;
        if (!groupedStats.has(key)) {
          groupedStats.set(key, {
            district_name: fir.district_name || 'Unknown',
            thana_name: fir.thana_name || 'Unknown',
            total_firs: 0,
            total_accused: 0,
            arrested: 0,
            bailed: 0
          });
        }
        groupedStats.get(key)!.total_firs++;
      });

      // Add accused counts
      accusedData?.forEach(acc => {
        const fir = firData.find(f => f.id === acc.fir_id);
        if (fir) {
          const key = `${fir.district_name || 'Unknown'}-${fir.thana_name || 'Unknown'}`;
          const stat = groupedStats.get(key);
          if (stat) {
            stat.total_accused++;
            if (acc.accused_type === 'arrested') stat.arrested++;
            if (acc.accused_type === 'bailed') stat.bailed++;
          }
        }
      });

      const statsArray = Array.from(groupedStats.values())
        .sort((a, b) => b.total_firs - a.total_firs);

      setStats(statsArray);

      // Calculate summary
      const uniqueDistricts = new Set(firData.map(f => f.district_name).filter(Boolean));
      const uniqueThanas = new Set(firData.map(f => f.thana_name).filter(Boolean));

      setSummary({
        totalFirs: firData.length,
        totalAccused: accusedData?.length || 0,
        totalArrested: accusedData?.filter(a => a.accused_type === 'arrested').length || 0,
        totalBailed: accusedData?.filter(a => a.accused_type === 'bailed').length || 0,
        totalDistricts: uniqueDistricts.size,
        totalThanas: uniqueThanas.size
      });

      toast.success(`Report generated: ${firData.length} FIRs found`);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (stats.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['S.No.', 'District', 'Thana', 'Total FIRs', 'Total Accused', 'Arrested', 'Bailed'];
    const rows = stats.map((stat, index) => [
      index + 1,
      stat.district_name,
      stat.thana_name,
      stat.total_firs,
      stat.total_accused,
      stat.arrested,
      stat.bailed
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_crime_report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Monthly Crime Report</h1>
              <p className="text-muted-foreground text-sm">
                Comprehensive monthly crime analysis
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" disabled={stats.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Month Selector */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Select Month
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Report Month</Label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadMonthlyReport} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-blue-600 font-semibold">Total FIRs</p>
                <p className="text-2xl font-bold text-blue-700">{summary.totalFirs}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <p className="text-xs text-red-600 font-semibold">Total Accused</p>
                <p className="text-2xl font-bold text-red-700">{summary.totalAccused}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-4">
                <p className="text-xs text-orange-600 font-semibold">Arrested</p>
                <p className="text-2xl font-bold text-orange-700">{summary.totalArrested}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-xs text-green-600 font-semibold">Bailed</p>
                <p className="text-2xl font-bold text-green-700">{summary.totalBailed}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <p className="text-xs text-purple-600 font-semibold">Districts</p>
                <p className="text-2xl font-bold text-purple-700">{summary.totalDistricts}</p>
              </CardContent>
            </Card>
            <Card className="bg-cyan-50 border-cyan-200">
              <CardContent className="pt-4">
                <p className="text-xs text-cyan-600 font-semibold">Thanas</p>
                <p className="text-2xl font-bold text-cyan-700">{summary.totalThanas}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Crime Statistics - {selectedMonth && getMonthName(selectedMonth)}</span>
              </div>
              <Badge variant="secondary">{stats.length} Locations</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Generating report...</p>
              </div>
            ) : stats.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No Data Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a month and click Generate Report
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">TOTAL FIRs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ACCUSED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ARRESTED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">BAILED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.map((stat, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{stat.district_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {stat.thana_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 border">
                            {stat.total_firs}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{stat.total_accused}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-300 border">
                            {stat.arrested}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-green-100 text-green-700 border-green-300 border">
                            {stat.bailed}
                          </Badge>
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