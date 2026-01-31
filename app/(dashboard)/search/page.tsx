"use client"

import { useState } from "react"
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
  ArrowRight,
  Users,
  MapPin,
  RefreshCw,
  Shield,
  Filter,
  Clock,
  ChevronRight,
  UserCheck,
  UserX,
  Scale,
  Hash,
  Calendar
} from "lucide-react"
import { toast } from 'sonner'

interface SearchResult {
  type: "accused" | "bailer"
  id: number
  fir_id: number
  name: string
  father_name: string | null
  mobile: string | null
  aadhaar: string | null
  address: string | null
  accused_type?: string
  totalCases: number
  isRepeat: boolean
  fir_number?: string
  age?: string | number
  gender?: string
}

export default function SearchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"all" | "accused" | "bailer">("all")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter something to search')
      return
    }

    setLoading(true)
    setSearched(true)
    setResults([])

    try {
      const query = searchQuery.trim()
      const tempResults: SearchResult[] = []
      
      // ========== Search Accused ==========
      if (searchType === "all" || searchType === "accused") {
        console.log("🔍 Searching accused...")
        
        const { data: accusedData, error: accusedError } = await supabase
          .from("accused_details")
          .select(`
            id,
            fir_id,
            name,
            father_name,
            age,
            gender,
            mobile,
            aadhaar,
            full_address,
            accused_type
          `)
          .or(`mobile.ilike.%${query}%,aadhaar.ilike.%${query}%,name.ilike.%${query}%`)

        if (accusedError) {
          console.error("Accused search error:", accusedError)
        }

        if (accusedData && accusedData.length > 0) {
          console.log("✅ Found accused:", accusedData.length)
          
          // Get FIR numbers
          const firIds = [...new Set(accusedData.map(a => a.fir_id))]
          const { data: firsData } = await supabase
            .from("fir_records")
            .select("id, fir_number")
            .in("id", firIds)

          const firMap = new Map(firsData?.map(f => [f.id, f.fir_number]) || [])

          for (const accused of accusedData) {
            // Check repeat offender
            let totalCases = 1
            if (accused.mobile || accused.aadhaar) {
              const { count } = await supabase
                .from("accused_details")
                .select("*", { count: "exact", head: true })
                .or(`mobile.eq.${accused.mobile || ''},aadhaar.eq.${accused.aadhaar || ''}`)

              totalCases = count || 1
            }

            tempResults.push({
              type: "accused",
              id: accused.id,
              fir_id: accused.fir_id,
              name: accused.name || "Unknown",
              father_name: accused.father_name,
              age: accused.age,
              gender: accused.gender,
              mobile: accused.mobile,
              aadhaar: accused.aadhaar,
              address: accused.full_address,
              accused_type: accused.accused_type,
              totalCases,
              isRepeat: totalCases > 1,
              fir_number: firMap.get(accused.fir_id) || ""
            })
          }
        }
      }

      // ========== Search Bailers ==========
      if (searchType === "all" || searchType === "bailer") {
        console.log("🔍 Searching bailers...")
        
        const { data: bailerData, error: bailerError } = await supabase
          .from("bailer_details")
          .select(`
            id,
            fir_id,
            name,
            father_name,
            mobile,
            aadhaar,
            full_address
          `)
          .or(`mobile.ilike.%${query}%,aadhaar.ilike.%${query}%,name.ilike.%${query}%`)

        if (bailerError) {
          console.error("Bailer search error:", bailerError)
        }

        if (bailerData && bailerData.length > 0) {
          console.log("✅ Found bailers:", bailerData.length)

          const firIds = [...new Set(bailerData.map(b => b.fir_id))]
          const { data: firsData } = await supabase
            .from("fir_records")
            .select("id, fir_number")
            .in("id", firIds)

          const firMap = new Map(firsData?.map(f => [f.id, f.fir_number]) || [])

          // Group by mobile/aadhaar
          const bailerMap = new Map<string, any>()
          
          for (const bailer of bailerData) {
            const key = bailer.mobile || bailer.aadhaar || bailer.name || `id-${bailer.id}`
            
            if (!bailerMap.has(key)) {
              bailerMap.set(key, {
                ...bailer,
                count: 1,
                fir_numbers: [firMap.get(bailer.fir_id) || ""]
              })
            } else {
              const existing = bailerMap.get(key)
              existing.count++
              existing.fir_numbers.push(firMap.get(bailer.fir_id) || "")
            }
          }

          for (const [key, bailer] of bailerMap) {
            tempResults.push({
              type: "bailer",
              id: bailer.id,
              fir_id: bailer.fir_id,
              name: bailer.name || "Unknown",
              father_name: bailer.father_name,
              mobile: bailer.mobile,
              aadhaar: bailer.aadhaar,
              address: bailer.full_address,
              totalCases: bailer.count,
              isRepeat: bailer.count > 1,
              fir_number: bailer.fir_numbers[0]
            })
          }
        }
      }

      setResults(tempResults)
      
      if (tempResults.length === 0) {
        toast.info('No records found')
      } else {
        toast.success(`Found ${tempResults.length} records`)
      }
      
      console.log("✅ Total results:", tempResults.length)

    } catch (error) {
      console.error("Search error:", error)
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const getAccusedTypeConfig = (type: string | undefined) => {
    const config: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
      unknown: { 
        bg: "bg-gray-100", 
        text: "text-gray-700", 
        border: "border-gray-300",
        icon: User, 
        label: "UNKNOWN" 
      },
      known: { 
        bg: "bg-blue-100", 
        text: "text-blue-700", 
        border: "border-blue-300",
        icon: UserCheck, 
        label: "KNOWN" 
      },
      arrested: { 
        bg: "bg-red-100", 
        text: "text-red-700", 
        border: "border-red-300",
        icon: UserX, 
        label: "ARRESTED" 
      },
      absconding: { 
        bg: "bg-orange-100", 
        text: "text-orange-700", 
        border: "border-orange-300",
        icon: AlertTriangle, 
        label: "ABSCONDING" 
      },
      bailed: { 
        bg: "bg-green-100", 
        text: "text-green-700", 
        border: "border-green-300",
        icon: Scale, 
        label: "BAILED" 
      },
    }
    return config[type?.toLowerCase() || "unknown"] || config.unknown
  }

  const accusedCount = results.filter(r => r.type === "accused").length
  const bailerCount = results.filter(r => r.type === "bailer").length

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Compact Header */}
        {/* <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Search Records</h1>
              <p className="text-muted-foreground text-sm">
                Search accused & bailers by mobile, aadhaar or name
              </p>
            </div>
          </div>
        </div> */}

        {/* Search Box */}
        <Card className="border-2 mb-6">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Input Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter mobile, aadhaar, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg bg-background text-sm"
                >
                  <option value="all">All Records</option>
                  <option value="accused">Accused Only</option>
                  <option value="bailer">Bailers Only</option>
                </select>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading || !searchQuery.trim()}
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
              </div>

              {/* Quick Examples */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground font-medium">QUICK:</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchQuery("9876543210")}
                  className="h-7 text-xs"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Mobile
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchQuery("123456789012")}
                  className="h-7 text-xs"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Aadhaar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchQuery("Ramesh")}
                  className="h-7 text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Name
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searched && (
          <>
            {/* Results Summary */}
            {results.length > 0 && !loading && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Found {results.length} Records
                </h2>
                <div className="flex gap-2">
                  <Badge className="bg-red-100 text-red-700 border-red-300 border">
                    <User className="h-3 w-3 mr-1" />
                    {accusedCount} Accused
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 border">
                    <Users className="h-3 w-3 mr-1" />
                    {bailerCount} Bailers
                  </Badge>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Searching records...</p>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {!loading && results.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="font-semibold">No Results Found</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Try searching with different keywords
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results Grid */}
            {!loading && results.length > 0 && (
              <div className="grid gap-4">
                {results.map((result, index) => {
                  const typeConfig = result.type === "accused" 
                    ? getAccusedTypeConfig(result.accused_type)
                    : null

                  return (
                    <Card 
                      key={`${result.type}-${result.id}-${index}`}
                      className="border-2 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => router.push(`/fir/${result.fir_id}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-lg ${
                            result.type === "accused" 
                              ? "bg-red-100" 
                              : "bg-blue-100"
                          }`}>
                            {result.type === "accused" ? (
                              <User className="h-5 w-5 text-red-600" />
                            ) : (
                              <Users className="h-5 w-5 text-blue-600" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-3">
                            {/* Header Row */}
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-lg">
                                    {result.name}
                                  </h3>
                                  <Badge 
                                    variant={result.type === "accused" ? "destructive" : "default"}
                                  >
                                    {result.type === "accused" ? "ACCUSED" : "BAILER"}
                                  </Badge>
                                  {result.type === "accused" && typeConfig && (
                                    <Badge className={`${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} border`}>
                                      <typeConfig.icon className="h-3 w-3 mr-1" />
                                      {typeConfig.label}
                                    </Badge>
                                  )}
                                  {result.isRepeat && (
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 border">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      REPEAT ({result.totalCases})
                                    </Badge>
                                  )}
                                </div>
                                {(result.father_name || result.age) && (
                                  <p className="text-sm text-muted-foreground">
                                    {result.father_name && `S/o ${result.father_name}`}
                                    {result.age && ` • Age: ${result.age}`}
                                    {result.gender && ` • ${result.gender}`}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Details Grid */}
                            <div className="flex flex-wrap gap-3">
                              {result.mobile && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-green-600" />
                                  <span>{result.mobile}</span>
                                </div>
                              )}
                              {result.aadhaar && (
                                <div className="flex items-center gap-2 text-sm">
                                  <CreditCard className="h-4 w-4 text-blue-600" />
                                  <span>****{result.aadhaar.slice(-4)}</span>
                                </div>
                              )}
                              {result.fir_number && (
                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="h-4 w-4 text-orange-600" />
                                  <span>FIR: {result.fir_number}</span>
                                </div>
                              )}
                              {result.address && (
                                <div className="flex items-center gap-2 text-sm flex-1">
                                  <MapPin className="h-4 w-4 text-gray-600" />
                                  <span className="text-muted-foreground truncate">
                                    {result.address}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Initial State */}
        {!searched && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold mb-2">Start Your Search</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Enter a mobile number, aadhaar number, or name to search across all records
              </p>
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-muted-foreground">Accused</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-muted-foreground">Bailers</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}