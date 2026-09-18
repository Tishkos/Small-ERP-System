import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Schema-only commands (`prisma generate`, `validate`, `format`) never open a
 * connection, so they must not hard-fail on a fresh clone that has no `.env`
 * yet. Using `env('DATABASE_URL')` here throws a PrismaConfigEnvError before
 * the command even starts, which breaks `npm install` -> `prisma generate` and
 * Docker builds. Fall back to an unreachable placeholder instead: commands that
 * really need the database still fail, but with a normal connection error.
 */
const PLACEHOLDER_DATABASE_URL =
  'postgresql://user:password@localhost:5432/arbati?schema=public'

const databaseUrl = process.env.DATABASE_URL?.trim() || PLACEHOLDER_DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
