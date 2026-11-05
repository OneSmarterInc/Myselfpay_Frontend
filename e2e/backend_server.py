"""Isolated browser-test server; never used by application deployments."""
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

backend = Path(os.getenv('E2E_BACKEND_PATH', str(Path(__file__).resolve().parents[1] / '.backend')))
sys.path.insert(0, str(backend))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.conf import settings
assert settings.DEBUG, 'Browser fixtures require development settings'
url = str(settings.DOMAIN_DATABASE)
assert not url.startswith(('postgres://', 'postgresql://')) or urlsplit(url).hostname in ('localhost', '127.0.0.1', '::1'), 'Browser fixtures require an isolated local database'

from api.throttles import GuestThrottle
GuestThrottle.limit = 200
import accounts
original_throttle = accounts.throttle

def simulated_client_throttle(path, action, ip, email):
    # Each synthetic account represents a separate client. Retain the real
    # per-account and global counters without exhausting one runner IP quota.
    return original_throttle(path, action, 'browser-fixture:' + email, email)

accounts.throttle = simulated_client_throttle
# Only this isolated, DEBUG-only fixture can simulate SMS. No real SMS is sent.
if os.getenv('E2E_FAKE_SMS') == 'true':
    from cryptography.fernet import Fernet
    os.environ.setdefault('BOOKING_ENCRYPTION_KEY', Fernet.generate_key().decode())
    import booking_sms
    import secrets
    booking_sms.configuration = lambda: {}
    booking_sms.send_code = lambda phone: 'VE' + secrets.token_hex(16)
    booking_sms.check_code = lambda sid, code: code == '123456'
from django.core.management import execute_from_command_line
execute_from_command_line(['manage.py', 'runserver', os.getenv('E2E_BACKEND_ADDRESS', '127.0.0.1:8000'), '--noreload'])
