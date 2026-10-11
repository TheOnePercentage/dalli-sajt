# init-scripts

Optional PostgreSQL init scripts mounted into the `postgres` container
(`/docker-entrypoint-initdb.d`) by `docker-compose.yml`.

Initialization SQL placed here runs **once**, on first database initialization
(empty data volume). It is ignored once `postgres_data` volume has data.

Place non-confidential bootstrap scripts (e.g. extensions, helper functions)
here. Secrets belong in environment variables, not in init scripts committed
to the repository.