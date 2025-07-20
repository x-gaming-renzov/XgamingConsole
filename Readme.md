set -a && source .env.prod && set +a && npm run dev
uvicorn nova_manager.main:app --reload

Run Postgress locally in docker

```
docker run -d \
  --name local-postgres \
  -e POSTGRES_USER=nova-manager \
  -e POSTGRES_PASSWORD=nova-manager \
  -e POSTGRES_DB=nova \
  -p 5432:5432 \
  -v pgdata:/Volumes/RenzovPersonal/cache_data \
  postgres:15
```
