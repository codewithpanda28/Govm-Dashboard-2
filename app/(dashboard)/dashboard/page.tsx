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
  Home, Activity, X, ExternalLink, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// Modal Component for showing data
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

      // 8. Top Districts & Thanas
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

  // Load detailed data when card is clicked
  const loadDetailedData = async (type: string) => {
    console.log('🔍 Loading detailed data for:', type);
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
          const { data: bailersData, error: bailersError } = await supabase
            .from('bailer_details')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (bailersError) {
            console.error('❌ Bailers Error:', bailersError);
            toast.error('Failed to load bailers: ' + bailersError.message);
          }
          
          console.log('✅ Bailers Data:', bailersData);
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
      console.log('✅ Loaded', data.length, 'records for', type);
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      toast.error('Failed to load data');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle card click
  const handleCardClick = (card: any) => {
    console.log('🎯 Card clicked:', card.id);
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

  // Stat cards configuration - ALL OPEN MODAL (NO NAVIGATION)
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

        {/* Stats Grid - CLICKABLE */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleCardClick(card);
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    <div className="flex items-center gap-1">
                      <Trend className={`h-4 w-4 ${card.trendColor}`} />
                      <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded"></span>
                    ) : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{card.label}</p>
                  <div className="mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view details →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Districts Table */}
              {modalType === 'districts' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No districts found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT NAME</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">FIR COUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge>{item.fir_count}</Badge>
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
                    <div className="py-8 text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No thanas found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">THANA NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                          <th className="px-4 py-3 text-right text-xs font-bold">FIR COUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{item.district}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge>{item.fir_count}</Badge>
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
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No FIRs found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">THANA</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-sm font-medium">{item.fir_number}</td>
                            <td className="px-4 py-3 text-sm">{item.district_name}</td>
                            <td className="px-4 py-3 text-sm">{item.thana_name}</td>
                            <td className="px-4 py-3 text-sm">{formatDate(item.incident_date)}</td>
                            <td className="px-4 py-3">
                              <Badge>{item.case_status || 'Open'}</Badge>
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
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No accused found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.fir_records?.fir_number}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge>{item.accused_type || 'Unknown'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div>{item.fir_records?.district_name}</div>
                              <div className="text-xs text-muted-foreground">{item.fir_records?.thana_name}</div>
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
                    <div className="py-8 text-center text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No bailers found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">BAILER NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FATHER NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">MOBILE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ADDRESS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={item.id || idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">
                              {item.name || item.bailer_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.father_name || item.father || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.mobile || item.phone || item.contact || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                              {item.address || item.permanent_address || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Bailed Table */}
              {modalType === 'bailed' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No bailed accused found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ACCUSED NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">BAIL DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.fir_records?.fir_number}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(item.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div>{item.fir_records?.district_name}</div>
                              <div className="text-xs text-muted-foreground">{item.fir_records?.thana_name}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Custody Table */}
              {modalType === 'custody' && (
                <>
                  {modalData.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No accused in custody found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ACCUSED NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FIR NUMBER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ARREST DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {modalData.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.fir_records?.fir_number}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(item.created_at)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div>{item.fir_records?.district_name}</div>
                              <div className="text-xs text-muted-foreground">{item.fir_records?.thana_name}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* Summary at bottom */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Records:</span>
                  <Badge variant="secondary" className="text-lg">{modalData.length}</Badge>
                </div>
              </div>
            </div>
          )}
        </DataModal>

        {/* Top Districts & Thanas */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Top Districts by Accused Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDistricts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              ) : (
                <div className="space-y-3">
                  {topDistricts.map((district, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="font-medium">{district.name}</span>
                      <Badge variant="secondary">{district.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Thanas by Accused Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topThanas.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              ) : (
                <div className="space-y-3">
                  {topThanas.map((thana, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="font-medium">{thana.name}</span>
                      <Badge variant="secondary">{thana.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent FIRs & Case Status */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent FIRs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentFirs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No recent FIRs</p>
              ) : (
                <div className="space-y-3">
                  {recentFirs.map((fir) => {
                    const statusConfig = getStatusConfig(fir.case_status);
                    return (
                      <div key={fir.id} className="p-3 border rounded-lg hover:bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-mono font-semibold">{fir.fir_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {fir.district_name} - {fir.thana_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(fir.incident_date)}
                            </p>
                          </div>
                          <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Case Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseStatusData.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              ) : (
                <div className="space-y-3">
                  {caseStatusData.map((item, idx) => {
                    const statusConfig = getStatusConfig(item.status);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                        <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          {statusConfig.label}
                        </Badge>
                        <span className="font-bold">{item.count}</span>
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