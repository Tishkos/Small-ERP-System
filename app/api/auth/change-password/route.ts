/**
 * Change password
 *
 * Self-service only: the signed-in user must prove the current password before
 * setting a new one, so a stolen session cannot lock the real owner out.
 * Clearing `mustChangePassword` here is what retires the seeded admin/admin
 * default.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, hashPassword, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const currentPassword = String(body?.currentPassword ?? '')
    const newPassword = String(body?.newPassword ?? '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are both required' },
        { status: 400 }
      )
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: 'New password must be different from the current one' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        // A successful change also clears any lockout left by failed attempts.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    logger.audit('Password changed', 'User', user.id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
