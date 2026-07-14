{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "reporting_dms_tree"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
