'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Download, FileSpreadsheet, Users, Eye, Phone, MapPin } from 'lucide-react';
import { maskMobile, formatDate, debounce } from '@/lib/utils';
import { exportToExcel, exportToPDF, exportToGoogleSheets } from '@/lib/export';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllAccusedPage() {
  const [accused, setAccused] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedAccused, setSelectedAccused] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  useEffect(() => {
    loadAccused();
  }, [search]);

  const loadAccused = async () => {
    setLoading(true);
    try {
      // ✅ Original join query - working!
      let query = supabase
        .from('accused_persons')
        .select('*, fir_records(fir_number, modus_operandi_id, case_status, incident_date)')
        .order('created_at', { ascending: false })
        .limit(500);

      // ✅ Fixed: Use correct column names for search
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,mobile_number.ilike.%${search}%,aadhar_number.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error('Accused query error:', error);
        throw error;
      }
      setAccused(data || []);
    } catch (error: any) {
      toast.error('Failed to load accused: ' + error.message);
      setAccused([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'sheets') => {
    if (accused.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      // ✅ Fixed: Use correct column names
      const columns = [
        { header: 'Name', key: 'full_name' },
        { header: 'Age', key: 'age' },
        { header: 'Gender', key: 'gender' },
        { header: 'Mobile', key: 'mobile_number' },
        { header: 'Aadhar', key: 'aadhar_number' },
        { header: 'FIR Number', key: 'fir_records.fir_number' },
        { header: 'Custody Status', key: 'custody_status' },
        { header: 'Is Minor', key: 'is_minor' },
      ];

      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user?.id)
        .single();

      if (format === 'pdf') {
        await exportToPDF({
          title: 'Accused Persons Database',
          data: accused,
          columns,
          generatedBy: userData?.full_name,
        });
      } else if (format === 'excel') {
        exportToExcel({
          filename: 'Accused_Persons',
          sheets: [{ name: 'Accused', data: accused, columns }],
        });
      } else {
        const result = exportToGoogleSheets(accused, columns, 'Accused_Persons');
        toast.info(result.message);
      }

      if (userData) {
        await supabase.from('export_logs').insert({
          user_id: userData.id,
          export_type: format.toUpperCase(),
          report_type: 'Accused Database',
          record_count: accused.length,
        });
      }

      toast.success('Exported successfully');
    } catch (error: any) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Accused Persons Database</h1>
            <p className="text-amber-100 text-lg">Search and manage all accused persons records</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleExport('pdf')}
              variant="secondary"
              size="sm"
              disabled={exporting || accused.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="secondary"
              size="sm"
              disabled={exporting || accused.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={() => handleExport('sheets')}
              variant="secondary"
              size="sm"
              disabled={exporting || accused.length === 0}
              className="bg-white text-amber-600 hover:bg-amber-50"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Sheets
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-amber-600" />
            Search Accused Persons
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, mobile number, or Aadhar number..."
              className="pl-10 h-12 text-base"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Enter name, mobile (e.g., 9876543210), or Aadhar number to search
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Accused Persons Database
            </CardTitle>
            <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
              {accused.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border-2 border-amber-100">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <tr>
                  <th className="p-3 text-left font-bold">Photo</th>
                  <th className="p-3 text-left font-bold">Name</th>
                  <th className="p-3 text-left font-bold">Age</th>
                  <th className="p-3 text-left font-bold">Gender</th>
                  <th className="p-3 text-left font-bold">Mobile</th>
                  <th className="p-3 text-left font-bold">FIR Number</th>
                  <th className="p-3 text-left font-bold">Status</th>
                  <th className="p-3 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={8} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : accused.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 font-semibold text-lg">No Accused Found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {search ? 'Try a different search term' : 'No records available'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  accused.map((acc) => (
                    <tr key={acc.id} className="border-b hover:bg-amber-50 transition-colors">
                      {/* Photo */}
                      <td className="p-3">
                        {acc.photo_url ? (
                          <img
                            src={acc.photo_url}
                            alt={acc.full_name || 'Photo'}
                            className="h-12 w-12 rounded-full object-cover border-2 border-amber-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {acc.full_name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                        )}
                      </td>
                      
                      {/* ✅ Name - FIXED */}
                      <td className="p-3">
                        <p className="font-semibold text-gray-900">{acc.full_name || 'N/A'}</p>
                        {acc.alias_name && (
                          <p className="text-xs text-gray-500">Alias: {acc.alias_name}</p>
                        )}
                      </td>
                      
                      {/* Age */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{acc.age || 'N/A'}</span>
                          {acc.is_minor && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-700">Minor</Badge>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3">{acc.gender || 'N/A'}</td>
                      
                      {/* ✅ Mobile - FIXED */}
                      <td className="p-3">
                        {acc.mobile_number ? (
                          <span className="font-mono text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {acc.mobile_number}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      
                      {/* FIR Number - Already working */}
                      <td className="p-3">
                        <span className="font-semibold text-amber-700">
                          {acc.fir_records?.fir_number || 'N/A'}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td className="p-3">
                        <Badge
                          className={
                            acc.custody_status === 'released' || acc.bail_status === 'granted'
                              ? 'bg-green-100 text-green-700'
                              : acc.custody_status === 'in_custody'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {acc.custody_status || 'N/A'}
                        </Badge>
                      </td>
                      
                      {/* Actions */}
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAccused(acc);
                            setShowDetails(true);
                          }}
                          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Details Modal - All fields FIXED */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Accused Person Details</DialogTitle>
          </DialogHeader>
          {selectedAccused && (
            <Tabs defaultValue="personal" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="contact">Contact Details</TabsTrigger>
                <TabsTrigger value="criminal">Criminal History</TabsTrigger>
              </TabsList>
              
              {/* Personal Info Tab - ✅ FIXED */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="flex items-center gap-4 mb-4">
                  {selectedAccused.photo_url ? (
                    <img
                      src={selectedAccused.photo_url}
                      alt={selectedAccused.full_name}
                      className="h-20 w-20 rounded-full object-cover border-4 border-amber-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-2xl">
                      {selectedAccused.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{selectedAccused.full_name || 'Unknown'}</h3>
                    {selectedAccused.alias_name && (
                      <p className="text-gray-500">Alias: {selectedAccused.alias_name}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Full Name</Label>
                    <p className="text-lg font-semibold mt-1">{selectedAccused.full_name || 'N/A'}</p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Age</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.age || 'N/A'} {selectedAccused.is_minor && '(Minor)'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Gender</Label>
                    <p className="text-lg font-semibold mt-1">{selectedAccused.gender || 'N/A'}</p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Date of Birth</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.date_of_birth ? formatDate(selectedAccused.date_of_birth) : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Father's Name</Label>
                    <p className="text-lg font-semibold mt-1">{selectedAccused.father_name || 'N/A'}</p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Mother's Name</Label>
                    <p className="text-lg font-semibold mt-1">{selectedAccused.mother_name || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>
              
              {/* Contact Tab - ✅ FIXED */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Mobile Number
                    </Label>
                    <p className="text-lg font-semibold mt-1 font-mono">
                      {selectedAccused.mobile_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Aadhar Number</Label>
                    <p className="text-lg font-semibold mt-1 font-mono">
                      {selectedAccused.aadhar_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg col-span-2">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Current Address
                    </Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.current_address || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg col-span-2">
                    <Label className="text-xs text-gray-500">Permanent Address</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.permanent_address || 'N/A'}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              {/* Criminal Tab - ✅ FIXED */}
              <TabsContent value="criminal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">FIR Number</Label>
                    <p className="text-lg font-semibold mt-1 text-amber-700">
                      {selectedAccused.fir_records?.fir_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Case Status</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.fir_records?.case_status || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Custody Status</Label>
                    <div className="mt-1">
                      <Badge
                        className={
                          selectedAccused.custody_status === 'released'
                            ? 'bg-green-100 text-green-700'
                            : selectedAccused.custody_status === 'in_custody'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {selectedAccused.custody_status || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Bail Status</Label>
                    <div className="mt-1">
                      <Badge
                        className={
                          selectedAccused.bail_status === 'granted'
                            ? 'bg-green-100 text-green-700'
                            : selectedAccused.bail_status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {selectedAccused.bail_status || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Incident Date</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.fir_records?.incident_date 
                        ? formatDate(selectedAccused.fir_records.incident_date) 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 border-2 rounded-lg">
                    <Label className="text-xs text-gray-500">Previous Cases</Label>
                    <p className="text-lg font-semibold mt-1">
                      {selectedAccused.previous_cases || 0}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}