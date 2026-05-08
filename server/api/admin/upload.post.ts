import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')

  if (!file?.data) throw createError({ statusCode: 400, message: 'Файл не передан' })
  const ext = MIME_TO_EXT[file.type ?? '']
  if (!ext) throw createError({ statusCode: 400, message: 'Допустимые форматы: JPEG, PNG, WebP, GIF' })
  if (file.data.length > MAX_SIZE) throw createError({ statusCode: 400, message: 'Файл больше 8 МБ' })

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, name), file.data)

  return { url: `/uploads/${name}` }
})
