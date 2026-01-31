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
  RefreshCw, User, CreditCard, Calendar, AlertTriangle,
  ChevronLeft, ExternalLink, FileText, Building, Home
} from 'lucide-react';
import { toast } from 'sonner';

interface AccusedRecord {
  id: number;
  fir_id: number;
  name: string;
  father_name: string | null;
  age: number | null;
  gender: string | null;
  mobile: string | null;
  aadhaar: string | null;
  full_address: string | null;
  accused_type: string | null;
  created_at: string;
  // Joined FIR data
  fir_number?: string;
  case_status?: string;
  incident_date?: string;
  district_name?: string;
  thana_name?: string;
}

export default function AllAccusedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [accused, setAccused] = useState<AccusedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAccused();
  }, []);

  const loadAccused = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading accused data...');
      
      // Step 1: Get ALL accused details
      const { data: accusedData, error: accusedError } = await supabase
        .from('accused_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (accusedError) {
        console.error('Accused query error:', accusedError);
        throw accusedError;
      }

      if (!accusedData || accusedData.length === 0) {
        console.log('No accused found');
        setAccused([]);
        toast.info('No accused records found');
        return;
      }

      console.log('✅ Found accused:', accusedData.length);

      // Step 2: Get FIR details for all accused
      const firIds = [...new Set(accusedData.map(a => a.fir_id).filter(Boolean))];
      
      let firMap = new Map();
      if (firIds.length > 0) {
        console.log('📋 Fetching FIR data for', firIds.length, 'FIRs');
        
        const { data: firData, error: firError } = await supabase
          .from('fir_records')
          .select('id, fir_number, case_status, incident_date, district_name, thana_name')
          .in('id', firIds);

        if (firError) {
          console.error('FIR query error:', firError);
        } else if (firData) {
          console.log('✅ Got FIR data:', firData.length);
          firData.forEach(fir => {
            firMap.set(fir.id, fir);
          });
        }
      }

      // Step 3: Combine data
      const combinedData: AccusedRecord[] = accusedData.map(acc => {
        const fir = firMap.get(acc.fir_id);
        return {
          id: acc.id,
          fir_id: acc.fir_id,
          name: acc.name,
          father_name: acc.father_name,
          age: acc.age,
          gender: acc.gender,
          mobile: acc.mobile,
          aadhaar: acc.aadhaar,
          full_address: acc.full_address,
          accused_type: acc.accused_type,
          created_at: acc.created_at,
          fir_number: fir?.fir_number || null,
          case_status: fir?.case_status || null,
          incident_date: fir?.incident_date || null,
          district_name: fir?.district_name || null,
          thana_name: fir?.thana_name || null,
        };
      });

      setAccused(combinedData);
      console.log('✅ Loaded total accused:', combinedData.length);
      toast.success(`Loaded ${combinedData.length} accused records`);

    } catch (error: any) {
      console.error('Load error:', error);
      toast.error('Failed to load accused: ' + error.message);
      setAccused([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const filteredAccused = accused.filter(acc => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      acc.name?.toLowerCase().includes(query) ||
      acc.father_name?.toLowerCase().includes(query) ||
      acc.mobile?.includes(query) ||
      acc.aadhaar?.includes(query) ||
      acc.fir_number?.toLowerCase().includes(query) ||
      acc.district_name?.toLowerCase().includes(query) ||
      acc.thana_name?.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    if (filteredAccused.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const headers = [
        'S.No.', 
        'Name', 
        'Father Name', 
        'Age', 
        'Gender', 
        'Mobile', 
        'Aadhaar', 
        'FIR Number', 
        'District', 
        'Thana', 
        'Status',
        'Accused Type',
        'Address'
      ];
      
      const rows = filteredAccused.map((acc, index) => [
        index + 1,
        acc.name || '',
        acc.father_name || '',
        acc.age || '',
        acc.gender || '',
        acc.mobile || '',
        acc.aadhaar || '',
        acc.fir_number || '',
        acc.district_name || '',
        acc.thana_name || '',
        acc.case_status || '',
        acc.accused_type || '',
        acc.full_address || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accused_database_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredAccused.length} records!`);
    } catch (error: any) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const getAccusedTypeBadge = (type: string | null) => {
    const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
      arrested: { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        border: 'border-red-300',
        label: 'ARRESTED' 
      },
      bailed: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        border: 'border-green-300',
        label: 'BAILED' 
      },
      absconding: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        border: 'border-orange-300',
        label: 'ABSCONDING' 
      },
      known: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-700', 
        border: 'border-blue-300',
        label: 'KNOWN' 
      },
      unknown: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700', 
        border: 'border-gray-300',
        label: 'UNKNOWN' 
      }
    };
    return config[type?.toLowerCase() || 'unknown'] || config.unknown;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate stats
  const stats = {
    total: accused.length,
    arrested: accused.filter(a => a.accused_type === 'arrested').length,
    bailed: accused.filter(a => a.accused_type === 'bailed').length,
    absconding: accused.filter(a => a.accused_type === 'absconding').length,
    unknown: accused.filter(a => !a.accused_type || a.accused_type === 'unknown' || a.accused_type === 'known').length,
    male: accused.filter(a => a.gender?.toLowerCase() === 'male').length,
    female: accused.filter(a => a.gender?.toLowerCase() === 'female').length,
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
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Accused Database</h1>
              <p className="text-muted-foreground text-sm">
                Complete database of all accused persons with FIR details
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={exporting || filteredAccused.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              onClick={loadAccused}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Card */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, father name, mobile, aadhaar, FIR number, district, or thana..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredAccused.length} of {accused.length} records
            </p>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
              <p className="text-xs text-blue-600 font-semibold">Total Accused</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-2xl font-bold text-red-700">{stats.arrested}</p>
              </div>
              <p className="text-xs text-red-600 font-semibold">Arrested</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <FileText className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-700">{stats.bailed}</p>
              </div>
              <p className="text-xs text-green-600 font-semibold">Bailed</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-2xl font-bold text-orange-700">{stats.absconding}</p>
              </div>
              <p className="text-xs text-orange-600 font-semibold">Absconding</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <User className="h-4 w-4 text-gray-600" />
                <p className="text-2xl font-bold text-gray-700">{stats.unknown}</p>
              </div>
              <p className="text-xs text-gray-600 font-semibold">Other</p>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <User className="h-4 w-4 text-indigo-600" />
                <p className="text-2xl font-bold text-indigo-700">{stats.male}</p>
              </div>
              <p className="text-xs text-indigo-600 font-semibold">Male</p>
            </CardContent>
          </Card>

          <Card className="bg-pink-50 border-pink-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <User className="h-4 w-4 text-pink-600" />
                <p className="text-2xl font-bold text-pink-700">{stats.female}</p>
              </div>
              <p className="text-xs text-pink-600 font-semibold">Female</p>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Accused Persons List</span>
              </div>
              <Badge variant="secondary">{filteredAccused.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading accused records...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait...</p>
              </div>
            ) : filteredAccused.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="font-semibold text-lg">No Accused Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : 'No records available in database'}
                </p>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME / FATHER</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">AGE/GENDER</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CONTACT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">FIR DETAILS</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAccused.map((acc, index) => {
                      const typeConfig = getAccusedTypeBadge(acc.accused_type);
                      return (
                        <tr 
                          key={acc.id} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/fir/${acc.fir_id}`)}
                        >
                          {/* S.No. */}
                          <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </td>
                          
                          {/* Name & Father */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {acc.name || 'Unknown'}
                                </p>
                                {acc.father_name && (
                                  <p className="text-xs text-muted-foreground">
                                    S/o {acc.father_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Age/Gender */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {acc.age && (
                                  <span className="text-sm font-medium">
                                    {acc.age} yrs
                                  </span>
                                )}
                                {acc.gender && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs"
                                  >
                                    {acc.gender}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Contact */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {acc.mobile ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  <span className="font-mono">{acc.mobile}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">No mobile</span>
                              )}
                              {acc.aadhaar && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CreditCard className="h-3 w-3 flex-shrink-0" />
                                  <span className="font-mono">****{acc.aadhaar.slice(-4)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* FIR Details */}
                          <td className="px-4 py-3">
                            {acc.fir_number ? (
                              <div className="space-y-1">
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300 border font-mono text-xs">
                                  {acc.fir_number}
                                </Badge>
                                {acc.case_status && (
                                  <p className="text-xs text-muted-foreground">
                                    {acc.case_status}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No FIR</span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {acc.district_name ? (
                                <>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span>{acc.district_name}</span>
                                  </div>
                                  {acc.thana_name && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      <span>{acc.thana_name}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">No location</span>
                              )}
                            </div>
                          </td>
                          
                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <Badge 
                              className={`${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} border text-xs font-semibold`}
                            >
                              {typeConfig.label}
                            </Badge>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/fir/${acc.fir_id}`);
                              }}
                              className="gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              View FIR
                              <ExternalLink className="h-3 w-3" />
                            </Button>
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

        {/* Footer Info */}
        {accused.length > 0 && (
          <Card className="bg-muted/30 border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Last updated: {formatDate(accused[0]?.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Click on any row to view complete FIR details</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}