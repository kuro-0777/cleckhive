# 12 — IoT Connectivity (ESP32 + Motion)

Live "Collection Point is Busy / Moderate / Open" room-monitor.

```
ESP32 (PIR on GPIO13)
   │
   ├── WiFi → POST /api/motion        (every 1s)
   │              │
   │       MotionController::store()
   │              │
   │     Cache::put('motion:room-101')   ← Laravel file cache, no DB
   │
   └── React polls GET /api/motion/latest (every 1s) → renders status
```

**No model, no migration, no DB table.** The latest reading per device
sits in Laravel's file cache (`storage/framework/cache/`) and is
overwritten on every POST. Reset = delete the cache key, no schema drift.

The full drop-in bundle lives at
`Downloads/aashika/TeamProject/TeamProjectFix/iot/` and ships as
copy-in files + small "snippet" patches to existing files (so it doesn't
trample your real `routes/api.php`, `config/services.php`, etc.).

---

## Files

### Drop-in (copy verbatim into your Laravel tree)

| Source                                                         | → Destination                                            |
|----------------------------------------------------------------|----------------------------------------------------------|
| `iot/app/Http/Controllers/MotionController.php`                | `app/Http/Controllers/MotionController.php`              |
| `iot/resources/js/pages/RoomMonitor.jsx`                       | `resources/js/pages/RoomMonitor.jsx`                     |
| `iot/resources/js/pages/RoomMonitor.scss`                      | `resources/js/pages/RoomMonitor.scss`                    |
| `iot/arduino/room-monitor.ino`                                 | open in Arduino IDE (not part of the Laravel tree)       |

### Snippets (merge — do NOT replace whole files)

| Snippet                                          | Merge into                          | Why                                              |
|--------------------------------------------------|-------------------------------------|--------------------------------------------------|
| `iot/routes/api.snippet.php`                     | `routes/api.php`                    | adds POST `/motion` + GET `/motion/latest`       |
| `iot/config/services.snippet.php`                | `config/services.php`               | adds `esp32.api_key` resolver                    |
| `iot/.env.snippet`                               | `.env`                              | adds `ESP32_API_KEY`                             |
| `iot/app/Providers/AppServiceProvider.snippet.php`| `app/Providers/AppServiceProvider.php` | forces HTTPS behind ngrok                     |
| `iot/resources/js/app.snippet.jsx`               | `resources/js/app.jsx`              | adds the `/room-monitor` React route             |
| `iot/vite.config.snippet.js` *(optional)*        | `vite.config.js`                    | LAN host + `/api` + `/storage` proxy for dev     |

---

## Environment

`.env`:

```env
ESP32_API_KEY=your-secret-key
# CACHE_STORE=file   # (only if you don't have create_cache_table migrated)
```

`config/services.php`:

```php
'esp32' => [
    'api_key' => env('ESP32_API_KEY'),
],
```

The **same string** must go in the Arduino sketch:
```cpp
const char* API_KEY = "your-secret-key";   // MUST match .env ESP32_API_KEY
```

---

## Routes

Public — the ESP32 has no Sanctum token; the controller checks the
`X-Api-Key` header itself.

| Method | URL                  | Controller                        |
|--------|----------------------|-----------------------------------|
| POST   | `/api/motion`        | `MotionController::store`         |
| GET    | `/api/motion/latest` | `MotionController::latest`        |

```php
use App\Http\Controllers\MotionController;
Route::post('/motion',       [MotionController::class, 'store']);
Route::get('/motion/latest', [MotionController::class, 'latest']);
```

---

## `MotionController.php`

70 lines, no model, no migration.

```php
class MotionController extends Controller
{
    /** POST /api/motion */
    public function store(Request $request): JsonResponse
    {
        if ($request->header('X-Api-Key') !== config('services.esp32.api_key')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $data = $request->validate([
            'device_id'    => 'required|string|max:50',
            'status'       => 'required|in:not_busy,moderate,busy',
            'motion_count' => 'required|integer|min:0',
            'uptime_ms'    => 'required|integer|min:0',
        ]);

        $data['received_at'] = now()->toISOString();
        Cache::put("motion:{$data['device_id']}", $data);

        return response()->json(['success' => true], 200);
    }

    /** GET /api/motion/latest?device_id=room-101 */
    public function latest(Request $request): JsonResponse
    {
        $deviceId = $request->query('device_id', 'room-101');
        $data     = Cache::get("motion:{$deviceId}");

        if (!$data) return response()->json(['error' => 'No data yet'], 404);

        $secondsAgo          = now()->diffInSeconds($data['received_at']);
        $data['last_seen_s'] = $secondsAgo;
        $data['online']      = $secondsAgo <= 5;

        $s = intdiv($data['uptime_ms'], 1000);
        $data['uptime'] = sprintf('%d:%02d:%02d',
            intdiv($s, 3600), intdiv($s % 3600, 60), $s % 60);

        return response()->json($data);
    }
}
```

**Key shape — `motion:<device_id>`** (overwritten every second). `latest()` adds three computed fields on read: `last_seen_s`, `online` (true if ≤5s), and a `HH:MM:SS`-formatted `uptime`.

---

## `RoomMonitor.jsx`

Public route `/room-monitor`. Polls `GET /api/motion/latest` every 1 s,
flashes a brief "ping" animation on each update, and renders one of three
status cards driven by `STATUS_CONFIG`:

