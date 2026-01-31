'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Download, RefreshCw, ChevronLeft, User, Phone, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface RepeatOffender {
  name: string;
  mobile: string | null;
  aadhaar: string | null;
  case_count: number;
  fir_numbers: string[];
}

export default function RepeatOffendersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [offenders, setOffenders] = useState<RepeatOffender[]>([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('name, mobile, aadhaar, fir_id');

      if (!accusedData) {
        setOffenders([]);
        return;
      }

      // Get FIR numbers
      const firIds = [...new Set(accusedData.map(a => a.fir_id))];
      const { data: firData } = await supabase
        .from('fir_records')
        .select('id, fir_number')
        .in('id', firIds);

      const firMap = new Map(firData?.map(f => [f.id, f.fir_number]) || []);

      // Group by mobile or aadhaar
      const offenderMap = new Map<string, RepeatOffender>();

      accusedData.forEach(acc => {
        const key = acc.mobile || acc.aadhaar || acc.name;
        if (!key) return;

        if (!offenderMap.has(key)) {
          offenderMap.set(key, {
            name: acc.name || 'Unknown',
            mobile: acc.mobile,
            aadhaar: acc.aadhaar,
            case_count: 0,
            fir_numbers: []
          });
        }

        const offender = offenderMap.get(key)!;
        offender.case_count++;
        const firNum = firMap.get(acc.fir_id);
        if (firNum && !offender.fir_numbers.includes(firNum)) {
          offender.fir_numbers.push(firNum);
        }
      });

      // Filter only repeat offenders (2+ cases)
      const repeats = Array.from(offenderMap.values())
        .filter(o => o.case_count >= 2)
        .sort((a, b) => b.case_count - a.case_count);

      setOffenders(repeats);

    } catch (error: any) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (offenders.length === 0) return;

    const headers = ['Rank', 'Name', 'Mobile', 'Aadhaar', 'Cases', 'FIR Numbers'];
    const rows = offenders.map((o, i) => [
      i + 1, o.name, o.mobile || '', o.aadhaar || '', o.case_count, o.fir_numbers.join('; ')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repeat_offenders.csv`;
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Repeat Offenders</h1>
              <p className="text-muted-foreground text-sm">Accused persons involved in multiple cases</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={offenders.length === 0}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <Button onClick={loadReport} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Total Repeat Offenders</p>
              <p className="text-2xl font-bold text-orange-700">{offenders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs text-red-600 font-semibold">3+ Cases</p>
              <p className="text-2xl font-bold text-red-700">
                {offenders.filter(o => o.case_count >= 3).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">5+ Cases</p>
              <p className="text-2xl font-bold text-purple-700">
                {offenders.filter(o => o.case_count >= 5).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Repeat Offenders List</span>
              </div>
              <Badge variant="secondary">{offenders.length} Persons</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              </div>
            ) : offenders.length === 0 ? (
              <div className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No Repeat Offenders Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">RANK</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">MOBILE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">CASES</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBERS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {offenders.map((offender, index) => (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant={offender.case_count >= 5 ? "destructive" : offender.case_count >= 3 ? "default" : "outline"}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="font-medium">{offender.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {offender.mobile ? (
                            <div className="flex items-center gap-1 text-sm font-mono">
                              <Phone className="h-3 w-3" />
                              {offender.mobile}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-300 border font-bold">
                            {offender.case_count} CASES
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {offender.fir_numbers.slice(0, 3).map(fir => (
                              <Badge key={fir} variant="outline" className="text-xs font-mono">
                                {fir}
                              </Badge>
                            ))}
                            {offender.fir_numbers.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{offender.fir_numbers.length - 3} more
                              </Badge>
                            )}
                          </div>
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