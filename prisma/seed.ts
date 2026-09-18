/**
 * Database seed
 *
 * Creates the minimum data needed to log in and click around a fresh install:
 * the company record, an active admin user, a few categories, sample
 * products/motorcycles and a demo customer.
 *
 * Run with:  npm run db:seed
 *
 * The admin account defaults to admin / admin so a fresh install is usable
 * immediately. It is flagged `mustChangePassword`, so the app blocks on a
 * non-dismissible dialog until a real password is set.
 *
 * Safe to re-run: every write is an upsert keyed on a unique column, so the
 * script is idempotent and never duplicates rows.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL?.trim()

if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase()
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase()
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin'
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Administrator'
const COMPANY_NAME = process.env.SEED_COMPANY_NAME || 'My Company'

/**
 * A password left at the shipped default must keep nagging. An operator who
 * seeds their own password via SEED_ADMIN_PASSWORD has already chosen one, so
 * only the literal default forces a change.
 */
const MUST_CHANGE_PASSWORD = ADMIN_PASSWORD === 'admin'

async function seedCompany() {
  const company = await prisma.companySettings.upsert({
    where: { id: 'default' },
    // Never overwrite a name and logo the operator already chose.
    update: {},
    create: { id: 'default', name: COMPANY_NAME },
  })

  console.log(`  company: ${company.name}`)
  return company
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    // Never silently reset the password of an existing account on re-seed.
    update: { status: 'ACTIVE', role: 'ADMIN', username: ADMIN_USERNAME },
    create: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash,
      name: ADMIN_NAME,
      status: 'ACTIVE',
      role: 'ADMIN',
      mustChangePassword: MUST_CHANGE_PASSWORD,
    },
  })

  console.log(`  admin user: ${admin.username} (${admin.email})`)
  return admin
}

async function seedCategories(adminId: string) {
  const categories = [
    { name: 'Spare Parts', nameAr: 'قطع غيار', nameKu: 'پارچەی یەدەک' },
    { name: 'Accessories', nameAr: 'إكسسوارات', nameKu: 'ئێکسسوار' },
    { name: 'Oils & Lubricants', nameAr: 'زيوت', nameKu: 'زەیت' },
  ]

  const created = []
  for (const category of categories) {
    // Category.name is not unique in the schema, so look it up before writing.
    const existing = await prisma.category.findFirst({
      where: { name: category.name },
    })

    created.push(
      existing ??
        (await prisma.category.create({
          data: { ...category, createdById: adminId, updatedById: adminId },
        }))
    )
  }

  console.log(`  categories: ${created.length}`)
  return created
}

async function seedMotorcycleCategories(adminId: string) {
  const names = [
    { name: 'Scooters', nameAr: 'سكوتر', nameKu: 'سکوتەر' },
    { name: 'Sport', nameAr: 'رياضية', nameKu: 'وەرزشی' },
  ]

  const created = []
  for (const category of names) {
    const existing = await prisma.motorcycleCategory.findFirst({
      where: { name: category.name },
    })

    created.push(
      existing ??
        (await prisma.motorcycleCategory.create({
          data: { ...category, createdById: adminId, updatedById: adminId },
        }))
    )
  }

  console.log(`  motorcycle categories: ${created.length}`)
  return created
}

async function seedProducts(categoryId: string, adminId: string) {
  const products = [
    {
      sku: 'PRD-0001',
      name: 'Brake Pad Set',
      purchasePrice: 9000,
      mufradPrice: 15000,
      jumlaPrice: 12000,
      stockQuantity: 120,
      lowStockThreshold: 20,
    },
    {
      sku: 'PRD-0002',
      name: 'Air Filter',
      purchasePrice: 4000,
      mufradPrice: 7500,
      jumlaPrice: 6000,
      stockQuantity: 60,
      lowStockThreshold: 15,
    },
    {
      sku: 'PRD-0003',
      name: 'Engine Oil 1L',
      purchasePrice: 6000,
      mufradPrice: 11000,
      jumlaPrice: 9000,
      // Deliberately below threshold so the low-stock alerts have something
      // to show on a fresh install.
      stockQuantity: 5,
      lowStockThreshold: 10,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: { ...product, categoryId, createdById: adminId, updatedById: adminId },
    })
  }

  console.log(`  products: ${products.length}`)
}

async function seedMotorcycles(categoryId: string, adminId: string) {
  const motorcycles = [
    {
      sku: 'MOTO-0001',
      name: 'City Scooter 125',
      usdRetailPrice: 1450,
      usdWholesalePrice: 1280,
      stockQuantity: 8,
      lowStockThreshold: 2,
    },
    {
      sku: 'MOTO-0002',
      name: 'Sport 250R',
      usdRetailPrice: 3200,
      usdWholesalePrice: 2950,
      stockQuantity: 3,
      lowStockThreshold: 1,
    },
  ]

  for (const motorcycle of motorcycles) {
    await prisma.motorcycle.upsert({
      where: { sku: motorcycle.sku },
      update: {},
      create: { ...motorcycle, categoryId, createdById: adminId, updatedById: adminId },
    })
  }

  console.log(`  motorcycles: ${motorcycles.length}`)
}

async function seedCustomers(adminId: string) {
  const customers = [
    {
      sku: 'CUST-0001',
      name: 'Walk-in Customer',
      type: 'INDIVIDUAL' as const,
      city: 'Erbil',
    },
    {
      sku: 'CUST-0002',
      name: 'Zagros Trading',
      type: 'COMPANY' as const,
      city: 'Sulaymaniyah',
      phone: '+9647500000000',
    },
  ]

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { sku: customer.sku },
      update: {},
      create: { ...customer, createdById: adminId },
    })
  }

  console.log(`  customers: ${customers.length}`)
}

async function main() {
  console.log('Seeding database...')

  await seedCompany()

  const admin = await seedAdmin()
  const categories = await seedCategories(admin.id)
  const motorcycleCategories = await seedMotorcycleCategories(admin.id)

  await seedProducts(categories[0].id, admin.id)
  await seedMotorcycles(motorcycleCategories[0].id, admin.id)
  await seedCustomers(admin.id)

  console.log('\nSeed complete.')
  console.log(`Sign in with  ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`)
  console.log(`(the email ${ADMIN_EMAIL} works as a login name too)`)

  if (MUST_CHANGE_PASSWORD) {
    console.log('\nThe app will require a new password on first sign-in.')
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
