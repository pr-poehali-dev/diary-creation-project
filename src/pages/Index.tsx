import { useState } from 'react';
import Icon from '@/components/ui/icon';

const TYPES = ['Контрольная', 'Самостоятельная', 'Зачёт', 'Дедлайн', 'Другое'];
const SUBJECTS_LIST = ['Математика', 'Литература', 'Физика', 'История', 'Английский'];

type Grade = { id: number; subject: string; value: number; date: string; note: string };
type Subject = { name: string; grades: number[]; color: string };
type Reminder = { id: number; subject: string; title: string; date: string; type: string };

const subjects: Subject[] = [
  { name: 'Математика', grades: [5, 4, 5, 5, 4], color: '220 14% 14%' },
  { name: 'Литература', grades: [4, 5, 4, 4], color: '20 30% 45%' },
  { name: 'Физика', grades: [3, 4, 4, 5], color: '200 25% 40%' },
  { name: 'История', grades: [5, 5, 4, 5, 5], color: '40 35% 45%' },
  { name: 'Английский', grades: [4, 4, 5, 4], color: '150 20% 38%' },
];

const history: Grade[] = [
  { id: 1, subject: 'Математика', value: 5, date: '24 июня', note: 'Контрольная работа' },
  { id: 2, subject: 'История', value: 5, date: '23 июня', note: 'Устный ответ' },
  { id: 3, subject: 'Физика', value: 4, date: '21 июня', note: 'Лабораторная' },
  { id: 4, subject: 'Английский', value: 5, date: '20 июня', note: 'Эссе' },
  { id: 5, subject: 'Литература', value: 4, date: '18 июня', note: 'Сочинение' },
  { id: 6, subject: 'Математика', value: 4, date: '17 июня', note: 'Самостоятельная' },
];

const reminders: Reminder[] = [
  { id: 1, subject: 'Физика', title: 'Контрольная по механике', date: '2 июля', type: 'Контрольная' },
  { id: 2, subject: 'Математика', title: 'Зачёт по интегралам', date: '5 июля', type: 'Зачёт' },
  { id: 3, subject: 'Английский', title: 'Сдать эссе', date: '8 июля', type: 'Дедлайн' },
];

const avg = (g: number[]) => g.reduce((a, b) => a + b, 0) / g.length;

const gradeColor = (v: number) =>
  v >= 5 ? 'text-emerald-700' : v >= 4 ? 'text-foreground' : v >= 3 ? 'text-amber-700' : 'text-red-700';

