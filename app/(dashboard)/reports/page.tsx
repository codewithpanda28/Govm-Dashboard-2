'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  BarChart3,
  Users,
  Lock,
  FileSearch,
  Download,
  ChevronRight,
  Clock,
  Building,
  MapPin,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  TrendingUp,
  Hash
} from 'lucide-react';

interface ReportCard {
  icon: any;
  title: string;
  description: string;
  href: string;
  color: string;
  badge: string;
  badgeColor: string;
  countKey: string;
}

const reportCardsConfig: ReportCard[] = [
  {
    icon: Calendar,
    title: 'Daily FIR Report',
    description: 'Generate daily FIR registration summary with all details',
    href: '/reports/daily',
    color: 'bg-blue-100 text-blue-600',
    badge: 'Daily',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
    countKey: 'todayFirs'
  },
  {
    icon: BarChart3,
    title: 'Monthly Crime Report',
    description: 'Comprehensive monthly crime analysis and statistics',
    href: '/reports/monthly',
    color: 'bg-purple-100 text-purple-600',
    badge: 'Monthly',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-300',
    countKey: 'monthlyFirs'
  },
  {
    icon: FileSearch,
    title: 'Custom Report Builder',
    description: 'Create custom reports with advanced filters',
    href: '/reports/custom',
    color: 'bg-green-100 text-green-600',
    badge: 'Custom',
    badgeColor: 'bg-green-100 text-green-700 border-green-300',
    countKey: 'totalFirs'
  },
  {
    icon: Users,
    title: 'All Accused Database',
    description: 'Complete database of all accused persons',
    href: '/reports/all-accused',
    color: 'bg-red-100 text-red-600',
    badge: 'Database',
    badgeColor: 'bg-red-100 text-red-700 border-red-300',
    countKey: 'totalAccused'
  },
  {
    icon: UserCheck,
    title: 'All Bailers Database',
    description: 'Complete database of all bailers/sureties',
    href: '/reports/all-bailers',
    color: 'bg-indigo-100 text-indigo-600',
    badge: 'Database',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    countKey: 'totalBailers'
  },
  {
    icon: Building,
    title: 'District Wise Report',
    description: 'Crime statistics grouped by district',
    href: '/reports/district-wise',
    color: 'bg-amber-100 text-amber-600',
    badge: 'Analysis',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-300',
    countKey: 'totalDistricts'
  },
  {
    icon: MapPin,
    title: 'Thana Wise Report',
    description: 'Crime statistics grouped by police station',
    href: '/reports/thana-wise',
    color: 'bg-cyan-100 text-cyan-600',
    badge: 'Analysis',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    countKey: 'totalThanas'
  },
  {
    icon: AlertTriangle,
    title: 'Repeat Offenders',
    description: 'List of repeat offenders and their cases',
    href: '/reports/repeat-offenders',
    color: 'bg-orange-100 text-orange-600',
    badge: 'Alert',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
    countKey: 'repeatOffenders'
  },
  {
    icon: Lock,
    title: 'Custody Status Report',
    description: 'Current custody status of all accused',
    href: '/reports/custody-status',
    color: 'bg-rose-100 text-rose-600',
    badge: 'Status',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-300',
    countKey: 'inCustody'
  },
];

interface ReportCounts {
  totalFirs: number;
  todayFirs: number;
  monthlyFirs: number;
  totalAccused: number;
  totalBailers: number;
  totalDistricts: number;
  totalThanas: number;
  repeatOffenders: number;
  inCustody: number;
}

