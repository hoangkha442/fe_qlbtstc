// src/task-service.js
export function findTaskById(tasks, id) {
  return tasks.find(task => task.id === id);
}

export function filterTasks(tasks, query = '', status = 'all') {
  const keyword = query.trim().toLowerCase();
  return tasks.filter(task => {
    const titleMatches = task.title.toLowerCase().includes(keyword);
    const statusMatches = status === 'all'
      || (status === 'done' && task.completed)
      || (status === 'pending' && !task.completed);
    return titleMatches && statusMatches;
  });
}

export function summarizeTasks(tasks) {
  const done = tasks.filter(task => task.completed).length;
  return { total: tasks.length, done, pending: tasks.length - done };
}

export function validateTask(values) {
  if (!values.title.trim()) return 'Vui lòng nhập tên công việc.';
  if (values.title.trim().length > 120) return 'Tên tối đa 120 ký tự.';
  if (!values.subject.trim()) return 'Vui lòng nhập môn học.';
  if (!values.deadline) return 'Vui lòng chọn hạn hoàn thành.';
  return '';
}
