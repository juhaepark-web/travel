"""Check local/production origin handling without accessing real Firebase data."""
import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch
import server


class DeploymentTests(unittest.TestCase):
    def check_origin(self, production, scheme, expected):
        with patch.dict('os.environ', {'VERCEL': '1' if production else ''}), patch.object(server.STORE, 'ready'):
            httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            worker = threading.Thread(target=httpd.serve_forever, daemon=True)
            worker.start()
            try:
                host = f'127.0.0.1:{httpd.server_port}'
                origin = f'{scheme}://{host}' if scheme != 'foreign' else 'https://other.example'
                request = urllib.request.Request(f'http://{host}/api/health', headers={'Origin': origin})
                try:
                    with urllib.request.urlopen(request, timeout=5) as response:
                        code = response.status
                        self.assertTrue(json.load(response)['ready'])
                except urllib.error.HTTPError as error:
                    code = error.code
                    error.close()
                self.assertEqual(code, expected)
            finally:
                httpd.shutdown()
                httpd.server_close()
                worker.join()

    def test_local_http_allowed(self):
        self.check_origin(False, 'http', 200)

    def test_vercel_https_allowed(self):
        self.check_origin(True, 'https', 200)

    def test_vercel_foreign_origin_denied(self):
        self.check_origin(True, 'foreign', 403)


if __name__ == '__main__':
    unittest.main()