interface QuickStat {
  label: string;
  value: number;
  icon: any;
  color: string;
  trend?: string;
  href?: string; // 🆕 Added href for navigation
}

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [counts, setCounts] = useState<ReportCounts>({
    totalFirs: 0,
    todayFirs: 0,
    monthlyFirs: 0,
    totalAccused: 0,
    totalBailers: 0,
    totalDistricts: 0,
    totalThanas: 0,
    repeatOffenders: 0,
    inCustody: 0
  });

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    try {
      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get first day of current month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      // Total FIRs
      const { count: totalFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true });

      // Today's FIRs
      const { count: todayFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);

      // This Month's FIRs
      const { count: monthlyFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);

      // Total Accused
      const { count: totalAccused } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true });

      // Total Bailers
      const { count: totalBailers } = await supabase
        .from('bailer_details')
        .select('*', { count: 'exact', head: true });

      // Total Districts (active)
      const { count: totalDistricts } = await supabase
        .from('districts')
        .select('*', { count: 'exact', head: true });

      // Total Thanas (active)
      const { count: totalThanas } = await supabase
        .from('thanas')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Repeat Offenders (accused with more than 1 FIR)
      // Note: This is a simplified count - you may need to adjust based on your data structure
      const { data: accusedData } = await supabase
        .from('accused_details')
        .select('name, father_name');
      
      // Count repeat offenders (same name + father_name appearing multiple times)
      let repeatOffendersCount = 0;
      if (accusedData) {
        const nameCount: Record<string, number> = {};
        accusedData.forEach(acc => {
          const key = `${acc.name?.toLowerCase()}_${acc.father_name?.toLowerCase()}`;
          nameCount[key] = (nameCount[key] || 0) + 1;
        });
        repeatOffendersCount = Object.values(nameCount).filter(count => count > 1).length;
      }

      // In Custody (accused with custody_status = 'In Custody' or similar)
      const { count: inCustody } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true })
        .or('custody_status.eq.In Custody,custody_status.eq.Judicial Custody,custody_status.eq.Police Custody');

      const newCounts: ReportCounts = {
        totalFirs: totalFirs || 0,
        todayFirs: todayFirs || 0,
        monthlyFirs: monthlyFirs || 0,
        totalAccused: totalAccused || 0,
        totalBailers: totalBailers || 0,
        totalDistricts: totalDistricts || 0,
        totalThanas: totalThanas || 0,
        repeatOffenders: repeatOffendersCount || 0,
        inCustody: inCustody || 0
      };

      setCounts(newCounts);

      // Set quick stats with navigation hrefs 🆕
      setStats([
        { 
          label: 'Total FIRs', 
          value: newCounts.totalFirs, 
          icon: FileText, 
          color: 'bg-blue-50 border-blue-200 text-blue-700',
          trend: '+' + newCounts.todayFirs + ' today',
          href: '/reports/custom' // Navigate to custom report for all FIRs
        },
        { 
          label: 'Total Accused', 
          value: newCounts.totalAccused, 
          icon: Users, 
          color: 'bg-red-50 border-red-200 text-red-700',
          href: '/reports/all-accused' // Navigate to all accused report
        },
        { 
          label: 'Total Bailers', 
          value: newCounts.totalBailers, 
          icon: UserCheck, 
          color: 'bg-green-50 border-green-200 text-green-700',
          href: '/reports/all-bailers' // Navigate to all bailers report
        },
        { 
          label: "This Month's FIRs", 
          value: newCounts.monthlyFirs, 
          icon: Calendar, 
          color: 'bg-purple-50 border-purple-200 text-purple-700',
          trend: new Date().toLocaleString('default', { month: 'long' }),
          href: '/reports/monthly' // Navigate to monthly report
        },
      ]);

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCountForCard = (countKey: string): number => {
    return counts[countKey as keyof ReportCounts] || 0;
  };

  const getCountLabel = (countKey: string): string => {
    const labels: Record<string, string> = {
      todayFirs: "Today's FIRs",
      monthlyFirs: "This Month",
      totalFirs: "Total Records",
      totalAccused: "Total Accused",
      totalBailers: "Total Bailers",
      totalDistricts: "Districts",
      totalThanas: "Thanas",
      repeatOffenders: "Repeat Offenders",
      inCustody: "In Custody"
    };
    return labels[countKey] || "Records";
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground text-sm">
                Generate, export and analyze crime data reports
              </p>
            </div>
          </div>
          <Button
            onClick={loadAllStats}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
        </div>

        {/* Quick Stats - Made Clickable 🆕 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-2">
                <CardContent className="pt-6">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2"></div>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <Card 
                key={stat.label} 
                className={`border-2 ${stat.color} cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5`}
                onClick={() => stat.href && router.push(stat.href)} // 🆕 Added onClick
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-5 w-5 opacity-70" />
                    <span className="text-2xl font-bold">{stat.value.toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-semibold mt-2 opacity-80">{stat.label}</p>
                  {stat.trend && (
                    <p className="text-xs mt-1 opacity-60 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Report Cards */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Available Reports
              <Badge variant="secondary" className="ml-2">{reportCardsConfig.length} Reports</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reportCardsConfig.map((report) => {
                const Icon = report.icon;
                const count = getCountForCard(report.countKey);
                const countLabel = getCountLabel(report.countKey);
                
                return (
                  <Card 
                    key={report.title} 
                    className="border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                    onClick={() => router.push(report.href)}
                  >
                    {/* Count Badge - Top Right */}
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant="outline" 
                        className={`${report.badgeColor} border text-xs`}
                      >
                        {report.badge}
                      </Badge>
                    </div>

                    <CardContent className="pt-6">
                      {/* Icon & Count Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${report.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        
                        {/* Count Display */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                            <Hash className="h-4 w-4 opacity-50" />
                            {loading ? (
                              <div className="h-7 w-12 bg-muted animate-pulse rounded"></div>
                            ) : (
                              <span>{count.toLocaleString()}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{countLabel}</p>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {report.description}
                      </p>

                      {/* Action Button */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-1 text-primary hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(report.href);
                          }}
                        >
                          Generate Report
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Download className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Export Section - Already clickable */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Quick Export
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 hover:border-red-300 hover:bg-red-50"
                onClick={() => router.push('/reports/all-accused')}
              >
                <Users className="h-6 w-6 text-red-600" />
                <span className="text-sm font-medium">Export Accused</span>
                <Badge variant="secondary" className="text-xs">
                  {loading ? '...' : counts.totalAccused.toLocaleString()} Records
                </Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 hover:border-green-300 hover:bg-green-50"
                onClick={() => router.push('/reports/all-bailers')}
              >
                <UserCheck className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Export Bailers</span>
                <Badge variant="secondary" className="text-xs">
                  {loading ? '...' : counts.totalBailers.toLocaleString()} Records
                </Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 hover:border-blue-300 hover:bg-blue-50"
                onClick={() => router.push('/reports/daily')}
              >
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Today's Report</span>
                <Badge variant="secondary" className="text-xs">
                  {loading ? '...' : counts.todayFirs.toLocaleString()} FIRs
                </Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 hover:border-purple-300 hover:bg-purple-50"
                onClick={() => router.push('/reports/monthly')}
              >
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium">Monthly Report</span>
                <Badge variant="secondary" className="text-xs">
                  {loading ? '...' : counts.monthlyFirs.toLocaleString()} FIRs
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats Row - Made Clickable 🆕 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Card 
            className="border bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/custom')} // 🆕 Navigate to custom report for all FIRs
          >
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
              <p className="text-xl font-bold text-blue-700">{loading ? '-' : counts.totalFirs.toLocaleString()}</p>
              <p className="text-xs text-blue-600">Total FIRs</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border bg-gradient-to-br from-red-50 to-red-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/all-accused')} // 🆕 Navigate to accused report
          >
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto text-red-600 mb-1" />
              <p className="text-xl font-bold text-red-700">{loading ? '-' : counts.totalAccused.toLocaleString()}</p>
              <p className="text-xs text-red-600">Accused</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border bg-gradient-to-br from-green-50 to-green-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/all-bailers')} // 🆕 Navigate to bailers report
          >
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <p className="text-xl font-bold text-green-700">{loading ? '-' : counts.totalBailers.toLocaleString()}</p>
              <p className="text-xs text-green-600">Bailers</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border bg-gradient-to-br from-amber-50 to-amber-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/district-wise')} // 🆕 Navigate to district report
          >
            <CardContent className="p-4 text-center">
              <Building className="h-5 w-5 mx-auto text-amber-600 mb-1" />
              <p className="text-xl font-bold text-amber-700">{loading ? '-' : counts.totalDistricts.toLocaleString()}</p>
              <p className="text-xs text-amber-600">Districts</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border bg-gradient-to-br from-cyan-50 to-cyan-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/thana-wise')} // 🆕 Navigate to thana report
          >
            <CardContent className="p-4 text-center">
              <MapPin className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
              <p className="text-xl font-bold text-cyan-700">{loading ? '-' : counts.totalThanas.toLocaleString()}</p>
              <p className="text-xs text-cyan-600">Thanas</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border bg-gradient-to-br from-rose-50 to-rose-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            onClick={() => router.push('/reports/custody-status')} // 🆕 Navigate to custody report
          >
            <CardContent className="p-4 text-center">
              <Lock className="h-5 w-5 mx-auto text-rose-600 mb-1" />
              <p className="text-xl font-bold text-rose-700">{loading ? '-' : counts.inCustody.toLocaleString()}</p>
              <p className="text-xs text-rose-600">In Custody</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Footer */}
        <Card className="bg-muted/30 border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Reports are generated in real-time from the database</span>
              </div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export to CSV, Excel or PDF format</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}