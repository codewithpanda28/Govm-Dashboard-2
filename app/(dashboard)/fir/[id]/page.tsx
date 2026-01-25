'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Download, Printer, Phone, MapPin, Train } from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { toast } from 'sonner';

export default function FIRDetailPage() {
  const params = useParams();
  const [fir, setFir] = useState<any>(null);
  const [accused, setAccused] = useState<any[]>([]);
  const [modusOperandi, setModusOperandi] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (params.id) {
      loadFIRData();
    }
  }, [params.id]);

  const loadFIRData = async () => {
    setLoading(true);
    try {
      // ✅ Simple Query - No complex joins
      const { data: firData, error: firError } = await supabase
        .from('fir_records')
        .select(`
          *,
          police_stations (id, name),
          railway_districts (id, name)
        `)
        .eq('id', params.id)
        .single();

      if (firError) {
        console.error('FIR Error:', firError);
        throw firError;
      }
      
      setFir(firData);

      // ✅ Fetch Modus Operandi separately
      if (firData?.modus_operandi_id) {
        const { data: moData } = await supabase
          .from('modus_operandi')
          .select('id, name')
          .eq('id', firData.modus_operandi_id)
          .single();
        
        setModusOperandi(moData);
      }

      // Accused query
      const { data: accusedData } = await supabase
        .from('accused_persons')
        .select('*')
        .eq('fir_id', params.id)
        .order('created_at');

      setAccused(accusedData || []);

      // Audit logs - Simple query without join
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'fir_records')
        .eq('record_id', params.id)
        .order('created_at', { ascending: false });

      setAuditLogs(auditData || []);

    } catch (error: any) {
      console.error('Error loading FIR:', error);
      toast.error('Failed to load FIR details');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!fir) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('auth_id', user?.id)
      .single();

    await exportToPDF({
      title: `FIR ${fir.fir_number}`,
      data: [fir],
      columns: [
        { header: 'FIR Number', key: 'fir_number' },
        { header: 'Date', key: 'incident_date' },
        { header: 'Time', key: 'incident_time' },
        { header: 'Police Station', key: 'police_stations.name' },
        { header: 'District', key: 'railway_districts.name' },
        { header: 'Status', key: 'case_status' },
      ],
      generatedBy: userData?.full_name,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fir) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-lg text-gray-500">FIR not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FIR Details</h1>
          <p className="text-muted-foreground">{fir.fir_number}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Basic Info & Crime Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">FIR Number</label>
              <p className="text-lg font-semibold text-blue-600">{fir.fir_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <p>{formatDate(fir.incident_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Time</label>
              <p>{fir.incident_time || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Police Station</label>
              <p>{fir.police_stations?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Railway District</label>
              <p>{fir.railway_districts?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge className="ml-2">{fir.case_status || 'Pending'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Crime Details */}
        <Card>
          <CardHeader>
            <CardTitle>Crime Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ✅ Modus Operandi - Using separate fetch */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Modus Operandi / Crime Type</label>
              <p className="font-medium text-red-600">
                {modusOperandi?.name || 'N/A'}
              </p>
            </div>
            
            {/* ✅ Law Section */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Law Section</label>
              <p className="font-medium">{fir.law_sections_text || 'N/A'}</p>
            </div>
            
            {/* ✅ Train */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Train</label>
              <p className="flex items-center gap-2">
                <Train className="h-4 w-4 text-gray-500" />
                {fir.train_number_manual && fir.train_name_manual 
                  ? `${fir.train_number_manual} - ${fir.train_name_manual}`
                  : 'N/A'}
              </p>
            </div>
            
            {/* ✅ Station */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Station</label>
              <p>{fir.station_name_manual || 'N/A'}</p>
            </div>
            
            {/* ✅ Description */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm text-gray-700 mt-1">
                {fir.brief_description || fir.detailed_description || 'N/A'}
              </p>
            </div>
            
            {/* ✅ Property Stolen */}
            {fir.property_stolen && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Property Stolen</label>
                <p className="font-medium">
                  {fir.property_stolen}
                  {fir.estimated_value && (
                    <span className="text-green-600 ml-2">
                      (Value: ₹{Number(fir.estimated_value).toLocaleString()})
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accused Persons */}
      <Card>
        <CardHeader>
          <CardTitle>Accused Persons ({accused.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {accused.length === 0 ? (
            <p className="text-muted-foreground">No accused persons</p>
          ) : (
            <div className="space-y-4">
              {accused.map((acc) => (
                <div 
                  key={acc.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/dashboard2/accused/${acc.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Photo/Initial */}
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {acc.photo_url ? (
                        <img 
                          src={acc.photo_url} 
                          alt={acc.full_name}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-600 font-bold text-xl">
                          {acc.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg text-gray-900">
                            {acc.full_name || 'Unknown'}
                          </p>
                          {acc.alias_name && (
                            <p className="text-sm text-gray-500">Alias: {acc.alias_name}</p>
                          )}
                        </div>
                        <Badge variant={acc.is_minor ? "destructive" : "secondary"}>
                          {acc.is_minor ? 'Minor' : 'Adult'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        Age: {acc.age || 'N/A'} • Gender: {acc.gender || 'N/A'} • Status: {acc.custody_status || 'N/A'}
                      </p>
                      
                      {/* Additional Info */}
                      <div className="mt-2 space-y-1">
                        {acc.father_name && (
                          <p className="text-sm text-gray-600">S/o {acc.father_name}</p>
                        )}
                        {acc.mobile_number && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {acc.mobile_number}
                          </p>
                        )}
                        {acc.current_address && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {acc.current_address}
                          </p>
                        )}
                      </div>
                      
                      {/* Bail Status */}
                      <div className="mt-2 flex gap-2">
                        {acc.bail_status === 'granted' && (
                          <Badge className="bg-green-100 text-green-700">
                            ✅ Bail Granted
                          </Badge>
                        )}
                        {acc.custody_status === 'in_custody' && (
                          <Badge className="bg-red-100 text-red-700">
                            🔒 In Custody
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground">No audit history</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}