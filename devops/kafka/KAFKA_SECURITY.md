# Kafka Security Configuration Guide

This guide describes security configuration for Kafka, including authentication and authorization mechanisms. The current setup uses PLAINTEXT for development, but this guide prepares for production security.

## Security Overview

Kafka security has three main components:

1. **Authentication**: Verifying client identity (SASL/SSL)
2. **Authorization**: Controlling access to resources (ACLs)
3. **Encryption**: Encrypting data in transit (SSL/TLS)

## Current Configuration (Development)

The current setup uses **PLAINTEXT** mode for simplicity in local development:

- No authentication required
- No encryption
- No authorization (all clients have full access)

**This is acceptable for local development only. Production deployments MUST use security.**

## Production Security Modes

### Option 1: SASL_SSL (Recommended for Production)

Combines SASL authentication with SSL encryption.

**Features**:
- Strong authentication via SASL (SCRAM-SHA-512, PLAIN, etc.)
- Encryption in transit via SSL/TLS
- Works with ACLs for fine-grained authorization

### Option 2: SASL_PLAINTEXT

SASL authentication without encryption.

**Features**:
- Authentication required
- No encryption (data visible on network)
- Use only in trusted networks or with external encryption (VPN, etc.)

### Option 3: SSL (Client Certificates)

Mutual TLS authentication.

**Features**:
- Strong authentication via client certificates
- Encryption in transit
- More complex certificate management

## Enabling Security in Production

### Step 1: Update docker-compose.dev.yml

Uncomment and configure security settings in the Kafka service:

```yaml
environment:
  # Security Protocol
  KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:SASL_SSL,EXTERNAL:SASL_SSL,CONTROLLER:PLAINTEXT
  
  # SASL Configuration
  KAFKA_SASL_ENABLED_MECHANISMS: SCRAM-SHA-512
  KAFKA_SASL_MECHANISM_INTER_BROKER_PROTOCOL: SCRAM-SHA-512
  KAFKA_LISTENER_NAME_INTER_BROKER_LISTENER: INTERNAL
  
  # JAAS Configuration (for broker)
  KAFKA_OPTS: >-
    -Djava.security.auth.login.config=/etc/kafka/kafka_server_jaas.conf
    -javaagent:/opt/jmx_exporter/jmx_prometheus_javaagent.jar=9999:/config/kafka.yml
  
  # SSL Configuration
  KAFKA_SSL_KEYSTORE_LOCATION: /var/ssl/private/kafka.server.keystore.jks
  KAFKA_SSL_KEYSTORE_PASSWORD: ${KAFKA_SSL_KEYSTORE_PASSWORD}
  KAFKA_SSL_KEY_PASSWORD: ${KAFKA_SSL_KEY_PASSWORD}
  KAFKA_SSL_TRUSTSTORE_LOCATION: /var/ssl/private/kafka.server.truststore.jks
  KAFKA_SSL_TRUSTSTORE_PASSWORD: ${KAFKA_SSL_TRUSTSTORE_PASSWORD}
  KAFKA_SSL_CLIENT_AUTH: required
  KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM: https
```

### Step 2: Create JAAS Configuration File

Create `devops/kafka/kafka_server_jaas.conf`:

```
KafkaServer {
    org.apache.kafka.common.security.scram.ScramLoginModule required
    username="kafka-broker"
    password="broker-password-change-me";
};

Client {
    org.apache.kafka.common.security.scram.ScramLoginModule required
    username="kafka-broker"
    password="broker-password-change-me";
};
```

**IMPORTANT**: Change passwords and store securely (use secrets management).

### Step 3: Generate SSL Certificates

Generate SSL certificates for Kafka:

```bash
# Create certificate authority (CA)
openssl req -new -x509 -keyout ca-key -out ca-cert -days 365

# Create keystore for broker
keytool -keystore kafka.server.keystore.jks -alias localhost -validity 365 -genkey -keyalg RSA

# Create truststore
keytool -keystore kafka.server.truststore.jks -alias CARoot -import -file ca-cert

# Sign broker certificate
keytool -keystore kafka.server.keystore.jks -alias localhost -certreq -file cert-file
openssl x509 -req -CA ca-cert -CAkey ca-key -in cert-file -out cert-signed -days 365 -CAcreateserial
keytool -keystore kafka.server.keystore.jks -alias CARoot -import -file ca-cert
keytool -keystore kafka.server.keystore.jks -alias localhost -import -file cert-signed
```

Store certificates securely and mount to container:

```yaml
volumes:
  - ./devops/kafka/ssl:/var/ssl/private:ro
  - ./devops/kafka/kafka_server_jaas.conf:/etc/kafka/kafka_server_jaas.conf:ro
```

### Step 4: Create SASL Users

Create SASL users using `kafka-configs`:

```bash
# Create SCRAM user for broker
docker exec kafka kafka-configs --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=broker-password]' \
  --entity-type users --entity-name kafka-broker

# Create SCRAM user for application
docker exec kafka kafka-configs --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=app-password-change-me]' \
  --entity-type users --entity-name mediajira-app

# Create SCRAM user for admin
docker exec kafka kafka-configs --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=admin-password-change-me]' \
  --entity-type users --entity-name admin
```

### Step 5: Update Client Configuration

#### Backend (Python)

Update `backend/backend/kafka_client.py`:

