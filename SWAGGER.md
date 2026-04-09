## Swagger / OpenAPI docs

This repo includes a consolidated OpenAPI spec at `openapi.yaml`.

### View in Swagger UI (Docker)

From the repo root:

```powershell
docker run --rm -p 8081:8080 `
  -e SWAGGER_JSON=/spec/openapi.yaml `
  -v "${PWD}:/spec" `
  swaggerapi/swagger-ui
```

Then open `http://localhost:8081`.

### Which server to use

- **Kong (recommended)**: select server `http://localhost:8000`
- **Direct service ports**: select the relevant `http://localhost:5xxx` server

### Notes

- The `credit` service is GraphQL at `/graphql` on the direct service (`http://localhost:5007/graphql`).
- If you want GraphQL to appear under Kong as `/credit/graphql`, ensure your Kong routes include that mapping.

