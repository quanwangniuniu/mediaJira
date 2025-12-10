terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider
provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "example" {
  cidr_block = "10.0.0.0/16"
}

# ECS Cluster
resource "aws_ecs_cluster" "example" {
  name = "example-cluster"
}

# RDS 
resource "aws_db_instance" "example" {
  allocated_storage   = 20
  engine              = "postgres"
  engine_version      = "14.0"
  instance_class      = "db.t3.micro"
  identifier          = "exampledb"
  username            = "exampleuser"
  password            = "examplepass"
  skip_final_snapshot = true
}
