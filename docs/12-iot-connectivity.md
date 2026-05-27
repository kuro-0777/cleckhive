# 12 — IoT Connectivity (ESP32 + Motion)

Live "Collection Point is Busy / Moderate / Open" room-monitor served at
`/room-monitor`. Powered by an ESP32 with a PIR motion sensor that posts
JSON over WiFi to the Laravel API once a second; React polls the same API
once a second and re-renders the status card.

```
ESP32 (PIR on GPIO13)
   │
   ├── WiFi → POST <NGROK_URL>/api/motion        (every 1s)
   │              │
   │       MotionController::store()
   │              │
   │     Cache::put('motion:room-101')   ← Laravel file cache, no DB
   │
   └── React polls GET /api/motion/latest (every 1s) → renders status
```

**No model, no migration, no DB table.** The latest reading per device
lives in Laravel's file cache (`storage/framework/cache/`) and is
overwritten on every POST. Reset = delete the cache key, no schema drift.

---

## Why the ESP32 talks to an ngrok URL

The ESP32 lives on whatever WiFi network is around (campus, home,
hotspot). To reach the Laravel server it needs a stable, publicly
addressable URL. We can't bake `http://192.168.x.y:8000` into the
firmware because:

- The PC's LAN IP is **DHCP-assigned and rotates** every time the lease
  expires or the laptop reconnects to a different network. Last week it
  was `192.168.1.42`, today it's `10.0.0.118`, tomorrow it'll be
  something else.
- Many networks (campus WiFi especially) **block client-to-client
  traffic**, so even if the IP were stable, the ESP32 couldn't reach it.
- Re-flashing the ESP32 every time the IP changes is not a workflow.

So we tunnel: run `ngrok http 8000` against the local Laravel server and
get back a fixed-for-the-session URL like
`https://anthill-radar-ambiguous.ngrok-free.dev`. That's what's baked into both the
ESP32 sketch and the React fetch base. The day's URL gets pasted into
`.env`'s `APP_URL` and the Arduino `API_URL` constant, and everything
keeps working regardless of which network the laptop is on.

Bonus: ngrok gives us **HTTPS for free**, which means the ESP32 talks to
the server over TLS without us having to provision a cert.

---

## Environment

`.env`:

```env
APP_URL=https://anthill-radar-ambiguous.ngrok-free.dev     # today's tunnel URL
ESP32_API_KEY=aashikachan
```

`config/services.php`:

```php
'esp32' => [
    'api_key' => env('ESP32_API_KEY'),
],
```

The **same key** is hard-coded in the ESP32 sketch:
```cpp
const char* API_KEY = "aashikachan";   // matches .env ESP32_API_KEY
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

**Key shape — `motion:<device_id>`** (overwritten every second). `latest()` adds three computed fields on read: `last_seen_s`, `online` (true if ≤5 s), and a `HH:MM:SS`-formatted `uptime`.

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

Wired into the router:

```jsx
import RoomMonitor from './pages/RoomMonitor'
// ...
<Route path="/room-monitor" element={<RoomMonitor />} />
```

No layout / auth wrapping — anyone on the open URL can view it.

---

## ESP32 firmware (`arduino/room-monitor.ino`)

- Board: **ESP32 Dev Module**
- Library: **ArduinoJson** (Benoit Blanchon) via Library Manager
- Wiring: PIR `VCC → VIN (5V)`, `GND → GND`, `OUT → GPIO 13`

Four constants edited before flashing:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL       = "https://anthill-radar-ambiguous.ngrok-free.dev/api/motion";  // ngrok tunnel
const char* API_KEY       = "aashikachan";                                  // matches .env
const char* DEVICE_ID     = "room-101";
```

`API_URL` is the ngrok URL because the PC's LAN IP would otherwise need
re-flashing on every network change — see the reasoning at the top.

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
X-Api-Key:    aashikachan
```

If WiFi drops, `postJson()` calls `connectWiFi()` and skips the POST that
tick.

---

## Day-to-day startup

```cmd
:: 1. Start Laravel bound to all interfaces
php artisan serve --host=0.0.0.0 --port=8000

:: 2. Tunnel it
ngrok http 8000
:: → copy the https://....ngrok-free.app URL it prints

:: 3. Put that URL into .env's APP_URL  (and into the Arduino sketch's API_URL
::    if it changed since last flash — paid ngrok plans give a reserved domain
::    that stays the same, so re-flashing isn't usually needed mid-session)

:: 4. Hot reload
php artisan config:clear
```

Then visit `<ngrok URL>/room-monitor` from any browser — phone, laptop,
projector — and the live status renders.

---

## Troubleshooting

| Symptom                                            | Likely cause                                                | Fix                                                          |
|----------------------------------------------------|-------------------------------------------------------------|--------------------------------------------------------------|
| ESP32 serial: `POST failed: connection refused`    | Laravel not running or bound to 127.0.0.1 only              | Restart with `--host=0.0.0.0`; confirm ngrok session is live |
| ESP32 serial: `-1` errors against the ngrok URL    | ngrok session expired (free tier rotates URLs)              | Re-run `ngrok http 8000`, update `API_URL`, re-flash         |
| Browser console: `Mixed Content`                   | HTTPS page loading HTTP assets                              | `npm run build` instead of `npm run dev`; HTTPS is forced on `x-forwarded-proto=https` |
| Browser DevTools: CORS error                       | Vite on `:5173` calling Laravel on `:8000`                  | Use the Vite proxy in `vite.config.js`, or serve the built bundle through Laravel |
| Page stuck on "Waiting for device…"                | ESP32 not posting, OR key mismatch (401), OR cache cleared  | Check ESP32 Serial Monitor for `POST 200`; verify `ESP32_API_KEY` |
| ESP32 serial: `401 Unauthorized`                   | `X-Api-Key` header ≠ `.env`                                 | Update either side to match                                  |
| ESP32 serial: `POST 422`                           | Validation failed                                           | Confirm `device_id`/`status`/`motion_count`/`uptime_ms` all present and typed correctly |

---

## Why no database?

The status is **only meaningful in real time** — a 5-minute-old "busy"
reading is useless. Persisting it to Oracle would mean (a) creating a
sequence + trigger for prefixed PKs, (b) writing once per second per
device into the same WAL the rest of CleckHive uses, and (c) immediately
discarding ~99% of those rows.

The file cache wins: zero schema, zero migration, atomically overwritten,
and `Cache::get()` is a single `file_get_contents`. If historical data
ever becomes useful, a `motion_history` table can layer on top — but it
shouldn't be the source of truth for the live screen.
