"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Home, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Building,
  Train, Upload, FileSpreadsheet
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

interface Thana {
  id: number
  [key: string]: any
}

const THANA_TYPES = [
  { value: "state_govt", label: "State Govt." },
  { value: "railway_govt", label: "Railway Govt." }
]

export default function ManageThanasPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [thanas, setThanas] = useState<Thana[]>([])
  const [states, setStates] = useState<State[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all")
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>("all")
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    state_id: "",
    zone_id: "",
    district_id: "",
    thana_type: "",
    thana_name: "",
    thana_id: "",
    address: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadZones()
    loadDistricts()
    loadThanas()
  }, [])

  useEffect(() => {
    if (formData.state_id) {
      const filtered = zones.filter(z => z.state_id === parseInt(formData.state_id) && z.is_active)
      setFilteredZones(filtered)
    } else {
      setFilteredZones([])
    }
  }, [formData.state_id, zones])

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

  const loadThanas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("thanas")
        .select("*")
        .order("id", { ascending: true })
      if (error) throw error
      setThanas(data || [])
    } catch (err: any) {
      console.error("Error loading thanas:", err)
      toast.error("Failed to load thanas")
    } finally {
      setLoading(false)
    }
  }

  const getThanaDistrictId = (thana: Thana): number => {
    return thana.district_id || thana.railway_district_id || 0
  }

  const getThanaName = (thana: Thana): string => {
    return thana.thana_name || thana.name || ""
  }

  const getThanaCode = (thana: Thana): string => {
    return thana.thana_id || thana.code || ""
  }

  const getDistrictName = (districtId: number): string => {
    const district = districts.find(d => d.id === districtId)
    return district?.name || "-"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.district_id || !formData.thana_name.trim()) {
      toast.error("District and Thana Name are required")
      return
    }

    try {
      // Build minimal insert data - only essential fields
      const insertData: any = {
        is_active: formData.is_active
      }

      // REQUIRED: Add name field (exists in all schemas)
      insertData.name = formData.thana_name.trim()

      // REQUIRED: Add district_id (try both column names)
      const districtIdValue = parseInt(formData.district_id)
      insertData.district_id = districtIdValue
      insertData.railway_district_id = districtIdValue

      // OPTIONAL: Add other fields only if they have values
      if (formData.thana_name.trim()) {
        insertData.thana_name = formData.thana_name.trim()
      }

      if (formData.thana_id.trim()) {
        insertData.code = formData.thana_id.trim().toUpperCase()
        insertData.thana_id = formData.thana_id.trim().toUpperCase()
      }

      if (formData.state_id) {
        insertData.state_id = parseInt(formData.state_id)
      }

      if (formData.zone_id) {
        insertData.zone_id = parseInt(formData.zone_id)
      }

      if (formData.thana_type) {
        insertData.thana_type = formData.thana_type
      }

      if (formData.address.trim()) {
        insertData.address = formData.address.trim()
      }

      console.log("Saving thana:", insertData)

      if (editingId) {
        const { error } = await supabase
          .from("thanas")
          .update(insertData)
          .eq("id", editingId)

        if (error) {
          console.error("Update error details:", error)
          throw error
        }
        toast.success("Thana updated successfully!")
      } else {
        const { error } = await supabase
          .from("thanas")
          .insert(insertData)

        if (error) {
          console.error("Insert error details:", error)
          throw error
        }
        toast.success("Thana added successfully!")
      }

      resetForm()
      loadThanas()
    } catch (err: any) {
      console.error("Error saving thana:", err)
      // Show more specific error message
      if (err.message?.includes("column")) {
        toast.error("Database schema error. Please run the SQL migration first.")
      } else {
        toast.error(err.message || "Failed to save thana")
      }
    }
  }

  const handleEdit = (thana: Thana) => {
    setFormData({
      state_id: thana.state_id?.toString() || "",
      zone_id: thana.zone_id?.toString() || "",
      district_id: getThanaDistrictId(thana).toString(),
      thana_type: thana.thana_type || "",
      thana_name: getThanaName(thana),
      thana_id: getThanaCode(thana),
      address: thana.address || "",
      is_active: thana.is_active !== false
    })
    setEditingId(thana.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from("thanas")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Thana deleted successfully!")
      loadThanas()
    } catch (err: any) {
      console.error("Error deleting thana:", err)
      toast.error(err.message || "Failed to delete thana")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("thanas")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`Thana ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadThanas()
    } catch (err: any) {
      console.error("Error toggling thana:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      state_id: "",
      zone_id: "",
      district_id: "",
      thana_type: "",
      thana_name: "",
      thana_id: "",
      address: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file")
      return
    }

    setUploading(true)
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error("CSV file is empty")
        return
      }

      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const nameIndex = header.findIndex(h => h.includes('name') && (h.includes('thana') || h.includes('station')))
      const districtIndex = header.findIndex(h => h.includes('district'))

      if (nameIndex === -1) {
        toast.error("CSV must have 'Thana Name' column")
        return
      }

      const dataRows = lines.slice(1)
      let successCount = 0
      let errorCount = 0

      for (const row of dataRows) {
        const columns = row.split(',').map(c => c.trim())
        if (!columns[nameIndex]) continue

        const thanaData: any = {
          name: columns[nameIndex],
          is_active: true
        }

        if (districtIndex !== -1 && columns[districtIndex]) {
          const distId = parseInt(columns[districtIndex])
          thanaData.district_id = distId
          thanaData.railway_district_id = distId
        } else if (districts.length > 0) {
          thanaData.district_id = districts[0].id
          thanaData.railway_district_id = districts[0].id
        }

        // Optional: add thana_name if it exists
        thanaData.thana_name = columns[nameIndex]

        const { error } = await supabase.from("thanas").insert(thanaData)

        if (error) {
          console.error("CSV insert error:", error)
          errorCount++
        } else {
          successCount++
        }
      }

      toast.success(`Uploaded: ${successCount}. Errors: ${errorCount}`)
      loadThanas()
      
    } catch (err: any) {
      console.error("CSV upload error:", err)
      toast.error("Failed to process CSV")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const getThanaTypeLabel = (type: string | undefined) => {
    if (!type) return "-"
    const found = THANA_TYPES.find(t => t.value === type)
    return found?.label || type
  }

  const getThanaTypeBadge = (type: string | undefined) => {
    if (type === "state_govt") return "bg-purple-100 text-purple-700 border-purple-300"
    if (type === "railway_govt") return "bg-blue-100 text-blue-700 border-blue-300"
    return "bg-gray-100 text-gray-700 border-gray-300"
  }

  const filteredThanas = thanas.filter(thana => {
    const name = getThanaName(thana).toLowerCase()
    const code = getThanaCode(thana).toLowerCase()
    const districtId = getThanaDistrictId(thana)
    const districtName = getDistrictName(districtId).toLowerCase()
    const search = searchQuery.toLowerCase()

    const matchesSearch = name.includes(search) || code.includes(search) || districtName.includes(search)
    const matchesDistrict = selectedDistrictFilter === "all" || districtId.toString() === selectedDistrictFilter
    const matchesState = selectedStateFilter === "all" || thana.state_id?.toString() === selectedStateFilter
    const matchesType = selectedTypeFilter === "all" || thana.thana_type === selectedTypeFilter
    
    return matchesSearch && matchesDistrict && matchesState && matchesType
  })

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Thanas (Police Stations)</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage police station records
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search thanas..."
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
              <option key={state.id} value={state.id.toString()}>{state.name}</option>
            ))}
          </select>
          <select
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Districts</option>
            {districts.map(district => (
              <option key={district.id} value={district.id.toString()}>{district.name}</option>
            ))}
          </select>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Types</option>
            {THANA_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={loadThanas} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Thana
          </Button>
        </div>

        {/* CSV Upload */}
        <Card className="mb-6 border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Upload Thanas via CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Columns: District ID, Thana Name, Thana ID, Address
                  </p>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className={`h-4 w-4 mr-2 ${uploading ? 'animate-pulse' : ''}`} />
                  {uploading ? "Uploading..." : "Upload CSV"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Thana" : "Add New Thana"}</span>
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
                    <Label>State</Label>
                    <select
                      value={formData.state_id}
                      onChange={(e) => setFormData({ ...formData, state_id: e.target.value, zone_id: "", district_id: "" })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                    >
                      <option value="">-- Select State --</option>
                      {states.map(state => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone (Optional) */}
                  <div>
                    <Label>Zone Name (Optional)</Label>
                    <select
                      value={formData.zone_id}
                      onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
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

                  {/* District */}
                  <div>
                    <Label>District Name *</Label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      required
                    >
                      <option value="">-- Select District --</option>
                      {(formData.state_id ? filteredDistricts : districts).map(district => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type of Thana */}
                  <div>
                    <Label>Type of Thana</Label>
                    <select
                      value={formData.thana_type}
                      onChange={(e) => setFormData({ ...formData, thana_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                    >
                      <option value="">-- Select Type --</option>
                      {THANA_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Thana Name */}
                  <div>
                    <Label>Thana Name *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g., GRP Patna Junction"
                      value={formData.thana_name}
                      onChange={(e) => setFormData({ ...formData, thana_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Thana ID */}
                  <div>
                    <Label>Thana ID</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g., GRPPJ001"
                      value={formData.thana_id}
                      onChange={(e) => setFormData({ ...formData, thana_id: e.target.value.toUpperCase() })}
                    />
                  </div>

                </div>

                {/* Address */}
                <div>
                  <Label>Address of Thana</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter full address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Active Thana</Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Update" : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Thanas List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="h-5 w-5 text-primary" />
                <span>Thanas List ({filteredThanas.length})</span>
              </div>
              <Badge variant="secondary">{thanas.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading thanas...</p>
              </div>
            ) : filteredThanas.length === 0 ? (
              <div className="py-12 text-center">
                <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No thanas found</p>
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Thana
                </Button>
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
                      <th className="px-4 py-3 text-left text-xs font-bold">TYPE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA ID</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredThanas.map((thana, index) => (
                      <tr key={thana.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm">{getStateName(thana.state_id)}</td>
                        <td className="px-4 py-3">
                          {thana.zone_id ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              {getZoneName(thana.zone_id)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {getDistrictName(getThanaDistrictId(thana))}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {thana.thana_type ? (
                            <Badge className={`${getThanaTypeBadge(thana.thana_type)} text-xs`}>
                              {getThanaTypeLabel(thana.thana_type)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{getThanaName(thana)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {getThanaCode(thana) || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(thana.id, thana.is_active !== false)}
                            className="h-8"
                          >
                            {thana.is_active !== false ? (
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
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(thana)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(thana.id, getThanaName(thana))}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
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
      </div>
    </div>
  )
}