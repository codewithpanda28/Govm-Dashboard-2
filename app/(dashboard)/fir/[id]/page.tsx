"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Edit, User, Users, FileText, Train, Scale,
  Building, MapPin, RefreshCw, AlertCircle, Calendar,
  Clock, Phone, CreditCard, Gavel, Shield, Eye
} from "lucide-react"

interface FIRDetails {
  id: number
  fir_number: string
  case_status: string
  accused_type: string
  state_name: string
  zone_name: string
  district_name: string
  thana_name: string
  court_name: string
  incident_date: string
  incident_time: string
  created_at: string
  updated_at: string
  brief_description: string
  law_sections_text: string
  train_number_manual: string
  train_name_manual: string
  station_code: string
  station_name_manual: string
  property_stolen: string
  estimated_value: number
  io_name: string
  io_belt_no: string
  io_rank: string
  io_mobile: string
  lawyer_name: string
  bar_council_no: string
  lawyer_mobile: string
  lawyer_email: string
}

interface AccusedDetails {
  id: number
  fir_id: number
  name: string
  father_name?: string
  age?: number | string
  gender?: string
  mobile?: string
  aadhaar?: string
  pan?: string
  email?: string
  full_address?: string
  state_name?: string
  district_name?: string
  pin_code?: string
  accused_type?: string
}

interface BailerDetails {
  id: number
  fir_id: number
  name: string
  father_name?: string
  age?: number | string
  gender?: string
  mobile?: string
  aadhaar?: string
  pan?: string
  email?: string
  full_address?: string
  state_name?: string
  district_name?: string
  pin_code?: string
  accused_id?: number
  accused_name?: string
}

interface HearingDetails {
  id: number
  fir_id: number
  hearing_date: string
  hearing_time?: string
  court_name?: string
  purpose?: string
  status?: string
  remarks?: string
}

