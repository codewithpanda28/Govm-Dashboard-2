"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  User, 
  Phone, 
  CreditCard, 
  FileText,
  AlertTriangle,
  Users,
  MapPin,
  RefreshCw,
  ChevronRight,
  UserCheck,
  UserX,
  Scale,
  X,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  Link2,
  Mail
} from "lucide-react"
import { toast } from 'sonner'

interface PreviousCase {
  fir_id: number
  fir_number: string
  district_name: string
  thana_name: string
  case_status: string
  incident_date: string
  role: string
}

interface AccusedResult {
  id: number
  fir_id: number
  name: string
  father_name: string | null
  age: string | number | null
  gender: string | null
  mobile: string | null
  aadhaar: string | null
  pan: string | null
  email: string | null
  full_address: string | null
  accused_type: string | null
  fir_number?: string
  district_name?: string
  thana_name?: string
  incident_date?: string
  case_status?: string
  previousCases?: PreviousCase[]
}

interface BailerResult {
  id: number
  fir_id: number
  accused_id: number | null
  accused_name: string | null
  name: string
  father_name: string | null
  age: string | number | null
  gender: string | null
  mobile: string | null
  aadhaar: string | null
  pan: string | null
  email: string | null
  full_address: string | null
  fir_number?: string
  district_name?: string
  thana_name?: string
  incident_date?: string
  case_status?: string
  previousCases?: PreviousCase[]
}

interface FIRRecord {
  id: number
  fir_number: string
  case_status: string
  incident_date: string
  state_name: string
  district_name: string
  thana_name: string
  accused_type: string
  created_at: string
  accusedCount?: number
  bailerCount?: number
}

