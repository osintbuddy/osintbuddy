---
title: Writing plugins
pageTitle: Creating your first OSINTBuddy plugin
description:
---

In this guide, you’ll create a plugin using the new manifest‑based plugin system. Plugins now consist of:

- A versioned folder with a `manifest.json` that defines entities and their UI elements
- A `plugin.py` with one or more `@transform(...)` functions that operate on those entities

Directory layout

```
plugins/
  website/
    1.0.0/
      manifest.json
      plugin.py
```

1) Define your entity in `manifest.json`

```json
{
  "plugin_id": "website",
  "version": "1.0.0",
  "module": "plugin.py",
  "entities": [
    {
      "id": "website",
      "version": "1.0.0",
      "label": "Website",
      "icon": "world-www",
      "color": "#1D1DB8",
      "elements": [
        { "label": "Domain", "type": "text", "icon": "world-www" }
      ]
    },
    {
      "id": "ip_address",
      "version": "1.0.0",
      "label": "IP Address",
      "icon": "server",
      "elements": [ { "label": "IP", "type": "copy" } ]
    }
  ]
}
```

2) Implement a transform in `plugin.py`

```py
import socket
from pydantic import BaseModel
from osintbuddy.plugins import transform


@transform(
    id='to_ip',
    label='To IP',
    icon='building-broadcast-tower',
    edge_label='ip_of',
    input={ 'entity_id': 'website', 'version_range': '^1' },
    outputs=[ { 'entity_id': 'ip_address', 'version': '1.0.0' } ],
)
async def to_ip(entity: BaseModel):
    domain = getattr(entity, 'domain', '').strip()
    if not domain:
        return []
    ip = socket.gethostbyname(domain)
    # Return a node for the output entity id
    return [{ 'label': 'ip_address', 'ip': ip }]
```

Return shape

- Return a dict or list of dicts
- Each dict must include `label` set to the output entity id (e.g., `ip_address`)
- Additional keys map to the entity’s elements (e.g., `ip` populates the Copy element)

Load and test locally

Use the included CLI from the plugins package to run transforms on disk without the server.

```bash
python osintbuddy-plugins/src/osintbuddy/ob.py run -T '{
  "entity": {
    "data": { "label": "website", "domain": "example.com" },
    "transform": "to_ip"
  }
}'
```

This will return an `ip_address` node populated from your transform.
