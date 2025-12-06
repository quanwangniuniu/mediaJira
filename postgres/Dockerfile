FROM postgres:15

RUN apt-get update && apt-get install -y \
    pgbackrest \
    gosu \
    && rm -rf /var/lib/apt/lists/*

COPY ./postgresql.conf /etc/postgresql/postgresql.conf

COPY ./pgbackrest-archive.conf /etc/pgbackrest.conf


