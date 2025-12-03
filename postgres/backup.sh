#!/bin/bash
#PostgreSQL backup script
set -e

echo "Backing up database '$POSTGRES_DB' to file '$BACKUP_FILE'..."

PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -h $DB_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Backup completed successfully."
else
  echo "Backup failed."
  exit 1
fi

