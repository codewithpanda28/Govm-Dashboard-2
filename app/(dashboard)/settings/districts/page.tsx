"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Building, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Upload, FileSpreadsheet
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
  state_id: number
  zone_id: number
  name: string
  district_id: string
  is_active: boolean
  created_at: string
  state?: State
  zone?: Zone
}

export default function ManageDistrictsPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [districts, setDistricts] = useState<District[]>([])
  const [states, setStates] = useState<State[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedState, setSelectedState] = useState<string>("all")
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    state_id: "",
    zone_id: "",
    name: "",
    district_id: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadZones()
    loadDistricts()
  }, [])

  // Filter zones when state changes in form
  useEffect(() => {
    if (formData.state_id) {
      const filtered = zones.filter(z => z.state_id === parseInt(formData.state_id) && z.is_active)
      setFilteredZones(filtered)
    } else {
      setFilteredZones([])
    }
  }, [formData.state_id, zones])

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
      toast.error("Failed to load states")
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
      toast.error("Failed to load zones")
    }
  }

  const loadDistricts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("districts")
        .select(`
          *,
          state:states (
            id,
            name,
            code
          ),
          zone:zones (
            id,
            zone_name,
            zone_code
          )
        `)
        .order("name", { ascending: true })

      if (error) throw error
      setDistricts(data || [])
    } catch (err: any) {
      console.error("Error loading districts:", err)
      toast.error("Failed to load districts")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.state_id || !formData.zone_id || !formData.name.trim() || !formData.district_id.trim()) {
      toast.error("All fields are required")
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("districts")
          .update({
            state_id: parseInt(formData.state_id),
            zone_id: parseInt(formData.zone_id),
            name: formData.name.trim(),
            district_id: formData.district_id.trim().toUpperCase(),
            is_active: formData.is_active
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("District updated successfully!")
      } else {
        const { error } = await supabase
          .from("districts")
          .insert({
            state_id: parseInt(formData.state_id),
            zone_id: parseInt(formData.zone_id),
            name: formData.name.trim(),
            district_id: formData.district_id.trim().toUpperCase(),
            is_active: formData.is_active
          })

        if (error) throw error
        toast.success("District added successfully!")
      }

      resetForm()
      loadDistricts()
    } catch (err: any) {
      console.error("Error saving district:", err)
      toast.error(err.message || "Failed to save district")
    }
  }

  const handleEdit = (district: District) => {
    setFormData({
      state_id: district.state_id.toString(),
      zone_id: district.zone_id?.toString() || "",
      name: district.name,
      district_id: district.district_id || "",
      is_active: district.is_active
    })
    setEditingId(district.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from("districts")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("District deleted successfully!")
      loadDistricts()
    } catch (err: any) {
      console.error("Error deleting district:", err)
      toast.error(err.message || "Failed to delete district")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("districts")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`District ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadDistricts()
    } catch (err: any) {
      console.error("Error toggling district:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      state_id: "",
      zone_id: "",
      name: "", 
      district_id: "", 
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // CSV Upload Handler
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
        toast.error("CSV file is empty or has no data rows")
        return
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Expected columns: state_id, zone_id, district_name, district_id
      const stateIdIndex = header.findIndex(h => h.includes('state'))
      const zoneIdIndex = header.findIndex(h => h.includes('zone'))
      const nameIndex = header.findIndex(h => h.includes('name') && !h.includes('zone'))
      const districtIdIndex = header.findIndex(h => h.includes('district_id') || h.includes('id'))

      if (nameIndex === -1) {
        toast.error("CSV must have 'District Name' column")
        return
      }

      const dataRows = lines.slice(1)
      let successCount = 0
      let errorCount = 0

      for (const row of dataRows) {
        const columns = row.split(',').map(c => c.trim())
        
        if (columns.length < 2) continue

        const districtData: any = {
          name: columns[nameIndex] || "",
          zone_id: zoneIdIndex !== -1 ? parseInt(columns[zoneIdIndex]) : zones[0]?.id,
          district_id: districtIdIndex !== -1 ? columns[districtIdIndex]?.toUpperCase() : "",
          state_id: stateIdIndex !== -1 ? parseInt(columns[stateIdIndex]) : states[0]?.id,
          is_active: true
        }

        if (!districtData.name) continue

        const { error } = await supabase
          .from("districts")
          .insert(districtData)

        if (error) {
          console.error("Error inserting:", error)
          errorCount++
        } else {
          successCount++
        }
      }

      toast.success(`Uploaded: ${successCount} districts. Errors: ${errorCount}`)
      loadDistricts()
      
    } catch (err: any) {
      console.error("CSV upload error:", err)
      toast.error("Failed to process CSV file")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Filter districts
  const displayDistricts = districts.filter(district => {
    const matchesSearch = district.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         district.district_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         district.zone?.zone_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesState = selectedState === "all" || district.state_id.toString() === selectedState
    const matchesZone = selectedZoneFilter === "all" || district.zone_id?.toString() === selectedZoneFilter
    
    return matchesSearch && matchesState && matchesZone
  })

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Districts</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage district records
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search districts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
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
            value={selectedZoneFilter}
            onChange={(e) => setSelectedZoneFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Zones</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id.toString()}>
                {zone.zone_name} ({zone.zone_code})
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={loadDistricts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add District
          </Button>
        </div>

        {/* CSV Upload */}
        <Card className="mb-6 border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Upload Districts via CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Columns: State ID, Zone ID, District Name, District ID
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
                  id="csv-upload"
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
                <span>{editingId ? "Edit District" : "Add New District"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* State Select */}
                  <div>
                    <Label>State *</Label>
                    <select
                      value={formData.state_id}
                      onChange={(e) => setFormData({ ...formData, state_id: e.target.value, zone_id: "" })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                    >
                      <option value="">-- Select State --</option>
                      {states.map(state => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Select - Fetched from Database */}
                  <div>
                    <Label>Zone Name *</Label>
                    <select
                      value={formData.zone_id}
                      onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                      disabled={!formData.state_id}
                    >
                      <option value="">-- Select Zone --</option>
                      {filteredZones.map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.zone_name} ({zone.zone_code})
                        </option>
                      ))}
                    </select>
                    {!formData.state_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Please select a state first
                      </p>
                    )}
                    {formData.state_id && filteredZones.length === 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        No zones found for this state. Add zones first.
                      </p>
                    )}
                  </div>

                  {/* District Name Input */}
                  <div>
                    <Label>District Name *</Label>
                    <Input
                      placeholder="e.g., Patna"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* District ID Input */}
                  <div>
                    <Label>District ID *</Label>
                    <Input
                      placeholder="e.g., PTN001"
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value.toUpperCase() })}
                      required
                    />
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
                      Active District
                    </Label>
                  </div>
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

        {/* Districts List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>District List ({displayDistricts.length})</span>
              <Badge variant="secondary">{districts.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading districts...</p>
              </div>
            ) : displayDistricts.length === 0 ? (
              <div className="py-12 text-center">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No districts found</p>
                {districts.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First District
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
                      <th className="px-4 py-3 text-left text-xs font-bold">ZONE NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT ID</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayDistricts.map((district, index) => (
                      <tr key={district.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">{district.state?.name || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {district.zone ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {district.zone.zone_name} ({district.zone.zone_code})
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{district.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {district.district_id || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(district.id, district.is_active)}
                            className="h-8"
                          >
                            {district.is_active ? (
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(district)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(district.id, district.name)}
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