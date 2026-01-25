"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, Phone, Mail, MapPin, Calendar, FileText, Scale, 
  AlertTriangle, ArrowLeft, Printer, Download, Shield, 
  Users, Clock, CreditCard, Building, Train
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function AccusedProfilePage() {
  const params = useParams()
  const router = useRouter()
  const accusedId = params.id as string

  const [loading, setLoading] = useState(true)
  const [accused, setAccused] = useState<any>(null)
  const [allRecords, setAllRecords] = useState<any[]>([])  // All records of same person
  const [allBailHistory, setAllBailHistory] = useState<any[]>([])
  const [bailerStats, setBailerStats] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalCases: 0,
    bailCases: 0,
    custodyCases: 0,
    abscondingCases: 0,
    totalBailAmount: 0,
  })

  useEffect(() => {
    if (accusedId) {
      loadCompleteProfile()
    }
  }, [accusedId])

  const loadCompleteProfile = async () => {
    setLoading(true)
    try {
      // 1. Get Current Accused Details
      const { data: accusedData, error: accusedError } = await supabase
        .from("accused_persons")
        .select(`
          *,
          state:states(name),
          district:districts(name),
          fir:fir_records(
            id, fir_number, incident_date, incident_time, case_status, brief_description,
            modus_operandi:modus_operandi(name),
            police_station:police_stations(name),
            railway_district:railway_districts(name)
          )
        `)
        .eq("id", accusedId)
        .single()

      if (accusedError) throw accusedError
      setAccused(accusedData)

      // 2. Find ALL records of SAME PERSON (by mobile or aadhar)
      let allPersonRecords = [accusedData]
      
      if (accusedData.mobile_number || accusedData.aadhar_number) {
        const orConditions = []
        if (accusedData.mobile_number) {
          orConditions.push(`mobile_number.eq.${accusedData.mobile_number}`)
        }
        if (accusedData.aadhar_number) {
          orConditions.push(`aadhar_number.eq.${accusedData.aadhar_number}`)
        }

        const { data: samePersonData } = await supabase
          .from("accused_persons")
          .select(`
            *,
            fir:fir_records(
              id, fir_number, incident_date, incident_time, case_status, brief_description,
              modus_operandi:modus_operandi(name),
              police_station:police_stations(name),
              railway_district:railway_districts(name)
            )
          `)
          .or(orConditions.join(","))
          .order("created_at", { ascending: false })

        if (samePersonData) {
          allPersonRecords = samePersonData
        }
      }

      setAllRecords(allPersonRecords)

      // 3. Get ALL Bail History for this person
      const accusedIds = allPersonRecords.map(r => r.id)
      
      const { data: bailData } = await supabase
        .from("bail_details")
        .select(`
          *,
          fir:fir_records(
            id, fir_number, incident_date, case_status,
            modus_operandi:modus_operandi(name),
            police_station:police_stations(name)
          ),
          court:courts(court_name)
        `)
        .in("accused_id", accusedIds)
        .order("created_at", { ascending: false })

      setAllBailHistory(bailData || [])

      // 4. Calculate Stats
      const bailCount = bailData?.filter(b => b.custody_status === "bail").length || 0
      const custodyCount = bailData?.filter(b => b.custody_status === "custody").length || 0
      const abscondingCount = bailData?.filter(b => b.custody_status === "absconding").length || 0
      const totalBailAmount = bailData?.reduce((sum, b) => sum + (b.bail_amount || 0), 0) || 0

      setStats({
        totalCases: allPersonRecords.length,
        bailCases: bailCount,
        custodyCases: custodyCount,
        abscondingCases: abscondingCount,
        totalBailAmount,
      })

      // 5. Analyze Bailers (who bailed how many times)
      const bailerMap = new Map<string, any>()
      
      for (const bail of bailData || []) {
        if (bail.bailer_mobile || bail.bailer_name) {
          const key = bail.bailer_mobile || bail.bailer_name
          
          if (!bailerMap.has(key)) {
            bailerMap.set(key, {
              name: bail.bailer_name,
              mobile: bail.bailer_mobile,
              relation: bail.bailer_relation,
              address: bail.bailer_address,
              age: bail.bailer_age,
              gender: bail.bailer_gender,
              count: 1,
              totalAmount: bail.bail_amount || 0,
              dates: [bail.bail_date],
            })
          } else {
            const existing = bailerMap.get(key)
            existing.count++
            existing.totalAmount += bail.bail_amount || 0
            existing.dates.push(bail.bail_date)
          }
        }
      }

      setBailerStats(Array.from(bailerMap.values()))

    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      bail: "bg-green-100 text-green-800",
      custody: "bg-red-100 text-red-800",
      absconding: "bg-orange-100 text-orange-800",
      registered: "bg-blue-100 text-blue-800",
      under_investigation: "bg-yellow-100 text-yellow-800",
      closed: "bg-gray-100 text-gray-800",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.registered}`}>
        {status.replace("_", " ").toUpperCase()}
      </span>
    )
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "₹0"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading complete profile...</p>
        </div>
      </div>
    )
  }

  if (!accused) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-lg font-semibold">Accused not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Complete Criminal Profile</h1>
            <p className="text-muted-foreground">All records of this person</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Personal Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photo & Basic Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {accused.photo_url ? (
                  <img
                    src={accused.photo_url}
                    alt={accused.full_name}
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-muted flex items-center justify-center border-4 border-primary">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <h2 className="text-xl font-bold mt-4">{accused.full_name}</h2>
                {accused.alias_name && (
                  <p className="text-muted-foreground">Alias: {accused.alias_name}</p>
                )}
                
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                  {accused.is_minor && <Badge variant="destructive">⚠️ MINOR</Badge>}
                  {accused.is_habitual_offender && (
                    <Badge variant="destructive">🔴 HABITUAL OFFENDER</Badge>
                  )}
                  {stats.totalCases >= 3 && (
                    <Badge variant="destructive">⚠️ REPEAT OFFENDER ({stats.totalCases} cases)</Badge>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{accused.age} years, {accused.gender}</span>
                </div>
                {accused.mobile_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{accused.mobile_number}</span>
                  </div>
                )}
                {accused.aadhar_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{accused.aadhar_number}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{accused.current_address}</span>
                </div>
                {accused.father_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>S/o {accused.father_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Criminal Summary */}
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Criminal Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-3xl font-bold text-primary">{stats.totalCases}</p>
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-3xl font-bold text-green-600">{stats.bailCases}</p>
                  <p className="text-xs text-muted-foreground">Bail Granted</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-3xl font-bold text-red-600">{stats.custodyCases}</p>
                  <p className="text-xs text-muted-foreground">In Custody</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-3xl font-bold text-orange-600">{stats.abscondingCases}</p>
                  <p className="text-xs text-muted-foreground">Absconding</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Bail Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(stats.totalBailAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bailers Who Helped This Person */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bailers ({bailerStats.length})
              </CardTitle>
              <CardDescription>People who bailed this accused</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bailerStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No bailers found</p>
              ) : (
                bailerStats.map((bailer, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/bailer?mobile=${bailer.mobile}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{bailer.name}</p>
                        <p className="text-sm text-muted-foreground">{bailer.relation}</p>
                      </div>
                      <Badge variant={bailer.count >= 2 ? "destructive" : "default"}>
                        {bailer.count}x Bailed
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {bailer.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {bailer.mobile}
                        </span>
                      )}
                      <span>Total: {formatCurrency(bailer.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cases & Bail History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="cases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cases">
                <FileText className="h-4 w-4 mr-2" />
                All Cases ({allRecords.length})
              </TabsTrigger>
              <TabsTrigger value="bail">
                <Scale className="h-4 w-4 mr-2" />
                Bail History ({allBailHistory.length})
              </TabsTrigger>
            </TabsList>

            {/* All Cases Tab */}
            <TabsContent value="cases" className="mt-4 space-y-4">
              {allRecords.map((record, index) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <Link 
                            href={`/fir/${record.fir?.id}`}
                            className="text-lg font-semibold text-primary hover:underline"
                          >
                            {record.fir?.fir_number}
                          </Link>
                          {getStatusBadge(record.fir?.case_status || "registered")}
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground ml-10">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {record.fir?.incident_date && 
                              format(new Date(record.fir.incident_date), "dd MMM yyyy")
                            }
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {record.fir?.modus_operandi?.name || "N/A"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {record.fir?.police_station?.name || "N/A"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Train className="h-4 w-4" />
                            {record.fir?.railway_district?.name || "N/A"}
                          </div>
                        </div>
                        
                        <p className="mt-3 text-sm ml-10 line-clamp-2">
                          {record.fir?.brief_description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Bail History Tab */}
            <TabsContent value="bail" className="mt-4 space-y-4">
              {allBailHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No bail/custody records found
                  </CardContent>
                </Card>
              ) : (
                allBailHistory.map((bail, index) => (
                  <Card key={bail.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            #{index + 1} - {bail.fir?.fir_number}
                            {getStatusBadge(bail.custody_status)}
                          </CardTitle>
                          <CardDescription>
                            {bail.fir?.police_station?.name} • {bail.fir?.modus_operandi?.name}
                          </CardDescription>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {format(new Date(bail.created_at), "dd MMM yyyy")}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bail.custody_status === "bail" && (
                        <div className="space-y-4">
                          {/* Bail Details */}
                          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div>
                              <p className="text-xs text-muted-foreground">Bail Date</p>
                              <p className="font-semibold">
                                {bail.bail_date ? format(new Date(bail.bail_date), "dd MMM yyyy") : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-semibold text-green-700">
                                {formatCurrency(bail.bail_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Order No.</p>
                              <p className="font-semibold font-mono text-sm">
                                {bail.bail_order_number || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Court</p>
                              <p className="font-semibold">
                                {bail.court?.court_name || bail.court_name_manual || "-"}
                              </p>
                            </div>
                          </div>

                          {/* Bailer Details */}
                          {bail.bailer_name && (
                            <div 
                              className="p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => router.push(`/bailer?mobile=${bail.bailer_mobile}`)}
                            >
                              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Bailer Details
                                <ArrowLeft className="h-4 w-4 rotate-180 ml-auto" />
                              </h4>
                              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Name</p>
                                  <p className="font-semibold">{bail.bailer_name}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Relation</p>
                                  <p className="font-semibold">{bail.bailer_relation || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Mobile</p>
                                  <p className="font-semibold flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {bail.bailer_mobile || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Age / Gender</p>
                                  <p className="font-semibold">
                                    {bail.bailer_age || "-"} yrs / {bail.bailer_gender || "-"}
                                  </p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-muted-foreground">Address</p>
                                  <p className="font-semibold">
                                    {bail.bailer_address || "-"}
                                    {bail.bailer_district && `, ${bail.bailer_district}`}
                                    {bail.bailer_state && `, ${bail.bailer_state}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {bail.custody_status === "custody" && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Custody Location</p>
                              <p className="font-semibold">{bail.custody_location || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">From Date</p>
                              <p className="font-semibold">
                                {bail.custody_from_date 
                                  ? format(new Date(bail.custody_from_date), "dd MMM yyyy") 
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {bail.custody_status === "absconding" && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-orange-800 font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            This accused is marked as ABSCONDING
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}