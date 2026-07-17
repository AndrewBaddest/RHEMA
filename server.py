#!/usr/bin/env python3
"""
Production-ready static file server with timing breakdown.
"""

import http.server
import socketserver
import json
import time
import uuid
import os
import sys
import gzip
import socket
from urllib.parse import urlparse, unquote
from datetime import datetime

# ---------- Colours ----------
COLORS = {
    "GREEN": "\033[92m",
    "YELLOW": "\033[93m",
    "RED": "\033[91m",
    "BLUE": "\033[94m",
    "CYAN": "\033[96m",
    "GREY": "\033[90m",
    "RESET": "\033[0m",
}

def is_tty():
    return sys.stdout.isatty()

TTY = is_tty()

class ProductionHTTPHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.0'
    timeout = 30

    def __init__(self, *args, **kwargs):
        self.request_version = self.protocol_version
        self._request_parsed = False
        super().__init__(*args, **kwargs)

    def log_message(self, format, *args):
        pass

    def log_request(self, code='-', size='-'):
        pass

    def parse_request(self):
        parsed = super().parse_request()
        if parsed:
            self._request_parsed = True
        return parsed

    def handle_one_request(self):
        self.request.settimeout(self.timeout)
        self.request_id = str(uuid.uuid4())[:8]
        self.start_time = time.time()
        self.path = '/'
        self._request_parsed = False
        self._read_time = 0.0
        self._process_time = 0.0

        try:
            # Time how long it takes to parse the request
            parse_start = time.time()
            super().handle_one_request()
            parse_end = time.time()
            self._process_time = (parse_end - parse_start) * 1000
        except (TimeoutError, socket.timeout, BrokenPipeError, ConnectionError):
            self.request.close()
            return
        except Exception as e:
            if self._request_parsed:
                self.send_error(500, f"Server error: {e}")
                self.response_code = 500
                self.finish()
            else:
                self.request.close()
        finally:
            self.request.settimeout(None)

    def send_response(self, code, message=None):
        super().send_response(code, message)
        self.response_code = code

    def send_error(self, code, message=None, explain=None):
        self.response_code = code
        super().send_error(code, message, explain)

    def end_headers(self):
        self.send_header('X-Request-ID', self.request_id)
        self.send_header('Connection', 'close')

        path = self.path.split('?')[0]
        if path.endswith(('.css', '.js', '.json', '.ico', '.png', '.jpg', '.svg', '.webp', '.woff2')):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')

        super().end_headers()

    def do_GET(self):
        """Serve files with timing breakdown."""
        path = self.translate_path(self.path)

        # Check if file exists
        if os.path.isdir(path) or not os.path.exists(path):
            super().do_GET()
            return

        # Check if we should compress
        accept_encoding = self.headers.get('Accept-Encoding', '')
        can_gzip = 'gzip' in accept_encoding
        compressible = path.endswith(('.js', '.css', '.json', '.html', '.txt', '.svg', '.xml', '.csv'))

        if can_gzip and compressible:
            try:
                # Time file read
                read_start = time.time()
                with open(path, 'rb') as f:
                    raw = f.read()
                read_end = time.time()
                self._read_time = (read_end - read_start) * 1000

                # Time compression
                compress_start = time.time()
                compressed = gzip.compress(raw, compresslevel=6)
                compress_end = time.time()
                compress_time = (compress_end - compress_start) * 1000

                # Send response
                self.send_response(200)
                self.send_header('Content-Type', self.guess_type(path))
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Content-Length', len(compressed))
                self.end_headers()

                # Time write
                write_start = time.time()
                self.wfile.write(compressed)
                write_end = time.time()
                write_time = (write_end - write_start) * 1000

                # Log timing breakdown to stderr (so it doesn't pollute JSON logs)
                if TTY:
                    sys.stderr.write(
                        f"⏱️  {self.path}: read={self._read_time:.1f}ms, "
                        f"compress={compress_time:.1f}ms, write={write_time:.1f}ms\n"
                    )

            except Exception as e:
                sys.stderr.write(f"⚠️ Error serving {path}: {e}\n")
                self.send_error(500, f"Error: {e}")
        else:
            # Serve uncompressed
            super().do_GET()

    def finish(self):
        """Log the request only if it was parsed."""
        if not self._request_parsed:
            try:
                super().finish()
            except Exception:
                pass
            return

        try:
            duration_ms = round((time.time() - self.start_time) * 1000, 2)
            parsed = urlparse(self.path)
            path = unquote(parsed.path)
            status = self.response_code if hasattr(self, 'response_code') else 500
            method = self.command if hasattr(self, 'command') else 'UNKNOWN'
            client_ip = self.client_address[0]

            # If it's a slow request, show extra info
            is_slow = duration_ms > 5000
            slow_flag = " 🐌" if is_slow else ""

            if TTY:
                if status >= 500:
                    status_colour = COLORS["RED"]
                elif status >= 400:
                    status_colour = COLORS["YELLOW"]
                elif status >= 300:
                    status_colour = COLORS["CYAN"]
                else:
                    status_colour = COLORS["GREEN"]

                time_str = datetime.utcnow().strftime("%H:%M:%S")
                cache_status = "HIT" if status == 304 else "MISS"
                display_path = path if len(path) <= 60 else path[:57] + "..."

                # Show processing time breakdown if we have it
                extra = ""
                if hasattr(self, '_process_time') and self._process_time > 0:
                    extra = f" [parse:{self._process_time:.0f}ms]"

                line = (
                    f"{COLORS['GREY']}[{time_str}]{COLORS['RESET']} "
                    f"{COLORS['BLUE']}{method:<6}{COLORS['RESET']} "
                    f"{status_colour}{status}{COLORS['RESET']} "
                    f"{display_path} "
                    f"{COLORS['GREY']}({duration_ms}ms){COLORS['RESET']}"
                    f"{slow_flag}"
                    f"{COLORS['GREY']} id:{self.request_id} {cache_status}{extra}{COLORS['RESET']}"
                )
                print(line, flush=True)
            else:
                log_entry = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "level": "INFO",
                    "request_id": self.request_id,
                    "client_ip": client_ip,
                    "method": method,
                    "path": path,
                    "status": status,
                    "duration_ms": duration_ms,
                    "slow": is_slow,
                }
                if hasattr(self, '_read_time'):
                    log_entry["read_ms"] = round(self._read_time, 2)
                if hasattr(self, '_process_time'):
                    log_entry["parse_ms"] = round(self._process_time, 2)
                sys.stdout.write(json.dumps(log_entry) + "\n")
                sys.stdout.flush()

        except BrokenPipeError:
            sys.stderr.write("⚠️ Broken pipe – shutting down.\n")
            os._exit(0)
        except Exception as e:
            sys.stderr.write(f"⚠️ Logging error: {e}\n")

        try:
            super().finish()
        except Exception:
            pass


if __name__ == '__main__':
    PORT = 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    if is_tty():
        print(f"✨ Serving on http://0.0.0.0:{PORT}/")
        print("📦 Gzip compression enabled.")
        print("⏱️  Socket timeout: 30 seconds.")
        print("🔁 HTTP/1.0 (no keep‑alive).")
        print("📊 Logs: human‑readable (idle connections skipped).")
        print("🐌 Slow requests (>5s) are marked with 🐌")
        print("📤 To save JSON logs: python3 server.py > logs.jsonl")

    with socketserver.TCPServer(("0.0.0.0", PORT), ProductionHTTPHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            if is_tty():
                print("\nShutting down...")
            httpd.server_close()