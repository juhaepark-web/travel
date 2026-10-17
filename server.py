"""Local Python server. Firebase server credentials are read from the environment only."""
import argparse
import hashlib
import json
import os
import re
import threading
import time
from datetime import date, datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
KST = timezone(timedelta(hours=9))
PUBLIC_CONFIG = {
    "apiKey": "AIzaSyCAAasrL0l88vRXotkZfIqYn9ShxJbKgn8",
    "authDomain": "travel-2bb1b.firebaseapp.com", "projectId": "travel-2bb1b",
    "storageBucket": "travel-2bb1b.firebasestorage.app", "messagingSenderId": "471744569692",
    "appId": "1:471744569692:web:3754c68500a989f03c2199",
}
if os.getenv("FIREBASE_AUTH_EMULATOR_HOST") and os.getenv("FIREBASE_DATABASE_EMULATOR_HOST"):
    PUBLIC_CONFIG["projectId"] = os.getenv("TRAVEL_EMULATOR_PROJECT", "demo-travel")
TRANSITIONS = {"requested": ["confirmed", "canceled"], "confirmed": ["cancel_requested", "completed"],
               "cancel_requested": ["canceled", "confirmed"], "canceled": [], "completed": []}


class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def text(value, label, limit=200, optional=False):
    if not isinstance(value, str) or (not optional and not value.strip()) or len(value) > limit:
        raise ApiError(f"{label} 항목을 올바르게 입력해 주세요. (최대 {limit}자)")
    return value.strip()


def record_id(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value):
        raise ApiError("잘못된 항목 ID입니다.")
    return value


def integer(value, label, minimum, maximum):
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ApiError(f"{label}: {minimum}~{maximum} 범위의 정수를 입력해 주세요.")
    return value


def booking_values(body, stay):
    try:
        start, end = date.fromisoformat(body["checkIn"]), date.fromisoformat(body["checkOut"])
        if start.isoformat() != body["checkIn"] or end.isoformat() != body["checkOut"]:
            raise ValueError()
    except (ValueError, TypeError, KeyError):
        raise ApiError("체크인·체크아웃 날짜를 올바르게 입력해 주세요.")
    nights = (end - start).days
    today = datetime.now(KST).date()
    if start < today or start > today + timedelta(days=365) or not 1 <= nights <= 30:
        raise ApiError("체크인은 오늘부터 1년 이내, 숙박 기간은 1~30박으로 선택해 주세요.")
    guests = integer(body.get("guestCount"), "예약 인원", 1, integer(stay.get("maxGuests"), "최대 인원", 1, 50))
    price = integer(stay.get("pricePerNight"), "숙소 가격", 1, 10000000)
    return {"checkIn": start.isoformat(), "checkOut": end.isoformat(), "guestCount": guests,
            "nightlyPriceAtBooking": price, "totalPrice": price * nights, "nights": nights}


def catalog_values(kind, body):
    data = {"name": text(body.get("name"), "이름", 100), "address": text(body.get("address"), "주소", 300),
            "description": text(body.get("description"), "설명", 5000),
            "imageUrl": text(body.get("imageUrl", ""), "이미지 주소", 2000, True)}
    if data["imageUrl"] and (urlsplit(data["imageUrl"]).scheme != "https" or not urlsplit(data["imageUrl"]).hostname):
        raise ApiError("이미지는 https 주소를 입력해 주세요.")
    if kind == "destinations":
        data.update(region=text(body.get("region"), "지역", 30), summary=text(body.get("summary"), "한 줄 소개", 200))
        states = ["draft", "published", "hidden"]
    else:
        data.update(destinationId=record_id(body.get("destinationId")), phone=text(body.get("phone"), "연락처", 30),
                    pricePerNight=integer(body.get("pricePerNight"), "1박 가격", 1, 10000000),
                    maxGuests=integer(body.get("maxGuests"), "최대 인원", 1, 50))
        states = ["active", "inactive"]
    if body.get("status") not in states:
        raise ApiError("올바른 공개 상태를 선택해 주세요.")
    data["status"] = body["status"]
    return data