| `status`   | Label                                | Modifier class         | Emoji |
|------------|--------------------------------------|------------------------|-------|
| `not_busy` | Collection Point is Open             | `status-card--not_busy`| 🟢    |
| `moderate` | Collection Point is Slightly Busy    | `status-card--moderate`| 🟡    |
| `busy`     | Collection Point is Busy             | `status-card--busy`    | 🔴    |

States it renders:

1. **Loading** — `Checking collection point status…`
2. **Error** — `Unable to load collection point status.`
3. **Sensor offline** — banner over the card when `data.online === false` (last update was >5 s ago).
4. **Live** — emoji + label + advice + a `LIVE` / `OFFLINE` badge with a pulsing dot.

Hook the page into your router by merging `iot/resources/js/app.snippet.jsx`:

```jsx
import RoomMonitor from './pages/RoomMonitor'
// ...
<Route path="/room-monitor" element={<RoomMonitor />} />
```

No layout / auth wrapping — anyone can view it.

---

## ESP32 firmware (`arduino/room-monitor.ino`)

- Board: **ESP32 Dev Module**
- Library: **ArduinoJson** (Benoit Blanchon) via Library Manager
- Wiring: PIR `VCC → VIN (5V)`, `GND → GND`, `OUT → GPIO 13`

Four constants to edit before flashing:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL       = "http://192.168.1.42:8000/api/motion";   // your PC's LAN IP
const char* API_KEY       = "your-secret-key";                       // matches .env
const char* DEVICE_ID     = "room-101";
```

### Busyness classification

A rolling ring buffer of motion timestamps over a 15-second window:

```cpp
const unsigned long WINDOW_MS = 15000;
const char* classify(int n) {
  if (n == 0) return "not_busy";
  if (n <= 5) return "moderate";
  return "busy";
}
```

Each sustained second of `HIGH` on GPIO 13 counts as one event (debounced
via `lastHighRecord`). The classifier runs every loop tick, but only the
1 Hz `lastPrint` cadence triggers an HTTP POST.

### Outbound JSON

```json
{
  "device_id":    "room-101",
  "status":       "moderate",
  "motion_count": 3,
  "uptime_ms":    482194
}
```

Sent with headers:

```
Content-Type: application/json
Accept:       application/json
X-Api-Key:    your-secret-key
```

If WiFi drops, `postJson()` calls `connectWiFi()` and skips the POST that
tick.

---

## Apply the bundle

```cmd
cd path\to\TeamProjectFix\iot
copy app\Http\Controllers\MotionController.php  ..\..\app\Http\Controllers\
copy resources\js\pages\RoomMonitor.jsx          ..\..\resources\js\pages\
copy resources\js\pages\RoomMonitor.scss         ..\..\resources\js\pages\

:: then merge each *.snippet.* into the corresponding real file

php artisan config:clear
php artisan route:clear
php artisan route:list          :: confirm api/motion + api/motion/latest are listed

npm run build                   :: or `npm run dev` if not behind ngrok
php artisan serve --host=0.0.0.0 --port=8000
```

Visit:
- Local: `http://localhost:5173/room-monitor` (dev) or `http://localhost:8000/room-monitor` (built)
- LAN: `http://YOUR_PC_LAN_IP:8000/room-monitor`
- Tunnelled: open the ngrok URL + `/room-monitor`

---

## Troubleshooting

| Symptom                                            | Likely cause                                                | Fix                                                          |
|----------------------------------------------------|-------------------------------------------------------------|--------------------------------------------------------------|
| ESP32 serial: `POST failed: connection refused`    | `artisan serve` bound to 127.0.0.1                          | Restart with `--host=0.0.0.0`                                |
| Same, but on campus/public WiFi                    | AP/client isolation blocks LAN-to-LAN                       | Phone hotspot OR ngrok tunnel                                |
| Browser console: `Mixed Content`                   | HTTPS page loading HTTP assets                              | `npm run build` instead of `npm run dev`, or merge `AppServiceProvider.snippet.php` |
| Browser DevTools: CORS error                       | Vite on `:5173` calling Laravel on `:8000`                  | Use `vite.config.snippet.js` proxy, or build the frontend    |
| Page stuck on "Waiting for device…"                | ESP32 not posting, OR key mismatch (401), OR cache cleared  | Check ESP32 Serial Monitor for `POST 200`; verify `ESP32_API_KEY` |
| ESP32 serial: `401 Unauthorized`                   | `X-Api-Key` header ≠ `.env`                                 | Update either side to match                                  |
| ESP32 serial: `POST 422`                           | Validation failed                                           | Make sure `device_id`/`status`/`motion_count`/`uptime_ms` are present and types match |

---

## Why no database?

The status is **only meaningful in real time** — a 5-minute-old "busy"
reading is useless. Persisting it to Oracle would mean (a) creating a
sequence + trigger for prefixed PKs, (b) writing once per second per
device into the same WAL the rest of CleckHive uses, and (c) immediately
discarding ~99% of those rows.

The file cache wins: zero schema, zero migration, atomically overwritten,
and `Cache::get()` is a single `file_get_contents`. If you ever need
historical data, layer a `motion_history` table on top — but don't make
that the source of truth for the live screen.
