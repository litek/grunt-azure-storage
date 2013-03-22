# grunt-azure-storage

Grunt task for copying files to an azure storage blob.

Azure SDK uses by default the environment variables AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_ACCESS_KEY.
Custom connection arguments can be set in service.

## Options and default values
```javascript
{
  serviceOptions: [], // custom arguments to azure.createBlobService
  containerName: null, // container name, required
  containerDelete: false, // deletes container if it exists
  containerOptions: {publicAccessLevel: "blob"}, // container options
  metadata: {}, // file metadata properties
  gzip: false // gzip files
};
```