class FirebaseStore:
    def __init__(self):
        self.app = None
        self.lock = threading.Lock()

    def ready(self):
        if self.app is not None:
            return
        with self.lock:
            if self.app is not None:
                return
            database_url = os.getenv("TRAVEL_DATABASE_URL", "https://travel-2bb1b-default-rtdb.asia-southeast1.firebasedatabase.app")
            if not database_url:
                raise ApiError("Firebase Database URL 설정이 필요합니다. docs/FIREBASE-SETUP.md를 확인해 주세요.", 503)
            try:
                import firebase_admin
                from firebase_admin import credentials
                if os.getenv("FIREBASE_AUTH_EMULATOR_HOST") and os.getenv("FIREBASE_DATABASE_EMULATOR_HOST"):
                    from google.auth.credentials import AnonymousCredentials
                    class EmulatorCredential(credentials.Base):
                        def get_credential(self):
                            return AnonymousCredentials()
                    credential = EmulatorCredential()
                else:
                    local_config = ROOT / '.server.local.json'
                    key_path = None
                    service_account_json = os.getenv('TRAVEL_FIREBASE_SERVICE_ACCOUNT', '')
                    if not service_account_json and not os.getenv('GOOGLE_APPLICATION_CREDENTIALS') and local_config.is_file():
                        key_path = json.loads(local_config.read_text(encoding='utf-8-sig')).get('credentialPath')
                    if service_account_json:
                        credential = credentials.Certificate(json.loads(service_account_json))
                        if credential.project_id != PUBLIC_CONFIG['projectId']:
                            raise ValueError('Firebase project mismatch')
                    elif key_path:
                        key_file = Path(key_path).resolve()
                        if key_file.is_relative_to(ROOT):
                            raise ValueError('Service account must be outside project')
                        credential = credentials.Certificate(str(key_file))
                        if credential.project_id != PUBLIC_CONFIG['projectId']:
                            raise ValueError('Firebase project mismatch')
                    else:
                        credential = credentials.ApplicationDefault()
                    credential.get_credential()
                self.app = firebase_admin.initialize_app(credential, {"projectId": PUBLIC_CONFIG["projectId"], "databaseURL": database_url})
            except Exception:
                raise ApiError("Python Firebase Admin SDK 또는 서버 인증 설정이 필요합니다. 서버 실행 안내를 확인해 주세요.", 503)

    def ref(self, path="/"):
        self.ready()
        from firebase_admin import db
        return db.reference(path, app=self.app)

    def identity(self, authorization):
        if not authorization or not authorization.startswith("Bearer "):
            raise ApiError("로그인후 예약하시오", 401)
        self.ready()
        from firebase_admin import auth
        try:
            # Firebase permits up to 60 seconds of clock skew. Keep signature,
            # project, expiry, revocation and disabled-account checks enabled.
            token = auth.verify_id_token(authorization[7:], app=self.app, check_revoked=True, clock_skew_seconds=60)
        except Exception:
            raise ApiError("로그인이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.", 401)
        admin_uid = os.getenv("TRAVEL_ADMIN_UID", "Ff9stQPFaRRvYFMYBMJXZRRqWjS2")
        token["role"] = "admin" if token.get("admin") is True or (admin_uid and token["uid"] == admin_uid) else "member"
        profile = self.ref(f"members/{token['uid']}").get()
        if profile and profile.get("status") == "suspended":
            raise ApiError("이용이 정지된 계정입니다. 운영자에게 문의해 주세요.", 403)
        token["profile"] = profile
        return token


STORE = FirebaseStore()


def require_admin(identity):
    if identity.get("role") != "admin":
        raise ApiError("관리자 권한이 필요합니다.", 403)


def require_member(root, identity):
    member = (root.get("members") or {}).get(identity["uid"])
    if identity.get("role") == "admin" or not member or member.get("status") != "active":
        raise ApiError("활성 회원 정보가 필요합니다. 회원가입 화면에서 정보를 완성해 주세요.", 403)
    return member


def api_get(path, identity):
    if path == "/api/session":
        return {"uid": identity["uid"], "email": identity.get("email", ""), "role": identity["role"], "profile": identity["profile"]}
    if path == "/api/reservations":
        if identity["role"] == "admin":
            raise ApiError("관리자 예약 확인 메뉴를 이용해 주세요.", 403)
        data = STORE.ref("reservations").order_by_child("memberId").equal_to(identity["uid"]).get() or {}
        return {"items": [{**value, "id": key} for key, value in data.items()]}
    if path == "/api/admin/data":
        require_admin(identity)
        root = STORE.ref().get() or {}
        return {kind: [{**value, "id": key} for key, value in (root.get(kind) or {}).items()]
                for kind in ["destinations", "stays", "members", "reservations"]}
    raise ApiError("요청한 API가 없습니다.", 404)


