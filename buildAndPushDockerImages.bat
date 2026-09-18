docker build -t lewan24/nodexmesh-api:latest ./Backend --no-cache
docker build -t lewan24/nodexmesh-web:latest ./Frontend --no-cache

docker push lewan24/nodexmesh-api:latest
docker push lewan24/nodexmesh-web:latest
