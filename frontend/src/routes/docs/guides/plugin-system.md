---
title: 'OSINTBuddy: Plugin System'
pageTitle: Plugin System
description: Fetch data from different sources and return results as visual entities you can explore step by step
---

OSINTBuddy plugins are manifest‑based and versioned. Each plugin lives in a folder like `plugins/<plugin_id>/<version>/` and contains:

- `manifest.json` describing entities and their UI elements
- `plugin.py` registering one or more transforms via a decorator

How it works

- The Registry loads all manifests and plugin modules from disk
- Entities come from `manifest.json` and are versioned
- Transforms are declared in code with explicit `input` entity and `outputs` entity ids/versions
- A transform returns one or more nodes (dicts) labeled with the output entity id; fields map to element labels

Example: CSE Search plugin

`plugins/cse_search/1.0.0/manifest.json`

```json
{
  "plugin_id": "cse_search",
  "version": "1.0.0",
  "module": "plugin.py",
  "entities": [
    {
      "id": "cse_search",
      "version": "1.0.0",
      "label": "CSE Search",
      "icon": "search",
      "color": "#2C7237",
      "elements": [
        [
          { "label": "Query", "type": "text", "icon": "search" },
          { "label": "Max Results", "type": "dropdown", "value": { "label": "20" }, "options": [
            { "label": "10" }, { "label": "20" }, { "label": "30" }, { "label": "40" }, { "label": "50" },
            { "label": "60" }, { "label": "70" }, { "label": "80" }, { "label": "90" }, { "label": "100" }
          ]}
        ],
        { "label": "CSE Categories", "type": "dropdown", "value": { "label": "Default CSE", "value": "https://cse.google.com/cse/publicurl?cx=017261104271573007538:bbzhlah6n4o" }, "options": [
          { "label": "Default CSE", "value": "https://cse.google.com/cse/publicurl?cx=017261104271573007538:bbzhlah6n4o" }
        ]}
      ]
    },
    {
      "id": "cse_result",
      "version": "1.0.0",
      "label": "CSE Result",
      "icon": "file",
      "color": "#058F63",
      "elements": [ { "label": "Result", "type": "title" }, { "label": "URL", "type": "copy" }, { "label": "Cache URL", "type": "copy" } ]
    }
  ]
}
```

`plugins/cse_search/1.0.0/plugin.py`

```py
from pydantic import BaseModel
from osintbuddy.plugins import transform


@transform(
  id='to_cse_results',
  label='To CSE Results',
  icon='search',
  edge_label='cse_result_of',
  input={ 'entity_id': 'cse_search', 'version_range': '^1' },
  outputs=[ { 'entity_id': 'cse_result', 'version': '1.0.0' } ],
)
async def to_cse_results(entity: BaseModel):
  query = getattr(entity, 'query', '').strip()
  if not query:
    return []
  # return one or more nodes labeled with the output entity id
  return [{
    'label': 'cse_result',
    'result': { 'title': f'Results for {query}', 'subtitle': 'example', 'text': '...' },
    'url': 'https://example.com',
    'cache_url': 'https://example.com/cache'
  }]
```

Testing transforms locally

Use the built‑in CLI from the plugins package to list entities, list transforms, and run transforms from disk.

```bash
python osintbuddy-plugins/src/osintbuddy/ob.py ls entities
python osintbuddy-plugins/src/osintbuddy/ob.py ls transforms -L cse_search
python osintbuddy-plugins/src/osintbuddy/ob.py run -T '{
  "entity": {
    "data": {
      "label": "cse_search",
      "query": "site:example.com",
      "max_results": "20",
      "cse_categories": "https://cse.google.com/cse/publicurl?cx=017261104271573007538:bbzhlah6n4o"
    },
    "transform": "to_cse_results"
  }
}'
```

Versioning

- Entities and plugins are versioned; the transform’s `input` declares compatible versions via `version` or `version_range`
- Outputs specify exact entity versions for predictable mapping

