import json
import os
import hashlib
import hmac
import secrets
import psycopg2

def hash_password(password: str, salt: str = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${pwd_hash}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split('$', 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)

def make_token(user_id: int) -> str:
    return f"{user_id}.{secrets.token_hex(24)}"

def handler(event, context):
    '''Регистрация и вход пользователей дневника (учитель, ученик, родитель, администратор)'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor()

    def resp(code, data):
        cur.close()
        conn.close()
        return {'statusCode': code, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps(data, default=str)}

    if action == 'register':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        full_name = (body.get('full_name') or '').strip()
        role = body.get('role') or ''
        grade_class = (body.get('grade_class') or '').strip() or None

        if not email or not password or not full_name or role not in ('teacher', 'student', 'parent', 'admin'):
            return resp(400, {'error': 'Заполните все поля корректно'})

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return resp(409, {'error': 'Пользователь с таким email уже существует'})

        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, role, grade_class) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (email, hash_password(password), full_name, role, grade_class)
        )
        user_id = cur.fetchone()[0]
        return resp(200, {'token': make_token(user_id), 'user': {
            'id': user_id, 'email': email, 'full_name': full_name, 'role': role, 'grade_class': grade_class
        }})

    if action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        cur.execute("SELECT id, password_hash, full_name, role, grade_class FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row or not verify_password(password, row[1]):
            return resp(401, {'error': 'Неверный email или пароль'})
        return resp(200, {'token': make_token(row[0]), 'user': {
            'id': row[0], 'email': email, 'full_name': row[2], 'role': row[3], 'grade_class': row[4]
        }})

    return resp(400, {'error': 'Неизвестное действие'})
