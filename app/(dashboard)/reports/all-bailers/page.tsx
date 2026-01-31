'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Download, Users, Eye, Phone, MapPin,
  RefreshCw, User, CreditCard, FileText, ChevronLeft, ExternalLink, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface BailerRecord {
  id: number;
  fir_id: number;
  name: string;
  father_name: string | null;
  mobile: string | null;
  aadhaar: string | null;
  full_address: string | null;
  relation_with_accused: string | null;
  created_at: string;
  fir_number?: string;
  district_name?: string;
  thana_name?: string;
}

export default function AllBailersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [bailers, setBailers] = useState<BailerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBailers();
  }, []);

  const loadBailers = async () => {
    setLoading(true);
    try {
      // Get bailer details
      const { data: bailerData, error } = await supabase
        .from('bailer_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (!bailerData || bailerData.length === 0) {
        setBailers([]);
        return;
      }

      // Get FIR details
      const firIds = [...new Set(bailerData.map(b => b.fir_id).filter(Boolean))];
      let firMap = new Map();

      if (firIds.length > 0) {
        const { data: firData } = await supabase
          .from('fir_records')
          .select('id, fir_number, district_name, thana_name')
          .in('id', firIds);

        firData?.forEach(fir => {
          firMap.set(fir.id, fir);
        });
      }

      const combinedData = bailerData.map(bailer => {
        const fir = firMap.get(bailer.fir_id);
        return {
          ...bailer,
          fir_number: fir?.fir_number || null,
          district_name: fir?.district_name || null,
          thana_name: fir?.thana_name || null,
        };
      });

      setBailers(combinedData);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load bailers');
    } finally {
      setLoading(false);
    }
  };

  const filteredBailers = bailers.filter(b => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.name?.toLowerCase().includes(query) ||
      b.mobile?.includes(query) ||
      b.aadhaar?.includes(query) ||
      b.fir_number?.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    if (filteredBailers.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['S.No.', 'Name', 'Father Name', 'Mobile', 'Aadhaar', 'FIR Number', 'District', 'Thana', 'Relation', 'Address'];
    const rows = filteredBailers.map((b, index) => [
      index + 1,
      b.name || '',
      b.father_name || '',
      b.mobile || '',
      b.aadhaar || '',
      b.fir_number || '',
      b.district_name || '',
      b.thana_name || '',
      b.relation_with_accused || '',
      b.full_address || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bailers_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully!');
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
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bailers Database</h1>
              <p className="text-muted-foreground text-sm">
                All bailers/sureties records
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={filteredBailers.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={loadBailers} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Bailers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, aadhaar, or FIR number..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Total Bailers</p>
              <p className="text-2xl font-bold text-green-700">{bailers.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-semibold">With Mobile</p>
              <p className="text-2xl font-bold text-blue-700">
                {bailers.filter(b => b.mobile).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">With Aadhaar</p>
              <p className="text-2xl font-bold text-purple-700">
                {bailers.filter(b => b.aadhaar).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Unique FIRs</p>
              <p className="text-2xl font-bold text-orange-700">
                {new Set(bailers.map(b => b.fir_id)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Bailers List</span>
              </div>
              <Badge variant="secondary">{filteredBailers.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : filteredBailers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold">No Bailers Found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME / FATHER</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CONTACT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">FIR DETAILS</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">RELATION</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBailers.map((bailer, index) => (
                      <tr key={bailer.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{bailer.name || 'Unknown'}</p>
                              {bailer.father_name && (
                                <p className="text-xs text-muted-foreground">S/o {bailer.father_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {bailer.mobile && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-green-600" />
                                <span className="font-mono">{bailer.mobile}</span>
                              </div>
                            )}
                            {bailer.aadhaar && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CreditCard className="h-3 w-3" />
                                ****{bailer.aadhaar.slice(-4)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {bailer.fir_number && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 border font-mono">
                              {bailer.fir_number}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {bailer.district_name && (
                              <p className="text-sm">{bailer.district_name}</p>
                            )}
                            {bailer.thana_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {bailer.thana_name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {bailer.relation_with_accused || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/fir/${bailer.fir_id}`)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View FIR
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