export default function Index() {
  const [active, setActive] = useState('Обзор');
  const [reminderList, setReminderList] = useState<Reminder[]>(reminders);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', type: 'Контрольная', date: '' });
  const [formError, setFormError] = useState('');

  const allGrades = subjects.flatMap((s) => s.grades);
  const overallAvg = avg(allGrades);

  const handleAddReminder = () => {
    if (!form.title.trim()) { setFormError('Введите название'); return; }
    if (!form.date) { setFormError('Укажите дату'); return; }
    const d = new Date(form.date);
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    setReminderList(prev => [
      ...prev,
      { id: Date.now(), subject: form.subject || '—', title: form.title.trim(), date: dateStr, type: form.type }
    ]);
    setForm({ title: '', subject: '', type: 'Контрольная', date: '' });
    setFormError('');
    setShowForm(false);
  };

  const nav = ['Обзор', 'Предметы', 'История', 'Напоминания'];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 md:px-10 py-12 md:py-16">

        <header className="flex items-end justify-between mb-16 animate-fade-in">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">Учебный год 2025—26</p>
            <h1 className="font-display text-5xl md:text-7xl font-medium leading-none">Дневник</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Анна Петрова</p>
              <p className="text-xs text-muted-foreground">10 класс</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-foreground text-background grid place-items-center font-medium">
              АП
            </div>
          </div>
        </header>

        <nav className="flex gap-8 border-b border-border mb-14">
          {nav.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`pb-4 text-sm transition-colors relative ${
                active === item ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item}
              {active === item && <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-foreground" />}
            </button>
          ))}
        </nav>

        {active === 'Обзор' && (
          <div className="animate-fade-in space-y-16">
            <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
              {[
                { label: 'Средний балл', value: overallAvg.toFixed(2) },
                { label: 'Всего оценок', value: allGrades.length },
                { label: 'Пятёрок', value: allGrades.filter((g) => g === 5).length },
                { label: 'Предметов', value: subjects.length },
              ].map((s) => (
                <div key={s.label} className="bg-card p-6 md:p-8">
                  <p className="font-display text-4xl md:text-5xl font-medium tabular">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
                </div>
              ))}
            </section>

            <section>
              <h2 className="font-display text-2xl font-medium mb-6">По предметам</h2>
              <div className="space-y-5">
                {subjects.map((s) => {
                  const a = avg(s.grades);
                  return (
                    <div key={s.name} className="flex items-center gap-5">
                      <span className="w-32 text-sm shrink-0">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(a / 5) * 100}%`, background: `hsl(${s.color})` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-medium tabular">{a.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-medium">Ближайшие сроки</h2>
                <button onClick={() => setActive('Напоминания')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Все →
                </button>
              </div>
              <div className="space-y-3">
                {reminders.slice(0, 2).map((r) => (
                  <ReminderRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          </div>
        )}

        {active === 'Предметы' && (
          <div className="animate-fade-in grid sm:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden">
            {subjects.map((s) => {
              const a = avg(s.grades);
              return (
                <div key={s.name} className="bg-card p-7 group hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="text-lg font-medium">{s.name}</h3>
                    <span className={`font-display text-3xl font-medium tabular ${gradeColor(a)}`}>{a.toFixed(1)}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {s.grades.map((g, i) => (
                      <span
                        key={i}
                        className="h-9 w-9 rounded-lg grid place-items-center text-sm font-medium border border-border tabular"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-5">{s.grades.length} оценок в журнале</p>
                </div>
              );
            })}
          </div>
        )}

        {active === 'История' && (
          <div className="animate-fade-in">
            <div className="space-y-px bg-border rounded-2xl overflow-hidden">
              {history.map((h) => (
                <div key={h.id} className="bg-card flex items-center gap-5 px-6 py-5 hover:bg-muted/40 transition-colors">
                  <span className={`font-display text-3xl font-medium w-10 tabular ${gradeColor(h.value)}`}>{h.value}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{h.subject}</p>
                    <p className="text-xs text-muted-foreground">{h.note}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'Напоминания' && (
          <div className="animate-fade-in space-y-3">
            {reminderList.map((r) => (
              <ReminderRow key={r.id} r={r} />
            ))}

            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full mt-2 border border-dashed border-border rounded-xl py-5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="Plus" size={16} />
                Добавить напоминание
              </button>
            ) : (
              <div className="mt-2 border border-border rounded-xl p-6 space-y-4 animate-fade-in">
                <p className="text-sm font-medium">Новое напоминание</p>

                <div className="space-y-3">
                  <input
                    autoFocus
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Название, например «Контрольная по алгебре»"
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    >
                      <option value="">Предмет</option>
                      {SUBJECTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>

                {formError && <p className="text-xs text-red-600">{formError}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleAddReminder}
                    className="px-5 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setFormError(''); }}
                    className="px-5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-24 pt-8 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>Дневник оценок</span>
          <span>Обновлено 24 июня 2026</span>
        </footer>
      </div>
    </div>
  );
}

function ReminderRow({ r }: { r: Reminder }) {
  return (
    <div className="flex items-center gap-5 bg-card border border-border rounded-xl px-6 py-5 hover:border-foreground/20 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center shrink-0">
        <Icon name="CalendarClock" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.subject} · {r.type}</p>
      </div>
      <span className="text-sm font-medium shrink-0">{r.date}</span>
    </div>
  );
}