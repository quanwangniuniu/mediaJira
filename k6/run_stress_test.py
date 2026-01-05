#!/usr/bin/env python3
"""
Stress Test Execution Script
Runs stress test pushing system beyond normal capacity (50-200 VUs)
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
    test_script = script_dir / 'scripts' / 'scenarios' / 'stress-test.js'
    
    # Check if test script exists
    if not test_script.exists():
        print(f"Error: Test script not found at {test_script}")
        sys.exit(1)
    
    # Build K6 command arguments
    k6_args = ['run', '--out', 'json=/tmp/stress-test-result.json']
    
    # Check if custom K6 image with InfluxDB support is available
    use_custom_image = os.environ.get('K6_USE_CUSTOM_IMAGE', 'false').lower() == 'true'
    k6_image = 'k6-influxdb:latest' if use_custom_image else 'grafana/k6:latest'
    
    # Add InfluxDB output if token is provided and custom image is used
    if influxdb_token and use_custom_image:
        k6_args.append('--out')
        k6_args.append('xk6-influxdb')
        print("Running stress test with InfluxDB output (using custom K6 image)...")
    elif influxdb_token:
        print("Note: InfluxDB 2.x output requires custom K6 image. Using JSON output only.")
        print()
    else:
        print("Running stress test (JSON output only - set INFLUXDB_TOKEN to enable InfluxDB)...")
    
    # Add test script path (inside container: /scripts/scenarios/stress-test.js)
    k6_args.append('/scripts/scenarios/stress-test.js')
    
    # Detect Docker network (default to mediajira_default)
    docker_network = os.environ.get('K6_DOCKER_NETWORK', 'mediajira_default')
    
    # Use service names by default for container-to-container communication
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
    
    # Prepare Docker command
    scripts_dir = script_dir / 'scripts'
    docker_cmd = [
        'docker', 'run', '--rm', '-i', '--network', docker_network,
        '-v', f'{scripts_dir}:/scripts:ro',
        '-e', f'K6_BASE_URL={k6_base_url}',
        '-e', f'K6_FRONTEND_URL={k6_frontend_url}',
        '-e', f'K6_TEST_USER_EMAIL={k6_test_user_email}',
        '-e', f'K6_TEST_USER_PASSWORD={k6_test_user_password}',
    ]
    
    # Add InfluxDB environment variables if token is provided (for xk6-influxdb)
    if influxdb_token:
        docker_cmd.extend([
            '-e', f'K6_INFLUXDB_ADDR={influxdb_url}',
            '-e', f'K6_INFLUXDB_ORGANIZATION={influxdb_org}',
            '-e', f'K6_INFLUXDB_BUCKET={influxdb_bucket}',
            '-e', f'K6_INFLUXDB_TOKEN={influxdb_token}',
        ])
    
    docker_cmd.append(k6_image)
    docker_cmd.extend(k6_args)
    
    # Execute K6
    print("Starting stress test...")
    print(f"Docker network: {docker_network}")
    print(f"Base URL: {k6_base_url}")
    print(f"Frontend URL: {k6_frontend_url}")
    print()
    print("Warning: This test will push the system beyond normal capacity.")
    print("Review metrics to identify breaking points and recovery behavior.")
    print()
    
    try:
        result = subprocess.run(docker_cmd, check=True)
        print()
        print("✓ Stress test completed successfully")
        sys.exit(0)
    except subprocess.CalledProcessError:
        print()
        print("✗ Stress test failed (expected for stress tests pushing system limits)")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: Docker not found. Please ensure Docker is installed and in your PATH.")
        sys.exit(1)


if __name__ == '__main__':
    main()

