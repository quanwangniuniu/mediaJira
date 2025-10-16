#!/usr/bin/env bash

CONTAINER="backend-dev"

if [ "$#" -ge 1 ]; then
  RAW_ARG="$1"
  TEST_ARG="${RAW_ARG//\//.}"
  TEST_ARG="${TEST_ARG#backend.}"
  
  echo "Running tests in container $CONTAINER with selector: $TEST_ARG"
  
  docker exec "$CONTAINER" coverage run --source='notion_editor' manage.py test "$TEST_ARG" --keepdb --noinput
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "📊 Coverage Report"
    echo "=========================================="
    docker exec "$CONTAINER" coverage report -m
  else
    echo "❌ Tests failed!"
    exit 1
  fi
else
  echo "Running full test suite in container $CONTAINER"
  
  docker exec "$CONTAINER" coverage run --source='.' manage.py test --keepdb --noinput
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "📊 Coverage Report"
    echo "=========================================="
    docker exec "$CONTAINER" coverage report -m
  else
    echo "❌ Tests failed!"
    exit 1
  fi
fi