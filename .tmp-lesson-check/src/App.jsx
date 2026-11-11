import { useEffect, useState } from 'react';
import { filterTasks, validateTask } from './task-service.js';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';

const emptyForm = { title: '', subject: '', deadline: '' };

export default function App() {
  const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState('');
const [attempt, setAttempt] = useState(0);

useEffect(() => {
  const controller = new AbortController();
  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}tasks.json`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Dữ liệu không phải danh sách.');
      if (!controller.signal.aborted) setTasks(data);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  load();
  return () => controller.abort();
}, [attempt]);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const visibleTasks = filterTasks(tasks, query, status);

  function cancelEdit() {
    setEditingId(null); setForm({ ...emptyForm }); setError('');
  }
  function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setEditingId(id);
    setForm({ title: task.title, subject: task.subject, deadline: task.deadline });
    setError('');
  }
  function save(event) {
    event.preventDefault();
    const message = validateTask(form);
    if (message) { setError(message); return; }
    const values = { ...form, title: form.title.trim(), subject: form.subject.trim() };
    const isEditing = editingId !== null;
    const newId = isEditing ? null : crypto.randomUUID();
    setTasks(previous => isEditing
      ? previous.map(t => t.id === editingId ? { ...t, ...values } : t)
      : [...previous, { ...values, id: newId, completed: false }]);
    cancelEdit();
  }
  function remove(id) {
    setTasks(previous => previous.filter(t => t.id !== id));
    if (editingId === id) cancelEdit();
  }
  function toggle(id) {
    setTasks(previous => previous.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

if (loading) return <p role="status">Đang tải dữ liệu...</p>;
if (loadError) return (
  <div role="alert">
    <p>{loadError}</p>
    <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
  </div>
);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Công việc học tập</h1>
      <TaskForm form={form} onChange={(name, value) => setForm(previous => ({ ...previous, [name]: value }))}
        onSubmit={save} onCancel={cancelEdit} isEditing={editingId !== null} error={error} />
      <label className="block">Tìm công việc
        <input value={query} onChange={event => setQuery(event.target.value)} className="ml-2 rounded border p-2" />
      </label>
      <label className="block">Trạng thái
        <select value={status} onChange={event => setStatus(event.target.value)} className="ml-2 rounded border p-2">
          <option value="all">Tất cả</option><option value="pending">Chưa hoàn thành</option><option value="done">Đã hoàn thành</option>
        </select>
      </label>
      <p>{visibleTasks.length} kết quả / {tasks.length} công việc</p>
      <TaskList tasks={visibleTasks} onEdit={startEdit} onToggle={toggle} onDelete={remove} />
    </main>
  );
}
