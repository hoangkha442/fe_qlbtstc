import TaskCard from './TaskCard.jsx';

export default function TaskList({ tasks, onToggle, onEdit, onDelete }) {
  if (tasks.length === 0) return <p>Không có công việc phù hợp.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task}
          onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
