import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ProprietressClassView } from '@/components/admin/ProprietressClassView'
import { HeadmasterClassView } from '@/components/admin/HeadmasterClassView'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ classId: string }>
}

/**
 * Server Component — reads the authenticated user's role on every request.
 * Renders ProprietressClassView or HeadmasterClassView; never both.
 * Redirects any other role to /login.
 */
export default async function ClassDrilldownPage({ params }: PageProps) {
  const { classId } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profileData?.role as UserRole | undefined

  if (role === 'proprietress') return <ProprietressClassView classId={classId} />
  if (role === 'headmaster') return <HeadmasterClassView classId={classId} />

  redirect('/login')
}
