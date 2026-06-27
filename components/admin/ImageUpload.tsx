'use client'
// components/admin/ImageUpload.tsx — Product image upload to Supabase Storage
import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
}

export default function ImageUpload({ currentUrl, onUpload, onRemove }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    // Show local preview immediately
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const supabase = createClient()
      const ext      = file.name.split('.').pop()
      const path     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false, contentType: file.type })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)

      onUpload(publicUrl)
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onRemove()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Product Image
      </label>

      {preview ? (
        <div className="mt-1 relative w-full aspect-square max-w-[180px] rounded-2xl overflow-hidden border-2 border-cream-dark group">
          <img
            src={preview}
            alt="Product"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!uploading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white text-green-deep rounded-full p-1.5 hover:bg-cream transition-colors"
                title="Change image"
              >
                <Upload size={14} />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="bg-white text-red-500 rounded-full p-1.5 hover:bg-red-50 transition-colors"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="mt-1 w-full max-w-[180px] aspect-square rounded-2xl border-2 border-dashed border-cream-dark
                     flex flex-col items-center justify-center gap-2 cursor-pointer
                     hover:border-green-muted hover:bg-cream/50 transition-colors"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-green-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon size={24} className="text-gray-300" />
              <p className="text-xs text-gray-400 text-center px-3">
                Click or drag to upload
              </p>
              <p className="text-xs text-gray-300">JPG, PNG, WebP · max 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
