import { useQuery } from '@tanstack/react-query';
import { BookOutlined, CodeOutlined } from '@ant-design/icons';
import { NavLink } from 'react-router-dom';
import { get } from '../lib/api';
import type { TrainingCategory } from '../lib/types';
import { QueryState } from './common';

export default function CategoryNavigation() {
  const categories = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: ({ signal }) =>
      get<TrainingCategory[]>('/public/categories', undefined, signal),
  });
  return (
    <nav className="category-tabs" aria-label="Danh mục đào tạo">
      <QueryState
        pending={categories.isPending}
        error={categories.error}
        retry={() => void categories.refetch()}
      >
        {categories.data?.map((category) => (
          <NavLink
            key={category.code}
            end={category.code === 'general'}
            to={category.code === 'general' ? '/' : '/specialized'}
            className={({ isActive }) =>
              `category-tab ${isActive ? 'selected' : ''}`
            }
          >
            {category.code === 'general' ? (
              <BookOutlined aria-hidden="true" />
            ) : (
              <CodeOutlined aria-hidden="true" />
            )}
            <span>{category.name}</span>
          </NavLink>
        ))}
      </QueryState>
    </nav>
  );
}
