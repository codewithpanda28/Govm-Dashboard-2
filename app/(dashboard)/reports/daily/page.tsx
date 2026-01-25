'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Printer, FileSpreadsheet, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { exportToPDF, exportToExcel, exportToGoogleSheets } from '@/lib/export';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [firs, setFirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDailyReport();
  }, [date]);

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fir_records')
        .select('*, police_stations(name), railway_districts(name)')
        .eq('incident_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFirs(data || []);
    } catch (error: any) {
      toast.error('Failed to load report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'sheets') => {
    if (firs.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const columns = [
        { header: 'FIR Number', key: 'fir_number' },
        { header: 'Date', key: 'incident_date' },
        { header: 'Time', key: 'incident_time' },
        { header: 'Police Station', key: 'police_stations.name' },
        { header: 'District', key: 'railway_districts.name' },
        { header: 'Crime Type', key: 'modus_operandi_id' },
        { header: 'Status', key: 'case_status' },
      ];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user?.id)
        .single();

      if (format === 'pdf') {
        await exportToPDF({
          title: `Daily FIR Report - ${formatDate(date)}`,
          data: firs,
          columns,
          generatedBy: userData?.full_name,
        });
      } else if (format === 'excel') {
        exportToExcel({
          filename: `Daily_FIR_Report_${date}`,
          sheets: [
            {
              name: 'Daily Report',
              data: firs,
              columns,
            },
          ],
        });
      } else {
        const result = exportToGoogleSheets(firs, columns, `Daily_FIR_Report_${date}`);
        toast.info(result.message);
        result.steps.forEach((step) => console.log(step));
      }

      if (userData) {
        await supabase.from('export_logs').insert({
          user_id: userData.id,
          export_type: format.toUpperCase(),
          report_type: 'Daily FIR Report',
          record_count: firs.length,
        });
      }

      toast.success(`Exported ${firs.length} records successfully`);
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
          <h1 className="text-3xl font-bold text-gray-900">Daily FIR Report</h1>
          <p className="text-gray-600 mt-1">Generate daily FIR summary</p>
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
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total FIRs</p>
                <p className="text-2xl font-bold text-gray-900">{firs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-medium">{formatDate(date)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>FIR Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : firs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No FIRs found for this date
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left font-semibold">FIR Number</th>
                    <th className="p-2 text-left font-semibold">Time</th>
                    <th className="p-2 text-left font-semibold">Station</th>
                    <th className="p-2 text-left font-semibold">Crime Type</th>
                    <th className="p-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {firs.map((fir) => (
                    <tr key={fir.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{fir.fir_number}</td>
                      <td className="p-2">{fir.incident_time || 'N/A'}</td>
                      <td className="p-2">{fir.police_stations?.name || 'N/A'}</td>
                      <td className="p-2">{fir.modus_operandi_id || 'N/A'}</td>
                      <td className="p-2">{fir.case_status || 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
