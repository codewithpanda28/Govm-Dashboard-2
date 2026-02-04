"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Shield, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Hash, AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface Crime {
  id: number
  crime_name: string
  crime_code: string
  is_active: boolean
  created_at: string
}

export default function ManageCrimesPage() {
  const supabase = createClient()
  const [crimes, setCrimes] = useState<Crime[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    crime_name: "",
    crime_code: "",
    is_active: true
  })

  useEffect(() => {
    loadCrimes()
  }, [])

  const loadCrimes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("crimes")
        .select("*")
        .order("crime_name", { ascending: true })

      if (error) {
        console.error("Crimes load error:", error)
        throw error
      }
      
      console.log("Crimes loaded:", data?.length || 0)
      setCrimes(data || [])
    } catch (err: any) {
      console.error("Error loading crimes:", err)
      toast.error("Failed to load crimes")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.crime_name.trim() || !formData.crime_code.trim()) {
      toast.error("Crime Name and Code are required")
      return
    }

    try {
      // Check if crime code already exists
      const { data: existingCrime } = await supabase
        .from("crimes")
        .select("id")
        .eq("crime_code", formData.crime_code.trim().toUpperCase())
        .neq("id", editingId || 0)
        .single()

      if (existingCrime) {
        toast.error("Crime code already exists!")
        return
      }

      const insertData = {
        crime_name: formData.crime_name.trim(),
        crime_code: formData.crime_code.trim().toUpperCase(),
        is_active: formData.is_active
      }

      console.log("Saving crime:", insertData)

      if (editingId) {
        const { error } = await supabase
          .from("crimes")
          .update(insertData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Crime updated successfully!")
      } else {
        const { error } = await supabase
          .from("crimes")
          .insert(insertData)

        if (error) throw error
        toast.success("Crime added successfully!")
      }

      resetForm()
      loadCrimes()
    } catch (err: any) {
      console.error("Error saving crime:", err)
      toast.error(err.message || "Failed to save crime")
    }
  }

  const handleEdit = (crime: Crime) => {
    setFormData({
      crime_name: crime.crime_name || "",
      crime_code: crime.crime_code || "",
      is_active: crime.is_active
    })
    setEditingId(crime.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`⚠️ Are you sure you want to DELETE "${name}"?\n\nThis action cannot be undone!`)) {
      return
    }

    try {
      const { error } = await supabase
        .from("crimes")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        
        // Check for foreign key constraint
        if (error.message.includes("foreign key constraint")) {
          toast.error(
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Cannot delete this crime!</p>
                <p className="text-sm mt-1">
                  This crime is being used in FIR records.
                </p>
                <p className="text-sm mt-1 font-medium">
                  Please remove it from all FIRs first.
                </p>
              </div>
            </div>,
            { duration: 6000 }
          )
        } else {
          toast.error(`Failed to delete: ${error.message}`)
        }
        return
      }

      toast.success(`Crime "${name}" deleted successfully!`)
      loadCrimes()
      
    } catch (err: any) {
      console.error("Error deleting crime:", err)
      toast.error("Failed to delete crime")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("crimes")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`Crime ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadCrimes()
    } catch (err: any) {
      console.error("Error toggling crime:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ 
      crime_name: "",
      crime_code: "",
      is_active: true 
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter crimes
  const filteredCrimes = crimes.filter(crime => {
    const matchesSearch = 
      crime.crime_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crime.crime_code?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Crimes</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage crime records
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search crimes by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCrimes} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Crime
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Crime" : "Create Crime"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Crime Name */}
                  <div className="lg:col-span-1">
                    <Label>Crime Name *</Label>
                    <div className="relative mt-1">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., Theft, Assault, Fraud"
                        value={formData.crime_name}
                        onChange={(e) => setFormData({ ...formData, crime_name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Code of Crime */}
                  <div>
                    <Label>Code of Crime *</Label>
                    <div className="relative mt-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., THF001, AST002"
                        value={formData.crime_code}
                        onChange={(e) => setFormData({ ...formData, crime_code: e.target.value.toUpperCase() })}
                        className="pl-10"
                        required
                        maxLength={20}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Code will be automatically converted to uppercase
                    </p>
                  </div>

                  {/* Active Checkbox */}
                  <div className="flex items-center gap-2 pt-7">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active Crime Type
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

        {/* Crimes List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Crime List ({filteredCrimes.length})</span>
              </div>
              <Badge variant="secondary">{crimes.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading crimes...</p>
              </div>
            ) : filteredCrimes.length === 0 ? (
              <div className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No crimes found</p>
                {crimes.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Crime
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CRIME NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CRIME CODE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CREATED</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCrimes.map((crime, index) => (
                      <tr key={crime.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{crime.crime_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                            {crime.crime_code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(crime.id, crime.is_active)}
                            className="h-8"
                          >
                            {crime.is_active ? (
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
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(crime.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(crime)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(crime.id, crime.crime_name)}
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
              <p className="text-xs text-blue-600 font-semibold">Total Crimes</p>
              <p className="text-2xl font-bold text-blue-700">{crimes.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Active Crimes</p>
              <p className="text-2xl font-bold text-green-700">
                {crimes.filter(c => c.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs text-red-600 font-semibold">Inactive Crimes</p>
              <p className="text-2xl font-bold text-red-700">
                {crimes.filter(c => !c.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">Last Added</p>
              <p className="text-sm font-bold text-purple-700 truncate">
                {crimes.length > 0 
                  ? crimes[crimes.length - 1]?.crime_name 
                  : "None"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}