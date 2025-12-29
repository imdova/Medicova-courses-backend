# Database Backup Installation Guide

## PostgreSQL Version Mismatch Issue

If you encounter a version mismatch error like:
```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.6; pg_dump version: 16.11
```

This means your `pg_dump` client version is older than your PostgreSQL server version.

## Solution: Install PostgreSQL 17 Client Tools

### For Ubuntu/Debian:

1. **Add PostgreSQL APT repository:**
   ```bash
   sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
   wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
   ```

2. **Update and install PostgreSQL 17 client:**
   ```bash
   sudo apt-get update
   sudo apt-get install postgresql-client-17
   ```

3. **Verify installation:**
   ```bash
   pg_dump --version
   ```
   Should show: `pg_dump (PostgreSQL) 17.x`

### For CentOS/RHEL:

1. **Install PostgreSQL repository:**
   ```bash
   sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
   ```

2. **Install PostgreSQL 17 client:**
   ```bash
   sudo yum install -y postgresql17
   ```

### Using Docker (Alternative):

If you can't install PostgreSQL 17 client directly, you can use Docker:

```bash
docker run --rm \
  -e PGPASSWORD="your_password" \
  -v $(pwd)/backups:/backups \
  postgres:17 \
  pg_dump \
  -h your-db-host \
  -p 5432 \
  -U your-username \
  -d your-database \
  -f /backups/backup.sql
```

### Verify pg_dump Version

After installation, verify the version:
```bash
pg_dump --version
```

The version should match or be newer than your PostgreSQL server version.

## Running Backups

Once PostgreSQL 17 client is installed, you can run backups:

```bash
# Manual backup
npm run db:backup

# Automatic weekly backups (via cron job)
# The scheduled backup runs every Sunday at 2:00 AM UTC
```

## Troubleshooting

### If pg_dump is still using old version:

Check which pg_dump is being used:
```bash
which pg_dump
```

If it shows an old version, you may need to:
1. Update your PATH to prioritize the new version
2. Use the full path: `/usr/lib/postgresql/17/bin/pg_dump`
3. Create an alias in your shell profile

### SSL Connection Issues:

If you encounter SSL errors, ensure your `.env` file has:
```
DB_SSL=true
```

The backup script will automatically use SSL mode when connecting to RDS or other SSL-enabled databases.

