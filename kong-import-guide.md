## 1. Install Deck

### FOR WINDOWS
install kong deck  
run `docker pull kong/deck` in terminal  

### FOR macOS  
run  
`brew tap kong/deck`  
then  
`brew install kong/deck/deck`  

## 2. Start Docker
Ensure KONG is running as well  
`docker compose up -d`

Check by going to http://localhost:8002 to see if the KONG Manager is up

## 3. Import from kong.yaml file

### Windows
``
docker run --rm --network host `
  -v "${PWD}:/workspace" `
  -w /workspace `
  kong/deck sync --state kong.yaml --kong-addr http://host.docker.internal:8001
``

### Mac

## 4. Check if KONG has imported the KONG Gateway Services and Routes
Go to http://localhost:8002 to see
