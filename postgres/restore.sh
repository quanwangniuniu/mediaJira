#!/bin/bash
# PostgreSQL restore script
set -e

echo "Restoring database '$POSTGRES_DB' from file '$BACKUP_FILE'..."

PGPASSWORD=${POSTGRES_PASSWORD} psql -h $DB_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB < $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Restore completed successfully."
else
  echo "Restore failed."
  exit 1
fi

