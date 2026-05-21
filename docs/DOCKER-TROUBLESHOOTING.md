# 🔧 Docker + Database Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: PostgreSQL stuck in "starting" or "health: starting"

**Symptom:**
```
CONTAINER ID   STATUS                    PORTS
abc123         Up 30 seconds (health: starting)   0.0.0.0:5433->5432/tcp
```
And it stays like this for minutes.

**Root Cause:**
- PostgreSQL data is corrupted (corrupted checkpoint record)
- Volume contains stale/incompatible data from previous runs
- Container can't recover the database state

**Solution:**
```bash
# Nuclear option - clean everything
docker-compose down -v
rm -rf data/postgres
docker-compose up -d
```

**Prevention:**
- Always use `docker-compose down -v` when you suspect corruption (not just `down`)
- The `-v` flag removes named volumes
- BUT: Bind mounts (like `./data/postgres`) are NOT removed by `-v`
- Always explicitly delete the local `data/` folder

---

### Issue 2: Alembic migration fails with "value too long for type character varying(32)"

**Symptom:**
```
value too long for type character varying(32)
[SQL: UPDATE alembic_version SET version_num='004_rename_es_principal_to_es_predeterminada' ...]
```

**Root Cause:**
- Alembic stores revision IDs in `alembic_version` table
- The column is `VARCHAR(32)` — only 32 characters
- Descriptive revision names like `004_rename_es_principal_to_es_predeterminada` (51 chars) exceed this

**Solution:**
```python
# ❌ WRONG (51 characters)
revision = "004_rename_es_principal_to_es_predeterminada"

# ✅ CORRECT (3 characters)
revision = "004"
```

**Prevention:**
- Always use short numeric revision IDs (001, 002, 003, etc.)
- Descriptions go in the docstring, not the revision ID
- Validate with: `SELECT MAX(LENGTH(version_num)) FROM alembic_version;`

---

### Issue 3: "relation "roles" does not exist"

**Symptom:**
```
asyncpg.exceptions.UndefinedTableError: relation "roles" does not exist
```
When running `python scripts/seed.py`

**Root Cause:**
- Database is empty (migrations haven't run)
- PostgreSQL is up but schema hasn't been created

**Solution:**
```bash
cd backend
alembic upgrade head  # Run ALL migrations first
python scripts/seed.py  # Then seed
```

---

## Docker Bind Mounts vs Named Volumes

### Bind Mounts (`./data/postgres`)
- Maps a local folder to container folder
- **Files persist on your machine** after `docker down -v`
- Good for: Development, debugging
- **Problem**: Corrupted data stays on disk

### Named Volumes (`postgres_data:`)
- Docker manages the folder location
- **Removed by** `docker-compose down -v`
- Good for: Production, reproducibility

### Our Setup
```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/postgres
```

This is a **hybrid**: named volume (`postgres_data`) that binds to local folder (`./data/postgres`).

**Consequence**: `docker-compose down -v` removes the volume but NOT the folder.
**Solution**: Always `rm -rf data/postgres` after `docker-compose down -v`

---

## Full Database Reset Procedure

Use this when you're stuck:

```bash
# 1. Stop and remove containers
docker-compose down -v

# 2. Remove local data (critical!)
rm -rf data/postgres

# 3. Remove any orphan volumes
docker volume prune -f

# 4. Start fresh
docker-compose up -d

# 5. Wait for PostgreSQL to be ready
sleep 15

# 6. Run migrations
cd backend
alembic upgrade head

# 7. Seed test data
python scripts/seed.py

# 8. Done!
```

**Or just run the setup script:**
```bash
./setup-dev.ps1  # Windows
./setup-dev.sh   # Mac/Linux
```

---

## Why Your Compañero Doesn't Have This Issue

Your compañero probably:
1. ✅ Always does `docker-compose down -v` (not just `down`)
2. ✅ Runs migrations **before** seeding
3. ✅ Doesn't reuse old data folders
4. ✅ Uses the setup script (if one exists)

You were likely:
1. ❌ Doing `docker-compose down` (without `-v`)
2. ❌ Reusing old `data/postgres` with corrupted files
3. ❌ Running seed before migrations
4. ❌ Not aware of the bind mount persistence issue

---

## Quick Reference: Docker Commands

```bash
# Check container status
docker ps -a

# See container logs
docker logs foodstore-postgres --tail 50

# Connect to PostgreSQL directly
docker exec -it foodstore-postgres psql -U postgres -d foodstore_db

# Restart a single service
docker-compose restart postgres

# Remove everything and start over
docker-compose down -v && rm -rf data/postgres && docker-compose up -d
```

---

## Going Forward

1. **Always use the setup script** when pulling new changes
2. **Never do** `docker-compose down` — always use `docker-compose down -v`
3. **If stuck**: nuclear option is the full reset (see above)
4. **Report corruption**: If you see checkpoint errors, tell the team immediately

