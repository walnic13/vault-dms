{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "reporting_search_clients"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}