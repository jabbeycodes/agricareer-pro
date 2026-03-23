import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'application-docs'

export async function uploadPdf(
  supabase: SupabaseClient,
  jobId: string,
  filename: string,
  buffer: Buffer
): Promise<string | null> {
  const path = `${jobId}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    console.error(`Upload error (${path}):`, error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
