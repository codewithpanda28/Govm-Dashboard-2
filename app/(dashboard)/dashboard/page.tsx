'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Users, Scale, Lock, RefreshCw, 
  Building, MapPin, Gavel, User, Shield,
  Train, AlertTriangle, CheckCircle, Clock,
  ChevronRight, BarChart3, TrendingUp,
  Home, Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const [stats, setStats] = useState({
    totalDistricts: 0,
    totalThanas: 0,
    totalFirs: 0,
    totalAccused: 0,
    totalBailers: 0,
    totalBailed: 0,
    totalCustody: 0,
  });

  const [topDistricts, setTopDistricts] = useState<{name: string; count: number}[]>([]);
  const [topThanas, setTopThanas] = useState<{name: string; count: number}[]>([]);
  const [recentFirs, setRecentFirs] = useState<any[]>([]);
  const [caseStatusData, setCaseStatusData] = useState<{status: string; count: number}[]>([]);

  const supabase = createClient();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading dashboard data...');

      // 1. Get Total Districts
      const { data: districtsData } = await supabase
        .from('fir_records')
        .select('district_name')
        .not('district_name', 'is', null);
      
      const uniqueDistricts = [...new Set((districtsData || []).map(d => d.district_name).filter(Boolean))];
      
      // 2. Get Total Thanas
      const { data: thanasData } = await supabase
        .from('fir_records')
        .select('thana_name')
        .not('thana_name', 'is', null);
      
      const uniqueThanas = [...new Set((thanasData || []).map(t => t.thana_name).filter(Boolean))];

      // 3. Get Total FIRs
      const { count: totalFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true });

      // 4. Get Total Accused
      const { count: totalAccused } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true });

      // 5. Get Total Bailers
      const { count: totalBailers } = await supabase
        .from('bailer_details')
        .select('*', { count: 'exact', head: true });

      // 6. Get Bailed count
      const { count: totalBailed } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true })
        .eq('accused_type', 'bailed');

      // 7. Get Custody count
      const { count: totalCustody } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true })
        .eq('accused_type', 'arrested');

      setStats({
        totalDistricts: uniqueDistricts.length,
        totalThanas: uniqueThanas.length,
        totalFirs: totalFirs || 0,
        totalAccused: totalAccused || 0,
        totalBailers: totalBailers || 0,
        totalBailed: totalBailed || 0,
        totalCustody: totalCustody || 0,
      });

      // 8. Top Districts
      const { data: allFirs } = await supabase
        .from('fir_records')
        .select('id, district_name, thana_name');

      const firIds = (allFirs || []).map(f => f.id);
      
      let accusedByFir: any[] = [];
      if (firIds.length > 0) {
        const { data } = await supabase
          .from('accused_details')
          .select('fir_id')
          .in('fir_id', firIds);
        accusedByFir = data || [];
      }

      // District counts
      const districtMap = new Map<string, number>();
      accusedByFir.forEach(acc => {
        const fir = allFirs?.find(f => f.id === acc.fir_id);
        if (fir?.district_name) {
          districtMap.set(fir.district_name, (districtMap.get(fir.district_name) || 0) + 1);
        }
      });

      setTopDistricts(
        Array.from(districtMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Thana counts
      const thanaMap = new Map<string, number>();
      accusedByFir.forEach(acc => {
        const fir = allFirs?.find(f => f.id === acc.fir_id);
        if (fir?.thana_name) {
          thanaMap.set(fir.thana_name, (thanaMap.get(fir.thana_name) || 0) + 1);
        }
      });

      setTopThanas(
        Array.from(thanaMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // 9. Recent FIRs
      const { data: recentFirsData } = await supabase
        .from('fir_records')
        .select('id, fir_number, incident_date, case_status, district_name, thana_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentFirs(recentFirsData || []);

      // 10. Case Status
      const { data: statusData } = await supabase
        .from('fir_records')
        .select('case_status');

      const statusMap = new Map<string, number>();
      (statusData || []).forEach(fir => {
        const status = fir.case_status || 'open';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      setCaseStatusData(
        Array.from(statusMap.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)
      );

      setLastUpdated(new Date().toLocaleString('en-IN'));
      console.log('✅ Dashboard loaded!');

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
      open: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        border: 'border-orange-300',
        label: 'OPEN' 
      },
      registered: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-700', 
        border: 'border-blue-300',
        label: 'REGISTERED' 
      },
      under_investigation: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-700', 
        border: 'border-yellow-300',
        label: 'INVESTIGATING' 
      },
      chargesheet_filed: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-700', 
        border: 'border-purple-300',
        label: 'CHARGESHEET' 
      },
      closed: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700', 
        border: 'border-gray-300',
        label: 'CLOSED' 
      },
    };
    return config[status?.toLowerCase()] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-700', 
      border: 'border-gray-300',
      label: status?.toUpperCase() || 'UNKNOWN' 
    };
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm">
                  Crime Management Analytics & Statistics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">{lastUpdated || 'Never'}</p>
              </div>
              <Button
                onClick={loadDashboardData}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-500 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Error Loading Dashboard</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {/* Districts Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Building className="h-5 w-5 text-blue-600" />
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalDistricts}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Districts</p>
            </CardContent>
          </Card>

          {/* Thanas Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalThanas}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Thanas</p>
            </CardContent>
          </Card>

          {/* FIRs Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalFirs}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total FIRs</p>
            </CardContent>
          </Card>

          {/* Accused Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-red-600" />
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalAccused}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Accused</p>
            </CardContent>
          </Card>

          {/* Bailers Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <User className="h-5 w-5 text-indigo-600" />
                <Shield className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalBailers}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Bailers</p>
            </CardContent>
          </Card>

          {/* Bailed Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Scale className="h-5 w-5 text-green-600" />
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalBailed}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Bailed</p>
            </CardContent>
          </Card>

          {/* Custody Card */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                ) : stats.totalCustody}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">In Custody</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Districts & Thanas */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Top Districts */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <span>Top Districts by Accused</span>
                </div>
                <Badge variant="secondary">Top 10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : topDistricts.length === 0 ? (
                <div className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold">RANK</th>
                        <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT NAME</th>
                        <th className="px-4 py-3 text-right text-xs font-bold">ACCUSED COUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topDistricts.map((item, idx) => (
                        <tr key={item.name} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <Badge 
                              variant={idx === 0 ? "default" : idx < 3 ? "secondary" : "outline"}
                              className="font-bold"
                            >
                              #{idx + 1}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                              {item.count}
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

          {/* Top Thanas */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Top Thanas by Accused</span>
                </div>
                <Badge variant="secondary">Top 10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : topThanas.length === 0 ? (
                <div className="py-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold">RANK</th>
                        <th className="px-4 py-3 text-left text-xs font-bold">THANA NAME</th>
                        <th className="px-4 py-3 text-right text-xs font-bold">ACCUSED COUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topThanas.map((item, idx) => (
                        <tr key={item.name} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <Badge 
                              variant={idx === 0 ? "default" : idx < 3 ? "secondary" : "outline"}
                              className="font-bold"
                            >
                              #{idx + 1}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                              {item.count}
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

        {/* Recent FIRs & Case Status */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent FIRs */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Recent FIR Registrations</span>
                  </div>
                  <Badge variant="secondary">Last 10</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : recentFirs.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">No FIRs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                          <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {recentFirs.map((fir, idx) => {
                          const statusConfig = getStatusConfig(fir.case_status);
                          return (
                            <tr key={fir.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-sm">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold text-primary">
                                  {fir.fir_number}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(fir.incident_date)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="text-sm">{fir.district_name || '-'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {fir.thana_name || '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge 
                                  className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}
                                >
                                  {statusConfig.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Case Status Summary */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                <span>Case Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : caseStatusData.length === 0 ? (
                <div className="py-8 text-center">
                  <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {caseStatusData.map((item) => {
                    const config = getStatusConfig(item.status);
                    const percentage = stats.totalFirs > 0 
                      ? Math.round((item.count / stats.totalFirs) * 100)
                      : 0;
                    return (
                      <div key={item.status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge 
                            className={`${config.bg} ${config.text} ${config.border} border`}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-lg font-bold">{item.count}</span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="absolute right-0 -top-5 text-xs text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <Card className="mt-6 bg-muted/30 border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Railway Protection Force - Crime Management System</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">Version 1.0</Badge>
                <span>© 2024 All Rights Reserved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}