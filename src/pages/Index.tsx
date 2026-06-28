import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { auth } from '@/lib/api';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type User = { id: number; email: string; full_name: string; role: 'admin' | 'teacher' | 'student' | 'parent'; grade_class?: string };
type Screen = 'loading' | 'login' | 'register_admin' | 'register_invite' | 'dashboard';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', teacher: 'Учитель', student: 'Ученик', parent: 'Родитель',
};

// ──────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────
export default function Index() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('diary_token');
    const savedUser = localStorage.getItem('diary_user');
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
      setScreen('dashboard');
      return;
    }
    auth.checkAdmin().then((r: { has_admin: boolean }) => {
      setScreen(r.has_admin ? 'login' : 'register_admin');
    }).catch(() => setScreen('login'));
  }, []);

  const onLogin = (u: User, t: string) => {
    localStorage.setItem('diary_token', t);
    localStorage.setItem('diary_user', JSON.stringify(u));
    setUser(u); setToken(t); setScreen('dashboard');
  };

  const onLogout = () => {
    localStorage.removeItem('diary_token');
    localStorage.removeItem('diary_user');
    setUser(null); setToken('');
    auth.checkAdmin().then((r: { has_admin: boolean }) => setScreen(r.has_admin ? 'login' : 'register_admin'));
  };

  if (screen === 'loading') return <Splash />;
  if (screen === 'register_admin') return <RegisterAdmin onSuccess={onLogin} />;
  if (screen === 'register_invite') return <RegisterInvite onSuccess={onLogin} onBack={() => setScreen('login')} />;
  if (screen === 'login') return <Login onSuccess={onLogin} onRegister={() => setScreen('register_invite')} />;
  if (screen === 'dashboard' && user) return <Dashboard user={user} token={token} onLogout={onLogout} />;
  return <Splash />;
}

// ──────────────────────────────────────────────
// Splash
// ──────────────────────────────────────────────
function Splash() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Auth layout wrapper
// ──────────────────────────────────────────────
function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Дневник оценок</p>
          <h1 className="font-display text-4xl font-medium">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 space-y-4 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
      />
    </div>
  );
}

