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
  Gavel, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, MapPin, Building,
  Phone, Scale
} from "lucide-react"
import { toast } from "sonner"

interface Court {
  id: number
  name: string
  address: string | null
  district: string | null
  state: string | null
  court_type: string | null
  phone: string | null
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

const STATES = [
  "Bihar",
  "Uttar Pradesh",
  "Jharkhand",
  "West Bengal",
  "Madhya Pradesh",
  "Maharashtra",
  "Delhi",
  "Rajasthan",
  "Gujarat",
  "Tamil Nadu",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Kerala",
  "Odisha",
  "Punjab",
  "Haryana",
  "Other"
]

export default function ManageCourtsPage() {
  const supabase = createClient()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedState, setSelectedState] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    court_type: "",
    state: "",
    district: "",
    address: "",
    phone: "",
    is_active: true
  })

  useEffect(() => {
    loadCourts()
  }, [])

  const loadCourts = async () => {
    setLoading(true)
    try {
      // Simple query - only columns that exist
      const { data, error } = await supabase
        .from("courts")
        .select("id, name, address, district, state, court_type, phone, is_active, created_at")
        .order("name", { ascending: true })

      if (error) {
        console.error("Courts load error:", error)
        throw error
      }
      
      console.log("Courts loaded:", data?.length || 0)
      setCourts(data || [])
    } catch (err: any) {
      console.error("Error loading courts:", err)
      toast.error("Failed to load courts: " + (err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Court Name is required")
      return
    }

    try {
      const insertData: any = {
        name: formData.name.trim(),
        is_active: formData.is_active
      }

      // Only add fields if they have values
      if (formData.court_type) insertData.court_type = formData.court_type
      if (formData.state) insertData.state = formData.state
      if (formData.district.trim()) insertData.district = formData.district.trim()
      if (formData.address.trim()) insertData.address = formData.address.trim()
      if (formData.phone.trim()) insertData.phone = formData.phone.trim()

      if (editingId) {
        // Update
        const { error } = await supabase
          .from("courts")
          .update(insertData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Court updated successfully!")
      } else {
        // Insert
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
      name: court.name || "",
      court_type: court.court_type || "",
      state: court.state || "",
      district: court.district || "",
      address: court.address || "",
      phone: court.phone || "",
      is_active: court.is_active
    })
    setEditingId(court.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from("courts")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Court deleted successfully!")
      loadCourts()
    } catch (err: any) {
      console.error("Error deleting court:", err)
      toast.error(err.message || "Failed to delete court")
    }
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
      name: "",
      court_type: "",
      state: "",
      district: "",
      address: "",
      phone: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter courts
  const filteredCourts = courts.filter(court => {
    const matchesSearch = court.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         court.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         court.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         court.phone?.includes(searchQuery)
    
    const matchesState = selectedState === "all" || court.state === selectedState
    const matchesType = selectedType === "all" || court.court_type === selectedType
    
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

  // Get unique states from data for filter
  const uniqueStates = [...new Set(courts.map(c => c.state).filter(Boolean))]

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
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All States</option>
            {uniqueStates.map(state => (
              <option key={state} value={state || ""}>
                {state}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
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
                <span>{editingId ? "Edit Court" : "Add New Court"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Court Name *</Label>
                    <div className="relative">
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
                  <div>
                    <Label>Court Type</Label>
                    <select
                      value={formData.court_type}
                      onChange={(e) => setFormData({ ...formData, court_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="">-- Select Type --</option>
                      {COURT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>State</Label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="">-- Select State --</option>
                      {STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>District</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., Patna"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., 0612-1234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
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
                      Active Court
                    </Label>
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    placeholder="Enter full court address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="resize-none"
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
                <span>Courts List ({filteredCourts.length})</span>
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
                      <th className="px-4 py-3 text-left text-xs font-bold">COURT NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">TYPE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DISTRICT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">PHONE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCourts.map((court, index) => (
                      <tr key={court.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{court.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {court.court_type ? (
                            <Badge className={`${getCourtTypeBadge(court.court_type)} font-semibold border`}>
                              {court.court_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {court.state ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{court.state}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {court.district ? (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{court.district}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {court.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{court.phone}</span>
                            </div>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(court)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(court.id, court.name)}
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
              <p className="text-xs text-orange-600 font-semibold">States Covered</p>
              <p className="text-2xl font-bold text-orange-700">
                {new Set(courts.map(c => c.state).filter(Boolean)).size}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}