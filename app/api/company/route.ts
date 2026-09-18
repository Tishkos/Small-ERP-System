/**
 * Company branding API
 *
 * GET   - the current company name and logo (public: the sign-in screen and the
 *         setup wizard both render branding before a session exists). Only the
 *         name and logo are exposed, which is the same information printed on
 *         every invoice.
 * PATCH - update the name and/or logo. Administrators only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  COMPANY_SETTINGS_ID,
  DEFAULT_COMPANY_NAME,
  getCompanyBranding,
} from '@/lib/company'
import { LogoUploadError, saveCompanyLogo } from '@/lib/logo-upload'

const MAX_NAME_LENGTH = 80

export async function GET() {
  const company = await getCompanyBranding()

  return NextResponse.json({ company })
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    })

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: only administrators can change company branding' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const rawName = formData.get('name')
    const logoFile = formData.get('logo')
    const removeLogo = formData.get('removeLogo') === 'true'

    const updates: { name?: string; logo?: string | null } = {}

    if (typeof rawName === 'string') {
      const name = rawName.trim()

      if (!name) {
        return NextResponse.json(
          { error: 'Company name is required' },
          { status: 400 }
        )
      }

      if (name.length > MAX_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Company name must be ${MAX_NAME_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }

      updates.name = name
    }

    if (logoFile instanceof File && logoFile.size > 0) {
      updates.logo = await saveCompanyLogo(logoFile)
    } else if (removeLogo) {
      // Falls back to the initials monogram.
      updates.logo = null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const company = await prisma.companySettings.upsert({
      where: { id: COMPANY_SETTINGS_ID },
      update: updates,
      create: {
        id: COMPANY_SETTINGS_ID,
        name: updates.name ?? DEFAULT_COMPANY_NAME,
        logo: updates.logo ?? null,
      },
      select: { name: true, logo: true },
    })

    return NextResponse.json({ success: true, company })
  } catch (error) {
    if (error instanceof LogoUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error updating company branding:', error)
    return NextResponse.json(
      { error: 'Failed to update company branding' },
      { status: 500 }
    )
  }
}
