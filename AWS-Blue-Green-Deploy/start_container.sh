#!/bin/bash

# Now the Github code has been downloaded to /home/ubuntu/app/

# Get global variables from AWS parameter store
eval $(aws ssm get-parameter --name "All_VARS_PV_BLUE_GREEN" --with-decryption --query "Parameter.Value" --output text --region ap-southeast-2)

destDir="/home/ubuntu/app"

[[ -d $destDir/mediaJira ]] && cd $destDir/mediaJira && cp -f env.example .env && docker compose -f docker-compose.preview.yml --env-file .env kill

docker_status_check_cmd="docker ps  | grep -v IMAGE | wc -l"

[[ x`eval ${docker_status_check_cmd}` != "x0" ]] && echo "docker container cannot be killed, please check." && exit 1

[[ -d $destDir/mediaJira ]] && cd $destDir && rm -rf mediaJira

# cd $destDir && git clone -b prod-preview git@github.com:quanwangniuniu/mediaJira.git

echo "Code pull finish"

until pg_isready -h ${POSTGRES_HOST} -p 5432 -U mediajira_user; do  echo "Waiting for external postgres..." && sleep 5; done

cd $destDir/mediaJira && cp -f env.example .env && docker compose -f docker-compose.preview.yml --env-file .env up --build -d && docker ps

echo "Check new data model and apply"

# new_model_check="cd $destDir/mediaJira && compose -f docker-compose.preview.yml --env-file .env exec backend python manage.py makemigrations --check --dry-run"

apply_new_data_transfer="cd $destDir/mediaJira && docker compose -f docker-compose.preview.yml --env-file .env exec backend python manage.py migrate"

eval ${apply_new_data_transfer}

echo "deploy finish"