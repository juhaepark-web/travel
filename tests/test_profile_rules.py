"""Member-profile Rules tests, using demo-travel local emulators only."""
import unittest
from firebase_admin import auth, db
from test_emulator import APP, http, signin

DATABASE = 'http://127.0.0.1:9000'
ADMIN_UID = 'Ff9stQPFaRRvYFMYBMJXZRRqWjS2'


def client(path, method='GET', body=None, token=None):
    url = f'{DATABASE}/{path}.json?ns=demo-travel-default-rtdb'
    if token:
        url += '&auth=' + token
    return http(url, method, body)


class MemberRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokens = {}
        for uid, email in [('rules-member', 'rules-member@example.test'), ('rules-other', 'rules-other@example.test'), (ADMIN_UID, 'rules-admin@example.test')]:
            try:
                auth.create_user(uid=uid, email=email, password='Emulator-rules-123!', app=APP)
            except auth.UidAlreadyExistsError:
                pass
            cls.tokens[uid] = signin(email, 'Emulator-rules-123!')

    def setUp(self):
        db.reference('members', app=APP).delete()
        self.profile = {'name': '시험 회원', 'email': 'rules-member@example.test', 'phone': '010-1234-5678', 'status': 'active', 'createdAt': {'.sv': 'timestamp'}, 'updatedAt': {'.sv': 'timestamp'}}

    def denied(self, result):
        self.assertIn(result[0], [401, 403], result)

    def save(self, profile=None):
        return client('members/rules-member', 'PUT', self.profile if profile is None else profile, self.tokens['rules-member'])

    def test_owner_create_read_and_update(self):
        code, result = self.save()
        self.assertEqual(code, 200, result)
        self.assertEqual(client('members/rules-member', token=self.tokens['rules-member'])[0], 200)
        code, result = client('members/rules-member', 'PATCH', {'name': '변경 회원', 'updatedAt': {'.sv': 'timestamp'}}, self.tokens['rules-member'])
        self.assertEqual(code, 200, result)

    def test_admin_read_all_and_member(self):
        self.assertEqual(self.save()[0], 200)
        self.assertEqual(client('members', token=self.tokens[ADMIN_UID])[0], 200)
        self.assertEqual(client('members/rules-member', token=self.tokens[ADMIN_UID])[0], 200)

    def test_guests_and_other_members_denied(self):
        self.denied(client('members/rules-member','PUT',self.profile))
        self.assertEqual(self.save()[0], 200)
        self.denied(client('members/rules-member'))
        self.denied(client('members', token=self.tokens['rules-member']))
        self.denied(client('members/rules-member', token=self.tokens['rules-other']))
        self.denied(client('members/rules-member','PATCH',{'name':'不正'},self.tokens['rules-other']))

    def test_password_and_role_injection_denied(self):
        for key in ['password','role','admin','isAdmin','uid']:
            self.denied(self.save({**self.profile, key: 'injected'}))

    def test_invalid_fields_and_forged_email_denied(self):
        for change in [{'email':'somebody@example.test'},{'name':''},{'name':'   '},{'name':'a'*61},{'phone':'bad'},{'status':'admin'},{'createdAt':1},{'updatedAt':1}]:
            self.denied(self.save({**self.profile, **change}))
        missing = dict(self.profile)
        del missing['name']
        self.denied(self.save(missing))

    def test_delete_and_created_at_changes_denied(self):
        self.assertEqual(self.save()[0],200)
        self.denied(client('members/rules-member','DELETE',token=self.tokens['rules-member']))
        self.denied(client('members/rules-member','PATCH',{'createdAt':123,'updatedAt':{'.sv':'timestamp'}},self.tokens['rules-member']))
        self.denied(client('members/rules-member','PATCH',{'name':None,'updatedAt':{'.sv':'timestamp'}},self.tokens['rules-member']))

    def test_suspended_member_cannot_reactivate(self):
        self.assertEqual(self.save()[0],200)
        db.reference('members/rules-member/status',app=APP).set('suspended')
        self.denied(client('members/rules-member','PATCH',{'status':'active','updatedAt':{'.sv':'timestamp'}},self.tokens['rules-member']))

    def test_admin_cannot_delete_member_or_forge_reservation(self):
        self.assertEqual(self.save()[0],200)
        self.denied(client('members/rules-member','DELETE',token=self.tokens[ADMIN_UID]))
        self.denied(client('reservations/injected','PUT',{'totalPrice':1},self.tokens[ADMIN_UID]))
        self.denied(client('reservations/injected','PUT',{'totalPrice':1},self.tokens['rules-member']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
