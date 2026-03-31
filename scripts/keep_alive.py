from __future__ import annotations

import os
import time

import httpx


TARGET = os.getenv("KEEP_ALIVE_URL", "http://localhost:8000/ping")
INTERVAL_SECONDS = int(os.getenv("KEEP_ALIVE_INTERVAL_SECONDS", "600"))


def main() -> None:
    while True:
        started = time.time()
        try:
            with httpx.Client(timeout=10) as client:
                response = client.get(TARGET)
            print(f"PING {TARGET} -> {response.status_code}")
        except Exception as exc:
            print(f"PING FAILED {TARGET} -> {exc}")
        elapsed = max(1, int(time.time() - started))
        sleep_for = max(1, INTERVAL_SECONDS - elapsed)
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
