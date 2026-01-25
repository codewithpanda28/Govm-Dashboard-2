"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, Phone, MapPin, Calendar, ArrowLeft, AlertTriangle,
  User, CreditCard, FileText, Scale, Printer, Download
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function BailerProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mobile = searchParams.get("mobile")

  const [loading, setLoading] = useState(true)
  const [bailerInfo, setBailerInfo] = useState<any>(null)
  const [bailedPersons, setBailedPersons] = useState<any[]>([])

  useEffect(() => {
    if (mobile) {
      loadBailerProfile()
    }
  }, [mobile])

  const loadBailerProfile = async () => {
    setLoading(true)
    try {
      // Get all bail records by this bailer
      const { data: bailData, error } = await supabase
        .from("bail_details")
        .select(`
          *,
          accused:accused_persons(
            id, full_name, mobile_number, aadhar_number, age, gender, 
            photo_url, is_habitual_offender
          ),
          fir:fir_records(
            id, fir_number, incident_date, case_status,
            modus_operandi:modus_operandi(name),
            police_station:police_stations(name)
          )
        `)
        .eq("bailer_mobile", mobile)
        .order("created_at", { ascending: false })

      if (bailData && bailData.length > 0) {
        // Get bailer info from first record
        const first = bailData[0]
        setBailerInfo({
          name: first.bailer_name,
          mobile: first.bailer_mobile,
          relation: first.bailer_relation,
          address: first.bailer_address,
          district: first.bailer_district,
          state: first.bailer_state,
          age: first.bailer_age,
          gender: first.bailer_gender,
          parentage: first.bailer_parentage,
          totalBailed: bailData.length,
          uniquePersons: new Set(bailData.map(b => b.accused_id)).size,
          totalAmount: bailData.reduce((sum, b) => sum + (b.bail_amount || 0), 0),
        })

        setBailedPersons(bailData)
      }

    } catch (error) {
      console.error("Error loading bailer profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
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
          <p className="mt-4 text-muted-foreground">Loading bailer profile...</p>
        </div>
      </div>
    )
  }

  if (!bailerInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-lg font-semibold">Bailer not found</p>
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
            <h1 className="text-2xl font-bold">Bailer Profile</h1>
            <p className="text-muted-foreground">Who did this person bail?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bailer Info Card */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full mx-auto bg-blue-200 flex items-center justify-center">
                  <Users className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold mt-4">{bailerInfo.name}</h2>
                <p className="text-muted-foreground">Bailer</p>
                
                {bailerInfo.totalBailed >= 3 && (
                  <Badge variant="destructive" className="mt-2">
                    ⚠️ REPEAT BAILER ({bailerInfo.totalBailed} times)
                  </Badge>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{bailerInfo.mobile}</span>
                </div>
                {bailerInfo.age && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{bailerInfo.age} years, {bailerInfo.gender}</span>
                  </div>
                )}
                {bailerInfo.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {bailerInfo.address}
                      {bailerInfo.district && `, ${bailerInfo.district}`}
                      {bailerInfo.state && `, ${bailerInfo.state}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{bailerInfo.totalBailed}</p>
                  <p className="text-xs text-muted-foreground">Times Bailed</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{bailerInfo.uniquePersons}</p>
                  <p className="text-xs text-muted-foreground">Persons Bailed</p>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-white rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Bail Amount</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(bailerInfo.totalAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* People Bailed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                People Bailed ({bailedPersons.length})
              </CardTitle>
              <CardDescription>
                All accused persons bailed by {bailerInfo.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bailedPersons.map((bail, index) => (
                <div 
                  key={bail.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/accused/${bail.accused_id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Accused Photo */}
                    {bail.accused?.photo_url ? (
                      <img
                        src={bail.accused.photo_url}
                        alt={bail.accused.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{bail.accused?.full_name}</h3>
                        <Badge variant="outline">{bailerInfo.relation}</Badge>
                        {bail.accused?.is_habitual_offender && (
                          <Badge variant="destructive">HABITUAL</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{bail.accused?.age} yrs, {bail.accused?.gender}</span>
                        {bail.accused?.mobile_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {bail.accused.mobile_number}
                          </span>
                        )}
                      </div>

                      {/* FIR Info */}
                      <div className="mt-2 p-2 bg-gray-50 rounded flex flex-wrap gap-4 text-sm">
                        <Link 
                          href={`/fir/${bail.fir?.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {bail.fir?.fir_number}
                        </Link>
                        <span>{bail.fir?.modus_operandi?.name}</span>
                        <span>{bail.fir?.police_station?.name}</span>
                      </div>

                      {/* Bail Details */}
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {bail.bail_date ? format(new Date(bail.bail_date), "dd MMM yyyy") : "-"}
                        </span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(bail.bail_amount || 0)}
                        </span>
                        <span className="text-muted-foreground">
                          Order: {bail.bail_order_number || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}