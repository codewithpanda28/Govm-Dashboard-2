"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Gavel, Plus, Edit, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Building,
  Scale
} from "lucide-react"
import { toast } from "sonner"

interface State {
  id: number
  name: string
  code: string
}

interface Zone {
  id: number
  zone_name: string
  zone_code: string
  state_id: number
  is_active: boolean
}

interface District {
  id: number
  name: string
  code?: string
  state_id?: number
  zone_id?: number
}

interface Court {
  id: number
  state_id?: number | null
  zone_id?: number | null
  district_id?: number | null
  court_type: string | null
  name: string
  address: string | null
  court_code: string | null
  is_active: boolean
  created_at: string
}

const COURT_TYPES = [
  "Railway Court",
  "District Court",
  "Sessions Court",
  "Magistrate Court",
  "High Court",
  "Special Court",
  "JMFC Court",
  "CJM Court",
  "Other"
]

export default function ManageCourtsPage() {
  const supabase = createClient()
  const [courts, setCourts] = useState<Court[]>([])
  const [states, setStates] = useState<State[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all")
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    state_id: "",
    zone_id: "",
    district_id: "",
    court_type: "",
    name: "",
    address: "",
    court_code: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadZones()
    loadDistricts()
    loadCourts()
  }, [])

  // Filter zones when state changes
  useEffect(() => {
    if (formData.state_id) {
      const filtered = zones.filter(z => z.state_id === parseInt(formData.state_id) && z.is_active)
      setFilteredZones(filtered)
    } else {
      setFilteredZones([])
    }
  }, [formData.state_id, zones])

  // Filter districts when state/zone changes
  useEffect(() => {
    let filtered = districts

    if (formData.state_id) {
      filtered = filtered.filter(d => d.state_id === parseInt(formData.state_id))
    }

    if (formData.zone_id) {
      filtered = filtered.filter(d => d.zone_id === parseInt(formData.zone_id))
    }

    setFilteredDistricts(filtered)
  }, [formData.state_id, formData.zone_id, districts])

  const loadStates = async () => {
    try {
      const { data, error } = await supabase
        .from("states")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true })
      if (error) throw error
      setStates(data || [])
    } catch (err: any) {
      console.error("Error loading states:", err)
    }
  }

  const loadZones = async () => {
    try {
      const { data, error } = await supabase
        .from("zones")
        .select("id, zone_name, zone_code, state_id, is_active")
        .eq("is_active", true)
        .order("zone_name", { ascending: true })
      if (error) throw error
      setZones(data || [])
    } catch (err: any) {
      console.error("Error loading zones:", err)
    }
  }

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from("districts")
        .select("*")
        .order("name", { ascending: true })
      if (error) throw error
      setDistricts(data || [])
    } catch (err: any) {
      console.error("Error loading districts:", err)
    }
  }

  const loadCourts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Courts load error:", error)
        throw error
      }
      
      console.log("Courts loaded:", data?.length || 0)
      setCourts(data || [])
    } catch (err: any) {
      console.error("Error loading courts:", err)
      toast.error("Failed to load courts")
    } finally {
      setLoading(false)
    }
  }

  const getStateName = (stateId: number | null | undefined): string => {
    if (!stateId) return "-"
    const state = states.find(s => s.id === stateId)
    return state?.name || "-"
  }

  const getZoneName = (zoneId: number | null | undefined): string => {
    if (!zoneId) return "-"
    const zone = zones.find(z => z.id === zoneId)
    return zone?.zone_name || "-"
  }

  const getDistrictName = (districtId: number | null | undefined): string => {
    if (!districtId) return "-"
    const district = districts.find(d => d.id === districtId)
    return district?.name || "-"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.state_id || !formData.district_id || !formData.court_type || !formData.name.trim()) {
      toast.error("State, District, Court Type and Court Name are required")
      return
    }

    try {
      const insertData: any = {
        state_id: parseInt(formData.state_id),
        district_id: parseInt(formData.district_id),
        court_type: formData.court_type,
        name: formData.name.trim(),
        is_active: formData.is_active
      }

      // Optional fields
      if (formData.zone_id) {
        insertData.zone_id = parseInt(formData.zone_id)
      }

      if (formData.address.trim()) {
        insertData.address = formData.address.trim()
      }

      if (formData.court_code.trim()) {
        insertData.court_code = formData.court_code.trim().toUpperCase()
      }

      console.log("Saving court:", insertData)

      if (editingId) {
        const { error } = await supabase
          .from("courts")
          .update(insertData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Court updated successfully!")
      } else {
        const { error } = await supabase
          .from("courts")
          .insert(insertData)

        if (error) throw error
        toast.success("Court added successfully!")
      }

      resetForm()
      loadCourts()
    } catch (err: any) {
      console.error("Error saving court:", err)
      toast.error(err.message || "Failed to save court")
    }
  }

  const handleEdit = (court: Court) => {
    setFormData({
      state_id: court.state_id?.toString() || "",
      zone_id: court.zone_id?.toString() || "",
      district_id: court.district_id?.toString() || "",
      court_type: court.court_type || "",
      name: court.name || "",
      address: court.address || "",
      court_code: court.court_code || "",
      is_active: court.is_active
    })
    setEditingId(court.id)
    setShowForm(true)
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("courts")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`Court ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadCourts()
    } catch (err: any) {
      console.error("Error toggling court:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      state_id: "",
      zone_id: "",
      district_id: "",
      court_type: "",
      name: "",
      address: "",
      court_code: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter courts
  const filteredCourts = courts.filter(court => {
    const matchesSearch = court.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         court.court_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getDistrictName(court.district_id).toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesState = selectedStateFilter === "all" || court.state_id?.toString() === selectedStateFilter
    const matchesType = selectedTypeFilter === "all" || court.court_type === selectedTypeFilter
    
    return matchesSearch && matchesState && matchesType
  })

  const getCourtTypeBadge = (courtType: string | null) => {
    const colors: Record<string, string> = {
      "Railway Court": "bg-blue-100 text-blue-700 border-blue-300",
      "High Court": "bg-purple-100 text-purple-700 border-purple-300",
      "Sessions Court": "bg-orange-100 text-orange-700 border-orange-300",
      "District Court": "bg-green-100 text-green-700 border-green-300",
      "Magistrate Court": "bg-teal-100 text-teal-700 border-teal-300",
      "JMFC Court": "bg-indigo-100 text-indigo-700 border-indigo-300",
      "CJM Court": "bg-pink-100 text-pink-700 border-pink-300",
      "Special Court": "bg-red-100 text-red-700 border-red-300"
    }
    return colors[courtType || ""] || "bg-gray-100 text-gray-700 border-gray-300"
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Courts</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage court records
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All States</option>
            {states.map(state => (
              <option key={state.id} value={state.id.toString()}>
                {state.name}
              </option>
            ))}
          </select>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Types</option>
            {COURT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCourts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Court
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Court" : "Create Court"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* State */}
                  <div>
                    <Label>State *</Label>
                    <select
                      value={formData.state_id}
                      onChange={(e) => setFormData({ ...formData, state_id: e.target.value, zone_id: "", district_id: "" })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      required
                    >
                      <option value="">-- Select State --</option>
                      {states.map(state => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Name (Optional) */}
                  <div>
                    <Label>Zone Name (Optional)</Label>
                    <select
                      value={formData.zone_id}
                      onChange={(e) => setFormData({ ...formData, zone_id: e.target.value, district_id: "" })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      disabled={!formData.state_id}
                    >
                      <option value="">-- Select Zone --</option>
                      {filteredZones.map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.zone_name} ({zone.zone_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Name */}
                  <div>
                    <Label>District Name *</Label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      required
                      disabled={!formData.state_id}
                    >
                      <option value="">-- Select District --</option>
                      {(formData.state_id ? filteredDistricts : districts).map(district => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Court Type */}
                  <div>
                    <Label>Court Type *</Label>
                    <select
                      value={formData.court_type}
                      onChange={(e) => setFormData({ ...formData, court_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      required
                    >
                      <option value="">-- Select Type --</option>
                      {COURT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Court Name */}
                  <div>
                    <Label>Court Name *</Label>
                    <div className="relative mt-1">
                      <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., Railway Court, Patna"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Code of Court */}
                  <div>
                    <Label>Code of Court</Label>
                    <div className="relative mt-1">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., RC-PTN-001"
                        value={formData.court_code}
                        onChange={(e) => setFormData({ ...formData, court_code: e.target.value.toUpperCase() })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Active Checkbox */}
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active Court
                    </Label>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label>Address</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter full court address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Update" : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Courts List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <span>Court List ({filteredCourts.length})</span>
              </div>
              <Badge variant="secondary">{courts.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading courts...</p>
              </div>
            ) : filteredCourts.length === 0 ? (
              <div className="py-12 text-center">
                <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No courts found</p>
                {courts.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Court
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">ZONE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">COURT TYPE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">COURT NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CODE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCourts.map((court, index) => (
                      <tr key={court.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm">{getStateName(court.state_id)}</td>
                        <td className="px-4 py-3">
                          {court.zone_id ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              {getZoneName(court.zone_id)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{getDistrictName(court.district_id)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {court.court_type ? (
                            <Badge className={`${getCourtTypeBadge(court.court_type)} font-semibold border text-xs`}>
                              {court.court_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{court.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {court.court_code ? (
                            <Badge variant="outline" className="font-mono">
                              {court.court_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(court.id, court.is_active)}
                            className="h-8"
                          >
                            {court.is_active ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                ACTIVE
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-300">
                                <XCircle className="h-3 w-3 mr-1" />
                                INACTIVE
                              </Badge>
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(court)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-semibold">Total Courts</p>
              <p className="text-2xl font-bold text-blue-700">{courts.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Active Courts</p>
              <p className="text-2xl font-bold text-green-700">
                {courts.filter(c => c.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">Railway Courts</p>
              <p className="text-2xl font-bold text-purple-700">
                {courts.filter(c => c.court_type === "Railway Court").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Inactive Courts</p>
              <p className="text-2xl font-bold text-orange-700">
                {courts.filter(c => !c.is_active).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}