```python
def get_base_producer_config() -> dict:
    config = {
        'bootstrap_servers': get_bootstrap_servers(),
        'security_protocol': 'SASL_SSL',
        'sasl_mechanism': 'SCRAM-SHA-512',
        'sasl_plain_username': os.getenv('KAFKA_SASL_USERNAME'),
        'sasl_plain_password': os.getenv('KAFKA_SASL_PASSWORD'),
        'ssl_cafile': os.getenv('KAFKA_SSL_CAFILE'),
        'ssl_certfile': os.getenv('KAFKA_SSL_CERTFILE'),
        'ssl_keyfile': os.getenv('KAFKA_SSL_KEYFILE'),
        # ... rest of config
    }
    return config
```

Set environment variables:
```bash
KAFKA_SASL_USERNAME=mediajira-app
KAFKA_SASL_PASSWORD=app-password-change-me
KAFKA_SSL_CAFILE=/path/to/ca-cert
```

#### Frontend (JavaScript/TypeScript)

Update `frontend/src/lib/kafka/client.ts`:

```typescript
const createKafkaClient = (): Kafka => {
  return new Kafka({
    clientId: 'mediajira-frontend',
    brokers: getBootstrapServers().split(','),
    ssl: {
      rejectUnauthorized: true,
      ca: [fs.readFileSync(process.env.KAFKA_SSL_CAFILE!, 'utf-8')],
    },
    sasl: {
      mechanism: 'scram-sha-512',
      username: process.env.KAFKA_SASL_USERNAME!,
      password: process.env.KAFKA_SASL_PASSWORD!,
    },
  });
};
```

## Access Control Lists (ACLs)

ACLs control which users can perform which operations on which resources.

### Enable ACLs

Add to Kafka broker configuration:

```yaml
KAFKA_AUTHORIZER_CLASS_NAME: kafka.security.authorizer.AclAuthorizer
KAFKA_SUPER_USERS: User:admin
```

### Create ACLs

```bash
# Allow admin full access
docker exec kafka kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:admin --operation All --topic '*' --group '*'

# Allow app user to produce to specific topics
docker exec kafka kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:mediajira-app \
  --producer --topic campaign.created.json --topic asset.updated.json

# Allow app user to consume from specific topics
docker exec kafka kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:mediajira-app \
  --consumer --topic campaign.created.json --group campaign-processor
```

### List ACLs

```bash
docker exec kafka kafka-acls --bootstrap-server localhost:9092 --list
```

### Remove ACLs

```bash
docker exec kafka kafka-acls --bootstrap-server localhost:9092 \
  --remove --allow-principal User:mediajira-app \
  --producer --topic campaign.created.json
```

## ACL Strategy Recommendations

### Principle of Least Privilege

1. **Separate Users**: Create separate users for different services/applications
2. **Topic-Level Permissions**: Grant access only to required topics
3. **Operation-Specific Permissions**: Grant only necessary operations (Read, Write, etc.)
4. **Consumer Group Isolation**: Use different consumer groups per service

### Example ACL Setup

```bash
# Campaign service - can produce campaign events
kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:campaign-service \
  --producer --topic campaign.created.json --topic campaign.updated.json

# Asset service - can produce asset events
kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:asset-service \
  --producer --topic asset.created.json --topic asset.updated.json

# Analytics service - can consume all events
kafka-acls --bootstrap-server localhost:9092 \
  --add --allow-principal User:analytics-service \
  --consumer --topic '*' --group analytics-processor

# Admin - full access (super user)
# Already configured via KAFKA_SUPER_USERS
```

## Security Best Practices

1. **Use Strong Passwords**: Generate random, strong passwords for all users
2. **Rotate Credentials**: Regularly rotate passwords and certificates
3. **Store Secrets Securely**: Use secrets management (Vault, AWS Secrets Manager, etc.)
4. **Limit Network Access**: Restrict Kafka ports to trusted networks
5. **Monitor Access**: Log and monitor authentication attempts
6. **Use TLS**: Always use SSL/TLS in production (SASL_SSL)
7. **Separate Environments**: Use different credentials for dev/staging/prod
8. **Regular Audits**: Review ACLs regularly and remove unnecessary permissions
9. **Certificate Management**: Use proper certificate lifecycle management
10. **Principle of Least Privilege**: Grant minimum necessary permissions

## Migration Path

When moving from PLAINTEXT to secured mode:

1. **Plan**: Document all clients and their access needs
2. **Test**: Set up secured environment and test all clients
3. **Create Users**: Create SASL users for all services
4. **Create ACLs**: Define and apply ACLs
5. **Update Clients**: Update all client configurations
6. **Deploy**: Deploy changes in staging first, then production
7. **Monitor**: Watch for authentication/authorization errors
8. **Rollback Plan**: Have a plan to rollback if issues occur

## Troubleshooting

### Authentication Failouts

Error: `SASL authentication failed`

Solutions:
- Verify username and password are correct
- Check JAAS configuration
- Verify SASL mechanism matches (SCRAM-SHA-512)
- Check user exists: `kafka-configs --bootstrap-server localhost:9092 --describe --entity-type users --entity-name <username>`

### Authorization Failures

Error: `Topic authorization failed`

Solutions:
- Check ACLs: `kafka-acls --bootstrap-server localhost:9092 --list`
- Verify user has required permissions
- Check topic name matches exactly
- Verify consumer group permissions

### SSL Certificate Issues

Error: `SSL handshake failed`

Solutions:
- Verify certificates are valid and not expired
- Check certificate paths are correct
- Verify CA certificate is trusted
- Check certificate matches broker hostname

## Additional Resources

- [Kafka Security Documentation](https://kafka.apache.org/documentation/#security)
- [Kafka SASL Configuration](https://kafka.apache.org/documentation/#security_sasl)
- [Kafka SSL Configuration](https://kafka.apache.org/documentation/#security_ssl)
- [Kafka ACLs](https://kafka.apache.org/documentation/#security_authz)

