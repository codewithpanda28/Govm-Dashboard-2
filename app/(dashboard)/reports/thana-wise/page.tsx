'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Download, RefreshCw, ChevronLeft, TrendingUp, Building } from 'lucide-react';
import { toast } from 'sonner';

interface ThanaStat {
  thana_name: string;
  district_name: string;
  total_firs: number;
  total_accused: number;
  arrested: number;
  bailed: number;
}

export default function ThanaWiseReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ThanaStat[]>([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: firData } = await supabase
        .from('fir_records')
        .select('id, thana_name, district_name');

      if (!firData || firData.length === 0) {
        setStats([]);
        return;
      }

      const firIds = firData.map(f => f.id);
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id, accused_type')
        .in('fir_id', firIds);

      const thanaMap = new Map<string, ThanaStat>();

      firData.forEach(fir => {
        const thana = fir.thana_name || 'Unknown';
        if (!thanaMap.has(thana)) {
          thanaMap.set(thana, {
            thana_name: thana,
            district_name: fir.district_name || 'Unknown',
            total_firs: 0,
            total_accused: 0,
            arrested: 0,
            bailed: 0
          });
        }
        thanaMap.get(thana)!.total_firs++;
      });

      accusedData?.forEach(acc => {
        const fir = firData.find(f => f.id === acc.fir_id);
        if (fir) {
          const thana = fir.thana_name || 'Unknown';
          const stat = thanaMap.get(thana);
          if (stat) {
            stat.total_accused++;
            if (acc.accused_type === 'arrested') stat.arrested++;
            if (acc.accused_type === 'bailed') stat.bailed++;
          }
        }
      });

      setStats(Array.from(thanaMap.values()).sort((a, b) => b.total_firs - a.total_firs));

    } catch (error: any) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (stats.length === 0) return;

    const headers = ['Rank', 'Thana', 'District', 'FIRs', 'Accused', 'Arrested', 'Bailed'];
    const rows = stats.map((s, i) => [
      i + 1, s.thana_name, s.district_name, s.total_firs, s.total_accused, s.arrested, s.bailed
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thana_wise_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
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
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Thana Wise Report</h1>
              <p className="text-muted-foreground text-sm">Crime statistics by police station</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={stats.length === 0}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button onClick={loadReport} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Thana Statistics</span>
              </div>
              <Badge variant="secondary">{stats.length} Thanas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              </div>
            ) : stats.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p>No Data Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">RANK</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">FIRs</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ACCUSED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ARRESTED</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">BAILED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.map((stat, index) => (
                      <tr key={stat.thana_name} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{stat.thana_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{stat.district_name}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 border">{stat.total_firs}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{stat.total_accused}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-300 border">{stat.arrested}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-green-100 text-green-700 border-green-300 border">{stat.bailed}</Badge>
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