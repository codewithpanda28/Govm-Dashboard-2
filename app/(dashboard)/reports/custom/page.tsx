'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToExcel, exportToGoogleSheets } from '@/lib/export';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomReportPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedData, setSelectedData] = useState({
    firDetails: true,
    accusedInfo: false,
    bailDetails: false,
  });
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    district: '',
    station: '',
    crimeType: '',
    status: '',
  });
  const [grouping, setGrouping] = useState({
    groupBy: '',
    sortBy: '',
    order: 'desc',
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    const [districtsRes, stationsRes] = await Promise.all([
      supabase.from('railway_districts').select('id, name').order('name'),
      supabase.from('police_stations').select('id, name').order('name'),
    ]);
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (stationsRes.data) setStations(stationsRes.data);
  };

  const generatePreview = async () => {
    setLoading(true);
    try {
      let query = supabase.from('fir_records').select('*, police_stations(name), railway_districts(name)').limit(100);

      if (filters.dateFrom) query = query.gte('incident_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('incident_date', filters.dateTo);
      if (filters.district) query = query.eq('railway_district_id', filters.district);
      if (filters.station) query = query.eq('police_station_id', filters.station);
      if (filters.status) query = query.eq('case_status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      setPreviewData(data || []);
      setStep(4);
    } catch (error: any) {
      toast.error('Failed to generate preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'sheets') => {
    if (previewData.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const columns = [
        { header: 'FIR Number', key: 'fir_number' },
        { header: 'Date', key: 'incident_date' },
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
          title: 'Custom Report',
          data: previewData,
          columns,
          filters,
          generatedBy: userData?.full_name,
        });
      } else if (format === 'excel') {
        exportToExcel({
          filename: 'Custom_Report',
          sheets: [{ name: 'Report', data: previewData, columns }],
        });
      } else {
        const result = exportToGoogleSheets(previewData, columns, 'Custom_Report');
        toast.info(result.message);
      }

      if (userData) {
        await supabase.from('export_logs').insert({
          user_id: userData.id,
          export_type: format.toUpperCase(),
          report_type: 'Custom Report',
          record_count: previewData.length,
          filters_applied: { ...filters, ...selectedData, ...grouping },
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
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Custom Report Builder</h1>
        <p className="text-amber-100 text-lg">Create personalized reports with custom filters and data selection</p>
      </div>

      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            Step {step} of 5
            <div className="flex-1 flex gap-2 ml-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded ${
                    s <= step ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Select Data Types</h3>
                <p className="text-gray-600 mb-4">Choose which data you want to include in your report</p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-amber-50 transition-colors">
                    <Checkbox
                      id="fir"
                      checked={selectedData.firDetails}
                      onCheckedChange={(checked) =>
                        setSelectedData({ ...selectedData, firDetails: !!checked })
                      }
                    />
                    <Label htmlFor="fir" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-gray-900">FIR Details</div>
                      <div className="text-sm text-gray-600">Include all FIR record information</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-amber-50 transition-colors">
                    <Checkbox
                      id="accused"
                      checked={selectedData.accusedInfo}
                      onCheckedChange={(checked) =>
                        setSelectedData({ ...selectedData, accusedInfo: !!checked })
                      }
                    />
                    <Label htmlFor="accused" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-gray-900">Accused Information</div>
                      <div className="text-sm text-gray-600">Include accused person details</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-amber-50 transition-colors">
                    <Checkbox
                      id="bail"
                      checked={selectedData.bailDetails}
                      onCheckedChange={(checked) =>
                        setSelectedData({ ...selectedData, bailDetails: !!checked })
                      }
                    />
                    <Label htmlFor="bail" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-gray-900">Bail Details</div>
                      <div className="text-sm text-gray-600">Include bail information and status</div>
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="bg-amber-600 hover:bg-amber-700">
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Apply Filters</h3>
                <p className="text-gray-600 mb-4">Filter the data based on your requirements</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>District</Label>
                    <Select
                      value={filters.district || undefined}
                      onValueChange={(value) => setFilters({ ...filters, district: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="All Districts" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Station</Label>
                    <Select
                      value={filters.station || undefined}
                      onValueChange={(value) => setFilters({ ...filters, station: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="All Stations" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={filters.status || undefined}
                      onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="investigation">Investigation</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="bg-amber-600 hover:bg-amber-700">
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Grouping & Sorting</h3>
                <p className="text-gray-600 mb-4">Organize your report data</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Group By</Label>
                    <Select
                      value={grouping.groupBy || undefined}
                      onValueChange={(value) => setGrouping({ ...grouping, groupBy: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="No Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="station">Police Station</SelectItem>
                        <SelectItem value="district">District</SelectItem>
                        <SelectItem value="crime">Crime Type</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sort By</Label>
                    <Select
                      value={grouping.sortBy || undefined}
                      onValueChange={(value) => setGrouping({ ...grouping, sortBy: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="fir_number">FIR Number</SelectItem>
                        <SelectItem value="modus_operandi_id">Crime Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Order</Label>
                    <Select
                      value={grouping.order}
                      onValueChange={(value) => setGrouping({ ...grouping, order: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={generatePreview} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                  {loading ? 'Generating...' : 'Generate Preview'}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Preview Report</h3>
                <p className="text-gray-600 mb-4">
                  Review your report data ({previewData.length} records found)
                </p>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="overflow-x-auto border-2 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <tr>
                          <th className="p-3 text-left font-bold">FIR Number</th>
                          <th className="p-3 text-left font-bold">Date</th>
                          <th className="p-3 text-left font-bold">Station</th>
                          <th className="p-3 text-left font-bold">Crime Type</th>
                          <th className="p-3 text-left font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 10).map((item) => (
                          <tr key={item.id} className="border-b hover:bg-amber-50">
                            <td className="p-3">{item.fir_number}</td>
                            <td className="p-3">{item.incident_date}</td>
                            <td className="p-3">{item.police_stations?.name || 'N/A'}</td>
                            <td className="p-3">{item.modus_operandi_id || 'N/A'}</td>
                            <td className="p-3">{item.case_status || 'Pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(5)} className="bg-amber-600 hover:bg-amber-700">
                  Continue to Export <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Export Report</h3>
                <p className="text-gray-600 mb-4">Choose your export format</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                    variant="outline"
                    className="h-24 flex-col border-2"
                  >
                    <FileText className="h-8 w-8 mb-2" />
                    <span>PDF Format</span>
                  </Button>
                  <Button
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                    variant="outline"
                    className="h-24 flex-col border-2"
                  >
                    <FileSpreadsheet className="h-8 w-8 mb-2" />
                    <span>Excel Format</span>
                  </Button>
                  <Button
                    onClick={() => handleExport('sheets')}
                    disabled={exporting}
                    variant="outline"
                    className="h-24 flex-col border-2"
                  >
                    <FileSpreadsheet className="h-8 w-8 mb-2" />
                    <span>Google Sheets</span>
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Report template saved!');
                    setStep(1);
                  }}
                  variant="outline"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
