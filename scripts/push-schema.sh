#!/usr/bin/env bash
# Pushes supabase/migrations/*.sql via the Supabase Management API.
# Requires SUPABASE_ACCESS_TOKEN and outbound access to api.supabase.com.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
source .env.local
set +a

PROJECT_REF="wyrgczdtqqaimsmghcle"

for file in supabase/migrations/*.sql; do
  echo "Applying $file ..."
  PAYLOAD=$(SQL_FILE="$file" node -e "const fs=require('fs');console.log(JSON.stringify({query: fs.readFileSync(process.env.SQL_FILE,'utf8')}))")
  RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
  CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  echo "$BODY"
  if [ "$CODE" -ge 300 ]; then
    echo "Failed applying $file (HTTP $CODE)" >&2
    exit 1
  fi
done
echo "Schema push complete."
