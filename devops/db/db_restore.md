# step 1: stop all docker containers

# step 2: empty the database(execute following cmd on lightsail machine)
PGPASSWORD="jared520" psql --host=ls-ed198f4022c8f28796507a847d6873af7ec9a6e5.ctksak4yylcx.ap-southeast-2.rds.amazonaws.com --port=5432  --username=mediajira_user --dbname=mediajira_db 

DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

\dt
exit

# step 3: restore the database(execute following cmd on lightsail machine)
# choose target backup file name
tar_file_name="db_2026-02-18_13-16-09"
TARGET_PATH="/home/ubuntu/db_backups"

cd $TARGET_PATH

aws s3api get-object --bucket bucket-pxjmgn --key db_backup/"$tar_file_name".tar.gz  "$tar_file_name".tar.gz && tar -xzvf "$tar_file_name".tar.gz 

PGPASSWORD="jared520" psql --host=ls-ed198f4022c8f28796507a847d6873af7ec9a6e5.ctksak4yylcx.ap-southeast-2.rds.amazonaws.com --port=5432  --username=mediajira_user --dbname=mediajira_db -f "$tar_file_name".sql

rm *tar.gz *sql

PGPASSWORD="jared520" psql --host=ls-ed198f4022c8f28796507a847d6873af7ec9a6e5.ctksak4yylcx.ap-southeast-2.rds.amazonaws.com --port=5432  --username=mediajira_user --dbname=mediajira_db 
\dt
exit

# step 4: start all docker containers, check if system works well by browser