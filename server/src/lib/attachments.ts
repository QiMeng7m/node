import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { VisionImage } from '../providers/openai.js'

const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const UPLOAD_ROOT = join(SERVER_ROOT, 'uploads')

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export interface AttachmentDto {
  type: 'image'
  url: string
  mime?: string
  name?: string
}

export function validateUploadMime(mime: string): void {
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error('仅支持 JPEG、PNG、WebP、GIF 图片')
  }
}

export function validateUploadSize(size: number): void {
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error('图片大小不能超过 10MB')
  }
}

export function uploadPublicUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/\\/g, '/')}`
}

export function uploadDiskPath(relativePath: string): string {
  const abs = resolve(UPLOAD_ROOT, relativePath)
  if (!abs.startsWith(resolve(UPLOAD_ROOT))) {
    throw new Error('非法文件路径')
  }
  return abs
}

export function uploadRelativePathFromUrl(url: string): string | null {
  const prefix = '/uploads/'
  if (!url.startsWith(prefix)) return null
  const relative = url.slice(prefix.length)
  if (!relative || relative.includes('..')) return null
  return relative
}

export async function saveUploadBuffer(
  buffer: Buffer,
  mime: string,
  originalName?: string,
): Promise<AttachmentDto> {
  validateUploadMime(mime)
  validateUploadSize(buffer.length)

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = mimeToExt(mime, originalName)
  const relativePath = join(year, month, `${randomUUID()}${ext}`)
  const diskPath = uploadDiskPath(relativePath)

  await mkdir(dirname(diskPath), { recursive: true })
  await writeFile(diskPath, buffer)

  return {
    type: 'image',
    url: uploadPublicUrl(relativePath),
    mime,
    name: originalName,
  }
}

function mimeToExt(mime: string, originalName?: string): string {
  if (originalName) {
    const dot = originalName.lastIndexOf('.')
    if (dot > 0) {
      const ext = originalName.slice(dot).toLowerCase()
      if (/^\.(jpe?g|png|webp|gif)$/.test(ext)) return ext
    }
  }
  switch (mime) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    default:
      return '.bin'
  }
}

export async function loadAttachmentImages(attachments: AttachmentDto[]): Promise<VisionImage[]> {
  const images: VisionImage[] = []
  for (const att of attachments) {
    if (att.type !== 'image') continue
    const relative = uploadRelativePathFromUrl(att.url)
    if (!relative) continue
    const diskPath = uploadDiskPath(relative)
    const buffer = await readFile(diskPath)
    images.push({
      mime: att.mime ?? 'image/png',
      base64: buffer.toString('base64'),
    })
  }
  return images
}

export function parseAttachmentsInput(raw: unknown): AttachmentDto[] {
  if (!Array.isArray(raw)) return []
  const result: AttachmentDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const att = item as Record<string, unknown>
    if (att.type !== 'image' || typeof att.url !== 'string' || !att.url.trim()) continue
    result.push({
      type: 'image',
      url: att.url.trim(),
      mime: typeof att.mime === 'string' ? att.mime : undefined,
      name: typeof att.name === 'string' ? att.name : undefined,
    })
  }
  return result
}
