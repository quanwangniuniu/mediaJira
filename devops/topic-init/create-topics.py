#!/usr/bin/env python3
"""
Create Kafka topics from topics.yaml definition file.
This script parses the YAML file and creates all defined topics.
"""
import sys
import yaml
import subprocess
import argparse

def create_topic(bootstrap_server, name, partitions, replication_factor, config):
    """Create a single Kafka topic."""
    try:
        # Check if topic exists
        check_cmd = [
            'kafka-topics',
            '--bootstrap-server', bootstrap_server,
            '--list'
        ]
        result = subprocess.run(check_cmd, capture_output=True, text=True, check=True)
        if name in result.stdout:
            print(f"⚠ Topic {name} already exists, skipping...")
            return True
        
        # Build create command
        create_cmd = [
            'kafka-topics',
            '--bootstrap-server', bootstrap_server,
            '--create',
            '--topic', name,
            '--partitions', str(partitions),
            '--replication-factor', str(replication_factor)
        ]
        
        # Add config options
        for key, value in config.items():
            create_cmd.extend(['--config', f'{key}={value}'])
        
        # Execute create command
        result = subprocess.run(create_cmd, capture_output=True, text=True, check=True)
        print(f"✓ Topic {name} created successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to create topic {name}: {e.stderr}")
        return False
    except Exception as e:
        print(f"✗ Error creating topic {name}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Create Kafka topics from topics.yaml')
    parser.add_argument(
        '--bootstrap-server',
        default='kafka:9092',
        help='Kafka bootstrap server (default: kafka:9092)'
    )
    parser.add_argument(
        '--yaml-file',
        default='topics.yaml',
        help='Path to topics.yaml file (default: topics.yaml)'
    )
    args = parser.parse_args()
    
    try:
        # Load YAML file
        with open(args.yaml_file, 'r') as f:
            data = yaml.safe_load(f)
        
        if 'topics' not in data:
            print("Error: 'topics' key not found in YAML file")
            sys.exit(1)
        
        topics = data['topics']
        print(f"Creating {len(topics)} topics from {args.yaml_file}...")
        print(f"Bootstrap server: {args.bootstrap_server}\n")
        
        success_count = 0
        failed_topics = []
        
        for topic_def in topics:
            name = topic_def['name']
            partitions = topic_def['partitions']
            replication_factor = topic_def['replication_factor']
            config = topic_def.get('config', {})
            
            if create_topic(args.bootstrap_server, name, partitions, replication_factor, config):
                success_count += 1
            else:
                failed_topics.append(name)
        
        print(f"\n{'='*60}")
        print(f"Summary: {success_count}/{len(topics)} topics created successfully")
        
        if failed_topics:
            print(f"Failed topics: {', '.join(failed_topics)}")
            sys.exit(1)
        else:
            print("All topics created successfully!")
            print(f"\nTo verify topics, run:")
            print(f"  kafka-topics --bootstrap-server {args.bootstrap_server} --list")
            print(f"\nTo describe a topic, run:")
            print(f"  kafka-topics --bootstrap-server {args.bootstrap_server} --describe --topic <topic-name>")
    
    except FileNotFoundError:
        print(f"Error: File '{args.yaml_file}' not found")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()


