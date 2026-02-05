"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Map, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, MapPin, Upload
} from "lucide-react"
import { toast } from "sonner"

interface State {
  id: number
  name: string
  code: string
}

interface Zone {
  id: number
  state_id: number
  zone_name: string
  zone_code: string
  is_active: boolean
  created_at: string
  state?: State
}

export default function ManageZonesPage() {
  const supabase = createClient()
  const [zones, setZones] = useState<Zone[]>([])
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedState, setSelectedState] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false) // 🆕
  
  const [formData, setFormData] = useState({
    state_id: "",
    zone_name: "",
    zone_code: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadZones()
  }, [])

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
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("zones")
        .select(`
          *,
          state:states (
            id,
            name,
            code
          )
        `)
        .order("zone_name", { ascending: true })

      if (error) throw error
      setZones(data || [])
    } catch (err: any) {
      console.error("Error loading zones:", err)
      toast.error("Failed to load zones")
    } finally {
      setLoading(false)
    }
  }

  // 🆕 CSV Upload Handler
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
      const rows = text.split('\n').filter(row => row.trim())
      const dataRows = rows.slice(1) // Skip header
      
      if (dataRows.length === 0) {
        toast.error("No data found in CSV file")
        setUploading(false)
        return
      }

      const zonesData: any[] = []
      
      dataRows.forEach((row) => {
        const columns = row.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''))
        
        if (columns.length >= 3) {
          const [stateName, zoneName, zoneCode, isActive] = columns
          
          if (stateName && zoneName && zoneCode) {
            // Find state by name or code
            const state = states.find(s => 
              s.name.toLowerCase() === stateName.toLowerCase() || 
              s.code.toLowerCase() === stateName.toLowerCase()
            )
            
            if (state) {
              zonesData.push({
                state_id: state.id,
                zone_name: zoneName.trim(),
                zone_code: zoneCode.trim().toUpperCase(),
                is_active: isActive ? (isActive.toLowerCase() === 'true' || isActive === '1' || isActive.toLowerCase() === 'yes') : true
              })
            }
          }
        }
      })

      if (zonesData.length === 0) {
        toast.error("No valid data to import")
        setUploading(false)
        return
      }

      // Insert data
      const { error } = await supabase
        .from("zones")
        .upsert(zonesData, { onConflict: 'zone_code' })

      if (error) throw error

      toast.success(`Successfully imported ${zonesData.length} zone(s)`)
      loadZones()

    } catch (err: any) {
      console.error("CSV upload error:", err)
      toast.error("Failed to process CSV file")
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.state_id || !formData.zone_name.trim() || !formData.zone_code.trim()) {
      toast.error("All fields are required")
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("zones")
          .update({
            state_id: parseInt(formData.state_id),
            zone_name: formData.zone_name.trim(),
            zone_code: formData.zone_code.trim().toUpperCase(),
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("Zone updated successfully!")
      } else {
        const { error } = await supabase
          .from("zones")
          .insert({
            state_id: parseInt(formData.state_id),
            zone_name: formData.zone_name.trim(),
            zone_code: formData.zone_code.trim().toUpperCase(),
            is_active: formData.is_active
          })

        if (error) throw error
        toast.success("Zone added successfully!")
      }

      resetForm()
      loadZones()
    } catch (err: any) {
      console.error("Error saving zone:", err)
      toast.error(err.message || "Failed to save zone")
    }
  }

  const handleEdit = (zone: Zone) => {
    setFormData({
      state_id: zone.state_id.toString(),
      zone_name: zone.zone_name,
      zone_code: zone.zone_code,
      is_active: zone.is_active
    })
    setEditingId(zone.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from("zones")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Zone deleted successfully!")
      loadZones()
    } catch (err: any) {
      console.error("Error deleting zone:", err)
      toast.error(err.message || "Failed to delete zone")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("zones")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`Zone ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadZones()
    } catch (err: any) {
      console.error("Error toggling zone:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      state_id: "", 
      zone_name: "", 
      zone_code: "", 
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter zones
  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.zone_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         zone.zone_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         zone.state?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesState = selectedState === "all" || zone.state_id.toString() === selectedState
    
    return matchesSearch && matchesState
  })

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Zones</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage zone records under states
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search zones..."
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
                {state.name} ({state.code})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {/* 🆕 CSV Upload Button */}
            <Button variant="outline" disabled={uploading}>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex items-center">
                <Upload className={`h-4 w-4 mr-2 ${uploading ? 'animate-spin' : ''}`} />
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </label>
            </Button>

            <Button variant="outline" onClick={loadZones} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Zone" : "Add New Zone"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>State *</Label>
                    <select
                      value={formData.state_id}
                      onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                    >
                      <option value="">-- Select State --</option>
                      {states.map(state => (
                        <option key={state.id} value={state.id}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Zone Name *</Label>
                    <Input
                      placeholder="e.g., East Central Railway"
                      value={formData.zone_name}
                      onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Zone Code *</Label>
                    <Input
                      placeholder="e.g., ECR"
                      value={formData.zone_code}
                      onChange={(e) => setFormData({ ...formData, zone_code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active Zone
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

        {/* Zones List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Zones List ({filteredZones.length})</span>
              <Badge variant="secondary">{zones.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading zones...</p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="py-12 text-center">
                <Map className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No zones found</p>
                {zones.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Zone
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">ZONE NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">ZONE CODE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredZones.map((zone, index) => (
                      <tr key={zone.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{zone.state?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {zone.state?.code}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{zone.zone_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {zone.zone_code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(zone.id, zone.is_active)}
                            className="h-8"
                          >
                            {zone.is_active ? (
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
                              onClick={() => handleEdit(zone)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(zone.id, zone.zone_name)}
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