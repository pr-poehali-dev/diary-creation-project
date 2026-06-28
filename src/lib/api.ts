const URLS = {
  auth: 'https://functions.poehali.dev/3a103456-5ce8-4ca2-91ed-51d65b228561',
  diary: 'https://functions.poehali.dev/89e1627e-00f2-4797-b114-a8f60aac9f87',
};

async function call(url: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function get(url: string, params: Record<string, string>, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['X-Auth-Token'] = token;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}${qs ? '?' + qs : ''}`, { headers });
  return res.json();
}

export const auth = {
  checkAdmin: () => call(URLS.auth, { action: 'check_admin' }),
  registerAdmin: (email: string, password: string, full_name: string) =>
    call(URLS.auth, { action: 'register_admin', email, password, full_name }),
  registerWithCode: (code: string, email: string, password: string, full_name: string, grade_class?: string) =>
    call(URLS.auth, { action: 'register_with_code', code, email, password, full_name, grade_class }),
  login: (email: string, password: string) =>
    call(URLS.auth, { action: 'login', email, password }),
  createInvite: (role: string, token: string) =>
    call(URLS.auth, { action: 'create_invite', role }, token),
  listInvites: (token: string) =>
    call(URLS.auth, { action: 'list_invites' }, token),
};

export const diary = {
  getSubjects: (token: string) => get(URLS.diary, { action: 'subjects' }, token),
  getStudents: (token: string) => get(URLS.diary, { action: 'students' }, token),
  getGrades: (token: string, student_id?: string) =>
    get(URLS.diary, student_id ? { action: 'grades', student_id } : { action: 'grades' }, token),
  getReminders: (token: string) => get(URLS.diary, { action: 'reminders' }, token),
  addSubject: (name: string, token: string) =>
    call(URLS.diary, { action: 'add_subject', name }, token),
  addGrade: (student_id: number, subject_id: number, value: number, note: string, token: string) =>
    call(URLS.diary, { action: 'add_grade', student_id, subject_id, value, note }, token),
  addReminder: (data: object, token: string) =>
    call(URLS.diary, { action: 'add_reminder', ...data }, token),
};
