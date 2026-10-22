#!/usr/bin/env python3
"""Read-only checks for a dedicated seeded demo backend; never logs tokens/passwords."""
import json
import os
import sys
import time
import urllib.error
import urllib.request

base = sys.argv[1].rstrip('/')


def request(path, payload=None, token=None, origin=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if origin:
        headers['Origin'] = origin
    req = urllib.request.Request(base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as result:
            body = result.read()
            return result.status, result.headers, json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        return error.code, error.headers, None


for attempt in range(120):
    try:
        if request('/api/public/job-postings')[0] == 200:
            break
    except (OSError, TimeoutError):
        pass
    time.sleep(1)
else:
    raise RuntimeError('Backend did not become healthy; inspect server logs privately')

tokens = {}
for role in ('ADMIN', 'HR_MANAGER', 'HIRING_MANAGER', 'APPROVER', 'RECRUITER', 'INTERVIEWER', 'CANDIDATE'):
    status, _, response = request('/api/auth/login', {
        'email': 'demo.' + role.lower() + '@example.invalid',
        'password': os.environ['DEMO_PASSWORD_' + role],
    })
    if status != 200 or not response.get('accessToken'):
        raise RuntimeError('Demo login failed for role ' + role + ', HTTP ' + str(status))
    tokens[role] = response['accessToken']
    print('PASS login ' + role)

status, headers, public = request('/api/public/job-postings', origin=os.environ['APP_FRONTEND_URL'])
assert status == 200 and public['totalElements'] >= 1, 'Published demo job missing'
assert headers.get('Access-Control-Allow-Origin') == os.environ['APP_FRONTEND_URL'], 'CORS origin missing'
assert request('/api/public/departments')[0] == 200
assert request('/api/admin/users', token=tokens['CANDIDATE'])[0] == 403, 'Candidate gained admin access'
assert request('/api/departments')[0] == 401, 'Internal departments became public'
print('PASS public APIs, exact CORS and negative RBAC')
print('NOT IMPLEMENTED candidate submission and full applicant management; full demo is not READY')
