'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Download, RefreshCw, ChevronLeft, TrendingUp, Users, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DistrictStat {
  district_name: string;
  total_firs: number;
  total_accused: number;
  arrested: number;
  bailed: number;
  absconding: number;
}

export default function DistrictWiseReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DistrictStat[]>([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      // Get all FIRs
      const { data: firData } = await supabase
        .from('fir_records')
        .select('id, district_name');

      if (!firData || firData.length === 0) {
        setStats([]);
        return;
      }

      // Get all accused
      const firIds = firData.map(f => f.id);
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id, accused_type')
        .in('fir_id', firIds);

      // Group by district
      const districtMap = new Map<string, DistrictStat>();

      firData.forEach(fir => {
        const district = fir.district_name || 'Unknown';
        if (!districtMap.has(district)) {
          districtMap.set(district, {
            district_name: district,
            total_firs: 0,
            total_accused: 0,
            arrested: 0,
            bailed: 0,
            absconding: 0
          });
        }
        districtMap.get(district)!.total_firs++;
      });

      accusedData?.forEach(acc => {
        const fir = firData.find(f => f.id === acc.fir_id);
        if (fir) {
          const district = fir.district_name || 'Unknown';
          const stat = districtMap.get(district);
          if (stat) {
            stat.total_accused++;
            if (acc.accused_type === 'arrested') stat.arrested++;
            if (acc.accused_type === 'bailed') stat.bailed++;
            if (acc.accused_type === 'absconding') stat.absconding++;
          }
        }
      });

      const sortedStats = Array.from(districtMap.values())
        .sort((a, b) => b.total_firs - a.total_firs);

      setStats(sortedStats);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (stats.length === 0) return;

    const headers = ['Rank', 'District', 'Total FIRs', 'Total Accused', 'Arrested', 'Bailed', 'Absconding'];
    const rows = stats.map((s, i) => [
      i + 1, s.district_name, s.total_firs, s.total_accused, s.arrested, s.bailed, s.absconding
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `district_wise_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  const totals = stats.reduce((acc, s) => ({
    firs: acc.firs + s.total_firs,
    accused: acc.accused + s.total_accused,
    arrested: acc.arrested + s.arrested,
    bailed: acc.bailed + s.bailed
  }), { firs: 0, accused: 0, arrested: 0, bailed: 0 });

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
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">District Wise Report</h1>
              <p className="text-muted-foreground text-sm">Crime statistics by district</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={stats.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={loadReport} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-semibold">Total FIRs</p>
              <p className="text-2xl font-bold text-blue-700">{totals.firs}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs text-red-600 font-semibold">Total Accused</p>
              <p className="text-2xl font-bold text-red-700">{totals.accused}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Arrested</p>
              <p className="text-2xl font-bold text-orange-700">{totals.arrested}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Bailed</p>
              <p className="text-2xl font-bold text-green-700">{totals.bailed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>District Statistics</span>
              </div>
              <Badge variant="secondary">{stats.length} Districts</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : stats.length === 0 ? (
              <div className="py-12 text-center">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No Data Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">RANK</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">FIRs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ACCUSED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ARRESTED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">BAILED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ABSCONDING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.map((stat, index) => (
                      <tr key={stat.district_name} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{stat.district_name}</td>
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
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 border">
                            {stat.absconding}
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