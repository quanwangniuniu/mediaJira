#!/usr/bin/env python3
"""
Run All Tests Script
Executes all test scenarios sequentially: smoke, load, stress, spike
"""

import os
import sys
import subprocess
from pathlib import Path


def get_script_dir():
    """Get the directory where this script is located"""
    return Path(__file__).parent.resolve()


def run_test(script_name, test_name):
    """Run a test script and return exit code"""
    script_dir = get_script_dir()
    script_path = script_dir / script_name
    
    if not script_path.exists():
        print(f"Error: Test script not found: {script_path}")
        return 1
    
    try:
        # Determine if it's a Python or bash script
        if script_path.suffix == '.py':
            result = subprocess.run([sys.executable, str(script_path)], check=False)
        else:
            result = subprocess.run(['bash', str(script_path)], check=False)
        return result.returncode
    except Exception as e:
        print(f"Error running {test_name}: {e}")
        return 1


def main():
    script_dir = get_script_dir()
    os.chdir(script_dir)
    
    print("=" * 70)
    print("K6 Load Testing - Running All Scenarios")
    print("=" * 70)
    print()
    print("⚠️  IMPORTANT: This will run ALL tests including aggressive stress and spike tests")
    print("   • Smoke test: Safe (1 VU)")
    print("   • Load test: Moderate (up to 50 VUs)")
    print("   • Stress test: Aggressive (up to 200 VUs) ⚠️")
    print("   • Spike test: Extreme (sudden 100 VU spike) ⚠️")
    print()
    print("   Consider running tests individually, especially stress/spike tests")
    print("   on dedicated test machines to avoid impacting your development workstation.")
    print("=" * 70)
    print()
    
    # Run smoke test
    print("1. Running Smoke Test...")
    print("-" * 40)
    smoke_exit = run_test('run_smoke_test.py', 'smoke test')
    if smoke_exit != 0:
        print("Warning: Smoke test failed. Continuing with other tests...")
    
    print()
    print("-" * 40)
    print()
    
    # Run load test
    print("2. Running Load Test...")
    print("-" * 40)
    load_exit = run_test('run_load_test.py', 'load test')
    if load_exit != 0:
        print("Warning: Load test failed. Continuing with other tests...")
    
    print()
    print("-" * 40)
    print()
    
    # Run stress test
    print("3. Running Stress Test...")
    print("-" * 40)
    print("⚠️  WARNING: Stress test will ramp up to 200 VUs (very aggressive)")
    print("   This may significantly impact your development machine.")
    print("   Consider running stress test separately on a dedicated machine.")
    print("-" * 40)
    stress_exit = run_test('run_stress_test.py', 'stress test')
    if stress_exit != 0:
        print("Warning: Stress test failed (may be expected). Continuing...")
    
    print()
    print("-" * 40)
    print()
    
    # Run spike test
    print("4. Running Spike Test...")
    print("-" * 40)
    print("⚠️  WARNING: Spike test creates sudden 100 VU spike in 10 seconds (extremely aggressive)")
    print("   This may overwhelm your system immediately.")
    print("   Consider running spike test separately on a dedicated machine.")
    print("-" * 40)
    spike_exit = run_test('run_spike_test.py', 'spike test')
    if spike_exit != 0:
        print("Warning: Spike test failed. Continuing...")
    
    print()
    print("=" * 42)
    print("All Tests Completed")
    print("=" * 42)
    print()
    print("Summary:")
    print(f"  Smoke Test:  {'PASSED' if smoke_exit == 0 else 'FAILED'}")
    print(f"  Load Test:   {'PASSED' if load_exit == 0 else 'FAILED'}")
    print(f"  Stress Test: {'PASSED' if stress_exit == 0 else 'FAILED'}")
    print(f"  Spike Test:  {'PASSED' if spike_exit == 0 else 'FAILED'}")
    print()
    
    # Determine overall exit status
    if smoke_exit == 0 and load_exit == 0:
        print("Core tests (smoke, load) passed.")
        sys.exit(0)
    else:
        print("Core tests failed. Review results above.")
        sys.exit(1)


if __name__ == '__main__':
    main()

