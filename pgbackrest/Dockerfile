FROM ubuntu:24.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl3 \
    libxml2 \
    liblz4-1 \
    libzstd1 \
    libbz2-1.0 \
    libyaml-0-2 \
    libssh2-1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built file
COPY ./package/pgbackrest /usr/bin/pgbackrest 
COPY ./pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY ./entrypoint /usr/bin/entrypoint

# Create directory
RUN mkdir -p /etc/pgbackrest /etc/pgbackrest/conf.d /var/log/pgbackrest /var/lib/pgbackrest \
    && chmod -R 755 /etc/pgbackrest /var/log/pgbackrest /var/lib/pgbackrest

# Create user for share repo-path access
RUN groupadd -g 999 postgres && useradd -u 999 -g 999 -m -s /bin/bash postgres


CMD ["tail", "-f", "/dev/null"]
