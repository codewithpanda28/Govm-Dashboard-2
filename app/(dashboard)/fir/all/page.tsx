'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { FileText, Download, Search, Filter, RefreshCw, X, FileSpreadsheet } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { exportToPDF, exportToExcel, exportToCSV, exportToGoogleSheets } from '@/lib/export';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllFIRsPage() {
  const [firs, setFirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    firNumber: '',
    dateFrom: '',
    dateTo: '',
    station: '',
    district: '',
    status: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [districts, setDistricts] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const supabase = createClient();

  const loadMasterData = useCallback(async () => {
    try {
      const [districtsRes, stationsRes] = await Promise.all([
        supabase.from('railway_districts').select('id, name').order('name'),
        supabase.from('police_stations').select('id, name').order('name'),
      ]);
      
      if (districtsRes.data) setDistricts(districtsRes.data);
      if (stationsRes.data) setStations(stationsRes.data);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  }, [supabase]);

  const loadFIRs = useCallback(async () => {
    setLoading(true);
    try {
      // Fixed query - don't use inner join, use left join
      let query = supabase
        .from('fir_records')
        .select(
          'id, fir_number, incident_date, incident_time, modus_operandi_id, case_status, police_station_id, railway_district_id, created_at, police_stations(name), railway_districts(name)',
          { count: 'exact' }
        );

      if (filters.firNumber) {
        query = query.ilike('fir_number', `%${filters.firNumber}%`);
      }
      if (filters.dateFrom) {
        query = query.gte('incident_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('incident_date', filters.dateTo);
      }
      if (filters.station) {
        query = query.eq('police_station_id', filters.station);
      }
      if (filters.district) {
        query = query.eq('railway_district_id', filters.district);
      }
      if (filters.status) {
        query = query.eq('case_status', filters.status);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        console.error('FIR query error:', error);
        throw error;
      }

      const firIds = data?.map((f) => f.id) || [];
      let accusedCounts: Record<string, number> = {};
      
      if (firIds.length > 0) {
        const { data: accusedData } = await supabase
          .from('accused_persons')
          .select('fir_id')
          .in('fir_id', firIds);
        
        accusedData?.forEach((acc) => {
          accusedCounts[acc.fir_id] = (accusedCounts[acc.fir_id] || 0) + 1;
        });
      }

      const firsWithCounts = data?.map((fir) => ({
        ...fir,
        accused_count: accusedCounts[fir.id] || 0,
      })) || [];

      setFirs(firsWithCounts);
      setTotal(count || 0);
    } catch (error: any) {
      console.error('Load FIRs error:', error);
      toast.error(error.message || 'Failed to load FIRs');
      setFirs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters, page, pageSize]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    loadFIRs();
  }, [loadFIRs]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'sheets') => {
    if (firs.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const dataToExport = selectedIds.size > 0
        ? firs.filter((f) => selectedIds.has(f.id))
        : firs;

      if (dataToExport.length === 0) {
        toast.error('Please select records to export');
        setExporting(false);
        return;
      }

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
      
      let userData = null;
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('auth_id', user.id)
          .single();
        userData = data;
      }

      if (format === 'pdf') {
        await exportToPDF({
          title: 'FIR Records',
          data: dataToExport,
          columns,
          filters,
          generatedBy: userData?.full_name,
        });
      } else if (format === 'excel') {
        exportToExcel({
          filename: 'FIR_Records',
          sheets: [
            {
              name: 'FIRs',
              data: dataToExport,
              columns,
            },
          ],
        });
      } else if (format === 'csv') {
        exportToCSV(dataToExport, columns, 'FIR_Records');
      } else {
        const result = exportToGoogleSheets(dataToExport, columns, 'FIR_Records');
        toast.info(result.message);
      }

      if (userData) {
        await supabase.from('export_logs').insert({
          user_id: userData.id,
          export_type: format.toUpperCase(),
          report_type: 'FIR Records',
          record_count: dataToExport.length,
          filters_applied: filters,
        });
      }

      toast.success(`Exported ${dataToExport.length} records successfully`);
      setSelectedIds(new Set());
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === firs.length && firs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(firs.map((f) => f.id)));
    }
  };

  const resetFilters = () => {
    setFilters({
      firNumber: '',
      dateFrom: '',
      dateTo: '',
      station: '',
      district: '',
      status: '',
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">FIR Records Database</h1>
            <p className="text-amber-100 text-lg">Search, filter, and export all FIR records</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleExport('pdf')}
              variant="secondary"
              size="sm"
              disabled={exporting || firs.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              {exporting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="secondary"
              size="sm"
              disabled={exporting || firs.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={() => handleExport('sheets')}
              variant="secondary"
              size="sm"
              disabled={exporting || firs.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Sheets
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-amber-600" />
              Search & Filter Options
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold mb-2 block text-gray-700">FIR Number</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter FIR number to search"
                  value={filters.firNumber}
                  onChange={(e) => setFilters({ ...filters, firNumber: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">District</label>
              <Select
                value={filters.district || undefined}
                onValueChange={(value) => {
                  setFilters({ ...filters, district: value, station: '' });
                  setPage(1);
                }}
              >
                <SelectTrigger>
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
              <label className="text-sm font-semibold mb-2 block text-gray-700">Station</label>
              <Select
                value={filters.station || undefined}
                onValueChange={(value) => {
                  setFilters({ ...filters, station: value });
                  setPage(1);
                }}
                disabled={!filters.district}
              >
                <SelectTrigger>
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
              <label className="text-sm font-semibold mb-2 block text-gray-700">Status</label>
              <Select
                value={filters.status || undefined}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPage(1);
                }}
              >
                <SelectTrigger>
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
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                setPage(1);
                loadFIRs();
              }}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Search className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-bold">
              FIR Records
              <span className="ml-2 text-base font-normal text-amber-700">({total} total)</span>
            </CardTitle>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm font-semibold text-amber-900">
                {selectedIds.size} record(s) selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {exporting ? (
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3 w-3" />
                )}
                Export Selected
              </Button>
            </div>
          )}
          
          <div className="overflow-x-auto rounded-lg border-2 border-amber-100">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <tr>
                  <th className="p-3 text-left font-bold">
                    <Checkbox
                      checked={selectedIds.size === firs.length && firs.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-amber-600"
                    />
                  </th>
                  <th className="p-3 text-left font-bold">FIR Number</th>
                  <th className="p-3 text-left font-bold hidden sm:table-cell">Date</th>
                  <th className="p-3 text-left font-bold hidden md:table-cell">Time</th>
                  <th className="p-3 text-left font-bold">Station</th>
                  <th className="p-3 text-left font-bold hidden lg:table-cell">District</th>
                  <th className="p-3 text-left font-bold hidden md:table-cell">Crime Type</th>
                  <th className="p-3 text-left font-bold">Accused</th>
                  <th className="p-3 text-left font-bold">Status</th>
                  <th className="p-3 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={10} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : firs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 font-semibold text-lg">No FIRs Found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your search filters or date range
                      </p>
                    </td>
                  </tr>
                ) : (
                  firs.map((fir) => (
                    <tr
                      key={fir.id}
                      className="border-b hover:bg-amber-50 transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedIds.has(fir.id)}
                          onCheckedChange={() => toggleSelect(fir.id)}
                        />
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/fir/${fir.id}`}
                          className="text-amber-700 hover:text-amber-900 font-bold hover:underline"
                        >
                          {fir.fir_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="p-3 hidden sm:table-cell">{formatDate(fir.incident_date) || 'N/A'}</td>
                      <td className="p-3 hidden md:table-cell">{fir.incident_time || 'N/A'}</td>
                      <td className="p-3 font-semibold">{fir.police_stations?.name || 'N/A'}</td>
                      <td className="p-3 hidden lg:table-cell">{fir.railway_districts?.name || 'N/A'}</td>
                      <td className="p-3 hidden md:table-cell">{fir.modus_operandi_id || 'N/A'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-semibold">{fir.accused_count || 0}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            fir.case_status === 'closed'
                              ? 'success'
                              : fir.case_status === 'investigation'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {fir.case_status || 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Link href={`/fir/${fir.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-amber-700 hover:text-amber-900 hover:bg-amber-100">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && firs.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Showing <span className="font-bold text-amber-700">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-amber-700">{Math.min(page * pageSize, total)}</span> of{' '}
                <span className="font-bold text-amber-700">{total}</span> records
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-amber-300"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= total}
                  className="border-amber-300"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
