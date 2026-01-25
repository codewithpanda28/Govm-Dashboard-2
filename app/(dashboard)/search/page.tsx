"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Users
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface SearchResult {
  type: "accused" | "bailer"
  id: number
  name: string
  mobile: string | null
  aadhar: string | null
  totalCases: number
  bailCount: number
  custodyCount: number
  abscondingCount: number
  isHabitual: boolean
}

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"all" | "accused" | "bailer">("all")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)
    setResults([])

    try {
      const query = searchQuery.trim()
      
      // Search Accused Persons
      if (searchType === "all" || searchType === "accused") {
        const { data: accusedData, error: accusedError } = await supabase
          .from("accused_persons")
          .select(`
            id,
            full_name,
            mobile_number,
            aadhar_number,
            is_habitual_offender,
            fir_id
          `)
          .or(`mobile_number.ilike.%${query}%,aadhar_number.ilike.%${query}%,full_name.ilike.%${query}%`)

        if (accusedData && accusedData.length > 0) {
          // Get bail details for each accused
          for (const accused of accusedData) {
            const { data: bailData } = await supabase
              .from("bail_details")
              .select("custody_status")
              .eq("accused_id", accused.id)

            const bailCount = bailData?.filter(b => b.custody_status === "bail").length || 0
            const custodyCount = bailData?.filter(b => b.custody_status === "custody").length || 0
            const abscondingCount = bailData?.filter(b => b.custody_status === "absconding").length || 0

            // Count total FIRs for this person (by mobile or aadhar)
            let totalFirs = 1
            if (accused.mobile_number || accused.aadhar_number) {
              const { count } = await supabase
                .from("accused_persons")
                .select("*", { count: "exact", head: true })
                .or(`mobile_number.eq.${accused.mobile_number},aadhar_number.eq.${accused.aadhar_number}`)

              totalFirs = count || 1
            }

            setResults(prev => [...prev, {
              type: "accused",
              id: accused.id,
              name: accused.full_name,
              mobile: accused.mobile_number,
              aadhar: accused.aadhar_number,
              totalCases: totalFirs,
              bailCount,
              custodyCount,
              abscondingCount,
              isHabitual: accused.is_habitual_offender,
            }])
          }
        }
      }

      // Search Bailers
      if (searchType === "all" || searchType === "bailer") {
        const { data: bailerData, error: bailerError } = await supabase
          .from("bail_details")
          .select(`
            id,
            bailer_name,
            bailer_mobile,
            accused_id
          `)
          .or(`bailer_mobile.ilike.%${query}%,bailer_name.ilike.%${query}%`)
          .not("bailer_name", "is", null)

        if (bailerData && bailerData.length > 0) {
          // Group by bailer mobile
          const bailerMap = new Map<string, any>()
          
          for (const bail of bailerData) {
            const key = bail.bailer_mobile || bail.bailer_name
            if (!bailerMap.has(key)) {
              bailerMap.set(key, {
                name: bail.bailer_name,
                mobile: bail.bailer_mobile,
                count: 1,
                accusedIds: [bail.accused_id]
              })
            } else {
              const existing = bailerMap.get(key)
              existing.count++
              if (!existing.accusedIds.includes(bail.accused_id)) {
                existing.accusedIds.push(bail.accused_id)
              }
            }
          }

          for (const [key, bailer] of bailerMap) {
            setResults(prev => [...prev, {
              type: "bailer",
              id: 0,
              name: bailer.name,
              mobile: bailer.mobile,
              aadhar: null,
              totalCases: bailer.count,
              bailCount: bailer.count,
              custodyCount: 0,
              abscondingCount: 0,
              isHabitual: bailer.count >= 3,
            }])
          }
        }
      }

    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🔍 Smart Search</h1>
          <p className="text-muted-foreground">
            Search accused, bailers by Mobile, Aadhar, or Name
          </p>
        </div>

        {/* Search Box */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter Mobile Number, Aadhar, or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="text-lg h-12"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg bg-background"
                >
                  <option value="all">All</option>
                  <option value="accused">Accused Only</option>
                  <option value="bailer">Bailers Only</option>
                </select>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading}
                  className="h-12 px-6"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Examples */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Try:</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery("9876543210")}
              >
                <Phone className="h-3 w-3 mr-1" />
                Mobile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery("123456789012")}
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Aadhar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery("Ramesh")}
              >
                <User className="h-3 w-3 mr-1" />
                Name
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Results ({results.length})
              </h2>
            </div>

            {results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">No results found</p>
                  <p className="text-muted-foreground">
                    Try different search terms
                  </p>
                </CardContent>
              </Card>
            ) : (
              results.map((result, index) => (
                <Card 
                  key={`${result.type}-${result.id}-${index}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (result.type === "accused") {
                      router.push(`/accused/${result.id}`)
                    } else {
                      router.push(`/bailer?mobile=${result.mobile}`)
                    }
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          result.type === "accused" 
                            ? "bg-red-100" 
                            : "bg-blue-100"
                        }`}>
                          {result.type === "accused" ? (
                            <User className="h-6 w-6 text-red-600" />
                          ) : (
                            <Users className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{result.name}</h3>
                            <Badge variant={result.type === "accused" ? "destructive" : "default"}>
                              {result.type === "accused" ? "ACCUSED" : "BAILER"}
                            </Badge>
                            {result.isHabitual && (
                              <Badge variant="warning">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                REPEAT
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            {result.mobile && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {result.mobile}
                              </span>
                            )}
                            {result.aadhar && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {result.aadhar}
                              </span>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap gap-3 mt-3">
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                              <FileText className="h-3 w-3" />
                              <span className="text-sm font-medium">
                                {result.totalCases} {result.type === "accused" ? "Cases" : "Times Bailed"}
                              </span>
                            </div>
                            {result.type === "accused" && (
                              <>
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded">
                                  <span className="text-sm font-medium text-green-700">
                                    Bail: {result.bailCount}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded">
                                  <span className="text-sm font-medium text-red-700">
                                    Custody: {result.custodyCount}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded">
                                  <span className="text-sm font-medium text-orange-700">
                                    Absconding: {result.abscondingCount}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}