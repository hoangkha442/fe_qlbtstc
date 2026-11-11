// src/components/TaskForm.jsx
export default function TaskForm({ form, onChange, onSubmit, onCancel, isEditing, error }) {
  const fields = [['title', 'Tên công việc'], ['subject', 'Môn học'], ['deadline', 'Hạn hoàn thành']];
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-200 p-4">
      {fields.map(([name, label]) => (
        <div key={name}>
          <label htmlFor={`task-${name}`} className="mb-1 block font-semibold">{label}</label>
          <input id={`task-${name}`} name={name} type={name === 'deadline' ? 'date' : 'text'}
            value={form[name]} onChange={event => onChange(name, event.target.value)} required
            className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
      ))}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-white">
        {isEditing ? 'Lưu thay đổi' : 'Thêm công việc'}
      </button>
      {isEditing && <button type="button" onClick={onCancel} className="ml-3">Hủy</button>}
    </form>
  );
}
