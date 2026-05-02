import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')

  if (!file?.data) throw createError({ statusCode: 400, message: 'Файл не передан' })
  if (!ALLOWED_TYPES.includes(file.type ?? '')) throw createError({ statusCode: 400, message: 'Допустимые форматы: JPEG, PNG, WebP, GIF' })
  if (file.data.length > MAX_SIZE) throw createError({ statusCode: 400, message: 'Файл больше 8 МБ' })

  const ext = extname(file.filename ?? '').toLowerCase() || '.jpg'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, name), file.data)

  return { url: `/uploads/${name}` }
})
