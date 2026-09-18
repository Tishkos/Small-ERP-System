/**
 * Authentication Server Actions
 * Application layer for auth operations
 */

'use server';

import { z } from 'zod';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  // Optional short login name; sign-in accepts either this or the email.
  username: z
    .string()
    .regex(
      /^[a-z0-9._-]{3,32}$/,
      'Username must be 3-32 characters: lowercase letters, numbers, dots, dashes or underscores'
    )
    .optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Signup action
 */
export async function signupAction(input: SignupInput) {
  try {
    // Validate input
    const validated = signupSchema.parse(input);

    const email = validated.email.toLowerCase();
    const username = validated.username?.toLowerCase();

    // Check if the email or username is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
      select: { email: true },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          existingUser.email === email
            ? 'Email already registered'
            : 'Username already taken',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user with PENDING status
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: validated.name,
        phone: validated.phone,
        status: 'PENDING',
        role: 'VIEWER',
      },
    });

    logger.info('User signed up', undefined, { userId: user.id, email: user.email });

    return {
      success: true,
      message: 'Signup successful. Please wait for approval.',
    };
  } catch (error) {
    logger.error('Signup error', undefined, { error });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation error',
      };
    }

    return {
      success: false,
      error: 'An error occurred during signup',
    };
  }
}


