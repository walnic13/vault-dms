{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "reporting_download_dms_item"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}