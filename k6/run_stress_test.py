#!/usr/bin/env python3
"""
Stress Test Execution Script
Runs stress test pushing system beyond normal capacity (50-200 VUs)
"""

import os
import sys
import subprocess
import urllib.request
import urllib.error
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


def verify_backend_ready(compose_file):
    """Verify backend service is ready before running tests"""
    print("=" * 60)
    print("Pre-flight Checks: Verifying Backend Connectivity")
    print("=" * 60)
    
    # Check 1: Verify backend service is running
    # Note: Service name is 'backend', container name is 'backend-dev'
    print("\n[1/3] Checking if backend service is running...")
    try:
        # First, try checking the service using docker compose (service name is 'backend')
        result = subprocess.run(
            ['docker', 'compose', '-f', str(compose_file), 'ps', 'backend', '--format', 'json'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            check=False
        )
        
        # If that fails, check the container directly by name
        if result.returncode != 0 or not (result.stdout and result.stdout.strip()):
            # Fallback: check container directly by name
            result2 = subprocess.run(
                ['docker', 'ps', '--filter', 'name=backend-dev', '--format', '{{.Names}}'],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                check=False
            )
            if not result2.stdout or 'backend-dev' not in result2.stdout:
                print("❌ ERROR: backend service (container: backend-dev) is not running")
                print("\nTo start the backend service, run:")
                print(f"  docker compose -f {compose_file} up -d backend")
                print("\nOr start all services:")
                print(f"  docker compose -f {compose_file} up -d")
                return False
            print("✓ Backend container (backend-dev) is running")
        else:
            # Parse JSON output to check status
            import json
            try:
                if not result.stdout:
                    raise ValueError("No output from docker compose ps")
                containers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
                if containers:
                    container = containers[0]
                    state = container.get('State', '')
                    if state != 'running':
                        print(f"❌ ERROR: backend service exists but is not running (state: {state})")
                        print("\nTo start the backend service, run:")
                        print(f"  docker compose -f {compose_file} start backend")
                        return False
                    print(f"✓ Backend service is running (state: {state})")
            except (json.JSONDecodeError, KeyError):
                # If JSON parsing fails, check if container exists via docker ps
                result2 = subprocess.run(
                    ['docker', 'ps', '--filter', 'name=backend-dev', '--format', '{{.Names}}'],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    check=False
                )
                if not result2.stdout or 'backend-dev' not in result2.stdout:
                    print("❌ ERROR: backend service (container: backend-dev) is not running")
                    print("\nTo start the backend service, run:")
                    print(f"  docker compose -f {compose_file} up -d backend")
                    return False
                print("✓ Backend container (backend-dev) is running")
    except FileNotFoundError:
        print("❌ ERROR: Docker not found. Please ensure Docker is installed and in your PATH.")
        return False
    except Exception as e:
        print(f"❌ ERROR: Failed to check container status: {e}")
        return False
    
    # Check 2: Test health endpoint from host
    print("\n[2/3] Testing health endpoint from host (http://localhost:8000/health/)...")
    try:
        req = urllib.request.Request('http://localhost:8000/health/')
        req.add_header('User-Agent', 'K6-Preflight-Check')
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            
            if status == 200:
                print(f"✓ Health check passed (status: {status}, response: {body.strip()})")
            else:
                print(f"❌ ERROR: Health check returned status {status} (expected 200)")
                print(f"Response: {body[:200]}")
                return False
    except urllib.error.URLError as e:
        print(f"❌ ERROR: Cannot connect to backend health endpoint")
        print(f"   Error: {e}")
        print("\nPossible causes:")
        print("  1. Backend service is not running")
        print("  2. Backend is not listening on port 8000")
        print("  3. Port 8000 is not exposed or mapped correctly")
        print("\nTo check backend logs:")
        print(f"  docker compose -f {compose_file} logs backend-dev")
        return False
    except Exception as e:
        print(f"❌ ERROR: Health check failed: {e}")
        return False
    
    # Check 3: Verify network connectivity from K6 container perspective
    print("\n[3/3] Verifying network connectivity from K6 container...")
    try:
        # Test if K6 container can resolve backend-dev hostname
        result = subprocess.run(
            ['docker', 'compose', '-f', str(compose_file), 'run', '--rm', '--no-deps', 'k6', 
             'sh', '-c', 'ping -c 1 backend-dev > /dev/null 2>&1 && echo "OK" || echo "FAIL"'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=10,
            check=False
        )
        
        if 'OK' in result.stdout:
            print("✓ Network connectivity verified (K6 can reach backend-dev)")
        else:
            print("⚠️  WARNING: Could not verify network connectivity from K6 container")
            print("   This may be normal if ping is not available in the K6 image")
            print("   The test will proceed, but if it fails, check Docker network configuration")
    except subprocess.TimeoutExpired:
        print("⚠️  WARNING: Network check timed out (this is usually OK)")
    except Exception as e:
        print(f"⚠️  WARNING: Network check failed: {e}")
        print("   The test will proceed, but connectivity issues may occur")
    
    print("\n" + "=" * 60)
    print("✓ All pre-flight checks passed. Starting K6 test...")
    print("=" * 60 + "\n")
    return True


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
        print("Running stress test with InfluxDB output (using k6 service from docker-compose)...")
    else:
        print("Running stress test (JSON output only - set INFLUXDB_TOKEN to enable InfluxDB)...")
    
    # Add test script path (inside container: /scripts/scenarios/stress-test.js)
    k6_args.append('/scripts/scenarios/stress-test.js')
    
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
    
    # Pre-flight checks: Verify backend is ready
    if not verify_backend_ready(compose_file):
        print("\n❌ Pre-flight checks failed. Please fix the issues above before running the test.")
        sys.exit(1)
    
    # Prepare docker compose command
    docker_cmd = [
        'docker', 'compose',
        '-f', str(compose_file),
        'run', '--rm', '--no-deps',
        '-e', f'K6_BASE_URL={k6_base_url}',
        '-e', f'K6_FRONTEND_URL={k6_frontend_url}',
        '-e', f'K6_TEST_USER_EMAIL={k6_test_user_email}',
        '-e', f'K6_TEST_USER_PASSWORD={k6_test_user_password}',
    ]
    
    # Add resource limits if specified via environment variables
    # Recommended: K6_DOCKER_MEMORY=2g K6_DOCKER_CPUS=2 for stress tests
    docker_memory = os.environ.get('K6_DOCKER_MEMORY')
    docker_cpus = os.environ.get('K6_DOCKER_CPUS')
    
    if docker_memory:
        docker_cmd.extend(['--memory', docker_memory])
        print(f"Resource limit: Memory = {docker_memory}")
    
    if docker_cpus:
        docker_cmd.extend(['--cpus', docker_cpus])
        print(f"Resource limit: CPUs = {docker_cpus}")
    
    # Add service name
    docker_cmd.append('k6')
    
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
    print("=" * 70)
    print("🔴 STRESS TEST - AGGRESSIVE LOAD WARNING")
    print("=" * 70)
    print()
    print("⚠️  CRITICAL WARNING: This test is VERY AGGRESSIVE")
    print()
    print("   • Will ramp up to 200 Virtual Users over 14 minutes")
    print("   • Will push your system BEYOND normal capacity")
    print("   • May significantly impact your development machine performance")
    print("   • High CPU, memory, and network usage expected")
    print("   • May cause system slowdown or unresponsiveness")
    print()
    print("   RECOMMENDED: Run on dedicated test machine, not development workstation")
    print()
    print("   RESOURCE LIMITS: Consider setting Docker resource limits to protect your machine:")
    print("     export K6_DOCKER_MEMORY=2g")
    print("     export K6_DOCKER_CPUS=2")
    print("     python k6/run_stress_test.py")
    print()
    print("=" * 70)
    print()
    
    # Confirmation prompt (can be skipped with K6_SKIP_CONFIRM=true)
    skip_confirm = os.getenv('K6_SKIP_CONFIRM', 'false').lower() == 'true'
    
    if not skip_confirm:
        print("Do you want to continue with the stress test?")
        print("  - Type 'yes' or 'y' to proceed")
        print("  - Type anything else to cancel")
        print("  - Set K6_SKIP_CONFIRM=true to skip this prompt")
        print()
        response = input("Continue? [yes/no]: ").strip().lower()
        
        if response not in ['yes', 'y']:
            print()
            print("Stress test cancelled by user.")
            print("If you want to skip this confirmation in the future, set:")
            print("  export K6_SKIP_CONFIRM=true")
            sys.exit(0)
        print()
    
    print("=" * 70)
    print("Starting Stress Test")
    print("=" * 70)
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
    print("Review metrics to identify breaking points and recovery behavior.")
    print("=" * 70)
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

