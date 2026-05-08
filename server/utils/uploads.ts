import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export async function deleteUploadFile(url: string): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return
  const filename = url.slice('/uploads/'.length)
  // prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) return
  try {
    await unlink(join(process.cwd(), 'public', 'uploads', filename))
  }
  catch {
    // файл уже удалён или недоступен — не критично
  }
}

export async function deleteUploadFiles(urls: string[]): Promise<void> {
  await Promise.all(urls.map(deleteUploadFile))
}
