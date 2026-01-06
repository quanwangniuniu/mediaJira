#!/usr/bin/env python3
"""
Smoke Test Execution Script
Runs minimal load test to verify system works under minimal load
"""

import os
import sys
import subprocess
from pathlib import Path


def load_env_file(env_path):
    """Load environment variables from .env file"""
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars


def get_script_dir():
    """Get the directory where this script is located"""
    return Path(__file__).parent.resolve()


def main():
    # Get script directory
    script_dir = get_script_dir()
    os.chdir(script_dir)
    
    # Load environment variables
    env_file = script_dir.parent / '.env'
    env_vars = load_env_file(env_file)
    
    # Set environment variables
    for key, value in env_vars.items():
        os.environ.setdefault(key, value)
    
    # Set default values
    k6_base_url = os.environ.get('K6_BASE_URL', 'http://localhost:8000')
    k6_frontend_url = os.environ.get('K6_FRONTEND_URL', 'http://localhost:3000')
    k6_test_user_email = os.environ.get('K6_TEST_USER_EMAIL', 'test@example.com')
    k6_test_user_password = os.environ.get('K6_TEST_USER_PASSWORD', 'testpassword123')
    influxdb_url = os.environ.get('INFLUXDB_URL', 'http://localhost:8086')
    influxdb_org = os.environ.get('INFLUXDB_ORG', 'k6')
    influxdb_bucket = os.environ.get('INFLUXDB_BUCKET', 'k6')
    influxdb_token = os.environ.get('INFLUXDB_TOKEN', '')
    
    # Test script path
    test_script = script_dir / 'scripts' / 'scenarios' / 'smoke-test.js'
    
    # Check if test script exists
    if not test_script.exists():
        print(f"Error: Test script not found at {test_script}")
        sys.exit(1)
    
    # Build K6 command arguments
    k6_args = ['run', '--out', 'json=/tmp/smoke-test-result.json']
    
    # Add abort-on-fail option if requested (aborts test on threshold failure)
    abort_on_fail = os.environ.get('K6_ABORT_ON_FAIL', 'false').lower() == 'true'
    if abort_on_fail:
        k6_args.append('--abort-on-fail')
        print("⚠️  Warning: --abort-on-fail enabled. Test will stop immediately if thresholds are crossed.")
    
    # K6 service in docker-compose uses custom image with InfluxDB support
    # Add InfluxDB output if token is provided
    if influxdb_token:
        k6_args.append('--out')
        k6_args.append('xk6-influxdb')
        print("Running smoke test with InfluxDB output (using k6 service from docker-compose)...")
    else:
        print("Running smoke test (JSON output only - set INFLUXDB_TOKEN to enable InfluxDB)...")
    
    # Add test script path (inside container: /scripts/scenarios/smoke-test.js)
    k6_args.append('/scripts/scenarios/smoke-test.js')
    
    # Use service names for container-to-container communication
    # IMPORTANT: Add service names to Django ALLOWED_HOSTS in .env
    use_service_names = os.environ.get('K6_USE_SERVICE_NAMES', 'true').lower() == 'true'
    
    if use_service_names:
        # Use service names when on the same Docker network
        if 'localhost' in k6_base_url or '127.0.0.1' in k6_base_url:
            k6_base_url = k6_base_url.replace('localhost:8000', 'backend-dev:8000').replace('127.0.0.1:8000', 'backend-dev:8000')
        if 'localhost' in k6_frontend_url or '127.0.0.1' in k6_frontend_url:
            k6_frontend_url = k6_frontend_url.replace('localhost:3000', 'frontend-dev:3000').replace('127.0.0.1:3000', 'frontend-dev:3000')
        if 'localhost' in influxdb_url or '127.0.0.1' in influxdb_url:
            influxdb_url = influxdb_url.replace('localhost:8086', 'influxdb-k6:8086').replace('127.0.0.1:8086', 'influxdb-k6:8086')
    
    # Get docker-compose file path
    compose_file = script_dir.parent / 'docker-compose.dev.yml'
    if not compose_file.exists():
        print(f"Error: docker-compose.dev.yml not found at {compose_file}")
        print("Please run this script from the mediaJira directory or ensure docker-compose.dev.yml exists")
        sys.exit(1)
    
    # Prepare docker compose command
    docker_cmd = [
        'docker', 'compose',
        '-f', str(compose_file),
        'run', '--rm', '--no-deps',  # --no-deps: don't start dependencies
        '-e', f'K6_BASE_URL={k6_base_url}',
        '-e', f'K6_FRONTEND_URL={k6_frontend_url}',
        '-e', f'K6_TEST_USER_EMAIL={k6_test_user_email}',
        '-e', f'K6_TEST_USER_PASSWORD={k6_test_user_password}',
        'k6',  # Service name
    ]
    
    # Add InfluxDB environment variables if token is provided
    if influxdb_token:
        docker_cmd.extend([
            '-e', f'K6_INFLUXDB_ADDR={influxdb_url}',
            '-e', f'K6_INFLUXDB_ORGANIZATION={influxdb_org}',
            '-e', f'K6_INFLUXDB_BUCKET={influxdb_bucket}',
            '-e', f'K6_INFLUXDB_TOKEN={influxdb_token}',
        ])
    
    # Add k6 command arguments
    docker_cmd.extend(k6_args)
    
    # Execute K6
    print("Starting smoke test...")
    print(f"Using docker-compose service: k6")
    print(f"Base URL: {k6_base_url}")
    print(f"Frontend URL: {k6_frontend_url}")
    if abort_on_fail:
        print("Abort on fail: ENABLED (test will stop if thresholds are crossed)")
    else:
        print("Abort on fail: DISABLED (test will continue even if thresholds fail)")
    print()
    print("Note: Using k6 service from docker-compose.dev.yml")
    print("      Make sure backend, frontend, and influxdb services are running.")
    print()
    
    try:
        result = subprocess.run(docker_cmd, check=True)
        print()
        print("✓ Smoke test completed successfully")
        sys.exit(0)
    except subprocess.CalledProcessError:
        print()
        print("✗ Smoke test failed")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: Docker not found. Please ensure Docker is installed and in your PATH.")
        sys.exit(1)


if __name__ == '__main__':
    main()