def api_post(path, body, identity):
    now = int(time.time() * 1000)
    result = {}
    if path == "/api/profile":
        if identity["role"] == "admin":
            raise ApiError("관리자 계정으로 회원가입할 수 없습니다.", 403)
        profile = {"name": text(body.get("name"), "이름", 60), "phone": text(body.get("phone"), "연락처", 30),
                   "email": identity.get("email", ""), "status": "active", "createdAt": now, "updatedAt": now}
        if not re.fullmatch(r"[0-9+()\s-]{8,30}", profile["phone"]):
            raise ApiError("연락처 형식을 확인해 주세요.")
        def save_profile(current):
            if current:
                raise ApiError("이미 가입된 회원입니다.", 409)
            return profile
        STORE.ref(f"members/{identity['uid']}").transaction(save_profile)
        return {"message": "가입 완료되었습니다."}
    if path == "/api/reservations":
        stay_id, request_id = record_id(body.get("stayId")), record_id(body.get("requestId"))
        booking_id = hashlib.sha256(f"{identity['uid']}:{request_id}".encode()).hexdigest()[:32]
        def book(root):
            root = root or {}
            member = require_member(root, identity)
            bookings = root.setdefault("reservations", {})
            if booking_id in bookings:
                result.update(id=booking_id, reservation=bookings[booking_id])
                return root
            stay = (root.get("stays") or {}).get(stay_id)
            if not stay or stay.get("status") != "active":
                raise ApiError("예약 신청할 수 없는 숙소입니다.", 409)
            destination = (root.get("destinations") or {}).get(stay.get("destinationId"))
            if not destination or destination.get("status") != "published":
                raise ApiError("현재 공개되지 않은 여행지의 숙소입니다.", 409)
            values = booking_values(body, stay)
            if body.get("expectedNightlyPrice") != values["nightlyPriceAtBooking"]:
                raise ApiError("숙소 가격이 변경되었습니다. 새로고침 후 다시 신청해 주세요.", 409)
            booking = {**values, "memberId": identity["uid"], "stayId": stay_id,
                       "stayNameAtBooking": stay["name"], "memberNameAtBooking": member["name"],
                       "status": "requested", "createdAt": now, "updatedAt": now,
                       "history": [{"status": "requested", "at": now, "by": identity["uid"]}]}
            bookings[booking_id] = booking
            result.update(id=booking_id, reservation=booking)
            return root
        STORE.ref().transaction(book)
        return result
    if path == "/api/reservations/status":
        booking_id, target = record_id(body.get("id")), body.get("status")
        def change(root):
            root = root or {}
            booking = (root.get("reservations") or {}).get(booking_id)
            if not booking:
                raise ApiError("예약을 찾을 수 없습니다.", 404)
            current = booking["status"]
            if identity["role"] != "admin":
                require_member(root, identity)
                if booking["memberId"] != identity["uid"] or target != "cancel_requested" or current not in ["requested", "confirmed"]:
                    raise ApiError("본인의 신청·확정 예약만 취소 요청할 수 있습니다.", 403)
            elif target not in TRANSITIONS.get(current, []):
                raise ApiError("허용되지 않는 예약 상태 변경입니다.", 409)
            if body.get("updatedAt") != booking.get("updatedAt"):
                raise ApiError("예약이 변경되었습니다. 새로고침해 주세요.", 409)
            if target == "completed" and booking["checkOut"] > datetime.now(KST).date().isoformat():
                raise ApiError("체크아웃 날짜 이후에 이용 완료로 변경할 수 있습니다.")
            booking.update(status=target, updatedAt=max(now, booking.get("updatedAt", 0) + 1))
            booking.setdefault("history", []).append({"status": target, "at": now, "by": identity["uid"]})
            return root
        STORE.ref().transaction(change)
        return {"message": "예약 상태를 변경했습니다."}
    require_admin(identity)
    if path == "/api/admin/catalog":
        kind = body.get("kind")
        if kind not in ["destinations", "stays"]:
            raise ApiError("잘못된 관리 항목입니다.")
        item_id = record_id(body.get("id")) if body.get("id") else STORE.ref(kind).push().key
        values = catalog_values(kind, body)
        def save(root):
            root = root or {}
            items = root.setdefault(kind, {})
            old = items.get(item_id)
            if body.get("id") and (not old or old.get("updatedAt") != body.get("updatedAt")):
                raise ApiError("항목이 변경되었습니다. 새로고침 후 다시 수정해 주세요.", 409)
            if kind == "stays":
                parent = (root.get("destinations") or {}).get(values["destinationId"])
                if not parent or (values["status"] == "active" and parent.get("status") != "published"):
                    raise ApiError("활성 숙소는 공개된 여행지에 연결해야 합니다.")
            items[item_id] = {**(old or {}), **values, "createdAt": old["createdAt"] if old else now,
                              "updatedAt": max(now, old.get("updatedAt", 0) + 1) if old else now}
            if kind == "destinations" and values["status"] != "published":
                for stay in (root.get("stays") or {}).values():
                    if stay.get("destinationId") == item_id:
                        stay.update(status="inactive", updatedAt=now)
            return root
        STORE.ref().transaction(save)
        return {"id": item_id, "message": "저장되었습니다."}
    if path == "/api/admin/archive":
        kind, item_id = body.get("kind"), record_id(body.get("id"))
        if kind not in ["destinations", "stays"]:
            raise ApiError("잘못된 관리 항목입니다.")
        def archive(root):
            root = root or {}
            item = (root.get(kind) or {}).get(item_id)
            if not item:
                raise ApiError("항목을 찾을 수 없습니다.", 404)
            if item.get("updatedAt") != body.get("updatedAt"):
                raise ApiError("항목이 변경되었습니다. 새로고침해 주세요.", 409)
            item.update(status="hidden" if kind == "destinations" else "inactive", updatedAt=now)
            if kind == "destinations":
                for stay in (root.get("stays") or {}).values():
                    if stay.get("destinationId") == item_id:
                        stay.update(status="inactive", updatedAt=now)
            return root
        STORE.ref().transaction(archive)
        return {"message": "기록을 보존하며 숨김·비활성화 처리했습니다."}
    raise ApiError("요청한 API가 없습니다.", 404)


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {self.command} {urlsplit(self.path).path} {args[1] if len(args) > 1 else ''}")

    def json_response(self, payload, status=200):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        self.handle_api() if urlsplit(self.path).path.startswith("/api/") else super().do_GET()

    def do_HEAD(self):
        self.send_error(405) if urlsplit(self.path).path.startswith("/api/") else super().do_HEAD()

    def translate_path(self, path):
        clean = unquote(urlsplit(path).path).lstrip("/") or "index.html"
        resolved = (ROOT / clean).resolve()
        allowed = resolved.is_relative_to(ROOT) and (clean == "index.html" or clean.split("/")[0] in ["html", "css", "js", "images", "assets"])
        allowed = allowed and resolved.suffix.lower() in [".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff2"]
        return str(resolved) if allowed and resolved.is_file() else str(ROOT / "__not_public__")

    def do_POST(self):
        self.handle_api()

    def handle_api(self):
        try:
            path = urlsplit(self.path).path
            origin = self.headers.get("Origin")
            scheme = 'https' if os.getenv('VERCEL') == '1' else 'http'
            if origin and origin != f"{scheme}://{self.headers.get('Host')}":
                raise ApiError("다른 출처의 요청은 허용하지 않습니다.", 403)
            if self.command == "GET" and path == "/api/config":
                return self.json_response({"firebaseConfig": PUBLIC_CONFIG, "adminEmail": os.getenv("TRAVEL_ADMIN_EMAIL", "admin@gmail.com"),
                                           "authEmulator": os.getenv("FIREBASE_AUTH_EMULATOR_HOST", "")})
            if self.command == "GET" and path == "/api/health":
                try:
                    STORE.ready()
                    return self.json_response({"ready": True})
                except ApiError as error:
                    return self.json_response({"ready": False, "message": error.message})
            if self.command == "GET" and path == "/api/catalog":
                destinations = STORE.ref("destinations").order_by_child("status").equal_to("published").get() or {}
                stays = STORE.ref("stays").order_by_child("status").equal_to("active").get() or {}
                return self.json_response({"destinations": [{**v, "id": k} for k, v in destinations.items()],
                                           "stays": [{**v, "id": k} for k, v in stays.items() if v.get("destinationId") in destinations]})
            identity = STORE.identity(self.headers.get("Authorization"))
            if self.command == "GET":
                return self.json_response(api_get(path, identity))
            if self.command != "POST" or self.headers.get_content_type() != "application/json":
                raise ApiError("JSON 요청이 필요합니다.", 415)
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 32768:
                raise ApiError("요청 크기가 올바르지 않습니다.", 413)
            self.connection.settimeout(10)
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ApiError("올바른 JSON 객체가 필요합니다.")
            return self.json_response(api_post(path, body, identity))
        except ApiError as error:
            self.json_response({"message": error.message}, error.status)
        except ValueError:
            self.json_response({"message": "입력 형식을 확인해 주세요."}, 400)
        except Exception as error:
            print(f"API failure: {type(error).__name__}")
            self.json_response({"message": "데이터 처리에 실패했습니다. 서버 설정·권한과 연결 상태를 확인한 뒤 다시 시도해 주세요."}, 503)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT)))
    print(f"Travel server: http://127.0.0.1:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
