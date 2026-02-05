'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Users, Scale, Lock, RefreshCw, 
  Building, MapPin, Gavel, User, Shield,
  Train, AlertTriangle, CheckCircle, Clock,
  ChevronRight, BarChart3, TrendingUp,
  Home, Activity, X, ExternalLink, Eye,
  PieChart, LineChart
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Modal Component
const DataModal = ({ isOpen, onClose, title, icon: Icon, children }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  
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
  const [monthlyTrend, setMonthlyTrend] = useState<{month: string; firs: number; accused: number}[]>([]);

  const supabase = createClient();

  // Chart colors
  const COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    indigo: '#6366f1',
    pink: '#ec4899',
    cyan: '#06b6d4',
  };

  const STATUS_COLORS: Record<string, string> = {
    open: '#f59e0b',
    registered: '#3b82f6',
    under_investigation: '#eab308',
    chargesheet_filed: '#8b5cf6',
    in_court: '#6366f1',
    closed: '#6b7280',
    disposed: '#10b981',
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading dashboard data...');

      // Get all FIRs with full data
      const { data: allFirs } = await supabase
        .from('fir_records')
        .select('*')
        .order('created_at', { ascending: false });

      const firRecords = allFirs || [];

      // 1. Districts
      const uniqueDistricts = [...new Set(firRecords.map(f => f.district_name).filter(Boolean))];
      
      // 2. Thanas
      const uniqueThanas = [...new Set(firRecords.map(f => f.thana_name).filter(Boolean))];

      // 3. Total FIRs
      const totalFirs = firRecords.length;

      // 4. Get Total Accused
      const { count: totalAccused } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true });

      // 5. Get Total Bailers
      const { count: totalBailers } = await supabase
        .from('bailer_details')
        .select('*', { count: 'exact', head: true });

      // 6. Get Bailed & Custody counts
      const { count: totalBailed } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true })
        .eq('accused_type', 'bailed');

      const { count: totalCustody } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true })
        .eq('accused_type', 'arrested');

      setStats({
        totalDistricts: uniqueDistricts.length,
        totalThanas: uniqueThanas.length,
        totalFirs,
        totalAccused: totalAccused || 0,
        totalBailers: totalBailers || 0,
        totalBailed: totalBailed || 0,
        totalCustody: totalCustody || 0,
      });

      // 7. Top Districts
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('fir_id');

      const districtMap = new Map<string, number>();
      (accusedData || []).forEach(acc => {
        const fir = firRecords.find(f => f.id === acc.fir_id);
        if (fir?.district_name) {
          districtMap.set(fir.district_name, (districtMap.get(fir.district_name) || 0) + 1);
        }
      });

      const topDistrictsData = Array.from(districtMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopDistricts(topDistrictsData);

      // 8. Top Thanas
      const thanaMap = new Map<string, number>();
      (accusedData || []).forEach(acc => {
        const fir = firRecords.find(f => f.id === acc.fir_id);
        if (fir?.thana_name) {
          thanaMap.set(fir.thana_name, (thanaMap.get(fir.thana_name) || 0) + 1);
        }
      });

      const topThanasData = Array.from(thanaMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopThanas(topThanasData);

      // 9. Recent FIRs
      setRecentFirs(firRecords.slice(0, 10));

      // 10. Case Status Distribution
      const statusMap = new Map<string, number>();
      firRecords.forEach(fir => {
        const status = fir.case_status || 'open';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusData = Array.from(statusMap.entries())
        .map(([status, count]) => ({ 
          status, 
          count,
          name: status.toUpperCase().replace(/_/g, ' ')
        }))
        .sort((a, b) => b.count - a.count);

      setCaseStatusData(statusData);

      // 11. Monthly Trend (Last 6 months)
      const monthlyData = new Map<string, {firs: number; accused: Set<number>}>();
      const last6Months = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d;
      }).reverse();

      last6Months.forEach(date => {
        const key = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        monthlyData.set(key, { firs: 0, accused: new Set() });
      });

      firRecords.forEach(fir => {
        const firDate = new Date(fir.created_at);
        const key = firDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        
        if (monthlyData.has(key)) {
          const data = monthlyData.get(key)!;
          data.firs++;
          
          // Count accused for this FIR
          const accusedForFir = (accusedData || []).filter(a => a.fir_id === fir.id);
          accusedForFir.forEach(a => data.accused.add(a.fir_id));
        }
      });

      const trendData = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        firs: data.firs,
        accused: data.accused.size
      }));

      setMonthlyTrend(trendData);

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

  const loadDetailedData = async (type: string) => {
    setModalLoading(true);
    setModalType(type);
    setModalOpen(true);
    
    try {
      let data: any[] = [];
      
      switch(type) {
        case 'districts':
          const { data: districtData } = await supabase
            .from('fir_records')
            .select('district_name')
            .not('district_name', 'is', null);
          
          const districtCounts = new Map<string, number>();
          districtData?.forEach(d => {
            districtCounts.set(d.district_name, (districtCounts.get(d.district_name) || 0) + 1);
          });
          
          data = Array.from(districtCounts.entries())
            .map(([name, count]) => ({ name, fir_count: count }))
            .sort((a, b) => b.fir_count - a.fir_count);
          break;
          
        case 'thanas':
          const { data: thanaData } = await supabase
            .from('fir_records')
            .select('thana_name, district_name')
            .not('thana_name', 'is', null);
          
          const thanaCounts = new Map<string, {count: number, district: string}>();
          thanaData?.forEach(t => {
            const key = t.thana_name;
            if (thanaCounts.has(key)) {
              thanaCounts.get(key)!.count++;
            } else {
              thanaCounts.set(key, { count: 1, district: t.district_name || 'Unknown' });
            }
          });
          
          data = Array.from(thanaCounts.entries())
            .map(([name, info]) => ({ 
              name, 
              district: info.district,
              fir_count: info.count 
            }))
            .sort((a, b) => b.fir_count - a.fir_count);
          break;
          
        case 'firs':
          const { data: firsData } = await supabase
            .from('fir_records')
            .select('*')
            .order('created_at', { ascending: false });
          data = firsData || [];
          break;
          
        case 'accused':
          const { data: accusedData } = await supabase
            .from('accused_details')
            .select(`
              *,
              fir_records(fir_number, district_name, thana_name)
            `)
            .order('created_at', { ascending: false });
          data = accusedData || [];
          break;
          
        case 'bailers':
          const { data: bailersData } = await supabase
            .from('bailer_details')
            .select('*')
            .order('created_at', { ascending: false });
          data = bailersData || [];
          break;
          
        case 'bailed':
          const { data: bailedData } = await supabase
            .from('accused_details')
            .select(`
              *,
              fir_records(fir_number, district_name, thana_name)
            `)
            .eq('accused_type', 'bailed')
            .order('created_at', { ascending: false });
          data = bailedData || [];
          break;
          
        case 'custody':
          const { data: custodyData } = await supabase
            .from('accused_details')
            .select(`
              *,
              fir_records(fir_number, district_name, thana_name)
            `)
            .eq('accused_type', 'arrested')
            .order('created_at', { ascending: false });
          data = custodyData || [];
          break;
      }
      
      setModalData(data);
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      toast.error('Failed to load data');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = (card: any) => {
    loadDetailedData(card.id);
  };

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
      in_court: { 
        bg: 'bg-indigo-100', 
        text: 'text-indigo-700', 
        border: 'border-indigo-300',
        label: 'IN COURT' 
      },
      closed: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700', 
        border: 'border-gray-300',
        label: 'CLOSED' 
      },
      disposed: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        border: 'border-green-300',
        label: 'DISPOSED' 
      },
    };
    return config[status?.toLowerCase()] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-700', 
      border: 'border-gray-300',
      label: status?.toUpperCase() || 'UNKNOWN' 
    };
  };

  // Stat cards configuration
  const statCards = [
    {
      id: 'districts',
      icon: Building,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50/50',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-50',
      hoverBorder: 'hover:border-blue-400',
      value: stats.totalDistricts,
      label: 'Total Districts',
      trend: TrendingUp,
      trendColor: 'text-green-600'
    },
    {
      id: 'thanas',
      icon: MapPin,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50/50',
      borderColor: 'border-purple-200',
      hoverBg: 'hover:bg-purple-50',
      hoverBorder: 'hover:border-purple-400',
      value: stats.totalThanas,
      label: 'Total Thanas',
      trend: TrendingUp,
      trendColor: 'text-green-600'
    },
    {
      id: 'firs',
      icon: FileText,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50/50',
      borderColor: 'border-orange-200',
      hoverBg: 'hover:bg-orange-50',
      hoverBorder: 'hover:border-orange-400',
      value: stats.totalFirs,
      label: 'Total FIRs',
      trend: Activity,
      trendColor: 'text-orange-600'
    },
    {
      id: 'accused',
      icon: Users,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50/50',
      borderColor: 'border-red-200',
      hoverBg: 'hover:bg-red-50',
      hoverBorder: 'hover:border-red-400',
      value: stats.totalAccused,
      label: 'Total Accused',
      trend: AlertTriangle,
      trendColor: 'text-red-600'
    },
    {
      id: 'bailers',
      icon: User,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50/50',
      borderColor: 'border-indigo-200',
      hoverBg: 'hover:bg-indigo-50',
      hoverBorder: 'hover:border-indigo-400',
      value: stats.totalBailers,
      label: 'Total Bailers',
      trend: Shield,
      trendColor: 'text-indigo-600'
    },
    {
      id: 'bailed',
      icon: Scale,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50/50',
      borderColor: 'border-green-200',
      hoverBg: 'hover:bg-green-50',
      hoverBorder: 'hover:border-green-400',
      value: stats.totalBailed,
      label: 'Total Bailed',
      trend: CheckCircle,
      trendColor: 'text-green-600'
    },
    {
      id: 'custody',
      icon: Lock,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      hoverBg: 'hover:bg-amber-50',
      hoverBorder: 'hover:border-amber-400',
      value: stats.totalCustody,
      label: 'In Custody',
      trend: Clock,
      trendColor: 'text-amber-600'
    }
  ];

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-500 text-sm">
                  Crime Management Analytics & Statistics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-700">{lastUpdated || 'Never'}</p>
              </div>
              <Button
                onClick={loadDashboardData}
                disabled={loading}
                variant="outline"
                className="border-gray-300"
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
          {statCards.map(card => {
            const Icon = card.icon;
            const Trend = card.trend;
            
            return (
              <div
                key={card.id}
                className={`
                  relative cursor-pointer transition-all duration-200 transform hover:scale-105
                  ${card.bgColor} ${card.hoverBg} 
                  border-2 ${card.borderColor} ${card.hoverBorder}
                  rounded-lg shadow-sm hover:shadow-md group
                `}
                onClick={() => handleCardClick(card)}
                role="button"
                tabIndex={0}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    <div className="flex items-center gap-1">
                      <Trend className={`h-4 w-4 ${card.trendColor}`} />
                      <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? (
                      <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                    ) : card.value}
                  </p>
                  <p className="text-xs text-gray-600 font-medium mt-1">{card.label}</p>
                  <div className="mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row 1 - Monthly Trend & Case Status */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trend Chart */}
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <LineChart className="h-5 w-5 text-blue-600" />
                Monthly Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {monthlyTrend.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No trend data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorFirs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAccused" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="firs" 
                      stroke={COLORS.primary} 
                      fillOpacity={1} 
                      fill="url(#colorFirs)"
                      name="FIRs"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="accused" 
                      stroke={COLORS.danger} 
                      fillOpacity={1} 
                      fill="url(#colorAccused)"
                      name="Accused"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Case Status Pie Chart */}
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <PieChart className="h-5 w-5 text-purple-600" />
                Case Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {caseStatusData.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No status data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={caseStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {caseStatusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.status] || COLORS.primary}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Top Districts & Thanas */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Top Districts Bar Chart */}
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Building className="h-5 w-5 text-blue-600" />
                Top 10 Districts by Accused Count
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {topDistricts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No district data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topDistricts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Thanas Bar Chart */}
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <MapPin className="h-5 w-5 text-purple-600" />
                Top 10 Thanas by Accused Count
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {topThanas.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No thana data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topThanas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={COLORS.purple} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent FIRs */}
        <Card className="border-2 mb-6">
          <CardHeader className="bg-gray-50 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <FileText className="h-5 w-5 text-orange-600" />
              Recent FIRs (Last 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {recentFirs.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No recent FIRs</p>
            ) : (
              <div className="space-y-3">
                {recentFirs.map((fir) => {
                  const statusConfig = getStatusConfig(fir.case_status);
                  return (
                    <div key={fir.id} className="p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-mono font-semibold text-gray-800">{fir.fir_number}</p>
                          <p className="text-sm text-gray-600">
                            {fir.district_name} - {fir.thana_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(fir.incident_date)}
                          </p>
                        </div>
                        <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Modal */}
        <DataModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          title={
            modalType === 'districts' ? 'All Districts' :
            modalType === 'thanas' ? 'All Thanas' :
            modalType === 'firs' ? 'All FIR Records' :
            modalType === 'accused' ? 'All Accused Persons' :
            modalType === 'bailers' ? 'All Bailers' :
            modalType === 'bailed' ? 'Bailed Accused' :
            modalType === 'custody' ? 'Accused in Custody' : 'Data'
          }
          icon={
            modalType === 'districts' ? Building :
            modalType === 'thanas' ? MapPin :
            modalType === 'firs' ? FileText :
            modalType === 'accused' ? Users :
            modalType === 'bailers' ? User :
            modalType === 'bailed' ? Scale :
            modalType === 'custody' ? Lock : FileText
          }
        >
          {modalLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Districts Table */}
              {modalType === 'districts' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No districts found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">DISTRICT NAME</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">FIR COUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge className="bg-blue-100 text-blue-700">{item.fir_count}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              
              {/* Thanas Table */}
              {modalType === 'thanas' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No thanas found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">THANA NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">DISTRICT</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">FIR COUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.district}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge className="bg-purple-100 text-purple-700">{item.fir_count}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              
              {/* FIRs Table */}
              {modalType === 'firs' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No FIRs found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">DISTRICT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">THANA</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-sm font-medium">{item.fir_number}</td>
                            <td className="px-4 py-3 text-sm">{item.district_name}</td>
                            <td className="px-4 py-3 text-sm">{item.thana_name}</td>
                            <td className="px-4 py-3 text-sm">{formatDate(item.incident_date)}</td>
                            <td className="px-4 py-3">
                              <Badge className="bg-orange-100 text-orange-700">{item.case_status || 'Open'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              
              {/* Accused Table */}
              {modalType === 'accused' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No accused found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">LOCATION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.fir_records?.fir_number}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-red-100 text-red-700">{item.accused_type || 'Unknown'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div>{item.fir_records?.district_name}</div>
                              <div className="text-xs text-gray-500">{item.fir_records?.thana_name}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Bailers Table */}
              {modalType === 'bailers' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No bailers found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">BAILER NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">FATHER NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">MOBILE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">ADDRESS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">
                              {item.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.father_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.mobile || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                              {item.full_address || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Bailed & Custody tables - similar to above */}
              {(modalType === 'bailed' || modalType === 'custody') && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      {modalType === 'bailed' ? <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" /> : <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />}
                      <p>No records found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">ACCUSED NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">LOCATION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.fir_records?.fir_number}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(item.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div>{item.fir_records?.district_name}</div>
                              <div className="text-xs text-gray-500">{item.fir_records?.thana_name}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Records:</span>
                  <Badge variant="secondary" className="text-lg">{modalData.length}</Badge>
                </div>
              </div>
            </div>
          )}
        </DataModal>

        {/* Footer */}
        <Card className="border-2 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Railway Protection Force - Crime Management System</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-gray-300">Version 1.0</Badge>
                <span>© 2024 All Rights Reserved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}