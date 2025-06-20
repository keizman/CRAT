cd web
npm run build
cd -
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o crat main.go