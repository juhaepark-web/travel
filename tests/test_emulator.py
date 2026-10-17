"""Integration tests against local Firebase emulators ONLY. Never accesses production."""
import copy
import json
import os
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta

os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"
os.environ["FIREBASE_DATABASE_EMULATOR_HOST"] = "127.0.0.1:9000"
from firebase_admin import auth, credentials, db, initialize_app
from google.auth.credentials import AnonymousCredentials


class EmulatorCredential(credentials.Base):
    def get_credential(self):
        return AnonymousCredentials()


APP = initialize_app(EmulatorCredential(), {"projectId": "demo-travel", "databaseURL": "http://127.0.0.1:9000?ns=demo-travel-default-rtdb"}, name="integration-tests")
BASE = "http://127.0.0.1:8001"


def http(url, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, method=method, headers=headers, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read()
        error.close()
        try:
            return error.code, json.loads(raw)
        except ValueError:
            return error.code, None


def signin(email, password):
    code, result = http("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only", "POST", {"email": email, "password": password, "returnSecureToken": True})
    assert code == 200, result
    return result["idToken"]


class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config_code, config = http(BASE + "/api/config")
        assert config_code == 200 and config["firebaseConfig"]["projectId"] == "demo-travel", "Refusing to test a non-emulator server"
        for uid, email in [("travel-test-admin", "admin@example.test"), ("test-member", "member@example.test"), ("test-other", "other@example.test")]:
            try:
                auth.create_user(uid=uid, email=email, password="Emulator-test-123!", app=APP)
            except auth.UidAlreadyExistsError:
                pass
        cls.admin = signin("admin@example.test", "Emulator-test-123!")
        cls.member = signin("member@example.test", "Emulator-test-123!")
        cls.other = signin("other@example.test", "Emulator-test-123!")
        today = datetime.now().date() + timedelta(days=2)
        cls.booking = {"stayId": "s1", "checkIn": today.isoformat(), "checkOut": (today + timedelta(days=2)).isoformat(), "guestCount": 2, "expectedNightlyPrice": 120000, "requestId": "first-request"}

    def setUp(self):
        db.reference("/", app=APP).set({
            "destinations": {"d1": {"name": "시험 여행지", "region": "제주", "status": "published", "createdAt": 1, "updatedAt": 1}},
            "stays": {"s1": {"name": "시험 숙소", "destinationId": "d1", "description": "설명", "address": "주소", "phone": "010-0000-0000", "pricePerNight": 120000, "maxGuests": 4, "status": "active", "createdAt": 1, "updatedAt": 1}},
            "members": {"test-member": {"name": "시험 회원", "email": "member@example.test", "phone": "010-0000-0000", "status": "active", "createdAt": 1, "updatedAt": 1}}
        })

    def post(self, path, body, token=None):
        return http(BASE + path, "POST", body, token or self.member)

    def test_roles_and_admin_data(self):
        self.assertEqual(http(BASE + "/api/admin/data")[0], 401)
        self.assertEqual(http(BASE + "/api/admin/data", token=self.member)[0], 403)
        self.assertEqual(http(BASE + "/api/admin/data", token=self.admin)[0], 200)
        self.assertEqual(http(BASE + "/api/session", token=self.admin)[1]["role"], "admin")

    def test_rules_deny_direct_reads_and_writes(self):
        for token in [None, self.member, self.admin]:
            for path in ["members", "reservations", "destinations", "stays"]:
                url = f"http://127.0.0.1:9000/{path}.json?ns=demo-travel-default-rtdb" + (f"&auth={token}" if token else "")
                self.assertIn(http(url)[0], [401, 403])
                self.assertIn(http(url, "PUT", {"injected": True})[0], [401, 403])

    def test_profile_and_password_never_saved(self):
        code, result = self.post("/api/profile", {"name": "새 회원", "phone": "010-1111-2222", "password": "do-not-store", "status": "admin"}, self.other)
        self.assertEqual(code, 200, result)
        profile = db.reference("members/test-other", app=APP).get()
        self.assertEqual(profile["status"], "active")
        self.assertNotIn("password", profile)
        self.assertEqual(self.post("/api/profile", {"name": "duplicate", "phone": "010-1111-2222"}, self.other)[0], 409)

    def test_server_price_snapshot_and_idempotency(self):
        code, first = self.post("/api/reservations", {**self.booking, "totalPrice": 1, "memberId": "test-other"})
        self.assertEqual(code, 200, first)
        self.assertEqual(first["reservation"]["totalPrice"], 240000)
        self.assertEqual(first["reservation"]["memberId"], "test-member")
        self.assertEqual(self.post("/api/reservations", self.booking)[1]["id"], first["id"])
        db.reference("stays/s1/pricePerNight", app=APP).set(150000)
        self.assertEqual(db.reference(f"reservations/{first['id']}/totalPrice", app=APP).get(), 240000)
        self.assertEqual(self.post("/api/reservations", {**self.booking, "requestId": "new"})[0], 409)

    def test_booking_validation(self):
        for change in [{"guestCount": 0}, {"guestCount": 5}, {"guestCount": True}, {"checkOut": self.booking["checkIn"]}, {"checkIn": "2020-01-01"}, {"expectedNightlyPrice": 1}]:
            self.assertIn(self.post("/api/reservations", {**self.booking, **change})[0], [400,409])
        self.assertFalse(db.reference("reservations",app=APP).get())

    def test_status_ownership_transition_and_history(self):
        first = self.post("/api/reservations", self.booking)[1]
        change = {"id": first["id"], "updatedAt": first["reservation"]["updatedAt"], "status": "confirmed"}
        self.assertEqual(self.post("/api/reservations/status",change)[0],403)
        self.assertEqual(self.post("/api/reservations/status",{**change,"status":"cancel_requested"},self.other)[0],403)
        self.assertEqual(self.post("/api/reservations/status",change,self.admin)[0],200)
        self.assertEqual(self.post("/api/reservations/status",change,self.admin)[0],409)
        saved = db.reference(f"reservations/{first['id']}",app=APP).get()
        self.assertEqual(saved["totalPrice"],240000)
        self.assertEqual(len(saved["history"]),2)
        self.assertEqual(self.post("/api/reservations/status",{**change,"updatedAt":saved["updatedAt"],"status":"completed"},self.admin)[0],400)

    def test_archive_preserves_reservations(self):
        first = self.post("/api/reservations", self.booking)[1]
        code, response = self.post("/api/admin/archive", {"kind":"destinations","id":"d1","updatedAt":1}, self.admin)
        self.assertEqual(code,200,response)
        self.assertEqual(db.reference("stays/s1/status",app=APP).get(),"inactive")
        self.assertTrue(db.reference(f"reservations/{first['id']}",app=APP).get())
        self.assertEqual(http(BASE + "/api/catalog")[1]["stays"],[])
        self.assertEqual(self.post("/api/reservations",{**self.booking,"requestId":"blocked"})[0],409)

    def test_member_reads_only_own_bookings(self):
        self.post("/api/reservations", self.booking)
        self.assertEqual(len(http(BASE + "/api/reservations",token=self.member)[1]["items"]),1)
        self.assertEqual(http(BASE + "/api/reservations",token=self.other)[1]["items"],[])

    def test_sensitive_server_files_are_not_served(self):
        for path in ["/server.py","/firebase/database.rules.json","/.env","/docs/FIREBASE-SETUP.md","/js/../server.py"]:
            self.assertEqual(http(BASE + path)[0],404,path)

    def test_suspended_member_is_blocked(self):
        db.reference("members/test-member/status",app=APP).set("suspended")
        self.assertEqual(http(BASE + "/api/session",token=self.member)[0],403)
        self.assertEqual(self.post("/api/reservations",self.booking)[0],403)

    def test_catalog_create_update_and_permission(self):
        destination = {"kind":"destinations","name":"새 여행지","region":"강원","address":"시험 주소","summary":"소개","description":"상세 소개","status":"published","imageUrl":""}
        self.assertEqual(self.post("/api/admin/catalog",destination)[0],403)
        code, result = self.post("/api/admin/catalog",destination,self.admin)
        self.assertEqual(code,200,result)
        item_id = result["id"]
        saved = db.reference(f"destinations/{item_id}",app=APP).get()
        update = {**destination,"id":item_id,"updatedAt":saved["updatedAt"],"name":"수정 여행지"}
        self.assertEqual(self.post("/api/admin/catalog",update,self.admin)[0],200)
        self.assertEqual(self.post("/api/admin/catalog",update,self.admin)[0],409)
        self.assertEqual(self.post("/api/admin/catalog",{**destination,"imageUrl":"javascript:alert(1)"},self.admin)[0],400)
        stay = {"kind":"stays","name":"새 숙소","destinationId":item_id,"address":"시험 주소","description":"소개","phone":"010-1234-5678","pricePerNight":90000,"maxGuests":3,"status":"active","imageUrl":""}
        code, result = self.post("/api/admin/catalog",stay,self.admin)
        self.assertEqual(code,200,result)
        self.assertEqual(db.reference(f"stays/{result['id']}/pricePerNight",app=APP).get(),90000)
        self.assertEqual(self.post("/api/admin/catalog",{**stay,"destinationId":"nonexistent"},self.admin)[0],400)

    def test_invalid_credentials_and_forged_admin(self):
        code, _ = http("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only","POST",{"email":"member@example.test","password":"wrong-password","returnSecureToken":True})
        self.assertEqual(code,400)
        self.assertEqual(http(BASE + "/api/admin/data",token="not-a-valid-token")[0],401)
        profile = {"name":"등록 회원","phone":"010-1111-2222","role":"admin","admin":True}
        self.assertEqual(self.post("/api/profile",profile,self.other)[0],200)
        self.assertEqual(http(BASE + "/api/session",token=self.other)[1]["role"],"member")


if __name__ == "__main__":
    unittest.main(verbosity=2)
