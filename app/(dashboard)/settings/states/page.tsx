"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  MapPin, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Upload
} from "lucide-react"
import { toast } from "sonner"

interface State {
  id: number
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export default function ManageStatesPage() {
  const supabase = createClient()
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false) // 🆕
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
  }, [])

  const loadStates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("states")
        .select("id, name, code, is_active, created_at")
        .order("name", { ascending: true })

      if (error) throw error
      setStates(data || [])
    } catch (err: any) {
      console.error("Error loading states:", err)
      toast.error("Failed to load states")
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

      const statesData: any[] = []
      
      dataRows.forEach((row) => {
        const columns = row.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''))
        
        if (columns.length >= 2) {
          const [name, code, isActive] = columns
          
          if (name && code) {
            statesData.push({
              name: name.trim(),
              code: code.trim().toUpperCase(),
              is_active: isActive ? (isActive.toLowerCase() === 'true' || isActive === '1' || isActive.toLowerCase() === 'yes') : true
            })
          }
        }
      })

      if (statesData.length === 0) {
        toast.error("No valid data to import")
        setUploading(false)
        return
      }

      // Insert data
      const { error } = await supabase
        .from("states")
        .upsert(statesData, { onConflict: 'code' })

      if (error) throw error

      toast.success(`Successfully imported ${statesData.length} state(s)`)
      loadStates()

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
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("State name and code are required")
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("states")
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            is_active: formData.is_active
          })
          .eq("id", editingId)

        if (error) throw error
        toast.success("State updated successfully!")
      } else {
        const { error } = await supabase
          .from("states")
          .insert({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            is_active: formData.is_active
          })

        if (error) throw error
        toast.success("State added successfully!")
      }

      resetForm()
      loadStates()
    } catch (err: any) {
      console.error("Error saving state:", err)
      toast.error(err.message || "Failed to save state")
    }
  }

  const handleEdit = (state: State) => {
    setFormData({
      name: state.name,
      code: state.code,
      is_active: state.is_active
    })
    setEditingId(state.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis may affect related districts and data!`)) return

    try {
      const { error } = await supabase
        .from("states")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("State deleted successfully!")
      loadStates()
    } catch (err: any) {
      console.error("Error deleting state:", err)
      toast.error(err.message || "Failed to delete state")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("states")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`State ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadStates()
    } catch (err: any) {
      console.error("Error toggling state:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({ name: "", code: "", is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const filteredStates = states.filter(state =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage States</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage state records
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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

            <Button variant="outline" onClick={loadStates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add State
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit State" : "Add New State"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>State Name *</Label>
                    <Input
                      placeholder="e.g., Bihar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>State Code *</Label>
                    <Input
                      placeholder="e.g., BR"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                      maxLength={5}
                    />
                  </div>
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
                    Active
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

        {/* States List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>States List ({filteredStates.length})</span>
              <Badge variant="secondary">{states.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading states...</p>
              </div>
            ) : filteredStates.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No states found</p>
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First State
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">STATE CODE</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStates.map((state, index) => (
                      <tr key={state.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{state.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            {state.code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(state.id, state.is_active)}
                            className="h-8"
                          >
                            {state.is_active ? (
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
                              onClick={() => handleEdit(state)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(state.id, state.name)}
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs text-blue-600 font-semibold">Total States</p>
              <p className="text-2xl font-bold text-blue-700">{states.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Active States</p>
              <p className="text-2xl font-bold text-green-700">
                {states.filter(s => s.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs text-red-600 font-semibold">Inactive States</p>
              <p className="text-2xl font-bold text-red-700">
                {states.filter(s => !s.is_active).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}