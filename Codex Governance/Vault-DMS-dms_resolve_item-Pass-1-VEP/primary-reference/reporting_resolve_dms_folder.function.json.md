{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "reporting_resolve_dms_folder"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
