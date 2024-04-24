# Document Naming Service

## Tutorials
### Add the document-naming-service to your stack
Add the following snippet to your `docker-compose.yml` file to include the document-naming-service service in your project.

```yml
document-naming-service:
  image: kanselarij/document-naming-service:0.3.8
```

The service supports the following environment variables:

```yml
    environment:
      ENABLE_SENDING_TO_VP_API: false
```

Add the following snippet to your `dispatcher.ex` config file to expose this service's endpoint.

``` elixir
match "/document-naming/*path", @json_service do
  Proxy.forward conn, path, "http://document-naming/"
end
```
