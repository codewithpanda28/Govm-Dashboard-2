"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Building, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, MapPin
} from "lucide-react"
import { toast } from "sonner"

interface State {
  id: number
  name: string
  code: string
}

interface District {
  id: number
  state_id: number
  name: string
  code: string
  is_active: boolean
  created_at: string
  state?: State
}

export default function ManageDistrictsPage() {
  const supabase = createClient()
  const [districts, setDistricts] = useState<District[]>([])
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedState, setSelectedState] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    state_id: "",
    name: "",
    code: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadDistricts()
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
    
    if (!formData.state_id || !formData.name.trim() || !formData.code.trim()) {
      toast.error("All fields are required")
      return
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("districts")
          .update({
            state_id: parseInt(formData.state_id),
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            is_active: formData.is_active
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("District updated successfully!")
      } else {
        // Insert
        const { error } = await supabase
          .from("districts")
          .insert({
            state_id: parseInt(formData.state_id),
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
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
      name: district.name,
      code: district.code,
      is_active: district.is_active
    })
    setEditingId(district.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nNote: This will affect all associated thanas and data!`)) return

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
      name: "", 
      code: "", 
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter districts
  const filteredDistricts = districts.filter(district => {
    const matchesSearch = district.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         district.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         district.state?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesState = selectedState === "all" || district.state_id.toString() === selectedState
    
    return matchesSearch && matchesState
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
                Add, edit, and manage district records under states
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
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
                {state.name} ({state.code})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDistricts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add District
            </Button>
          </div>
        </div>

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
                    <Label>District Name *</Label>
                    <Input
                      placeholder="e.g., Patna"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>District Code *</Label>
                    <Input
                      placeholder="e.g., PTN"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
              <span>Districts List ({filteredDistricts.length})</span>
              <Badge variant="secondary">{districts.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading districts...</p>
              </div>
            ) : filteredDistricts.length === 0 ? (
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
                      <th className="px-4 py-3 text-left text-xs font-bold">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT CODE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDistricts.map((district, index) => (
                      <tr key={district.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{district.state?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {district.state?.code}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{district.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {district.code}
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