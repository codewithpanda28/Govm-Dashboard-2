"use client"

import { useEffect, useState, ChangeEvent } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Eye, 
  Edit, 
  Scale, 
  User, 
  Loader2, 
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Phone,
  Camera,
  Upload,
  X
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Accused {
  id: number
  full_name: string
  alias_name: string | null
  age: number
  gender: string
  mobile_number: string | null
  aadhar_number: string | null
  photo_url: string | null
  fir_id: number
  bail_status: string | null
  custody_status: string | null
  bail_date: string | null
  court_name: string | null
  bail_remarks: string | null
  created_at: string
  fir?: {
    fir_number: string
  } | null
}

export default function AccusedListPage() {
  const [accused, setAccused] = useState<Accused[]>([])
  const [filteredAccused, setFilteredAccused] = useState<Accused[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Bail Modal State
  const [bailModalOpen, setBailModalOpen] = useState<boolean>(false)
  const [selectedAccused, setSelectedAccused] = useState<Accused | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  
  // Photo Upload Modal
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false)
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  
  // Bail Form State
  const [bailStatus, setBailStatus] = useState<string>("")
  const [custodyStatus, setCustodyStatus] = useState<string>("")
  const [courtName, setCourtName] = useState<string>("")
  const [bailDate, setBailDate] = useState<string>("")
  const [bailRemarks, setBailRemarks] = useState<string>("")

  useEffect(() => {
    loadAccused()
  }, [])

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccused(accused)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = accused.filter(acc => 
        acc.full_name?.toLowerCase().includes(query) ||
        acc.alias_name?.toLowerCase().includes(query) ||
        acc.mobile_number?.includes(query) ||
        acc.aadhar_number?.includes(query) ||
        acc.fir?.fir_number?.toLowerCase().includes(query)
      )
      setFilteredAccused(filtered)
    }
  }, [searchQuery, accused])

  const loadAccused = async (): Promise<void> => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("accused_persons")
        .select(`
          *,
          fir:fir_id (fir_number)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAccused(data || [])
      setFilteredAccused(data || [])
    } catch (error: unknown) {
      console.error("Error:", error)
      toast.error("Failed to load accused list")
    } finally {
      setLoading(false)
    }
  }

  // Open Bail Modal
  const openBailModal = (acc: Accused): void => {
    setSelectedAccused(acc)
    setBailStatus(acc.bail_status || "no_bail")
    setCustodyStatus(acc.custody_status || "not_in_custody")
    setCourtName(acc.court_name || "")
    setBailDate(acc.bail_date || "")
    setBailRemarks(acc.bail_remarks || "")
    setBailModalOpen(true)
  }

  // Open Photo Upload Modal
  const openPhotoModal = (acc: Accused): void => {
    setSelectedAccused(acc)
    setSelectedFile(null)
    setPreviewUrl(acc.photo_url || "")
    setPhotoModalOpen(true)
  }

  // Handle File Select
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Upload Photo
  const uploadPhoto = async (): Promise<void> => {
    if (!selectedAccused || !selectedFile) return

    try {
      setUploadingPhoto(true)
      
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `accused_${selectedAccused.id}_${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(`accused-photos/${fileName}`, selectedFile, {
          cacheControl: "3600",
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(`accused-photos/${fileName}`)

      const photoUrl = urlData.publicUrl

      // Update accused record
      const { error: updateError } = await supabase
        .from("accused_persons")
        .update({ photo_url: photoUrl })
        .eq("id", selectedAccused.id)

      if (updateError) throw updateError

      toast.success("Photo uploaded successfully!")
      setPhotoModalOpen(false)
      loadAccused()
      
    } catch (error: unknown) {
      console.error("Error:", error)
      toast.error("Failed to upload photo")
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Save Bail Status
  const saveBailStatus = async (): Promise<void> => {
    if (!selectedAccused) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from("accused_persons")
        .update({
          bail_status: bailStatus,
          custody_status: custodyStatus,
          court_name: courtName || null,
          bail_date: bailDate || null,
          bail_remarks: bailRemarks || null,
        })
        .eq("id", selectedAccused.id)

      if (error) throw error

      toast.success("Bail status updated successfully!")
      setBailModalOpen(false)
      loadAccused()
      
    } catch (error: unknown) {
      console.error("Error:", error)
      toast.error("Failed to update bail status")
    } finally {
      setSaving(false)
    }
  }

  // Get Badge Color
  const getBailBadge = (status: string | null): JSX.Element => {
    switch (status) {
      case "granted":
        return <Badge className="bg-green-100 text-green-700">✅ Bail Granted</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">❌ Bail Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">⏳ Bail Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700">No Bail</Badge>
    }
  }

  const getCustodyBadge = (status: string | null): JSX.Element => {
    switch (status) {
      case "in_custody":
        return <Badge className="bg-red-100 text-red-700">🔒 In Custody</Badge>
      case "released":
        return <Badge className="bg-green-100 text-green-700">🔓 Released</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700">Not in Custody</Badge>
    }
  }

  // Navigation handler
  const navigateTo = (path: string): void => {
    window.location.href = path
  }

  // Export Functions
  const exportToPDF = (): void => {
    toast.info("PDF export coming soon!")
  }

  const exportToExcel = (): void => {
    toast.info("Excel export coming soon!")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accused Persons Database</h1>
          <p className="text-gray-600">Search and manage all accused persons records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => navigateTo("/accused/add")}>
            <User className="mr-2 h-4 w-4" />
            Add Accused
          </Button>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, mobile number, or Aadhar number..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter name, mobile (e.g., 9876543210), or Aadhar number to search
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Accused Persons Database</h2>
          <p className="text-sm text-gray-500">{filteredAccused.length} Records</p>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>FIR Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccused.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  No accused found
                </TableCell>
              </TableRow>
            ) : (
              filteredAccused.map((acc: Accused) => (
                <TableRow key={acc.id} className="hover:bg-gray-50">
                  {/* Photo Cell */}
                  <TableCell>
                    <div 
                      className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100 cursor-pointer group"
                      onClick={() => openPhotoModal(acc)}
                    >
                      {acc.photo_url ? (
                        <Image
                          src={acc.photo_url}
                          alt={acc.full_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600 font-semibold text-lg">
                          {acc.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Name Cell */}
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{acc.full_name || "N/A"}</p>
                      {acc.alias_name && (
                        <p className="text-sm text-gray-500">Alias: {acc.alias_name}</p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">{acc.age || "N/A"}</TableCell>
                  <TableCell>{acc.gender || "N/A"}</TableCell>
                  
                  {/* Mobile Cell */}
                  <TableCell>
                    {acc.mobile_number ? (
                      <div className="flex items-center gap-1 text-gray-700">
                        <Phone className="h-3 w-3" />
                        {acc.mobile_number}
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {acc.fir?.fir_number || `FIR-${acc.fir_id}`}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getBailBadge(acc.bail_status)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigateTo(`/accused/${acc.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigateTo(`/accused/${acc.id}/edit`)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openBailModal(acc)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="Update Bail"
                      >
                        <Scale className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 📷 Photo Upload Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Upload Photo
            </DialogTitle>
          </DialogHeader>

          {selectedAccused && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium">{selectedAccused.full_name}</p>
                <p className="text-sm text-gray-500">
                  {selectedAccused.fir?.fir_number || `FIR-${selectedAccused.fir_id}`}
                </p>
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                <div className="relative h-40 w-40 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                  {previewUrl ? (
                    <>
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => {
                          setPreviewUrl("")
                          setSelectedFile(null)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <div className="space-y-2">
                <Label>Select Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  Max size: 5MB. Formats: JPG, PNG
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setPhotoModalOpen(false)}
                  disabled={uploadingPhoto}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={uploadPhoto}
                  disabled={uploadingPhoto || !selectedFile}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ⚖️ Bail Status Modal */}
      <Dialog open={bailModalOpen} onOpenChange={setBailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Update Bail Status
            </DialogTitle>
          </DialogHeader>

          {selectedAccused && (
            <div className="space-y-4">
              {/* Accused Info */}
              <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-100">
                  {selectedAccused.photo_url ? (
                    <Image
                      src={selectedAccused.photo_url}
                      alt={selectedAccused.full_name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-blue-600 font-semibold">
                      {selectedAccused.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedAccused.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedAccused.fir?.fir_number || `FIR-${selectedAccused.fir_id}`}
                  </p>
                </div>
              </div>

              {/* Bail Status */}
              <div className="space-y-2">
                <Label>Bail Status *</Label>
                <Select value={bailStatus} onValueChange={setBailStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_bail">No Bail Applied</SelectItem>
                    <SelectItem value="pending">Bail Pending</SelectItem>
                    <SelectItem value="granted">Bail Granted ✅</SelectItem>
                    <SelectItem value="rejected">Bail Rejected ❌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custody Status */}
              <div className="space-y-2">
                <Label>Custody Status *</Label>
                <Select value={custodyStatus} onValueChange={setCustodyStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_in_custody">Not in Custody</SelectItem>
                    <SelectItem value="in_custody">In Custody 🔒</SelectItem>
                    <SelectItem value="released">Released 🔓</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Court Name (Show when bail granted/pending) */}
              {(bailStatus === "granted" || bailStatus === "pending") && (
                <>
                  <div className="space-y-2">
                    <Label>Court Name</Label>
                    <Input
                      value={courtName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCourtName(e.target.value)}
                      placeholder="e.g., Railway Court, Ranchi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bail Date</Label>
                    <Input
                      type="date"
                      value={bailDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setBailDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={bailRemarks}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBailRemarks(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setBailModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveBailStatus}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Scale className="mr-2 h-4 w-4" />
                      Update Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}