# Document Naming Service

## Tutorials
### Add the document-naming-service to your stack
Add the following snippet to your `docker-compose.yml` file to include the document-naming-service service in your project.

```yml
document-naming-service:
  image: kanselarij/document-naming-service
```

Add the following snippet to your `dispatcher.ex` config file to expose this service's endpoint.

``` elixir
match "/document-naming/*path", @json_service do
  Proxy.forward conn, path, "http://document-naming/"
end
```

#### Resources

`domain.lisp`:
```lisp
(define-resource document-naming-job ()
  :class (s-prefix "ext:DocumentNamingJob") ; "cogs:Job"
  :properties `((:created       :datetime  ,(s-prefix "dct:created"))
                (:status        :uri       ,(s-prefix "adms:status"))
                (:time-started  :datetime  ,(s-prefix "prov:startedAtTime"))
                (:time-ended    :datetime  ,(s-prefix "prov:endedAtTime"))
                (:message       :string    ,(s-prefix "schema:error"))
  )
  :has-one `((agenda            :via       ,(s-prefix "dct:source")
                                :as "source"))
  :has-many `((piece            :via       ,(s-prefix "prov:used")
                                :as "used"))
  :resource-base (s-url "http://example.com/id/document-naming-jobs/")
  :features '(include-uri)
  :on-path "document-naming-jobs"
)
```