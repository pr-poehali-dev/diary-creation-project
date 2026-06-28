import json
import os
import hashlib
import hmac
import secrets
import psycopg2
import psycopg2.extras

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

def get_user_id(event):
    token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token') or ''
    if not token or '.' not in token:
        return None
    try:
        return int(token.split('.', 1)[0])
    except ValueError:
        return None

def handler(event, context):
    '''Регистрация, вход и управление кодами приглашений для дневника оценок'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def resp(code, data):
        cur.close()
        conn.close()
        return {'statusCode': code, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps(data, default=str)}

    # --- Регистрация администратора (только если нет ни одного) ---
    if action == 'register_admin':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        full_name = (body.get('full_name') or '').strip()
        if not email or not password or not full_name:
            return resp(400, {'error': 'Заполните все поля'})
        cur.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        if cur.fetchone():
            return resp(403, {'error': 'Администратор уже зарегистрирован'})
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return resp(409, {'error': 'Email уже используется'})
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, role) VALUES (%s, %s, %s, 'admin') RETURNING id",
            (email, hash_password(password), full_name)
        )
        user_id = cur.fetchone()['id']
        return resp(200, {'token': make_token(user_id), 'user': {
            'id': user_id, 'email': email, 'full_name': full_name, 'role': 'admin', 'grade_class': None
        }})

    # --- Регистрация по коду приглашения ---
    if action == 'register_with_code':
        code = (body.get('code') or '').strip().upper()
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        full_name = (body.get('full_name') or '').strip()
        grade_class = (body.get('grade_class') or '').strip() or None
        if not code or not email or not password or not full_name:
            return resp(400, {'error': 'Заполните все поля'})
        cur.execute("SELECT id, role, is_used FROM invite_codes WHERE code = %s", (code,))
        inv = cur.fetchone()
        if not inv:
            return resp(404, {'error': 'Код приглашения не найден'})
        if inv['is_used']:
            return resp(409, {'error': 'Этот код уже был использован'})
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return resp(409, {'error': 'Email уже используется'})
        role = inv['role']
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, role, grade_class) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (email, hash_password(password), full_name, role, grade_class)
        )
        user_id = cur.fetchone()['id']
        cur.execute("UPDATE invite_codes SET is_used = TRUE, used_by = %s, used_at = NOW() WHERE id = %s",
                    (user_id, inv['id']))
        return resp(200, {'token': make_token(user_id), 'user': {
            'id': user_id, 'email': email, 'full_name': full_name, 'role': role, 'grade_class': grade_class
        }})

    # --- Вход ---
    if action == 'login':
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''
        if not email or not password:
            return resp(400, {'error': 'Введите email и пароль'})
        cur.execute("SELECT id, password_hash, full_name, role, grade_class FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row or not verify_password(password, row['password_hash']):
            return resp(401, {'error': 'Неверный email или пароль'})
        return resp(200, {'token': make_token(row['id']), 'user': {
            'id': row['id'], 'email': email, 'full_name': row['full_name'],
            'role': row['role'], 'grade_class': row['grade_class']
        }})

    # --- Проверить: есть ли уже администратор ---
    if action == 'check_admin':
        cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'")
        row = cur.fetchone()
        return resp(200, {'has_admin': row['cnt'] > 0})

    # --- Создать код приглашения (только admin) ---
    if action == 'create_invite':
        user_id = get_user_id(event)
        if not user_id:
            return resp(401, {'error': 'Требуется авторизация'})
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        me = cur.fetchone()
        if not me or me['role'] != 'admin':
            return resp(403, {'error': 'Только администратор может создавать коды'})
        role = body.get('role') or ''
        if role not in ('teacher', 'student', 'parent'):
            return resp(400, {'error': 'Укажите роль: teacher, student или parent'})
        code = secrets.token_hex(4).upper()
        cur.execute("INSERT INTO invite_codes (code, role, created_by) VALUES (%s, %s, %s) RETURNING id, code",
                    (code, role, user_id))
        row = cur.fetchone()
        return resp(200, {'code': row['code'], 'role': role})

    # --- Список кодов (только admin) ---
    if action == 'list_invites':
        user_id = get_user_id(event)
        if not user_id:
            return resp(401, {'error': 'Требуется авторизация'})
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        me = cur.fetchone()
        if not me or me['role'] != 'admin':
            return resp(403, {'error': 'Доступ запрещён'})
        cur.execute(
            "SELECT ic.id, ic.code, ic.role, ic.is_used, ic.created_at, u.full_name AS used_by_name "
            "FROM invite_codes ic LEFT JOIN users u ON u.id = ic.used_by "
            "WHERE ic.created_by = %s ORDER BY ic.created_at DESC",
            (user_id,)
        )
        return resp(200, {'invites': cur.fetchall()})

    return resp(400, {'error': 'Неизвестное действие'})
