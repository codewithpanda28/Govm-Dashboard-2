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
  Home, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Building,
  Phone, Train
} from "lucide-react"
import { toast } from "sonner"

interface District {
  id: number
  name: string
  code: string
  state_id?: number
}

interface Thana {
  id: number
  district_id: number
  thana_name: string
  thana_code: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export default function ManageThanasPage() {
  const supabase = createClient()
  const [thanas, setThanas] = useState<Thana[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    district_id: "",
    thana_name: "",
    thana_code: "",
    address: "",
    phone: "",
    is_active: true
  })

  useEffect(() => {
    loadDistricts()
    loadThanas()
  }, [])

  // ✅ Load Districts from actual 'districts' table
  const loadDistricts = async () => {
    try {
      console.log("Loading districts...")
      
      const { data, error } = await supabase
        .from("districts")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Districts error:", error)
        throw error
      }

      console.log("Districts loaded:", data?.length, data)
      setDistricts(data || [])
    } catch (err: any) {
      console.error("Error loading districts:", err)
      toast.error("Failed to load districts")
    }
  }

  // ✅ Load Thanas - Check actual column names
  const loadThanas = async () => {
    setLoading(true)
    try {
      console.log("Loading thanas...")

      const { data, error } = await supabase
        .from("thanas")
        .select("*")
        .order("id", { ascending: true })

      if (error) {
        console.error("Thanas error:", error)
        throw error
      }

      console.log("Thanas loaded:", data?.length, data)
      
      // Check first record to see actual column names
      if (data && data.length > 0) {
        console.log("Thana columns:", Object.keys(data[0]))
      }

      setThanas(data || [])
    } catch (err: any) {
      console.error("Error loading thanas:", err)
      toast.error("Failed to load thanas")
    } finally {
      setLoading(false)
    }
  }

  // ✅ Get thana name (handles both 'name' and 'thana_name')
  const getThanaName = (thana: any): string => {
    return thana.thana_name || thana.name || ""
  }

  // ✅ Get thana code (handles both 'code' and 'thana_code')
  const getThanaCode = (thana: any): string => {
    return thana.thana_code || thana.code || ""
  }

  // ✅ Get district_id (handles both 'district_id' and 'railway_district_id')
  const getDistrictId = (thana: any): number => {
    return thana.district_id || thana.railway_district_id || 0
  }

  // ✅ Get district name for display
  const getDistrictName = (thana: any): string => {
    const districtId = getDistrictId(thana)
    const district = districts.find(d => d.id === districtId)
    return district?.name || "Unknown"
  }

  // ✅ Get district code for display
  const getDistrictCode = (thana: any): string => {
    const districtId = getDistrictId(thana)
    const district = districts.find(d => d.id === districtId)
    return district?.code || ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.district_id || !formData.thana_name.trim() || !formData.thana_code.trim()) {
      toast.error("District, Name and Code are required")
      return
    }

    try {
      // Detect column names from existing data
      const useNewColumns = thanas.length === 0 || thanas[0].hasOwnProperty('thana_name')
      
      const insertData: any = {
        is_active: formData.is_active
      }

      // Set district_id column
      if (thanas.length > 0 && thanas[0].hasOwnProperty('railway_district_id')) {
        insertData.railway_district_id = parseInt(formData.district_id)
      } else {
        insertData.district_id = parseInt(formData.district_id)
      }

      // Set name column
      if (useNewColumns) {
        insertData.thana_name = formData.thana_name.trim()
        insertData.thana_code = formData.thana_code.trim().toUpperCase()
      } else {
        insertData.name = formData.thana_name.trim()
        insertData.code = formData.thana_code.trim().toUpperCase()
      }

      // Optional fields
      if (formData.address.trim()) {
        insertData.address = formData.address.trim()
      }
      if (formData.phone.trim()) {
        insertData.phone = formData.phone.trim()
      }

      console.log("Saving thana:", insertData)

      if (editingId) {
        // Update
        const { error } = await supabase
          .from("thanas")
          .update(insertData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Thana updated successfully!")
      } else {
        // Insert
        const { error } = await supabase
          .from("thanas")
          .insert(insertData)

        if (error) throw error
        toast.success("Thana added successfully!")
      }

      resetForm()
      loadThanas()
    } catch (err: any) {
      console.error("Error saving thana:", err)
      toast.error(err.message || "Failed to save thana")
    }
  }

  const handleEdit = (thana: any) => {
    setFormData({
      district_id: getDistrictId(thana).toString(),
      thana_name: getThanaName(thana),
      thana_code: getThanaCode(thana),
      address: thana.address || "",
      phone: thana.phone || "",
      is_active: thana.is_active !== false
    })
    setEditingId(thana.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nNote: This will affect all associated FIRs and data!`)) return

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
      district_id: "",
      thana_name: "",
      thana_code: "",
      address: "",
      phone: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter thanas
  const filteredThanas = thanas.filter(thana => {
    const name = getThanaName(thana).toLowerCase()
    const code = getThanaCode(thana).toLowerCase()
    const districtName = getDistrictName(thana).toLowerCase()
    const address = (thana.address || "").toLowerCase()
    const phone = (thana.phone || "").toLowerCase()
    const search = searchQuery.toLowerCase()

    const matchesSearch = name.includes(search) ||
                         code.includes(search) ||
                         districtName.includes(search) ||
                         address.includes(search) ||
                         phone.includes(search)
    
    const matchesDistrict = selectedDistrict === "all" || 
                           getDistrictId(thana).toString() === selectedDistrict
    
    return matchesSearch && matchesDistrict
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
                Add, edit, and manage railway police station records
              </p>
            </div>
          </div>
          
          {/* Debug Info */}
          <div className="flex gap-2 mt-2 text-xs">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Districts: {districts.length}</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Thanas: {thanas.length}</span>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search thanas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Districts ({districts.length})</option>
            {districts.map(district => (
              <option key={district.id} value={district.id.toString()}>
                {district.name} {district.code ? `(${district.code})` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { loadDistricts(); loadThanas(); }} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Thana
            </Button>
          </div>
        </div>

        {/* Warning if no districts */}
        {districts.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-medium">⚠️ No Districts Found!</p>
            <p className="text-sm text-yellow-700 mt-1">
              Please add districts first in "Manage District" section before adding thanas.
            </p>
          </div>
        )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>District *</Label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm mt-1"
                      required
                    >
                      <option value="">-- Select District --</option>
                      {districts.map(district => (
                        <option key={district.id} value={district.id}>
                          {district.name} {district.code ? `(${district.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <Label>Thana Code *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g., GRPPJ"
                      value={formData.thana_code}
                      onChange={(e) => setFormData({ ...formData, thana_code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., 0612-1234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter full address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active Thana
                  </Label>
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
                {thanas.length === 0 && districts.length > 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Thana
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CODE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">PHONE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredThanas.map((thana, index) => (
                      <tr key={thana.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{getDistrictName(thana)}</span>
                            {getDistrictCode(thana) && (
                              <Badge variant="outline" className="text-xs">
                                {getDistrictCode(thana)}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{getThanaName(thana)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {getThanaCode(thana)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {thana.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{thana.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(thana)}
                            >
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