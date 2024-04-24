# Document Naming Service

## Tutorials
### Add the document-naming-service
Add the following snippet to your `docker-compose.yml` file to include the document-naming-service service in your project.

```yml
document-naming-service:
  image: kanselarij/vlaams-parlement-sync-service:0.3.8
  volumes:
    - ./data/files:/share # To access the files
    - ./data/debug:/debug # Writes payload.json for debug purposes — warning! it's a big file! your editor may struggle to open it
```

The service supports the following environment variables:

```yml
    environment:
      ENABLE_SENDING_TO_VP_API: false # enable/disable the actual call to the VP-API
```

Add the following snippet to your `dispatcher.ex` config file to expose this service's endpoint.

``` elixir
match "/document-naming-service/*path", @json_service do
  Proxy.forward conn, path, "http://document-naming-service/"
end
```
