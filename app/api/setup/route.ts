/**
 * First-run setup API
 *
 * GET  - whether the installation still needs setting up.
 * POST - create the company (name + logo) and its first administrator.
 *
 * POST is only reachable while the installation has no user accounts. Once one
 * exists this endpoint is permanently closed, so it cannot be used to mint an
 * extra administrator later.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { COMPANY_SETTINGS_ID, isAppInitialized } from '@/lib/company'
import { LogoUploadError, saveCompanyLogo } from '@/lib/logo-upload'
import { logger } from '@/lib/logger'

const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 80

/** Usernames are used as login identifiers, so keep them unambiguous. */
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/

export async function GET() {
  try {
    const initialized = await isAppInitialized()

    return NextResponse.json({ initialized })
  } catch (error) {
    console.error('Error checking setup status:', error)
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (await isAppInitialized()) {
      return NextResponse.json(
        { error: 'This installation is already set up' },
        { status: 409 }
      )
    }

    const formData = await request.formData()

    const companyName = String(formData.get('companyName') ?? '').trim()
    const adminName = String(formData.get('adminName') ?? '').trim()
    const username = String(formData.get('username') ?? '')
      .trim()
      .toLowerCase()
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()
    const password = String(formData.get('password') ?? '')
    const logoFile = formData.get('logo')

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    if (companyName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Company name must be ${MAX_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    if (!adminName) {
      return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
    }

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        {
          error:
            'Username must be 3-32 characters using lowercase letters, numbers, dots, dashes or underscores',
        },
        { status: 400 }
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Save the logo before opening the transaction: writing a file is not
    // something the database can roll back, and a stray unreferenced image is
    // harmless compared with holding a transaction open across disk I/O.
    let logoPath: string | null = null

    if (logoFile instanceof File && logoFile.size > 0) {
      logoPath = await saveCompanyLogo(logoFile)
    }

    const passwordHash = await hashPassword(password)

    const admin = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so two concurrent setup submissions
      // cannot both create a first administrator.
      if ((await tx.user.count()) > 0) {
        throw new AlreadyInitializedError()
      }

      await tx.companySettings.upsert({
        where: { id: COMPANY_SETTINGS_ID },
        update: { name: companyName, logo: logoPath },
        create: { id: COMPANY_SETTINGS_ID, name: companyName, logo: logoPath },
      })

      return tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          name: adminName,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: { id: true, email: true, username: true },
      })
    })

    logger.info('Installation set up', admin.id, { company: companyName })

    return NextResponse.json({
      success: true,
      username: admin.username,
    })
  } catch (error) {
    if (error instanceof AlreadyInitializedError) {
      return NextResponse.json(
        { error: 'This installation is already set up' },
        { status: 409 }
      )
    }

    if (error instanceof LogoUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Unique violation on email or username
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'That username or email is already taken' },
        { status: 409 }
      )
    }

    console.error('Error during setup:', error)
    return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 })
  }
}

class AlreadyInitializedError extends Error {
  constructor() {
    super('Already initialized')
    this.name = 'AlreadyInitializedError'
  }
}
