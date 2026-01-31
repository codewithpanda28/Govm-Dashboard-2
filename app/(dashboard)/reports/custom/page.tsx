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
  FileSearch, Download, RefreshCw, ChevronLeft, Calendar,
  Building, MapPin, Filter, Eye, FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);
  const [thanas, setThanas] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    district: '',
    thana: '',
    caseStatus: '',
    accusedType: ''
  });

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    // Load unique districts
    const { data: districtData } = await supabase
      .from('fir_records')
      .select('district_name')
      .not('district_name', 'is', null);

    const uniqueDistricts = [...new Set(districtData?.map(d => d.district_name).filter(Boolean))];
    setDistricts(uniqueDistricts.sort());

    // Load unique thanas
    const { data: thanaData } = await supabase
      .from('fir_records')
      .select('thana_name')
      .not('thana_name', 'is', null);

    const uniqueThanas = [...new Set(thanaData?.map(t => t.thana_name).filter(Boolean))];
    setThanas(uniqueThanas.sort());
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('fir_records')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`);
      }
      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }
      if (filters.district) {
        query = query.eq('district_name', filters.district);
      }
      if (filters.thana) {
        query = query.eq('thana_name', filters.thana);
      }
      if (filters.caseStatus) {
        query = query.eq('case_status', filters.caseStatus);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      if (!data || data.length === 0) {
        setResults([]);
        toast.info('No records found matching filters');
        return;
      }

      // Get accused counts
      const firIds = data.map(f => f.id);
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id, accused_type')
        .in('fir_id', firIds);

      // Filter by accused type if selected
      let filteredFirIds = firIds;
      if (filters.accusedType && accusedData) {
        const matchingFirIds = accusedData
          .filter(a => a.accused_type === filters.accusedType)
          .map(a => a.fir_id);
        filteredFirIds = [...new Set(matchingFirIds)];
      }

      const accusedMap = new Map<number, number>();
      accusedData?.forEach(a => {
        accusedMap.set(a.fir_id, (accusedMap.get(a.fir_id) || 0) + 1);
      });

      const enrichedData = data
        .filter(f => !filters.accusedType || filteredFirIds.includes(f.id))
        .map(fir => ({
          ...fir,
          accused_count: accusedMap.get(fir.id) || 0
        }));

      setResults(enrichedData);
      toast.success(`Found ${enrichedData.length} records`);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['S.No.', 'FIR Number', 'Date', 'District', 'Thana', 'Complainant', 'Accused Count', 'Status'];
    const rows = results.map((fir, index) => [
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
    a.download = `custom_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      district: '',
      thana: '',
      caseStatus: '',
      accusedType: ''
    });
    setResults([]);
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
              <FileSearch className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Custom Report Builder</h1>
              <p className="text-muted-foreground text-sm">
                Create custom reports with advanced filters
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" disabled={results.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>District</Label>
                <select
                  value={filters.district}
                  onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">All Districts</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Thana</Label>
                <select
                  value={filters.thana}
                  onChange={(e) => setFilters({ ...filters, thana: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">All Thanas</option>
                  {thanas.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Case Status</Label>
                <select
                  value={filters.caseStatus}
                  onChange={(e) => setFilters({ ...filters, caseStatus: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="chargesheet_filed">Chargesheet Filed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <Label>Accused Type</Label>
                <select
                  value={filters.accusedType}
                  onChange={(e) => setFilters({ ...filters, accusedType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">All Types</option>
                  <option value="arrested">Arrested</option>
                  <option value="bailed">Bailed</option>
                  <option value="absconding">Absconding</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={generateReport} disabled={loading}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileSearch className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Report Results</span>
              </div>
              <Badge variant="secondary">{results.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Generating report...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No Results</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Apply filters and click Generate Report
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
                    {results.map((fir, index) => (
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
                        <td className="px-4 py-3 text-sm">{fir.complainant_name || '-'}</td>
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