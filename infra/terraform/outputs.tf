output "vpc_id" {
  description = "The ID of the example VPC"
  value       = aws_vpc.example.id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.example.name
}

output "rds_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.example.id
}
