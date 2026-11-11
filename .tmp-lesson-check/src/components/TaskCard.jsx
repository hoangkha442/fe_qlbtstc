export default function TaskCard({ task, onToggle, onEdit, onDelete }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-semibold">{task.title}</h2>
      <p className="mt-2 text-slate-600">Môn: {task.subject}</p>
      <p>Hạn: {task.deadline}</p>
      <p className="mt-2 font-semibold">
        {task.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onToggle?.(task.id)}>
          {task.completed ? 'Đánh dấu chưa xong' : 'Hoàn thành'}
        </button>
        <button type="button" onClick={() => onEdit?.(task.id)}>Sửa</button>
        <button type="button" onClick={() => onDelete?.(task.id)}>Xóa</button>
      </div>
    </article>
  );
}
