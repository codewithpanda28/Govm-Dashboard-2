'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/dashboard/StatsCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import DoughnutChart from '@/components/charts/DoughnutChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Scale, Lock, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { subDays, startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardFilters {
  dateRange: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: '30',
  });
  const [stats, setStats] = useState({
    totalFirs: 0,
    totalAccused: 0,
    bailCases: 0,
    custodyCases: 0,
    firChange: 0,
  });
  const [districtData, setDistrictData] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: [],
  });
  const [modusOperandiData, setModusOperandiData] = useState<{
    labels: string[];
    values: number[];
  }>({ labels: [], values: [] });
  const [monthlyTrend, setMonthlyTrend] = useState<{
    labels: string[];
    datasets: { label: string; data: number[]; color?: string }[];
  }>({ labels: [], datasets: [] });
  const [ageGroupData, setAgeGroupData] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: [],
  });
  const [stationPerformance, setStationPerformance] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const supabase = createClient();

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
      case '7':
        return { start: subDays(now, 7), end: now };
      case '30':
        return { start: subDays(now, 30), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }, [filters.dateRange]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      const prevRange = {
        start: subDays(start, 30),
        end: start,
      };

      // Use incident_date for filtering - this is the key fix
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      const prevStartStr = prevRange.start.toISOString().split('T')[0];
      const prevEndStr = prevRange.end.toISOString().split('T')[0];

      console.log('Loading data for date range:', { startDateStr, endDateStr });

      // Fetch FIRs - use incident_date if available, otherwise created_at
      const [firsRes, prevFirsRes, districtsRes] = await Promise.all([
        supabase
          .from('fir_records')
          .select('id, incident_date, created_at, railway_district_id, police_station_id, modus_operandi_id')
          .gte('incident_date', startDateStr)
          .lte('incident_date', endDateStr),
        supabase
          .from('fir_records')
          .select('id, incident_date, created_at')
          .gte('incident_date', prevStartStr)
          .lte('incident_date', prevEndStr),
        supabase.from('railway_districts').select('id, name'),
      ]);

      if (firsRes.error) {
        console.error('FIR query error:', firsRes.error);
        throw new Error(firsRes.error.message);
      }

      const firs = firsRes.data || [];
      const prevFirs = prevFirsRes.data || [];
      const firIds = firs.map((f) => f.id);
      const districtMap = new Map(
        (districtsRes.data || []).map((d) => [d.id, d.name])
      );

      console.log('FIRs loaded:', firs.length);

      // Get accused data
      let accused: any[] = [];
      if (firIds.length > 0) {
        const accusedRes = await supabase
          .from('accused_persons')
          .select('id, age, custody_status, fir_id')
          .in('fir_id', firIds);
        
        if (accusedRes.error) {
          console.error('Accused query error:', accusedRes.error);
        } else {
          accused = accusedRes.data || [];
        }
      }

      console.log('Accused loaded:', accused.length);

      const totalFirs = firs.length;
      const totalAccused = accused.length;
      const bailCases = accused.filter((a) => a.custody_status === 'bail').length;
      const custodyCases = accused.filter((a) => a.custody_status === 'custody').length;
      const prevTotalFirs = prevFirs.length;
      const firChange =
        prevTotalFirs > 0 ? ((totalFirs - prevTotalFirs) / prevTotalFirs) * 100 : 0;

      setStats({
        totalFirs,
        totalAccused,
        bailCases,
        custodyCases,
        firChange,
      });

      // District data
      const districtCounts = new Map<string, number>();
      firs.forEach((fir) => {
        const districtId = fir.railway_district_id;
        if (districtId) {
          districtCounts.set(districtId, (districtCounts.get(districtId) || 0) + 1);
        }
      });

      const districtLabels: string[] = [];
      const districtValues: number[] = [];
      districtCounts.forEach((count, id) => {
        const name = districtMap.get(id);
        if (name) {
          districtLabels.push(name);
          districtValues.push(count);
        }
      });
      setDistrictData({ labels: districtLabels, values: districtValues });

      // Modus operandi
      const modusMap = new Map<string, number>();
      firs.forEach((fir) => {
        const mo = fir.modus_operandi_id;
        if (mo) {
          modusMap.set(mo, (modusMap.get(mo) || 0) + 1);
        }
      });

      const sortedModus = Array.from(modusMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      setModusOperandiData({
        labels: sortedModus.map(([label]) => label),
        values: sortedModus.map(([, value]) => value),
      });

      // Monthly trend - simplified for performance
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return format(date, 'MMM yyyy');
      });

      const monthlyDataPromises = months.map(async (_, i) => {
        const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
        const monthEnd = endOfMonth(monthStart);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];

        const monthFirsRes = await supabase
          .from('fir_records')
          .select('id, incident_date, created_at')
          .gte('incident_date', monthStartStr)
          .lte('incident_date', monthEndStr)
          .limit(5000);

        const monthFirIds = (monthFirsRes.data || []).map((f) => f.id);
        
        let monthAccused: any[] = [];
        if (monthFirIds.length > 0) {
          const accusedRes = await supabase
            .from('accused_persons')
            .select('custody_status, fir_id')
            .in('fir_id', monthFirIds)
            .limit(10000);
          monthAccused = accusedRes.data || [];
        }

        return {
          firs: monthFirIds.length,
          bail: monthAccused.filter((a) => a.custody_status === 'bail').length,
          custody: monthAccused.filter((a) => a.custody_status === 'custody').length,
        };
      });

      const monthlyData = await Promise.all(monthlyDataPromises);

      setMonthlyTrend({
        labels: months,
        datasets: [
          { label: 'FIRs', data: monthlyData.map((d) => d.firs), color: '#1d4ed8' },
          { label: 'Bail', data: monthlyData.map((d) => d.bail), color: '#16a34a' },
          { label: 'Custody', data: monthlyData.map((d) => d.custody), color: '#dc2626' },
        ],
      });

      // Age groups
      const ageGroups = {
        minor: 0,
        '18-30': 0,
        '30-50': 0,
        '50+': 0,
      };

      accused.forEach((a) => {
        if (a.age < 18) ageGroups.minor++;
        else if (a.age < 30) ageGroups['18-30']++;
        else if (a.age < 50) ageGroups['30-50']++;
        else ageGroups['50+']++;
      });

      setAgeGroupData({
        labels: ['Minor (<18)', '18-30', '30-50', '50+'],
        values: [
          ageGroups.minor,
          ageGroups['18-30'],
          ageGroups['30-50'],
          ageGroups['50+'],
        ],
      });

      // Station performance
      const stationMap = new Map<string, any>();
      firs.forEach((fir) => {
        const stationId = fir.police_station_id;
        if (stationId) {
          if (!stationMap.has(stationId)) {
            stationMap.set(stationId, {
              stationId,
              firs: 0,
              accused: 0,
              bail: 0,
              custody: 0,
            });
          }
          const station = stationMap.get(stationId)!;
          station.firs++;
        }
      });

      accused.forEach((acc) => {
        const fir = firs.find((f) => f.id === acc.fir_id);
        if (fir && fir.police_station_id && stationMap.has(fir.police_station_id)) {
          const station = stationMap.get(fir.police_station_id)!;
          station.accused++;
          if (acc.custody_status === 'bail') station.bail++;
          if (acc.custody_status === 'custody') station.custody++;
        }
      });

      const { data: stationsData } = await supabase
        .from('police_stations')
        .select('id, name');

      const stationsMap = new Map(
        (stationsData || []).map((s) => [s.id, s.name])
      );

      const performanceData = Array.from(stationMap.entries())
        .map(([stationId, data]) => {
          const stationName = stationsMap.get(stationId) || 'Unknown';
          return {
            station: stationName,
            firs: data.firs,
            accused: data.accused,
            bail: data.bail,
            custody: data.custody,
            pending: data.accused - data.bail - data.custody,
          };
        })
        .sort((a, b) => b.firs - a.firs)
        .slice(0, 10);

      setStationPerformance(performanceData);

      // Activities
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, created_at, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      const formattedActivities = (auditData || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        user_name: log.users?.full_name || 'Unknown',
        table_name: log.table_name,
        created_at: log.created_at,
      }));

      setActivities(formattedActivities);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, getDateRange]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Crime Analytics Dashboard</h1>
            <p className="text-amber-100 text-lg">Real-time insights and comprehensive reporting</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Error loading data</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Filter */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Time Period Selection
            </CardTitle>
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                setFilters({ ...filters, dateRange: value })
              }
            >
              <SelectTrigger className="w-full sm:w-64 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-2 border-amber-200 bg-white shadow-lg">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-blue-900">Total FIRs Registered</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-700 mb-1">{stats.totalFirs}</div>
                {stats.firChange !== 0 && (
                  <p className="text-xs text-blue-600">
                    {stats.firChange > 0 ? '↑' : '↓'} {Math.abs(stats.firChange).toFixed(1)}% from previous period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-purple-900">Total Accused Persons</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-purple-700 mb-1">{stats.totalAccused}</div>
                <p className="text-xs text-purple-600">Across all FIR cases</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100 shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-green-900">Bail Cases Granted</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-700 mb-1">{stats.bailCases}</div>
                <p className="text-xs text-green-600">
                  {stats.totalAccused > 0 ? ((stats.bailCases / stats.totalAccused) * 100).toFixed(1) : 0}% of total accused
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-red-900">Custody Cases</CardTitle>
                  <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-red-700 mb-1">{stats.custodyCases}</div>
                <p className="text-xs text-red-600">
                  {stats.totalAccused > 0 ? ((stats.custodyCases / stats.totalAccused) * 100).toFixed(1) : 0}% of total accused
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800">District-wise FIR Distribution</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Breakdown by Railway District</p>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : districtData.labels.length > 0 ? (
              <PieChart data={districtData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No district data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800">Top Crime Methods</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Modus Operandi Analysis</p>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : modusOperandiData.labels.length > 0 ? (
              <BarChart data={modusOperandiData} horizontal />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No modus operandi data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800">Crime Trends (6 Months)</CardTitle>
            <p className="text-sm text-gray-600 mt-1">FIRs, Bail, and Custody over time</p>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <LineChart data={monthlyTrend} />
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800">Accused Age Distribution</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Demographic analysis</p>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <DoughnutChart
                data={ageGroupData}
                centerText={stats.totalAccused.toString()}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Station Performance & Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-2 border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg font-bold text-gray-800">Top Performing Police Stations</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Based on FIR registration count</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-amber-200 bg-amber-50">
                    <th className="text-left p-3 font-bold text-gray-800">Station Name</th>
                    <th className="text-right p-3 font-bold text-gray-800">FIRs</th>
                    <th className="text-right p-3 font-bold text-gray-800">Accused</th>
                    <th className="text-right p-3 font-bold text-gray-800">Bail</th>
                    <th className="text-right p-3 font-bold text-gray-800">Custody</th>
                    <th className="text-right p-3 font-bold text-gray-800">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={6} className="p-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : stationPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No station performance data available</p>
                      </td>
                    </tr>
                  ) : (
                    stationPerformance.map((station, idx) => (
                      <tr
                        key={idx}
                        className={`border-b hover:bg-amber-50 transition-colors ${
                          idx === 0 ? 'bg-green-50 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3">
                          {idx === 0 && <span className="text-green-600 mr-2">🏆</span>}
                          {station.station}
                        </td>
                        <td className="p-3 text-right font-medium">{station.firs}</td>
                        <td className="p-3 text-right">{station.accused}</td>
                        <td className="p-3 text-right text-green-600">{station.bail}</td>
                        <td className="p-3 text-right text-red-600">{station.custody}</td>
                        <td className="p-3 text-right text-orange-600">{station.pending}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
