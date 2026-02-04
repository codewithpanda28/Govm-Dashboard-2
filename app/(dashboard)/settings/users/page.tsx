"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Users, Plus, Edit, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Save, X, Phone, Mail,
  Shield, User, Eye, EyeOff, Key, Building, Home,
  Loader2, Camera, Upload, MapPin, UserCheck, AlertCircle
} from "lucide-react"
import { toast } from "sonner"

// Types remain same as before...
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
  name: string
  code: string
  district_id?: number
  zone_id?: number
  is_active: boolean
}

interface UserData {
  id: number
  auth_id?: string
  user_id?: string  // Make optional for backward compatibility
  email: string
  full_name: string
  designation?: string | null
  mobile?: string | null
  photo_url?: string | null
  higher_authority_id?: number | null
  state_id?: number | null
  zone_id?: number | null
  district_id?: number | null
  thana_id?: number | null
  is_active: boolean
  created_at: string
  role?: string
}

const DESIGNATIONS = [
  "SP (Superintendent of Police)",
  "DSP (Deputy Superintendent)",
  "Inspector",
  "Sub-Inspector",
  "ASI (Assistant Sub-Inspector)",
  "Head Constable",
  "Constable",
  "SHO (Station House Officer)",
  "Data Entry Operator",
  "Clerk",
  "Other"
]