export default function FIRDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const firId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [fir, setFir] = useState<FIRDetails | null>(null)
  const [accusedList, setAccusedList] = useState<AccusedDetails[]>([])
  const [bailerList, setBailerList] = useState<BailerDetails[]>([])
  const [hearingList, setHearingList] = useState<HearingDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (firId) {
      loadFIRDetails()
    }
  }, [firId])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        console.log("No user found, redirecting to login")
        router.push('/login')
        return
      }
      setUser(currentUser)
    } catch (err) {
      console.error("User load error:", err)
    }
  }

  const loadFIRDetails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("📋 Loading FIR details for ID:", firId)

      // 1. Load FIR record
      const { data: firData, error: firError } = await supabase
        .from("fir_records")
        .select("*")
        .eq("id", firId)
        .single()

      if (firError) {
        console.error("❌ FIR fetch error:", firError)
        throw new Error(firError.message || "Failed to load FIR")
      }

      if (!firData) {
        throw new Error("FIR not found")
      }

      console.log("✅ FIR loaded:", firData.fir_number)
      setFir(firData)

      // 2. Load accused persons
      console.log("📋 Loading accused...")
      const { data: accusedData, error: accusedError } = await supabase
        .from("accused_details")
        .select("*")
        .eq("fir_id", firId)
        .order("created_at", { ascending: false })

      if (accusedError) {
        console.error("⚠️ Accused fetch error:", accusedError)
        setAccusedList([])
      } else {
        console.log("✅ Accused loaded:", accusedData?.length || 0)
        setAccusedList(accusedData || [])
      }

      // 3. Load bailer details
      console.log("📋 Loading bailers...")
      const { data: bailerData, error: bailerError } = await supabase
        .from("bailer_details")
        .select("*")
        .eq("fir_id", firId)
        .order("created_at", { ascending: false })

      if (bailerError) {
        console.error("⚠️ Bailer fetch error:", bailerError)
        setBailerList([])
      } else {
        console.log("✅ Bailers loaded:", bailerData?.length || 0)
        
        // 🆕 Map accused names to bailers
        const bailersWithAccused = (bailerData || []).map(bailer => {
          if (bailer.accused_id && accusedData) {
            const accused = accusedData.find(a => a.id === bailer.accused_id)
            return {
              ...bailer,
              accused_name: accused?.name || bailer.accused_name || null
            }
          }
          return bailer
        })
        
        setBailerList(bailersWithAccused)
      }

      // 4. Load hearing history
      console.log("📋 Loading hearings...")
      const { data: hearingData, error: hearingError } = await supabase
        .from("hearing_history")
        .select("*")
        .eq("fir_id", firId)
        .order("hearing_date", { ascending: false })

      if (hearingError) {
        console.error("⚠️ Hearing fetch error:", hearingError)
        setHearingList([])
      } else {
        console.log("✅ Hearings loaded:", hearingData?.length || 0)
        setHearingList(hearingData || [])
      }

      console.log("✅ All data loaded successfully!")

    } catch (err: any) {
      console.error("❌ Error loading FIR details:", err)
      setError(err.message || "Failed to load FIR details")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firId, supabase])

  const handleRefresh = () => {
    loadFIRDetails(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      open: { color: "bg-orange-100 text-orange-700", label: "OPEN" },
      registered: { color: "bg-blue-100 text-blue-700", label: "REGISTERED" },
      under_investigation: { color: "bg-yellow-100 text-yellow-700", label: "UNDER INVESTIGATION" },
      chargesheet_filed: { color: "bg-purple-100 text-purple-700", label: "CHARGESHEET FILED" },
      in_court: { color: "bg-indigo-100 text-indigo-700", label: "IN COURT" },
      closed: { color: "bg-gray-100 text-gray-700", label: "CLOSED" },
      disposed: { color: "bg-green-100 text-green-700", label: "DISPOSED" },
    }

    const key = status?.toLowerCase().replace(/ /g, "_") || "open"
    const config = statusConfig[key] || { color: "bg-gray-100 text-gray-700", label: status || "UNKNOWN" }
    return <Badge className={`${config.color} font-semibold border`}>{config.label}</Badge>
  }

  const getAccusedTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      unknown: { color: "bg-gray-100 text-gray-700 border-gray-300", label: "UNKNOWN" },
      known: { color: "bg-blue-100 text-blue-700 border-blue-300", label: "KNOWN" },
      arrested: { color: "bg-red-100 text-red-700 border-red-300", label: "ARRESTED" },
      absconding: { color: "bg-orange-100 text-orange-700 border-orange-300", label: "ABSCONDING" },
      bailed: { color: "bg-green-100 text-green-700 border-green-300", label: "BAILED" }
    }
    const key = type?.toLowerCase() || "unknown"
    const item = config[key] || config.unknown
    return <Badge className={`${item.color} text-xs border`}>{item.label}</Badge>
  }

  const goToEditFIR = () => router.push(`/fir/${firId}/edit`)
  const goBack = () => router.push("/search")

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading FIR Details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !fir) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-red-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="font-semibold text-lg mb-2 text-gray-800">
              {error ? "Error Loading FIR" : "FIR Not Found"}
            </p>
            <p className="text-sm text-gray-600 mb-4">{error || `FIR with ID ${firId} not found`}</p>
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
                    FIR: {fir.fir_number}
                  </h1>
                  {getStatusBadge(fir.case_status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(fir.incident_date)}
                  </span>
                  {fir.incident_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fir.incident_time}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "details", label: "Case Details", icon: FileText },
              { id: "accused", label: `Accused (${accusedList.length})`, icon: Users },
              { id: "bailer", label: `Bailers (${bailerList.length})`, icon: User },
              { id: "hearings", label: `Hearings (${hearingList.length})`, icon: Gavel },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Basic Details */}
            <Card className="border-2">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Basic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">FIR Number</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.fir_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">State</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.state_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Zone</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.zone_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">District</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.district_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Thana</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.thana_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Court</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.court_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Sections</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.law_sections_text || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Accused Type</p>
                    <p className="font-semibold text-gray-800 mt-1">{fir.accused_type?.toUpperCase() || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {fir.brief_description && (
              <Card className="border-2">
                <CardHeader className="bg-gray-50 border-b pb-3">
                  <CardTitle className="text-base">Case Description</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{fir.brief_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Train Details */}
            {(fir.train_number_manual || fir.station_code) && (
              <Card className="border-2">
                <CardHeader className="bg-gray-50 border-b pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Train className="h-4 w-4 text-blue-600" />
                    Train & Station Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Train Number</p>
                      <p className="font-semibold text-gray-800 mt-1">{fir.train_number_manual || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Train Name</p>
                      <p className="font-semibold text-gray-800 mt-1">{fir.train_name_manual || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Station Code</p>
                      <p className="font-semibold text-gray-800 mt-1">{fir.station_code || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Station Name</p>
                      <p className="font-semibold text-gray-800 mt-1">{fir.station_name_manual || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ACCUSED TAB - TABLE FORMAT */}
        {activeTab === "accused" && (
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-red-600" />
                Accused Persons ({accusedList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {accusedList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No accused persons added</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100 border-b-2">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">#</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">NAME</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">FATHER'S NAME</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">AGE/GENDER</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">STATUS</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">MOBILE</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">AADHAAR</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">PAN</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">EMAIL</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">ADDRESS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {accusedList.map((accused, index) => (
                        <tr key={accused.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3 font-medium text-gray-800">{accused.name || "Unknown"}</td>
                          <td className="px-3 py-3">{accused.father_name || "-"}</td>
                          <td className="px-3 py-3">
                            {accused.age || "-"} / {accused.gender || "-"}
                          </td>
                          <td className="px-3 py-3">
                            {getAccusedTypeBadge(accused.accused_type || "unknown")}
                          </td>
                          <td className="px-3 py-3">
                            {accused.mobile ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-green-600" />
                                {accused.mobile}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">{accused.aadhaar || "-"}</td>
                          <td className="px-3 py-3 font-mono text-xs">{accused.pan || "-"}</td>
                          <td className="px-3 py-3 text-xs">{accused.email || "-"}</td>
                          <td className="px-3 py-3 max-w-xs">
                            <p className="truncate text-xs">{accused.full_address || "-"}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* BAILERS TAB - TABLE FORMAT WITH ACCUSED NAME */}
        {activeTab === "bailer" && (
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Bailer Details ({bailerList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {bailerList.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No bailers added</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100 border-b-2">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">#</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">NAME</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">FATHER'S NAME</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">BAILER FOR (ACCUSED)</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">AGE/GENDER</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">MOBILE</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">AADHAAR</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">PAN</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">EMAIL</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">ADDRESS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {bailerList.map((bailer, index) => (
                        <tr key={bailer.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3 font-medium text-gray-800">{bailer.name || "N/A"}</td>
                          <td className="px-3 py-3">{bailer.father_name || "-"}</td>
                          <td className="px-3 py-3">
                            {bailer.accused_name ? (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                {bailer.accused_name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Not Linked</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {bailer.age || "-"} / {bailer.gender || "-"}
                          </td>
                          <td className="px-3 py-3">
                            {bailer.mobile ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-green-600" />
                                {bailer.mobile}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">{bailer.aadhaar || "-"}</td>
                          <td className="px-3 py-3 font-mono text-xs">{bailer.pan || "-"}</td>
                          <td className="px-3 py-3 text-xs">{bailer.email || "-"}</td>
                          <td className="px-3 py-3 max-w-xs">
                            <p className="truncate text-xs">{bailer.full_address || "-"}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* HEARINGS TAB - TABLE FORMAT */}
        {activeTab === "hearings" && (
          <Card className="border-2">
            <CardHeader className="bg-gray-50 border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gavel className="h-4 w-4 text-purple-600" />
                Hearing History ({hearingList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {hearingList.length === 0 ? (
                <div className="text-center py-12">
                  <Gavel className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No hearings scheduled</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100 border-b-2">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">#</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">DATE</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">TIME</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">COURT</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">PURPOSE</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">STATUS</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-700">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {hearingList.map((hearing, index) => (
                        <tr key={hearing.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3 font-medium">{formatDate(hearing.hearing_date)}</td>
                          <td className="px-3 py-3">{hearing.hearing_time || "-"}</td>
                          <td className="px-3 py-3">{hearing.court_name || "-"}</td>
                          <td className="px-3 py-3">{hearing.purpose || "-"}</td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="text-xs">
                              {hearing.status || "Scheduled"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{hearing.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}