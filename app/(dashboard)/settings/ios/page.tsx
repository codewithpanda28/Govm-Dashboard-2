"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  UserCog, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Phone, Mail,
  Building, Home, User, Star
} from "lucide-react"
import { toast } from "sonner"

// 🔥 FIXED: Made railway_district_id optional since we don't use it
interface Thana {
  id: number
  name: string
  code: string
  railway_district_id?: number | null  // ← Made optional
}

interface IO {
  id: number
  thana_id: number
  name: string
  designation: string
  email: string | null
  mobile: string | null
  is_active: boolean
  created_at: string
  thana?: Thana
}

const DESIGNATIONS = [
  "Inspector",
  "Sub-Inspector", 
  "Assistant Sub-Inspector",
  "Head Constable",
  "Constable",
  "SHO (Station House Officer)",
  "Circle Inspector",
  "DSP (Deputy Superintendent)",
  "SP (Superintendent of Police)",
  "Other"
]

export default function ManageIOsPage() {
  const supabase = createClient()
  const [ios, setIOs] = useState<IO[]>([])
  const [thanas, setThanas] = useState<Thana[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedThana, setSelectedThana] = useState<string>("all")
  const [selectedDesignation, setSelectedDesignation] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    thana_id: "",
    name: "",
    designation: "",
    email: "",
    mobile: "",
    is_active: true
  })

  useEffect(() => {
    loadThanas()
    loadIOs()
  }, [])

  const loadThanas = async () => {
    try {
      const { data, error } = await supabase
        .from("thanas")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error
      
      // 🔥 FIXED: Type assertion to match Thana interface
      const formattedThanas: Thana[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        railway_district_id: null  // Optional field
      }))
      
      setThanas(formattedThanas)
    } catch (err: any) {
      console.error("Error loading thanas:", err)
      toast.error("Failed to load thanas")
    }
  }

  const loadIOs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("investigating_officers")
        .select(`
          *,
          thana:thanas (
            id,
            name,
            code
          )
        `)
        .order("name", { ascending: true })

      if (error) throw error
      setIOs(data || [])
    } catch (err: any) {
      console.error("Error loading IOs:", err)
      toast.error("Failed to load investigating officers")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.thana_id || !formData.name.trim() || !formData.designation || !formData.mobile.trim()) {
      toast.error("Thana, Name, Designation and Mobile are required")
      return
    }

    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(formData.mobile.trim())) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }

    // Validate email if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        toast.error("Please enter a valid email address")
        return
      }
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("investigating_officers")
          .update({
            thana_id: parseInt(formData.thana_id),
            name: formData.name.trim(),
            designation: formData.designation,
            email: formData.email.trim() || null,
            mobile: formData.mobile.trim(),
            is_active: formData.is_active
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("IO updated successfully!")
      } else {
        // Insert
        const { error } = await supabase
          .from("investigating_officers")
          .insert({
            thana_id: parseInt(formData.thana_id),
            name: formData.name.trim(),
            designation: formData.designation,
            email: formData.email.trim() || null,
            mobile: formData.mobile.trim(),
            is_active: formData.is_active
          })

        if (error) throw error
        toast.success("IO added successfully!")
      }

      resetForm()
      loadIOs()
    } catch (err: any) {
      console.error("Error saving IO:", err)
      toast.error(err.message || "Failed to save investigating officer")
    }
  }

  const handleEdit = (io: IO) => {
    setFormData({
      thana_id: io.thana_id.toString(),
      name: io.name,
      designation: io.designation,
      email: io.email || "",
      mobile: io.mobile || "",
      is_active: io.is_active
    })
    setEditingId(io.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from("investigating_officers")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("IO deleted successfully!")
      loadIOs()
    } catch (err: any) {
      console.error("Error deleting IO:", err)
      toast.error(err.message || "Failed to delete investigating officer")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("investigating_officers")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`IO ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadIOs()
    } catch (err: any) {
      console.error("Error toggling IO:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      thana_id: "",
      name: "",
      designation: "",
      email: "",
      mobile: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter IOs
  const filteredIOs = ios.filter(io => {
    const matchesSearch = io.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         io.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         io.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         io.thana?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesThana = selectedThana === "all" || io.thana_id.toString() === selectedThana
    const matchesDesignation = selectedDesignation === "all" || io.designation === selectedDesignation
    
    return matchesSearch && matchesThana && matchesDesignation
  })

  const getDesignationBadge = (designation: string) => {
    const colors: Record<string, string> = {
      "SP (Superintendent of Police)": "bg-purple-100 text-purple-700 border-purple-300",
      "DSP (Deputy Superintendent)": "bg-indigo-100 text-indigo-700 border-indigo-300",
      "Inspector": "bg-blue-100 text-blue-700 border-blue-300",
      "Sub-Inspector": "bg-green-100 text-green-700 border-green-300",
      "SHO (Station House Officer)": "bg-orange-100 text-orange-700 border-orange-300",
      "Circle Inspector": "bg-teal-100 text-teal-700 border-teal-300"
    }
    return colors[designation] || "bg-gray-100 text-gray-700 border-gray-300"
  }

  const isHighRank = (designation: string) => {
    return ["SP (Superintendent of Police)", "DSP (Deputy Superintendent)", "SHO (Station House Officer)"].includes(designation)
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Investigating Officers (IOs)</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage investigating officer records
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, mobile, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedThana}
            onChange={(e) => setSelectedThana(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Thanas</option>
            {thanas.map(thana => (
              <option key={thana.id} value={thana.id.toString()}>
                {thana.name} ({thana.code})
              </option>
            ))}
          </select>
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Designations</option>
            {DESIGNATIONS.map(des => (
              <option key={des} value={des}>{des}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadIOs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add IO
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Investigating Officer" : "Add New Investigating Officer"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Thana/Police Station *</Label>
                    <select
                      value={formData.thana_id}
                      onChange={(e) => setFormData({ ...formData, thana_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                    >
                      <option value="">-- Select Thana --</option>
                      {thanas.map(thana => (
                        <option key={thana.id} value={thana.id}>
                          {thana.name} ({thana.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Name of IO *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., Inspector Ramesh Kumar"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Designation *</Label>
                    <select
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                    >
                      <option value="">-- Select Designation --</option>
                      {DESIGNATIONS.map(des => (
                        <option key={des} value={des}>{des}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Mobile Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., 9876543210"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="pl-10"
                        required
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email ID</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="e.g., io.name@railwaypolice.gov.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      Active Officer
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

        {/* IOs List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Investigating Officers List ({filteredIOs.length})</span>
              <Badge variant="secondary">{ios.length} Total Officers</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading officers...</p>
              </div>
            ) : filteredIOs.length === 0 ? (
              <div className="py-12 text-center">
                <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No investigating officers found</p>
                {ios.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First IO
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME OF IO</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DESIGNATION</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">THANA</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">MOBILE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">EMAIL</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredIOs.map((io, index) => (
                      <tr key={io.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{io.name}</span>
                            {isHighRank(io.designation) && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${getDesignationBadge(io.designation)} font-semibold border`}>
                            {io.designation}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Home className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{io.thana?.name}</span>
                            {io.thana?.code && (
                              <Badge variant="outline" className="text-xs">
                                {io.thana.code}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {io.mobile && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{io.mobile}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {io.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[200px]">{io.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(io.id, io.is_active)}
                            className="h-8"
                          >
                            {io.is_active ? (
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
                              onClick={() => handleEdit(io)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(io.id, io.name)}
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
              <p className="text-xs text-blue-600 font-semibold">Total IOs</p>
              <p className="text-2xl font-bold text-blue-700">{ios.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Active IOs</p>
              <p className="text-2xl font-bold text-green-700">
                {ios.filter(io => io.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">Inspectors & Above</p>
              <p className="text-2xl font-bold text-purple-700">
                {ios.filter(io => isHighRank(io.designation)).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Thanas Covered</p>
              <p className="text-2xl font-bold text-orange-700">
                {new Set(ios.map(io => io.thana_id)).size}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}