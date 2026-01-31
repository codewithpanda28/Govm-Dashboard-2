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
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface UserData {
  id: number
  auth_id?: string // Added auth_id
  email: string
  full_name: string
  role: string
  belt_number: string | null
  rank: string | null
  mobile: string | null
  designation: string | null
  thana_id: number | null
  district_id: number | null
  is_active: boolean
  created_at: string
}

interface Thana {
  id: number
  name: string
  code: string
}

interface District {
  id: number
  name: string
  code: string
}

const ROLES = [
  { value: "super_admin", label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "admin", label: "Admin", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "district_admin", label: "District Admin", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  { value: "station_officer", label: "Station Officer", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "data_operator", label: "Data Operator", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "viewer", label: "Viewer", color: "bg-gray-100 text-gray-700 border-gray-300" }
]

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

const RANKS = [
  "SP",
  "DSP", 
  "Inspector",
  "Sub-Inspector",
  "ASI",
  "Head Constable",
  "Constable",
  "Other"
]

export default function ManageUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserData[]>([])
  const [thanas, setThanas] = useState<Thana[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    role: "station_officer",
    belt_number: "",
    rank: "",
    mobile: "",
    designation: "",
    thana_id: "",
    district_id: "",
    is_active: true
  })

  useEffect(() => {
    loadThanas()
    loadDistricts()
    loadUsers()
  }, [])

  const loadThanas = async () => {
    try {
      const { data, error } = await supabase
        .from("thanas")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error
      setThanas(data || [])
    } catch (err: any) {
      console.error("Error loading thanas:", err)
    }
  }

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error
      setDistricts(data || [])
    } catch (err: any) {
      console.error("Error loading districts:", err)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("full_name", { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error("Error loading users:", err)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.email.trim() || !formData.full_name.trim() || !formData.role) {
      toast.error("Email, Name and Role are required")
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

    // Mobile validation if provided
    if (formData.mobile.trim()) {
      const mobileRegex = /^[6-9]\d{9}$/
      if (!mobileRegex.test(formData.mobile.trim())) {
        toast.error("Please enter a valid 10-digit mobile number")
        return
      }
    }

    setCreating(true)
    
    try {
      if (editingId) {
        // ✅ UPDATE USER - Only update database record
        const updateData: any = {
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          is_active: formData.is_active
        }

        // Optional fields
        if (formData.belt_number.trim()) updateData.belt_number = formData.belt_number.trim()
        if (formData.rank) updateData.rank = formData.rank
        if (formData.mobile.trim()) updateData.mobile = formData.mobile.trim()
        if (formData.designation) updateData.designation = formData.designation
        if (formData.thana_id) updateData.thana_id = parseInt(formData.thana_id)
        if (formData.district_id) updateData.district_id = parseInt(formData.district_id)

        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("User updated successfully!")
        
      } else {
        // ✅ CREATE NEW USER - Use API route
        console.log('🚀 Creating new user via API...')
        
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            full_name: formData.full_name.trim(),
            role: formData.role,
            belt_number: formData.belt_number || null,
            rank: formData.rank || null,
            mobile: formData.mobile || null,
            designation: formData.designation || null,
            thana_id: formData.thana_id ? parseInt(formData.thana_id) : null,
            district_id: formData.district_id ? parseInt(formData.district_id) : null,
            is_active: formData.is_active
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user')
        }
        
        console.log('✅ User created:', result)
        toast.success("User created successfully! They can now login.")
      }

      resetForm()
      loadUsers()
    } catch (err: any) {
      console.error("Error saving user:", err)
      toast.error(err.message || "Failed to save user")
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (user: UserData) => {
    setFormData({
      email: user.email,
      password: "",
      confirm_password: "",
      full_name: user.full_name,
      role: user.role,
      belt_number: user.belt_number || "",
      rank: user.rank || "",
      mobile: user.mobile || "",
      designation: user.designation || "",
      thana_id: user.thana_id?.toString() || "",
      district_id: user.district_id?.toString() || "",
      is_active: user.is_active
    })
    setEditingId(user.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string, authId?: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?\n\nThis action cannot be undone!`)) return

    try {
      // If user has auth_id, use API route to delete properly
      if (authId) {
        const response = await fetch(`/api/auth/delete-user?user_id=${id}&auth_id=${authId}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete user')
        }
      } else {
        // Old user without auth_id - just delete from database
        const { error } = await supabase
          .from("users")
          .delete()
          .eq("id", id)

        if (error) throw error
      }

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
      email: "",
      password: "",
      confirm_password: "",
      full_name: "",
      role: "station_officer",
      belt_number: "",
      rank: "",
      mobile: "",
      designation: "",
      thana_id: "",
      district_id: "",
      is_active: true
    })
    setEditingId(null)
    setShowForm(false)
    setShowPassword(false)
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.mobile?.includes(searchQuery) ||
                         user.belt_number?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole
    const matchesStatus = selectedStatus === "all" || 
                         (selectedStatus === "active" && user.is_active) ||
                         (selectedStatus === "inactive" && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role)
    return roleConfig || { value: role, label: role, color: "bg-gray-100 text-gray-700 border-gray-300" }
  }

  const getThanaName = (thanaId: number | null) => {
    if (!thanaId) return null
    return thanas.find(t => t.id === thanaId)?.name || null
  }

  const getDistrictName = (districtId: number | null) => {
    if (!districtId) return null
    return districts.find(d => d.id === districtId)?.name || null
  }

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

        {/* Filters & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, mobile, belt number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-primary/20">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit User" : "Create New User"}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., Ramesh Kumar"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
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
                        disabled={!!editingId} // Can't change email for existing user
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Mobile Number</Label>
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
                </div>

                {/* Password (for new users only) */}
                {!editingId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Password *</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 6 characters"
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
                  </div>
                )}

                {/* Role & Designation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Role *</Label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                      required
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
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
                    <Label>Rank</Label>
                    <select
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="">-- Select Rank --</option>
                      {RANKS.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location & Belt */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>District</Label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="">-- Select District --</option>
                      {districts.map(district => (
                        <option key={district.id} value={district.id}>
                          {district.name} ({district.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Thana (Police Station)</Label>
                    <select
                      value={formData.thana_id}
                      onChange={(e) => setFormData({ ...formData, thana_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
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
                    <Label>Belt Number</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., RPF12345"
                        value={formData.belt_number}
                        onChange={(e) => setFormData({ ...formData, belt_number: e.target.value.toUpperCase() })}
                        className="pl-10"
                      />
                    </div>
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
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? "Update User" : "Create User"}
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
              <span>Users List ({filteredUsers.length})</span>
              <Badge variant="secondary">{users.length} Total Users</Badge>
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
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold">S.NO.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">EMAIL / MOBILE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">ROLE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">DESIGNATION</th>
                      <th className="px-4 py-3 text-left text-xs font-bold">LOCATION</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">AUTH</th>
                      <th className="px-4 py-3 text-center text-xs font-bold">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user, index) => {
                      const roleBadge = getRoleBadge(user.role)
                      return (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                {user.belt_number && (
                                  <p className="text-xs text-muted-foreground">Belt: {user.belt_number}</p>
                                )}
                              </div>
                            </div>
                          </td>
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
                          <td className="px-4 py-3">
                            <Badge className={`${roleBadge.color} font-semibold border`}>
                              {roleBadge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {user.designation && (
                                <p className="text-sm">{user.designation}</p>
                              )}
                              {user.rank && (
                                <p className="text-xs text-muted-foreground">Rank: {user.rank}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {getDistrictName(user.district_id) && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  {getDistrictName(user.district_id)}
                                </div>
                              )}
                              {getThanaName(user.thana_id) && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Home className="h-3 w-3" />
                                  {getThanaName(user.thana_id)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {user.auth_id ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                <Key className="h-3 w-3 mr-1" />
                                YES
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-300">
                                <X className="h-3 w-3 mr-1" />
                                NO
                              </Badge>
                            )}
                          </td>
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
                                onClick={() => handleDelete(user.id, user.full_name, user.auth_id)}
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
              <p className="text-xs text-purple-600 font-semibold">Can Login</p>
              <p className="text-2xl font-bold text-purple-700">
                {users.filter(u => u.auth_id).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-xs text-orange-600 font-semibold">Station Officers</p>
              <p className="text-2xl font-bold text-orange-700">
                {users.filter(u => u.role === 'station_officer').length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}