// Modal Component
const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"all" | "accused" | "bailer">("all")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // Search Results
  const [accusedResults, setAccusedResults] = useState<AccusedResult[]>([])
  const [bailerResults, setBailerResults] = useState<BailerResult[]>([])
  
  // Expanded History States for Search
  const [expandedSearchAccused, setExpandedSearchAccused] = useState<number | null>(null)
  const [expandedSearchBailer, setExpandedSearchBailer] = useState<number | null>(null)
  
  // FIR List States
  const [firList, setFirList] = useState<FIRRecord[]>([])
  const [firLoading, setFirLoading] = useState(true)

  // Modal States
  const [accusedModalOpen, setAccusedModalOpen] = useState(false)
  const [bailerModalOpen, setBailerModalOpen] = useState(false)
  const [selectedFir, setSelectedFir] = useState<FIRRecord | null>(null)
  const [accusedList, setAccusedList] = useState<AccusedResult[]>([])
  const [bailerList, setBailerList] = useState<BailerResult[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  // Expanded History States for Modal
  const [expandedAccused, setExpandedAccused] = useState<number | null>(null)
  const [expandedBailer, setExpandedBailer] = useState<number | null>(null)

  useEffect(() => {
    loadFIRList()
  }, [])

  const loadFIRList = async () => {
    try {
      setFirLoading(true)
      
      const { data: firs, error } = await supabase
        .from("fir_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("FIR load error:", error)
        toast.error("Failed to load FIRs")
        return
      }

      const { data: accusedCounts } = await supabase
        .from("accused_details")
        .select("fir_id")

      const { data: bailerCounts } = await supabase
        .from("bailer_details")
        .select("fir_id")

      const accusedCountMap = new Map<number, number>()
      const bailerCountMap = new Map<number, number>()

      accusedCounts?.forEach(a => {
        accusedCountMap.set(a.fir_id, (accusedCountMap.get(a.fir_id) || 0) + 1)
      })

      bailerCounts?.forEach(b => {
        bailerCountMap.set(b.fir_id, (bailerCountMap.get(b.fir_id) || 0) + 1)
      })

      const firsWithCounts = (firs || []).map(fir => ({
        ...fir,
        accusedCount: accusedCountMap.get(fir.id) || 0,
        bailerCount: bailerCountMap.get(fir.id) || 0
      }))

      setFirList(firsWithCounts)
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setFirLoading(false)
    }
  }

  // Get Previous Cases for a person
  const getPreviousCases = async (mobile: string | null, aadhaar: string | null, currentFirId: number, personType: 'accused' | 'bailer') => {
    const previousCases: PreviousCase[] = []

    if (!mobile && !aadhaar) return previousCases

    try {
      // Check in accused_details
      let accusedQuery = supabase
        .from("accused_details")
        .select("fir_id")
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        accusedQuery = accusedQuery.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        accusedQuery = accusedQuery.eq("mobile", mobile)
      } else if (aadhaar) {
        accusedQuery = accusedQuery.eq("aadhaar", aadhaar)
      }

      const { data: accusedRecords } = await accusedQuery

      if (accusedRecords && accusedRecords.length > 0) {
        const firIds = [...new Set(accusedRecords.map(a => a.fir_id))]
        const { data: firs } = await supabase
          .from("fir_records")
          .select("id, fir_number, district_name, thana_name, case_status, incident_date")
          .in("id", firIds)

        firs?.forEach(f => {
          previousCases.push({
            fir_id: f.id,
            fir_number: f.fir_number,
            district_name: f.district_name,
            thana_name: f.thana_name,
            case_status: f.case_status,
            incident_date: f.incident_date,
            role: "Accused"
          })
        })
      }

      // Check in bailer_details
      let bailerQuery = supabase
        .from("bailer_details")
        .select("fir_id")
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        bailerQuery = bailerQuery.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        bailerQuery = bailerQuery.eq("mobile", mobile)
      } else if (aadhaar) {
        bailerQuery = bailerQuery.eq("aadhaar", aadhaar)
      }

      const { data: bailerRecords } = await bailerQuery

      if (bailerRecords && bailerRecords.length > 0) {
        const firIds = [...new Set(bailerRecords.map(b => b.fir_id))]
        const { data: firs } = await supabase
          .from("fir_records")
          .select("id, fir_number, district_name, thana_name, case_status, incident_date")
          .in("id", firIds)

        firs?.forEach(f => {
          // Avoid duplicates
          if (!previousCases.find(pc => pc.fir_id === f.id)) {
            previousCases.push({
              fir_id: f.id,
              fir_number: f.fir_number,
              district_name: f.district_name,
              thana_name: f.thana_name,
              case_status: f.case_status,
              incident_date: f.incident_date,
              role: "Bailer"
            })
          }
        })
      }
    } catch (err) {
      console.error("Error getting previous cases:", err)
    }

    return previousCases
  }

  // Search Handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter something to search')
      return
    }

    setLoading(true)
    setSearched(true)
    setAccusedResults([])
    setBailerResults([])
    setExpandedSearchAccused(null)
    setExpandedSearchBailer(null)

    try {
      const query = searchQuery.trim()
      
      // Search Accused
      if (searchType === "all" || searchType === "accused") {
        const { data: accusedData } = await supabase
          .from("accused_details")
          .select("*")
          .or(`mobile.ilike.%${query}%,aadhaar.ilike.%${query}%,name.ilike.%${query}%`)

        if (accusedData && accusedData.length > 0) {
          // Get FIR details
          const firIds = [...new Set(accusedData.map(a => a.fir_id))]
          const { data: firsData } = await supabase
            .from("fir_records")
            .select("id, fir_number, district_name, thana_name, incident_date, case_status")
            .in("id", firIds)

          const firMap = new Map(firsData?.map(f => [f.id, f]) || [])

          // Get previous cases for each accused
          const accusedWithHistory: AccusedResult[] = []
          
          for (const acc of accusedData) {
            const fir = firMap.get(acc.fir_id)
            const previousCases = await getPreviousCases(acc.mobile, acc.aadhaar, acc.fir_id, 'accused')
            
            accusedWithHistory.push({
              ...acc,
              fir_number: fir?.fir_number,
              district_name: fir?.district_name,
              thana_name: fir?.thana_name,
              incident_date: fir?.incident_date,
              case_status: fir?.case_status,
              previousCases
            })
          }

          setAccusedResults(accusedWithHistory)
        }
      }

      // Search Bailers
      if (searchType === "all" || searchType === "bailer") {
        const { data: bailerData } = await supabase
          .from("bailer_details")
          .select("*")
          .or(`mobile.ilike.%${query}%,aadhaar.ilike.%${query}%,name.ilike.%${query}%`)

        if (bailerData && bailerData.length > 0) {
          // Get FIR details
          const firIds = [...new Set(bailerData.map(b => b.fir_id))]
          const { data: firsData } = await supabase
            .from("fir_records")
            .select("id, fir_number, district_name, thana_name, incident_date, case_status")
            .in("id", firIds)

          const firMap = new Map(firsData?.map(f => [f.id, f]) || [])

          // Get accused names for bailers
          const { data: accusedData } = await supabase
            .from("accused_details")
            .select("id, name")
            .in("fir_id", firIds)

          const accusedMap = new Map(accusedData?.map(a => [a.id, a.name]) || [])

          // Get previous cases for each bailer
          const bailersWithHistory: BailerResult[] = []
          
          for (const bailer of bailerData) {
            const fir = firMap.get(bailer.fir_id)
            const previousCases = await getPreviousCases(bailer.mobile, bailer.aadhaar, bailer.fir_id, 'bailer')
            
            bailersWithHistory.push({
              ...bailer,
              accused_name: bailer.accused_id ? accusedMap.get(bailer.accused_id) || bailer.accused_name : bailer.accused_name,
              fir_number: fir?.fir_number,
              district_name: fir?.district_name,
              thana_name: fir?.thana_name,
              incident_date: fir?.incident_date,
              case_status: fir?.case_status,
              previousCases
            })
          }

          setBailerResults(bailersWithHistory)
        }
      }

      const totalResults = (searchType === "all" || searchType === "accused" ? accusedResults.length : 0) + 
                          (searchType === "all" || searchType === "bailer" ? bailerResults.length : 0)
      
      if (accusedResults.length === 0 && bailerResults.length === 0) {
        // Will be set after state updates
      }

    } catch (error) {
      console.error("Search error:", error)
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  // After search completes, show toast
  useEffect(() => {
    if (searched && !loading) {
      const total = accusedResults.length + bailerResults.length
      if (total === 0) {
        toast.info('No records found')
      } else {
        toast.success(`Found ${total} records`)
      }
    }
  }, [searched, loading, accusedResults.length, bailerResults.length])

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearched(false)
    setAccusedResults([])
    setBailerResults([])
    setExpandedSearchAccused(null)
    setExpandedSearchBailer(null)
  }

  // Load Accused for a FIR
  const loadAccusedForFIR = async (fir: FIRRecord) => {
    setSelectedFir(fir)
    setModalLoading(true)
    setAccusedModalOpen(true)
    setExpandedAccused(null)

    try {
      const { data: accused } = await supabase
        .from("accused_details")
        .select("*")
        .eq("fir_id", fir.id)

      const accusedWithHistory: AccusedResult[] = []

      for (const acc of accused || []) {
        const previousCases = await getPreviousCases(acc.mobile, acc.aadhaar, fir.id, 'accused')
        accusedWithHistory.push({
          ...acc,
          fir_number: fir.fir_number,
          district_name: fir.district_name,
          thana_name: fir.thana_name,
          incident_date: fir.incident_date,
          case_status: fir.case_status,
          previousCases
        })
      }

      setAccusedList(accusedWithHistory)
    } catch (err) {
      console.error("Error loading accused:", err)
      toast.error("Failed to load accused details")
    } finally {
      setModalLoading(false)
    }
  }

  // Load Bailers for a FIR
  const loadBailersForFIR = async (fir: FIRRecord) => {
    setSelectedFir(fir)
    setModalLoading(true)
    setBailerModalOpen(true)
    setExpandedBailer(null)

    try {
      const { data: bailers } = await supabase
        .from("bailer_details")
        .select("*")
        .eq("fir_id", fir.id)

      const { data: accused } = await supabase
        .from("accused_details")
        .select("id, name")
        .eq("fir_id", fir.id)

      const accusedMap = new Map(accused?.map(a => [a.id, a.name]) || [])

      const bailersWithHistory: BailerResult[] = []

      for (const bailer of bailers || []) {
        const previousCases = await getPreviousCases(bailer.mobile, bailer.aadhaar, fir.id, 'bailer')
        bailersWithHistory.push({
          ...bailer,
          accused_name: bailer.accused_id ? accusedMap.get(bailer.accused_id) || bailer.accused_name : bailer.accused_name,
          fir_number: fir.fir_number,
          district_name: fir.district_name,
          thana_name: fir.thana_name,
          incident_date: fir.incident_date,
          case_status: fir.case_status,
          previousCases
        })
      }

      setBailerList(bailersWithHistory)
    } catch (err) {
      console.error("Error loading bailers:", err)
      toast.error("Failed to load bailer details")
    } finally {
      setModalLoading(false)
    }
  }

  const getAccusedTypeConfig = (type: string | undefined) => {
    const config: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
      unknown: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", icon: User, label: "UNKNOWN" },
      known: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: UserCheck, label: "KNOWN" },
      arrested: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: UserX, label: "ARRESTED" },
      absconding: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: AlertTriangle, label: "ABSCONDING" },
      bailed: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", icon: Scale, label: "BAILED" },
    }
    return config[type?.toLowerCase() || "unknown"] || config.unknown
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase().replace(/ /g, "_") || "open"
    const config: Record<string, { bg: string; text: string; label: string }> = {
      open: { bg: "bg-orange-100", text: "text-orange-700", label: "OPEN" },
      registered: { bg: "bg-blue-100", text: "text-blue-700", label: "REGISTERED" },
      under_investigation: { bg: "bg-yellow-100", text: "text-yellow-700", label: "INVESTIGATING" },
      chargesheet_filed: { bg: "bg-purple-100", text: "text-purple-700", label: "CHARGESHEET" },
      in_court: { bg: "bg-indigo-100", text: "text-indigo-700", label: "IN COURT" },
      closed: { bg: "bg-gray-100", text: "text-gray-700", label: "CLOSED" },
      disposed: { bg: "bg-green-100", text: "text-green-700", label: "DISPOSED" }
    }
    const { bg, text, label } = config[statusLower] || config.open
    return <Badge className={`${bg} ${text}`}>{label}</Badge>
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    } catch {
      return dateStr
    }
  }

  // Accused Table Component (reusable)
  const AccusedTable = ({ 
    data, 
    expandedId, 
    setExpandedId,
    showFirDetails = false 
  }: { 
    data: AccusedResult[], 
    expandedId: number | null, 
    setExpandedId: (id: number | null) => void,
    showFirDetails?: boolean 
  }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100 border-b-2">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-bold">#</th>
            <th className="px-3 py-3 text-left text-xs font-bold">NAME</th>
            <th className="px-3 py-3 text-left text-xs font-bold">FATHER NAME</th>
            <th className="px-3 py-3 text-left text-xs font-bold">AGE/GENDER</th>
            <th className="px-3 py-3 text-left text-xs font-bold">STATUS</th>
            <th className="px-3 py-3 text-left text-xs font-bold">MOBILE</th>
            <th className="px-3 py-3 text-left text-xs font-bold">AADHAAR</th>
            {showFirDetails && (
              <>
                <th className="px-3 py-3 text-left text-xs font-bold">FIR NO.</th>
                <th className="px-3 py-3 text-left text-xs font-bold">DISTRICT/THANA</th>
              </>
            )}
            <th className="px-3 py-3 text-left text-xs font-bold">ADDRESS</th>
            <th className="px-3 py-3 text-center text-xs font-bold">HISTORY</th>
            <th className="px-3 py-3 text-center text-xs font-bold">ACTION</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((accused, idx) => {
            const typeConfig = getAccusedTypeConfig(accused.accused_type || "unknown")
            const hasHistory = accused.previousCases && accused.previousCases.length > 0
            const isExpanded = expandedId === accused.id

            return (
              <>
                <tr key={accused.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium">{accused.name}</td>
                  <td className="px-3 py-3">{accused.father_name || "-"}</td>
                  <td className="px-3 py-3">{accused.age || "-"} / {accused.gender || "-"}</td>
                  <td className="px-3 py-3">
                    <Badge className={`${typeConfig.bg} ${typeConfig.text} border ${typeConfig.border}`}>
                      {typeConfig.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {accused.mobile ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-green-600" />
                        {accused.mobile}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {accused.aadhaar || "-"}
                  </td>
                  {showFirDetails && (
                    <>
                      <td className="px-3 py-3 font-mono text-blue-600 font-semibold">
                        {accused.fir_number || "-"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div>{accused.district_name || "-"}</div>
                        <div className="text-gray-500">{accused.thana_name || "-"}</div>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-xs max-w-[150px] truncate">
                    {accused.full_address || "-"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasHistory ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        onClick={() => setExpandedId(isExpanded ? null : accused.id)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        {accused.previousCases!.length}
                        {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/fir/${accused.fir_id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
                {/* Expanded History Row */}
                {isExpanded && hasHistory && (
                  <tr>
                    <td colSpan={showFirDetails ? 13 : 11} className="px-3 py-3 bg-yellow-50">
                      <div className="pl-8">
                        <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Previous Cases ({accused.previousCases!.length}) - This person appeared in other cases
                        </p>
                        <table className="w-full text-xs border rounded">
                          <thead className="bg-yellow-100">
                            <tr>
                              <th className="px-2 py-2 text-left">FIR No.</th>
                              <th className="px-2 py-2 text-left">District</th>
                              <th className="px-2 py-2 text-left">Thana</th>
                              <th className="px-2 py-2 text-left">Date</th>
                              <th className="px-2 py-2 text-left">Role</th>
                              <th className="px-2 py-2 text-left">Status</th>
                              <th className="px-2 py-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y">
                            {accused.previousCases!.map((pc, pcIdx) => (
                              <tr key={pcIdx} className="hover:bg-gray-50">
                                <td className="px-2 py-2 font-mono font-semibold">{pc.fir_number}</td>
                                <td className="px-2 py-2">{pc.district_name}</td>
                                <td className="px-2 py-2">{pc.thana_name}</td>
                                <td className="px-2 py-2">{formatDate(pc.incident_date)}</td>
                                <td className="px-2 py-2">
                                  <Badge className={pc.role === "Accused" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                                    {pc.role}
                                  </Badge>
                                </td>
                                <td className="px-2 py-2">{getStatusBadge(pc.case_status)}</td>
                                <td className="px-2 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/fir/${pc.fir_id}`)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // Bailer Table Component (reusable)
  const BailerTable = ({ 
    data, 
    expandedId, 
    setExpandedId,
    showFirDetails = false 
  }: { 
    data: BailerResult[], 
    expandedId: number | null, 
    setExpandedId: (id: number | null) => void,
    showFirDetails?: boolean 
  }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100 border-b-2">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-bold">#</th>
            <th className="px-3 py-3 text-left text-xs font-bold">BAILER NAME</th>
            <th className="px-3 py-3 text-left text-xs font-bold">BAILER FOR (ACCUSED)</th>
            <th className="px-3 py-3 text-left text-xs font-bold">FATHER NAME</th>
            <th className="px-3 py-3 text-left text-xs font-bold">AGE/GENDER</th>
            <th className="px-3 py-3 text-left text-xs font-bold">MOBILE</th>
            <th className="px-3 py-3 text-left text-xs font-bold">AADHAAR</th>
            {showFirDetails && (
              <>
                <th className="px-3 py-3 text-left text-xs font-bold">FIR NO.</th>
                <th className="px-3 py-3 text-left text-xs font-bold">DISTRICT/THANA</th>
              </>
            )}
            <th className="px-3 py-3 text-left text-xs font-bold">ADDRESS</th>
            <th className="px-3 py-3 text-center text-xs font-bold">HISTORY</th>
            <th className="px-3 py-3 text-center text-xs font-bold">ACTION</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((bailer, idx) => {
            const hasHistory = bailer.previousCases && bailer.previousCases.length > 0
            const isExpanded = expandedId === bailer.id

            return (
              <>
                <tr key={bailer.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium">{bailer.name}</td>
                  <td className="px-3 py-3">
                    {bailer.accused_name ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300 border">
                        <Link2 className="h-3 w-3 mr-1" />
                        {bailer.accused_name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Not Linked</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{bailer.father_name || "-"}</td>
                  <td className="px-3 py-3">{bailer.age || "-"} / {bailer.gender || "-"}</td>
                  <td className="px-3 py-3">
                    {bailer.mobile ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-green-600" />
                        {bailer.mobile}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {bailer.aadhaar || "-"}
                  </td>
                  {showFirDetails && (
                    <>
                      <td className="px-3 py-3 font-mono text-blue-600 font-semibold">
                        {bailer.fir_number || "-"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div>{bailer.district_name || "-"}</div>
                        <div className="text-gray-500">{bailer.thana_name || "-"}</div>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-xs max-w-[150px] truncate">
                    {bailer.full_address || "-"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasHistory ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        onClick={() => setExpandedId(isExpanded ? null : bailer.id)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        {bailer.previousCases!.length}
                        {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/fir/${bailer.fir_id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
                {/* Expanded History Row */}
                {isExpanded && hasHistory && (
                  <tr>
                    <td colSpan={showFirDetails ? 12 : 10} className="px-3 py-3 bg-yellow-50">
                      <div className="pl-8">
                        <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Previous Cases ({bailer.previousCases!.length}) - This person appeared in other cases
                        </p>
                        <table className="w-full text-xs border rounded">
                          <thead className="bg-yellow-100">
                            <tr>
                              <th className="px-2 py-2 text-left">FIR No.</th>
                              <th className="px-2 py-2 text-left">District</th>
                              <th className="px-2 py-2 text-left">Thana</th>
                              <th className="px-2 py-2 text-left">Date</th>
                              <th className="px-2 py-2 text-left">Role</th>
                              <th className="px-2 py-2 text-left">Status</th>
                              <th className="px-2 py-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y">
                            {bailer.previousCases!.map((pc, pcIdx) => (
                              <tr key={pcIdx} className="hover:bg-gray-50">
                                <td className="px-2 py-2 font-mono font-semibold">{pc.fir_number}</td>
                                <td className="px-2 py-2">{pc.district_name}</td>
                                <td className="px-2 py-2">{pc.thana_name}</td>
                                <td className="px-2 py-2">{formatDate(pc.incident_date)}</td>
                                <td className="px-2 py-2">
                                  <Badge className={pc.role === "Accused" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                                    {pc.role}
                                  </Badge>
                                </td>
                                <td className="px-2 py-2">{getStatusBadge(pc.case_status)}</td>
                                <td className="px-2 py-2 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/fir/${pc.fir_id}`)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Search Box */}
        <Card className="border-2 mb-6">
          <CardHeader className="bg-gray-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search Accused & Bailers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Enter mobile, aadhaar, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 bg-white"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg bg-white text-sm"
                >
                  <option value="all">All Records</option>
                  <option value="accused">Accused Only</option>
                  <option value="bailer">Bailers Only</option>
                </select>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading || !searchQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
                {searched && (
                  <Button onClick={handleClearSearch} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500 font-medium">QUICK:</span>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("9876543210")} className="h-7 text-xs">
                  <Phone className="h-3 w-3 mr-1" />Mobile
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("123456789012")} className="h-7 text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />Aadhaar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("Ramesh")} className="h-7 text-xs">
                  <User className="h-3 w-3 mr-1" />Name
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searched && (
          <>
            {/* Loading */}
            {loading && (
              <Card className="border-2 mb-6">
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                  <p className="text-gray-500">Searching records...</p>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {!loading && accusedResults.length === 0 && bailerResults.length === 0 && (
              <Card className="border-2 border-dashed mb-6">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700">No Results Found</p>
                  <p className="text-sm text-gray-500 mt-1">Try searching with different keywords</p>
                </CardContent>
              </Card>
            )}

            {/* Accused Results Table */}
            {!loading && accusedResults.length > 0 && (
              <Card className="border-2 mb-6">
                <CardHeader className="bg-red-50 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-red-600" />
                    Accused Results ({accusedResults.length})
                    {accusedResults.some(a => a.previousCases && a.previousCases.length > 0) && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Repeat Offenders Found
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <AccusedTable 
                    data={accusedResults}
                    expandedId={expandedSearchAccused}
                    setExpandedId={setExpandedSearchAccused}
                    showFirDetails={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Bailer Results Table */}
            {!loading && bailerResults.length > 0 && (
              <Card className="border-2 mb-6">
                <CardHeader className="bg-blue-50 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Bailer Results ({bailerResults.length})
                    {bailerResults.some(b => b.previousCases && b.previousCases.length > 0) && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Multiple Cases Found
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <BailerTable 
                    data={bailerResults}
                    expandedId={expandedSearchBailer}
                    setExpandedId={setExpandedSearchBailer}
                    showFirDetails={true}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* FIR List Section */}
        {!searched && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                FIR List ({firList.length})
              </h2>
              <Button variant="outline" size="sm" onClick={loadFIRList} disabled={firLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${firLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {firLoading && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                  <p className="text-gray-500">Loading FIR records...</p>
                </CardContent>
              </Card>
            )}

            {!firLoading && firList.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700">No FIR Records</p>
                </CardContent>
              </Card>
            )}

            {!firLoading && firList.length > 0 && (
              <Card className="border-2">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b-2">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Sl</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">FIR No.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">State</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Dist</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">No. of Accused</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">No. of Bailer</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Date of FIR</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {firList.map((fir, index) => (
                          <tr key={fir.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                              {fir.fir_number}
                            </td>
                            <td className="px-4 py-3 text-sm">{fir.state_name || "-"}</td>
                            <td className="px-4 py-3 text-sm">{fir.district_name || "-"}</td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`${fir.accusedCount! > 0 ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (fir.accusedCount! > 0) {
                                    loadAccusedForFIR(fir)
                                  }
                                }}
                                disabled={fir.accusedCount === 0}
                              >
                                <User className="h-3 w-3 mr-1" />
                                {fir.accusedCount || 0}
                              </Button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`${fir.bailerCount! > 0 ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (fir.bailerCount! > 0) {
                                    loadBailersForFIR(fir)
                                  }
                                }}
                                disabled={fir.bailerCount === 0}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                {fir.bailerCount || 0}
                              </Button>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(fir.incident_date)}</td>
                            <td className="px-4 py-3 text-sm">{getStatusBadge(fir.case_status)}</td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/fir/${fir.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Accused Modal */}
        <Modal
          isOpen={accusedModalOpen}
          onClose={() => setAccusedModalOpen(false)}
          title={`Accused List - FIR: ${selectedFir?.fir_number || ''}`}
        >
          {modalLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-500">Loading accused details...</p>
            </div>
          ) : accusedList.length === 0 ? (
            <div className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No accused found</p>
            </div>
          ) : (
            <AccusedTable 
              data={accusedList}
              expandedId={expandedAccused}
              setExpandedId={setExpandedAccused}
              showFirDetails={false}
            />
          )}
        </Modal>

        {/* Bailer Modal */}
        <Modal
          isOpen={bailerModalOpen}
          onClose={() => setBailerModalOpen(false)}
          title={`Bailer List - FIR: ${selectedFir?.fir_number || ''}`}
        >
          {modalLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-500">Loading bailer details...</p>
            </div>
          ) : bailerList.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No bailers found</p>
            </div>
          ) : (
            <BailerTable 
              data={bailerList}
              expandedId={expandedBailer}
              setExpandedId={setExpandedBailer}
              showFirDetails={false}
            />
          )}
        </Modal>
      </div>
    </div>
  )
}