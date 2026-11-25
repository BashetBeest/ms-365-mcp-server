# Two app registrations for search and file reads

`--http --obo` keeps the one Cursor login. The server exchanges that sign-in into two Graph tokens:

- The search app's token has `Files.Read.All`. `search-query` uses it, so search can see files the signed-in user can read.
- The read app's token has `Files.SelectedOperations.Selected`. `list-folder-files`, `get-drive-item`, `get-download-url`, and `download-bytes` use it and no other token. Graph allows that token only for files and folders granted to the read app.

Plain `--http` cannot do this. Its bearer is already a Graph token, and Entra will not exchange a Graph token for a second app.

Each Cursor session sends its own bearer. Several people can use one server. The folder grant is on the read app, so every caller is confined to the same folder, and each caller must also be allowed to open that folder.

When the read app is configured, the search app's Graph token is `Files.Read.All` only, not `https://graph.microsoft.com/.default`. Other tools on that server share that token.

## Search app

Use the existing app (`MS365_MCP_CLIENT_ID`). It is the app Cursor logs into. It must be a confidential client (`MS365_MCP_CLIENT_SECRET`).

Delegated permissions, admin-consented:

- `Files.Read.All` on Microsoft Graph
- `access_as_user` on the read app (the API permission from the next section)

Do not grant this app `Files.SelectedOperations.Selected`. A token that also contains `Files.Read.All` ignores a folder grant.

Expose an API of its own if it does not already have one. `--obo` asks for `<search-app-id>/access_as_user`.

## Read app

Create a second app registration.

1. Certificates & secrets: create a client secret. Put it in `MS365_MCP_READ_CLIENT_SECRET`. The application id is `MS365_MCP_READ_CLIENT_ID`.
2. Expose an API. Set the Application ID URI to `api://<read-app-id>`. Add a scope named `access_as_user`. Under Authorized client applications, add the search app's client id so the exchange does not prompt.
3. API permissions: add delegated `Files.SelectedOperations.Selected` on Microsoft Graph. Grant admin consent. Do not add `Files.Read.All`.

## Folder grant

`Files.SelectedOperations.Selected` does nothing until the read app is granted the folder. This is a Graph call made with an account that can manage permissions on that folder. It breaks permission inheritance on the folder.

```http
POST https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/items/{folder-id}/permissions
Content-Type: application/json

{
  "roles": ["read"],
  "grantedTo": {
    "application": { "id": "<read-app-id>" }
  }
}
```

A parent of that folder is not granted, so the read token receives 403 there. Delegated selected access still requires the signed-in user to be able to open the folder.

## Run

```bash
node dist/index.js --org-mode --enabled-tools-file ./enabled_tools.txt --read-only --http 127.0.0.1:3000 --obo
```

`--obo` is required. Without the two `MS365_MCP_READ_*` variables the server keeps the single `.default` exchange and file tools use that token.
