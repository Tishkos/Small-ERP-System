# Troubleshooting

Common setup and deployment problems, consolidated from the ad-hoc `FIX_*.md`
and `QUICK_FIX_*.md` notes that used to sit in the repository root.

Container and user names below match the shipped compose files:

| | Service | Container | DB user | DB name |
|---|---|---|---|---|
| Development | `db` (`docker-compose.dev.yml`) | `arbati_db_dev` | `arbati_user` | `arbati` |
| Production | `db` / `web` (`docker-compose.yml`) | `arbati-db` / `arbati-web` | `arbati` | `arbati` |

---

## Local development

### `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`

You have no `.env` yet:

```bash
cp .env.example .env
```

Schema-only commands (`prisma generate`, `validate`, `format`) work without a
reachable database, but anything that connects needs a real `DATABASE_URL`.

### `EPERM` / file-lock error during `prisma generate` (Windows)

The dev server holds the generated client open.

1. Stop the dev server (`Ctrl+C`).
2. Re-run `npm run db:generate`.
3. Still locked? Close every terminal and editor window that has the project
   open, then try again.

### Tables don't exist / API returns "Unknown error"

The database is empty. Start it and push the schema:

```bash
# Start the dev database
docker compose -f docker-compose.dev.yml up -d db

# Create the tables
npm run db:push

# Optional: an admin login plus sample products, motorcycles and customers
npm run db:seed
```

Verify:

```bash
docker exec arbati_db_dev psql -U arbati_user -d arbati -c "\dt"
```

You should see `users`, `products`, `motorcycles`, `customers`, `invoices`, and
friends.

### Prefer migrations over `db:push`

```bash
npx prisma migrate dev --name <describe-your-change>
```

If migration history and database have diverged in local development only:

```bash
npx prisma migrate reset
```

`migrate reset` drops all local data. Never run it against production.

### Can't sign in on a fresh install

There are no accounts until you create one. Either:

- run `npm run db:seed`, then sign in with **`admin` / `admin`** (the app will
  immediately require a new password), or
- open the app with an empty database and complete the **setup wizard**, which
  creates your company and your administrator account together.

Sign-in accepts either the username or the email address. There is no
verification code and no reset email.

### Signed in successfully but bounced straight back to the sign-in page

The session cookie name is derived from the scheme in `NEXTAUTH_URL`. If the app
is served over plain HTTP but `NEXTAUTH_URL` says `https://` (or vice versa),
NextAuth writes one cookie name and the middleware looks for another, so every
request looks unauthenticated. Make `NEXTAUTH_URL` match how the browser
actually reaches the app, then restart the container.

### Locked out after too many attempts

Five wrong passwords lock an account for 15 minutes. To clear it immediately:

```bash
docker compose exec db psql -U arbati -d arbati -c "update users set \"failedLoginAttempts\"=0, \"lockedUntil\"=null where username='admin';"
```

### An administrator needs to reset someone's password

There is no reset email. Set a new bcrypt hash directly, then have the user
change it from **Settings**:

```bash
# Generate a hash
node -e "console.log(require('bcryptjs').hashSync('TemporaryPass123', 12))"

# Apply it and force a change on next sign-in
docker compose exec db psql -U arbati -d arbati -c "update users set \"passwordHash\"='<hash>', \"mustChangePassword\"=true where username='someone';"
```

---

## Production / VPS

### Missing tables (e.g. `company_settings` does not exist)

Migrations were never applied to the deployed database:

```bash
cd /var/www/arbatis

# Apply all pending migrations
docker compose exec web npx prisma migrate deploy

# Verify
docker compose exec db psql -U arbati -d arbati -c "\dt"
```

If the container name differs, find it with `docker ps`.

If the project has no migration files for the change you need, `db push` applies
the schema directly:

```bash
docker compose exec web npx prisma db push
```

### Health check and logs

```bash
docker logs arbati-web
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
```

### Rebuilding after a code change

```bash
git pull
docker compose build --no-cache web
docker compose up -d web
```

### Prisma version mismatch

The image installs Prisma from `package.json` only — there is no global install —
and the build calls `npx prisma generate`. Confirm the running version with:

```bash
docker compose exec web npx prisma --version
```

It should match the `prisma` / `@prisma/client` versions in `package.json`
(both pinned to the same release; they must never drift apart).

### Container restarts on boot

```bash
docker compose restart web
docker compose ps
```

---

## Company name or logo is wrong

Branding lives in the `company_settings` table, not in configuration. Sign in as
an administrator and edit it under **Settings → Company**. Uploaded logos are
written to `public/uploads/branding/`, which the compose file keeps on a volume;
if a logo disappears after a rebuild, check that the `./data/public/uploads`
mount is still in place.
