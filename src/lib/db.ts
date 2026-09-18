/**
 * Database connection and Prisma client (Prisma 7 with driver adapter)
 * Singleton pattern to prevent multiple instances in development.
 *
 * The client is created lazily. Throwing at module scope when DATABASE_URL is
 * missing breaks `next build` (which imports route modules while collecting
 * page data) and any Docker image built without database credentials. With a
 * lazy client the failure happens on the first real query instead, where it can
 * be handled and reported per request.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Copy .env.example to .env and set it.'
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Proxy that defers client construction to first property access, so importing
 * this module is always safe.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
  has(_target, property) {
    return Reflect.has(getPrismaClient(), property)
  },
})

export default prisma