function Btn({ children, onClick, loading, variant = 'primary' }: {
  children: React.ReactNode; onClick: () => void; loading?: boolean; variant?: 'primary' | 'ghost';
}) {
  return (
    <button
      onClick={onClick} disabled={loading}
      className={`w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2
        ${variant === 'primary'
          ? 'bg-foreground text-background hover:opacity-90 disabled:opacity-50'
          : 'text-muted-foreground hover:text-foreground'}`}
    >
      {loading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return msg ? <p className="text-xs text-red-600 text-center">{msg}</p> : null;
}

// ──────────────────────────────────────────────
// Register Admin
// ──────────────────────────────────────────────
function RegisterAdmin({ onSuccess }: { onSuccess: (u: User, t: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !pass) { setErr('Заполните все поля'); return; }
    if (pass !== pass2) { setErr('Пароли не совпадают'); return; }
    if (pass.length < 6) { setErr('Пароль минимум 6 символов'); return; }
    setLoading(true); setErr('');
    const r = await auth.registerAdmin(email, pass, name);
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    onSuccess(r.user, r.token);
  };

  return (
    <AuthCard title="Настройка системы" subtitle="Создайте аккаунт администратора школы">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
        Первый пользователь системы — администратор. Он сможет приглашать учителей, учеников и родителей через коды.
      </div>
      <Field label="Полное имя" value={name} onChange={setName} placeholder="Иванов Иван Иванович" />
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="admin@school.ru" />
      <Field label="Пароль" type="password" value={pass} onChange={setPass} placeholder="Минимум 6 символов" />
      <Field label="Повторите пароль" type="password" value={pass2} onChange={setPass2} placeholder="Повторите пароль" />
      <ErrMsg msg={err} />
      <Btn onClick={submit} loading={loading}>Создать аккаунт администратора</Btn>
    </AuthCard>
  );
}

// ──────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────
function Login({ onSuccess, onRegister }: { onSuccess: (u: User, t: string) => void; onRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pass) { setErr('Введите email и пароль'); return; }
    setLoading(true); setErr('');
    const r = await auth.login(email, pass);
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    onSuccess(r.user, r.token);
  };

  return (
    <AuthCard title="Вход" subtitle="Дневник оценок для учеников и учителей">
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.ru" />
      <Field label="Пароль" type="password" value={pass} onChange={setPass} placeholder="Ваш пароль" />
      <ErrMsg msg={err} />
      <Btn onClick={submit} loading={loading}>Войти</Btn>
      <div className="pt-2 border-t border-border text-center">
        <p className="text-xs text-muted-foreground mb-2">Есть код приглашения от администратора?</p>
        <Btn onClick={onRegister} variant="ghost">Зарегистрироваться по коду →</Btn>
      </div>
    </AuthCard>
  );
}

// ──────────────────────────────────────────────
// Register with Invite Code
// ──────────────────────────────────────────────
function RegisterInvite({ onSuccess, onBack }: { onSuccess: (u: User, t: string) => void; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [klass, setKlass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code || !name || !email || !pass) { setErr('Заполните все поля'); return; }
    if (pass !== pass2) { setErr('Пароли не совпадают'); return; }
    if (pass.length < 6) { setErr('Пароль минимум 6 символов'); return; }
    setLoading(true); setErr('');
    const r = await auth.registerWithCode(code.trim().toUpperCase(), email, pass, name, klass);
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    onSuccess(r.user, r.token);
  };

  return (
    <AuthCard title="Регистрация" subtitle="Введите код приглашения от администратора">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Код приглашения</label>
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Например: A1B2C3D4"
          className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 font-mono tracking-widest text-center uppercase"
        />
      </div>
      <Field label="Полное имя" value={name} onChange={setName} placeholder="Иванов Иван Иванович" />
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.ru" />
      <Field label="Класс (необязательно)" value={klass} onChange={setKlass} placeholder="10А" />
      <Field label="Пароль" type="password" value={pass} onChange={setPass} placeholder="Минимум 6 символов" />
      <Field label="Повторите пароль" type="password" value={pass2} onChange={setPass2} placeholder="Повторите пароль" />
      <ErrMsg msg={err} />
      <Btn onClick={submit} loading={loading}>Зарегистрироваться</Btn>
      <Btn onClick={onBack} variant="ghost">← Назад ко входу</Btn>
    </AuthCard>
  );
}

// ──────────────────────────────────────────────
// Dashboard (роутинг по роли)
// ──────────────────────────────────────────────
function Dashboard({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 md:px-10 py-12">
        <header className="flex items-end justify-between mb-12 animate-fade-in">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Учебный год 2025—26</p>
            <h1 className="font-display text-5xl md:text-6xl font-medium leading-none">Дневник</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}{user.grade_class ? ` · ${user.grade_class}` : ''}</p>
            </div>
            <button
              onClick={onLogout}
              title="Выйти из аккаунта"
              className="h-11 w-11 rounded-full bg-foreground text-background grid place-items-center font-medium hover:opacity-80 transition"
            >
              {user.full_name.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>

        {user.role === 'admin'   && <AdminDashboard   token={token} user={user} />}
        {user.role === 'teacher' && <TeacherDashboard token={token} user={user} />}
        {user.role === 'student' && <StudentDashboard token={token} user={user} />}
        {user.role === 'parent'  && <ParentDashboard  token={token} user={user} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Admin Dashboard
// ──────────────────────────────────────────────
function AdminDashboard({ token }: { token: string; user: User }) {
  type Invite = { id: number; code: string; role: string; is_used: boolean; used_by_name?: string };
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<'teacher' | 'student' | 'parent'>('teacher');
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState('');

  const loadInvites = async () => {
    setLoading(true);
    const r = await auth.listInvites(token);
    setLoading(false);
    if (r.invites) setInvites(r.invites);
  };

  useEffect(() => { loadInvites(); }, [token]);

  const createCode = async () => {
    setCreating(true);
    const r = await auth.createInvite(role, token);
    setCreating(false);
    if (r.code) { setNewCode(r.code); loadInvites(); }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const roleColors: Record<string, string> = {
    teacher: 'bg-blue-50 text-blue-700 border-blue-200',
    student: 'bg-green-50 text-green-700 border-green-200',
    parent: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="bg-card border border-border rounded-2xl p-7">
        <h2 className="font-display text-2xl font-medium mb-2">Коды приглашений</h2>
        <p className="text-sm text-muted-foreground mb-6">Создайте код и передайте его учителю, ученику или родителю — они зарегистрируются по нему.</p>

        <div className="flex gap-3 flex-wrap items-center">
          {(['teacher', 'student', 'parent'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-lg text-sm border transition ${role === r ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {ROLE_LABELS[r]}
            </button>
          ))}
          <button onClick={createCode} disabled={creating}
            className="px-5 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
            {creating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Icon name="Plus" size={16} />}
            Создать код
          </button>
        </div>

        {newCode && (
          <div className="mt-5 flex items-center gap-4 bg-muted rounded-xl px-5 py-4 animate-fade-in">
            <Icon name="Key" size={18} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Код для {ROLE_LABELS[role].toLowerCase()}а — отправьте его пользователю</p>
              <p className="font-mono text-2xl font-medium tracking-widest">{newCode}</p>
            </div>
            <button onClick={() => copy(newCode)}
              className="px-4 py-2 border border-border rounded-lg text-sm bg-background hover:opacity-80 transition flex items-center gap-2">
              <Icon name={copied === newCode ? 'Check' : 'Copy'} size={15} />
              {copied === newCode ? 'Скопировано!' : 'Скопировать'}
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-medium mb-5">История кодов</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Кодов ещё нет — создайте первый выше.</p>
        ) : (
          <div className="space-y-px bg-border rounded-2xl overflow-hidden">
            {invites.map((inv) => (
              <div key={inv.id} className="bg-card flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition">
                <span className={`font-mono text-base font-medium w-24 ${inv.is_used ? 'line-through opacity-40' : ''}`}>{inv.code}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${roleColors[inv.role]}`}>{ROLE_LABELS[inv.role]}</span>
                {inv.is_used
                  ? <span className="text-xs text-muted-foreground flex-1">Использован · {inv.used_by_name}</span>
                  : <span className="flex-1" />}
                {!inv.is_used && (
                  <button onClick={() => copy(inv.code)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition shrink-0">
                    <Icon name={copied === inv.code ? 'Check' : 'Copy'} size={14} />
                    {copied === inv.code ? 'Скопировано!' : 'Скопировать'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Teacher Dashboard
// ──────────────────────────────────────────────
function TeacherDashboard({ user }: { token: string; user: User }) {
  return (
    <div className="animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
        <div className="h-16 w-16 rounded-full bg-blue-50 grid place-items-center mx-auto">
          <Icon name="GraduationCap" size={28} />
        </div>
        <h2 className="font-display text-2xl font-medium">Кабинет учителя</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Добро пожаловать, {user.full_name}! Здесь будет журнал с оценками учеников.
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-4 py-2 inline-block">
          Функции выставления оценок подключатся на следующем шаге
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Student Dashboard
// ──────────────────────────────────────────────
function StudentDashboard({ user }: { token: string; user: User }) {
  return (
    <div className="animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
        <div className="h-16 w-16 rounded-full bg-green-50 grid place-items-center mx-auto">
          <Icon name="BookOpen" size={28} />
        </div>
        <h2 className="font-display text-2xl font-medium">Дневник ученика</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Привет, {user.full_name}!{user.grade_class ? ` Класс: ${user.grade_class}.` : ''} Здесь будут твои оценки и напоминания.
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-4 py-2 inline-block">
          Оценки появятся после того, как учитель внесёт их в журнал
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Parent Dashboard
// ──────────────────────────────────────────────
function ParentDashboard({ user }: { token: string; user: User }) {
  return (
    <div className="animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
        <div className="h-16 w-16 rounded-full bg-orange-50 grid place-items-center mx-auto">
          <Icon name="Users" size={28} />
        </div>
        <h2 className="font-display text-2xl font-medium">Кабинет родителя</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Добро пожаловать, {user.full_name}! Здесь вы сможете следить за успеваемостью вашего ребёнка.
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-4 py-2 inline-block">
          Привяжите аккаунт ребёнка через его email для просмотра оценок
        </p>
      </div>
    </div>
  );
}