'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToGoogleSheets } from '@/lib/export';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState<any>({});
  const [firs, setFirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadMonthlyReport();
  }, [month]);

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(new Date(month + '-01'));
      const monthEnd = endOfMonth(monthStart);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      const [firsRes, accusedRes] = await Promise.all([
        supabase
          .from('fir_records')
          .select('id, modus_operandi_id, police_stations(name)')
          .gte('incident_date', monthStartStr)
          .lte('incident_date', monthEndStr),
        supabase
          .from('accused_persons')
          .select('custody_status, fir_id'),
      ]);

      const firsData = firsRes.data || [];
      const firIds = firsData.map((f) => f.id);
      const accusedData = (accusedRes.data || []).filter((a) =>
        firIds.includes(a.fir_id)
      );

      setFirs(firsData);
      setStats({
        totalFirs: firsData.length,
        totalAccused: accusedData.length,
        bailCases: accusedData.filter((a) => a.custody_status === 'bail').length,
        custodyCases: accusedData.filter((a) => a.custody_status === 'custody').length,
      });
    } catch (error: any) {
      toast.error('Failed to load report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'sheets') => {
    if (firs.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const columns = [
        { header: 'Total FIRs', key: 'totalFirs' },
        { header: 'Total Accused', key: 'totalAccused' },
        { header: 'Bail Cases', key: 'bailCases' },
        { header: 'Custody Cases', key: 'custodyCases' },
      ];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user?.id)
        .single();

      if (exportFormat === 'pdf') {
        await exportToPDF({
          title: `Monthly Report - ${format(new Date(month + '-01'), 'MMMM yyyy')}`,
          data: [stats],
          columns,
          generatedBy: userData?.full_name,
        });
      } else if (exportFormat === 'excel') {
        exportToExcel({
          filename: `Monthly_Report_${month}`,
          sheets: [
            {
              name: 'Summary',
              data: [stats],
              columns,
            },
            {
              name: 'FIRs',
              data: firs,
              columns: [
                { header: 'FIR ID', key: 'id' },
                { header: 'Crime Type', key: 'modus_operandi_id' },
                { header: 'Police Station', key: 'police_stations.name' },
              ],
            },
          ],
        });
      } else {
        const result = exportToGoogleSheets([stats], columns, `Monthly_Report_${month}`);
        toast.info(result.message);
      }

      if (userData) {
        await supabase.from('export_logs').insert({
          user_id: userData.id,
          export_type: exportFormat.toUpperCase(),
          report_type: 'Monthly Report',
          record_count: firs.length,
        });
      }

      toast.success('Report exported successfully');
    } catch (error: any) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-gray-600 mt-1">Generate monthly crime report</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => handleExport('pdf')}
            variant="outline"
            size="sm"
            disabled={exporting || firs.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            onClick={() => handleExport('excel')}
            variant="outline"
            size="sm"
            disabled={exporting || firs.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            onClick={() => handleExport('sheets')}
            variant="outline"
            size="sm"
            disabled={exporting || firs.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Google Sheets
          </Button>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Select Month</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-xs"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-2">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Total FIRs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalFirs || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Total Accused</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalAccused || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Bail Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.bailCases || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-base">Custody Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.custodyCases || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}