export default function ManageUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserData[]>([])
  const [states, setStates] = useState<State[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [thanas, setThanas] = useState<Thana[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([])
  const [filteredThanas, setFilteredThanas] = useState<Thana[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  const [formData, setFormData] = useState({
    user_id: "",
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    designation: "",
    mobile: "",
    photo_url: "",
    higher_authority_id: "",
    state_id: "",
    zone_id: "",
    district_id: "",
    thana_id: "",
    is_active: true
  })

  useEffect(() => {
    loadStates()
    loadZones()
    loadDistricts()
    loadThanas()
    loadUsers()
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

  // Filter thanas when district changes
  useEffect(() => {
    if (formData.district_id) {
      const filtered = thanas.filter(t => t.district_id === parseInt(formData.district_id) && t.is_active)
      setFilteredThanas(filtered)
    } else {
      setFilteredThanas([])
    }
  }, [formData.district_id, thanas])

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
        .select("*")
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
    try {
      const { data, error } = await supabase
        .from("thanas")
        .select("*")
        .order("name", { ascending: true })
      if (error) throw error
      setThanas(data || [])
    } catch (err: any) {
      console.error("Error loading thanas:", err)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      console.log("✅ Users loaded:", data?.length || 0)
      if (data && data.length > 0) {
        console.log("First user data:", {
          id: data[0].id,
          user_id: data[0].user_id,
          photo_url: data[0].photo_url ? "Has photo" : "No photo",
          higher_authority_id: data[0].higher_authority_id
        })
      }
      
      setUsers(data || [])
    } catch (err: any) {
      console.error("❌ Error loading users:", err)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }

    if (file.size > 300 * 1024) { // 300KB
      toast.error("Image size must be less than 300KB")
      return
    }

    setUploadingPhoto(true)

    try {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        console.log("📸 Photo uploaded, size:", base64.length)
        setFormData(prev => ({ ...prev, photo_url: base64 }))
        toast.success("Photo uploaded successfully!")
      }
      
      reader.onerror = () => {
        toast.error("Failed to read image file")
      }
      
      reader.readAsDataURL(file)
      
    } catch (err) {
      console.error("Error processing photo:", err)
      toast.error("Failed to process photo")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removePhoto = () => {
    setFormData({ ...formData, photo_url: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.user_id.trim()) {
      toast.error("User ID is required")
      return
    }

    if (!formData.email.trim() || !formData.full_name.trim()) {
      toast.error("Email and Name are required")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid email address")
      return
    }

    // Password validation for new users
    if (!editingId) {
      if (!formData.password || formData.password.length < 6) {
        toast.error("Password must be at least 6 characters")
        return
      }
      if (formData.password !== formData.confirm_password) {
        toast.error("Passwords do not match")
        return
      }
    }

    setCreating(true)
    
    try {
      // Prepare data with ALL fields
      const userData: any = {
        user_id: formData.user_id.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        designation: formData.designation || null,
        mobile: formData.mobile.trim() || null,
        photo_url: formData.photo_url || null,
        higher_authority_id: formData.higher_authority_id ? parseInt(formData.higher_authority_id) : null,
        state_id: formData.state_id ? parseInt(formData.state_id) : null,
        zone_id: formData.zone_id ? parseInt(formData.zone_id) : null,
        district_id: formData.district_id ? parseInt(formData.district_id) : null,
        thana_id: formData.thana_id ? parseInt(formData.thana_id) : null,
        is_active: formData.is_active
      }

      // Add role for new users
      if (!editingId) {
        userData.role = 'station_officer'
      }

      console.log("💾 Saving user with data:", {
        ...userData,
        photo_url: userData.photo_url ? "Has photo" : "No photo"
      })

      if (editingId) {
        // UPDATE USER
        const { data, error } = await supabase
          .from("users")
          .update(userData)
          .eq("id", editingId)
          .select()
          .single()

        if (error) throw error
        
        console.log("✅ User updated successfully:", data)
        toast.success("User updated successfully!")
        
      } else {
        // CREATE NEW USER
        const { data, error } = await supabase
          .from("users")
          .insert([userData])  // Note: wrap in array
          .select()
          .single()

        if (error) {
          console.error("❌ Insert error:", error)
          throw error
        }
        
        console.log("✅ User created successfully:", data)
        toast.success("User created successfully!")
      }

      // Immediately reload users
      setTimeout(() => {
        loadUsers()
      }, 500)
      
      resetForm()
    } catch (err: any) {
      console.error("❌ Error saving user:", err)
      
      // Better error messages
      if (err.message?.includes('duplicate key')) {
        toast.error("User ID already exists! Please use a different User ID.")
      } else if (err.message?.includes('foreign key')) {
        toast.error("Invalid location selection. Please select valid State, District, and Thana.")
      } else {
        toast.error(err.message || "Failed to save user")
      }
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (user: UserData) => {
    console.log("📝 Editing user:", user)
    setFormData({
      user_id: user.user_id || "",
      email: user.email || "",
      password: "",
      confirm_password: "",
      full_name: user.full_name || "",
      designation: user.designation || "",
      mobile: user.mobile || "",
      photo_url: user.photo_url || "",
      higher_authority_id: user.higher_authority_id?.toString() || "",
      state_id: user.state_id?.toString() || "",
      zone_id: user.zone_id?.toString() || "",
      district_id: user.district_id?.toString() || "",
      thana_id: user.thana_id?.toString() || "",
      is_active: user.is_active !== false
    })
    setEditingId(user.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?\n\nThis action cannot be undone!`)) return

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("User deleted successfully!")
      loadUsers()
    } catch (err: any) {
      console.error("Error deleting user:", err)
      toast.error(err.message || "Failed to delete user")
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: !currentStatus })
        .eq("id", id)

      if (error) throw error
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}!`)
      loadUsers()
    } catch (err: any) {
      console.error("Error toggling user:", err)
      toast.error("Failed to update status")
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: "",
      email: "",
      password: "",
      confirm_password: "",
      full_name: "",
      designation: "",
      mobile: "",
      photo_url: "",
      higher_authority_id: "",
      state_id: "",
      zone_id: "",
      district_id: "",
      thana_id: "",
      is_active: true
    })
    setEditingId(null)
    setShowForm(false)
    setShowPassword(false)
  }

  // Helper functions
  const getLocationNames = (user: UserData) => {
    const state = states.find(s => s.id === user.state_id)?.name
    const zone = zones.find(z => z.id === user.zone_id)?.zone_name
    const district = districts.find(d => d.id === user.district_id)?.name
    const thana = thanas.find(t => t.id === user.thana_id)?.name
    
    return { state, zone, district, thana }
  }

  const getHigherAuthorityName = (authorityId: number | null | undefined) => {
    if (!authorityId) return null
    const authority = users.find(u => u.id === authorityId)
    return authority?.full_name || null
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.mobile?.includes(searchQuery) ||
                         user.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Manage Users</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage system users
              </p>
            </div>
          </div>
        </div>

        {/* Debug Info - Remove in production */}
        {/* {process.env.NODE_ENV === 'development' && users.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 mb-1">Debug Info:</p>
            <p className="text-xs text-yellow-700">
              First user: user_id={users[0].user_id || 'MISSING'}, 
              photo={users[0].photo_url ? 'YES' : 'NO'}, 
              higher_auth={users[0].higher_authority_id || 'NONE'}
            </p>
          </div>
        )} */}

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, mobile, user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit User" : "Create User"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Location Details */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>State *</Label>
                      <select
                        value={formData.state_id}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          state_id: e.target.value, 
                          zone_id: "", 
                          district_id: "", 
                          thana_id: "" 
                        })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                        required
                      >
                        <option value="">-- Select State --</option>
                        {states.map(state => (
                          <option key={state.id} value={state.id}>{state.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Zone Name</Label>
                      <select
                        value={formData.zone_id}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          zone_id: e.target.value,
                          district_id: "",
                          thana_id: ""
                        })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                        disabled={!formData.state_id}
                      >
                        <option value="">-- Select Zone --</option>
                        {filteredZones.map(zone => (
                          <option key={zone.id} value={zone.id}>{zone.zone_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>District Name *</Label>
                      <select
                        value={formData.district_id}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          district_id: e.target.value,
                          thana_id: ""
                        })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                        required
                        disabled={!formData.state_id}
                      >
                        <option value="">-- Select District --</option>
                        {filteredDistricts.map(district => (
                          <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Thana Name *</Label>
                      <select
                        value={formData.thana_id}
                        onChange={(e) => setFormData({ ...formData, thana_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                        required
                        disabled={!formData.district_id}
                      >
                        <option value="">-- Select Thana --</option>
                        {filteredThanas.map(thana => (
                          <option key={thana.id} value={thana.id}>{thana.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name of Thana Incharge *</Label>
                      <Input
                        placeholder="e.g., Inspector Ramesh Kumar"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label>Designation</Label>
                      <select
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      >
                        <option value="">-- Select Designation --</option>
                        {DESIGNATIONS.map(des => (
                          <option key={des} value={des}>{des}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Email ID *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="e.g., user@railwaypolice.gov.in"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Mobile No.</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., 9876543210"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className="pl-10"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div className="md:col-span-2">
                      <Label>Photo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50">
                          {formData.photo_url ? (
                            <img 
                              src={formData.photo_url} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <label>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                disabled={uploadingPhoto}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingPhoto}
                                asChild
                              >
                                <span className="cursor-pointer">
                                  {uploadingPhoto ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      {formData.photo_url ? 'Change Photo' : 'Upload Photo'}
                                    </>
                                  )}
                                </span>
                              </Button>
                            </label>
                            
                            {formData.photo_url && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={removePhoto}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            JPG/PNG, max 300KB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Higher Authority</Label>
                      <select
                        value={formData.higher_authority_id}
                        onChange={(e) => setFormData({ ...formData, higher_authority_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      >
                        <option value="">-- Select Higher Authority --</option>
                        {users
                          .filter(u => u.id !== editingId && u.is_active)
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} {user.designation ? `(${user.designation})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Login Details */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Login Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>User ID *</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g., ramesh.kumar"
                          value={formData.user_id}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
                            setFormData({ ...formData, user_id: value })
                          }}
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unique username (no spaces)
                      </p>
                    </div>

                    {!editingId && (
                      <>
                        <div>
                          <Label>Password *</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Min 6 characters"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="pl-10 pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label>Confirm Password *</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Re-enter password"
                              value={formData.confirm_password}
                              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active User (Can login to system)
                  </Label>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={creating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || uploadingPhoto}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? "Update" : "Create"} User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>User List ({filteredUsers.length})</span>
              <Badge variant="secondary">{users.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No users found</p>
                {users.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">PHOTO</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME / USER ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">CONTACT</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DESIGNATION</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">HIGHER AUTH.</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user, index) => {
                      const locations = getLocationNames(user)
                      const higherAuth = getHigherAuthorityName(user.higher_authority_id)
                      
                      return (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          
                          {/* PHOTO - Fixed */}
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                              {user.photo_url && user.photo_url.trim() !== '' ? (
                                <>
                                  <img 
                                    src={user.photo_url} 
                                    alt={user.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                      if (fallback) {
                                        fallback.style.display = 'flex'
                                      }
                                    }}
                                  />
                                  <div className="w-full h-full items-center justify-center bg-blue-500 text-white font-bold text-sm hidden">
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold text-sm">
                                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* NAME / USER ID - Fixed */}
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{user.full_name || 'N/A'}</p>
                              {user.user_id ? (
                                <p className="text-xs text-muted-foreground">@{user.user_id}</p>
                              ) : (
                                <p className="text-xs text-red-500">⚠️ No User ID</p>
                              )}
                            </div>
                          </td>
                          
                          {/* CONTACT */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {user.email}
                              </div>
                              {user.mobile && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {user.mobile}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* DESIGNATION */}
                          <td className="px-4 py-3">
                            <p className="text-sm">{user.designation || "-"}</p>
                          </td>
                          
                          {/* LOCATION */}
                          <td className="px-4 py-3">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">{locations.thana || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {[locations.district, locations.zone, locations.state]
                                  .filter(Boolean)
                                  .join(", ") || "-"}
                              </p>
                            </div>
                          </td>
                          
                          {/* HIGHER AUTHORITY - Fixed */}
                          <td className="px-4 py-3">
                            <p className="text-sm">
                              {higherAuth || <span className="text-muted-foreground">-</span>}
                            </p>
                          </td>
                          
                          {/* STATUS */}
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(user.id, user.is_active)}
                              className="h-8"
                            >
                              {user.is_active ? (
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
                          
                          {/* ACTIONS */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(user)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(user.id, user.full_name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
              <p className="text-xs text-blue-600 font-semibold">Total Users</p>
              <p className="text-2xl font-bold text-blue-700">{users.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-xs text-green-600 font-semibold">Active Users</p>
              <p className="text-2xl font-bold text-green-700">
                {users.filter(u => u.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-xs text-purple-600 font-semibold">With Photo</p>
              <p className="text-2xl font-bold text-purple-700">
                {users.filter(u => u.photo_url && u.photo_url.trim() !== '').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">With User ID</p>
              <p className="text-2xl font-bold text-orange-700">
                {users.filter(u => u.user_id && u.user_id.trim() !== '').length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}