'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Scale,
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
  Gavel,
  PieChart,
  ListFilter,
  FileSpreadsheet
} from 'lucide-react';

const reportCards = [
  {
    icon: Calendar,
    title: 'Daily FIR Report',
    description: 'Generate daily FIR registration summary with all details',
    href: '/reports/daily',
    color: 'bg-blue-100 text-blue-600',
    badge: 'Daily',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  {
    icon: BarChart3,
    title: 'Monthly Crime Report',
    description: 'Comprehensive monthly crime analysis and statistics',
    href: '/reports/monthly',
    color: 'bg-purple-100 text-purple-600',
    badge: 'Monthly',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  {
    icon: FileSearch,
    title: 'Custom Report Builder',
    description: 'Create custom reports with advanced filters',
    href: '/reports/custom',
    color: 'bg-green-100 text-green-600',
    badge: 'Custom',
    badgeColor: 'bg-green-100 text-green-700 border-green-300'
  },
  {
    icon: Users,
    title: 'All Accused Database',
    description: 'Complete database of all accused persons',
    href: '/reports/all-accused',
    color: 'bg-red-100 text-red-600',
    badge: 'Database',
    badgeColor: 'bg-red-100 text-red-700 border-red-300'
  },
  {
    icon: UserCheck,
    title: 'All Bailers Database',
    description: 'Complete database of all bailers/sureties',
    href: '/reports/all-bailers',
    color: 'bg-indigo-100 text-indigo-600',
    badge: 'Database',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-300'
  },
  {
    icon: Building,
    title: 'District Wise Report',
    description: 'Crime statistics grouped by district',
    href: '/reports/district-wise',
    color: 'bg-amber-100 text-amber-600',
    badge: 'Analysis',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-300'
  },
  {
    icon: MapPin,
    title: 'Thana Wise Report',
    description: 'Crime statistics grouped by police station',
    href: '/reports/thana-wise',
    color: 'bg-cyan-100 text-cyan-600',
    badge: 'Analysis',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-300'
  },
  {
    icon: AlertTriangle,
    title: 'Repeat Offenders',
    description: 'List of repeat offenders and their cases',
    href: '/reports/repeat-offenders',
    color: 'bg-orange-100 text-orange-600',
    badge: 'Alert',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  {
    icon: Lock,
    title: 'Custody Status Report',
    description: 'Current custody status of all accused',
    href: '/reports/custody-status',
    color: 'bg-rose-100 text-rose-600',
    badge: 'Status',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-300'
  },
];

interface QuickStat {
  label: string;
  value: number;
  icon: any;
  color: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    setLoading(true);
    try {
      // Total FIRs
      const { count: totalFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true });

      // Total Accused
      const { count: totalAccused } = await supabase
        .from('accused_details')
        .select('*', { count: 'exact', head: true });

      // Total Bailers
      const { count: totalBailers } = await supabase
        .from('bailer_details')
        .select('*', { count: 'exact', head: true });

      // Today's FIRs
      const today = new Date().toISOString().split('T')[0];
      const { count: todayFirs } = await supabase
        .from('fir_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats([
        { 
          label: 'Total FIRs', 
          value: totalFirs || 0, 
          icon: FileText, 
          color: 'bg-blue-50 border-blue-200 text-blue-700' 
        },
        { 
          label: 'Total Accused', 
          value: totalAccused || 0, 
          icon: Users, 
          color: 'bg-red-50 border-red-200 text-red-700' 
        },
        { 
          label: 'Total Bailers', 
          value: totalBailers || 0, 
          icon: UserCheck, 
          color: 'bg-green-50 border-green-200 text-green-700' 
        },
        { 
          label: "Today's FIRs", 
          value: todayFirs || 0, 
          icon: Calendar, 
          color: 'bg-purple-50 border-purple-200 text-purple-700' 
        },
      ]);

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
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
            onClick={loadQuickStats}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
        </div>

        {/* Quick Stats */}
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
              <Card key={stat.label} className={`border-2 ${stat.color}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-5 w-5 opacity-70" />
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs font-semibold mt-2 opacity-80">{stat.label}</p>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reportCards.map((report) => {
                const Icon = report.icon;
                return (
                  <Card 
                    key={report.title} 
                    className="border-2 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => router.push(report.href)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${report.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${report.badgeColor} border`}
                        >
                          {report.badge}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {report.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(report.href);
                          }}
                        >
                          Generate
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => router.push('/reports/all-accused')}
              >
                <Users className="h-6 w-6 text-red-600" />
                <span className="text-sm">Export Accused</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => router.push('/reports/all-bailers')}
              >
                <UserCheck className="h-6 w-6 text-green-600" />
                <span className="text-sm">Export Bailers</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => router.push('/reports/daily')}
              >
                <Calendar className="h-6 w-6 text-blue-600" />
                <span className="text-sm">Daily Report</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => router.push('/reports/monthly')}
              >
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <span className="text-sm">Monthly Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}