#!/usr/bin/env bash
set -euo pipefail

DB_PASSWORD="${1:?Usage: bash setup-droplet.sh <db_password>}"
DB_NAME="arcwrite"
DB_USER="arcwrite_app"
PG_VERSION="17"
SSL_DIR="/etc/postgresql/${PG_VERSION}/main"
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

echo "==> Adding PostgreSQL official apt repository..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list

echo "==> Installing PostgreSQL ${PG_VERSION}..."
apt-get update -qq
apt-get install -y -qq postgresql-${PG_VERSION} postgresql-client-${PG_VERSION} ufw

echo "==> Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 5432/tcp
echo "y" | ufw enable

echo "==> Configuring PostgreSQL..."
openssl req -new -x509 -days 3650 -nodes \
  -out "$SSL_DIR/server.crt" \
  -keyout "$SSL_DIR/server.key" \
  -subj "/CN=arcwrite-db" 2>/dev/null
chown postgres:postgres "$SSL_DIR/server.crt" "$SSL_DIR/server.key"
chmod 600 "$SSL_DIR/server.key"

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '0.0.0.0'/" "$PG_CONF"
sed -i "s/#ssl = off/ssl = on/" "$PG_CONF"
grep -q "^ssl = on" "$PG_CONF" || echo "ssl = on" >> "$PG_CONF"

echo "# Allow SSL connections from anywhere for arcwrite_app" >> "$PG_HBA"
echo "hostssl all ${DB_USER} 0.0.0.0/0 scram-sha-256" >> "$PG_HBA"

systemctl restart postgresql

echo "==> Creating database and user..."
sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "==> Running schema..."
sudo -u postgres psql -d "${DB_NAME}" -f "$(dirname "$0")/schema.sql"

sudo -u postgres psql -d "${DB_NAME}" <<SQL
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT EXECUTE ON FUNCTION update_updated_at() TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo ""
echo "==> Done! Connection string:"
echo "postgresql://${DB_USER}:${DB_PASSWORD}@$(hostname -I | awk '{print $1}'):5432/${DB_NAME}?sslmode=require"
echo ""
echo "Add this as DATABASE_URL in your Vercel environment variables."
