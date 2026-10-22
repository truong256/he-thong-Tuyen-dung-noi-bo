#!/usr/bin/env bash
set -euo pipefail
# No xtrace: environment contains database and per-role account secrets.
set +x
if [[ "${DEMO_SEED_ENABLED:-false}" != "true" ]]; then
  echo 'Seed disabled. Explicitly set DEMO_SEED_ENABLED=true for a dedicated demo database.' >&2
  exit 2
fi
for key in DB_URL DB_USERNAME DB_PASSWORD JWT_SECRET CORS_ALLOWED_ORIGINS APP_FRONTEND_URL \
  DEMO_PASSWORD_ADMIN DEMO_PASSWORD_HR_MANAGER DEMO_PASSWORD_HIRING_MANAGER DEMO_PASSWORD_APPROVER \
  DEMO_PASSWORD_RECRUITER DEMO_PASSWORD_INTERVIEWER DEMO_PASSWORD_CANDIDATE; do
  if [[ -z "${!key:-}" ]]; then echo "Missing required environment variable: $key" >&2; exit 2; fi
done
if [[ "$DB_URL" != jdbc:postgresql://* ]]; then echo 'PostgreSQL JDBC DB_URL is required.' >&2; exit 2; fi
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
jar_path="${SEED_JAR_PATH:-$repo_dir/backend/auth-service/target/auth-service-0.0.1-SNAPSHOT.jar}"
if [[ ! -f "$jar_path" ]]; then
  echo 'Build and verify the JAR with Java 21: cd backend/auth-service && ./mvnw verify' >&2
  exit 2
fi
echo 'Starting one-off demo seed: Flyway validates/migrates before transactional provisioning.'
export SPRING_PROFILES_ACTIVE=prod,demo-seed
exec java -jar "$jar_path" --server.address=127.0.0.1 --server.port=0 --app.demo-seed.run-and-exit=true
