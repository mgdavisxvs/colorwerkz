# ColorWerkz API (v2)

Minimal Express server exposing consolidated v2 endpoints and proxying color transfer to the Python service.

## Run (local)

1. Start Python service (in another terminal):

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install -r ../../services/python-color/requirements.txt
uvicorn services.python-color.app.main:app --reload --port 8001
```

2. Start API:

```sh
cd apps/api
npm install
PY_SERVICE_BASE=http://localhost:8001 npm run dev
```

3. Test endpoint:

```sh
curl -s -X POST http://localhost:5000/api/v2/color-transfer \
  -H 'content-type: application/json' \
  -d '{"image":"data:image/png;base64,iVBORw0KGgo=","method":"pytorch"}' | jq
```
