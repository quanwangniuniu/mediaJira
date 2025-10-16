#!/usr/bin/env bash

# Usage:
# ./test.sh                          -> run full test suite inside the backend-dev container
# ./test.sh path.to.TestClass        -> run a specific test or test module
# ./test.sh path.to.TestClass.test_method -> run a specific test method

# container name used in compose
CONTAINER="backend-dev"

# Accept optional first argument as test selector
if [ "$#" -ge 1 ]; then
  # replace all slashes with dots so callers can pass paths like a/b/c and
  # Django's test runner receives a dotted python path a.b.c
  RAW_ARG="$1"
  TEST_ARG="${RAW_ARG//\//.}"
  echo "Running tests in container $CONTAINER with selector: $TEST_ARG"
  docker exec "$CONTAINER" python manage.py test "$TEST_ARG"
  
else
  echo "Running full test suite in container $CONTAINER"
  docker exec "$CONTAINER" python manage.py test
fi


