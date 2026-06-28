import json
import os
import psycopg2
import psycopg2.extras

def get_user_id(event):
    token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
    if not token or '.' not in token:
        return None
    try:
        return int(token.split('.', 1)[0])
    except ValueError:
        return None

def handler(event, context):
    '''Управление оценками, предметами и напоминаниями дневника по ролям'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    user_id = get_user_id(event)
    if not user_id:
        return {'statusCode': 401, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Требуется авторизация'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def resp(code, data):
        cur.close()
        conn.close()
        return {'statusCode': code, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps(data, default=str)}

    cur.execute("SELECT id, role, full_name, grade_class FROM users WHERE id = %s", (user_id,))
    me = cur.fetchone()
    if not me:
        return resp(401, {'error': 'Пользователь не найден'})
    role = me['role']

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    action = params.get('action') or body.get('action') or ''

    # ---- READ DATA ----
    if method == 'GET':
        if action == 'subjects':
            cur.execute("SELECT s.id, s.name, u.full_name AS teacher_name FROM subjects s "
                        "LEFT JOIN users u ON u.id = s.teacher_id ORDER BY s.name")
            return resp(200, {'subjects': cur.fetchall()})

        if action == 'students':
            cur.execute("SELECT id, full_name, grade_class, email FROM users WHERE role = 'student' ORDER BY full_name")
            return resp(200, {'students': cur.fetchall()})

        if action == 'users':
            cur.execute("SELECT id, full_name, email, role, grade_class, created_at FROM users ORDER BY created_at DESC")
            return resp(200, {'users': cur.fetchall()})

        if action == 'reminders':
            cur.execute("SELECT r.id, r.title, r.reminder_type, r.due_date, r.grade_class, s.name AS subject_name "
                        "FROM reminders r LEFT JOIN subjects s ON s.id = r.subject_id "
                        "ORDER BY r.due_date")
            return resp(200, {'reminders': cur.fetchall()})

        # grades — by role
        target = params.get('student_id')
        if role == 'student':
            sid = user_id
        elif role == 'parent':
            if target:
                cur.execute("SELECT 1 FROM parent_student WHERE parent_id = %s AND student_id = %s", (user_id, target))
                if not cur.fetchone():
                    return resp(403, {'error': 'Нет доступа к этому ученику'})
                sid = int(target)
            else:
                cur.execute("SELECT s.id, s.full_name, s.grade_class FROM parent_student ps "
                            "JOIN users s ON s.id = ps.student_id WHERE ps.parent_id = %s", (user_id,))
                return resp(200, {'children': cur.fetchall()})
        else:
            sid = int(target) if target else None

        if sid is None:
            cur.execute("SELECT g.id, g.value, g.note, g.grade_date, s.name AS subject_name, "
                        "u.full_name AS student_name FROM grades g "
                        "JOIN subjects s ON s.id = g.subject_id JOIN users u ON u.id = g.student_id "
                        "ORDER BY g.grade_date DESC LIMIT 200")
        else:
            cur.execute("SELECT g.id, g.value, g.note, g.grade_date, s.name AS subject_name, "
                        "u.full_name AS student_name FROM grades g "
                        "JOIN subjects s ON s.id = g.subject_id JOIN users u ON u.id = g.student_id "
                        "WHERE g.student_id = %s ORDER BY g.grade_date DESC", (sid,))
        return resp(200, {'grades': cur.fetchall()})

    # ---- WRITE DATA ----
    if method == 'POST':
        if action == 'add_subject':
            if role not in ('teacher', 'admin'):
                return resp(403, {'error': 'Только учитель может создавать предметы'})
            name = (body.get('name') or '').strip()
            if not name:
                return resp(400, {'error': 'Укажите название предмета'})
            cur.execute("INSERT INTO subjects (name, teacher_id) VALUES (%s, %s) RETURNING id", (name, user_id))
            return resp(200, {'id': cur.fetchone()['id']})

        if action == 'add_grade':
            if role not in ('teacher', 'admin'):
                return resp(403, {'error': 'Только учитель может выставлять оценки'})
            student_id = body.get('student_id')
            subject_id = body.get('subject_id')
            value = body.get('value')
            note = (body.get('note') or '').strip() or None
            if not student_id or not subject_id or value not in (1, 2, 3, 4, 5):
                return resp(400, {'error': 'Заполните ученика, предмет и оценку (1-5)'})
            cur.execute("INSERT INTO grades (student_id, subject_id, teacher_id, value, note) "
                        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                        (student_id, subject_id, user_id, value, note))
            return resp(200, {'id': cur.fetchone()['id']})

        if action == 'add_reminder':
            if role not in ('teacher', 'admin'):
                return resp(403, {'error': 'Только учитель может создавать напоминания'})
            title = (body.get('title') or '').strip()
            due_date = body.get('due_date')
            if not title or not due_date:
                return resp(400, {'error': 'Укажите название и дату'})
            cur.execute("INSERT INTO reminders (teacher_id, subject_id, title, reminder_type, due_date, grade_class) "
                        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                        (user_id, body.get('subject_id'), title, body.get('reminder_type'),
                         due_date, body.get('grade_class')))
            return resp(200, {'id': cur.fetchone()['id']})

        if action == 'link_child':
            if role != 'parent':
                return resp(403, {'error': 'Только родитель может привязать ребёнка'})
            email = (body.get('student_email') or '').strip().lower()
            cur.execute("SELECT id FROM users WHERE email = %s AND role = 'student'", (email,))
            child = cur.fetchone()
            if not child:
                return resp(404, {'error': 'Ученик с таким email не найден'})
            cur.execute("INSERT INTO parent_student (parent_id, student_id) VALUES (%s, %s) "
                        "ON CONFLICT (parent_id, student_id) DO NOTHING", (user_id, child['id']))
            return resp(200, {'ok': True})

    return resp(400, {'error': 'Неизвестное действие'})
