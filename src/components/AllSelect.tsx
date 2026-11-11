import { Select } from 'antd';
import type { SelectProps } from 'antd';

type Props = Omit<SelectProps<string>, 'mode' | 'onChange'> & {
  allLabel: string;
  onChange: (value?: string) => void;
};

export default function AllSelect({
  allLabel,
  options,
  value,
  onChange,
  ...props
}: Props) {
  return (
    <Select
      {...props}
      allowClear={false}
      placeholder={allLabel}
      value={value ?? 'all'}
      options={[
        { value: 'all', label: allLabel },
        ...(options ?? []).filter(
          (option) => option.value != null && option.value !== 'all',
        ),
      ]}
      onChange={(next) => onChange(next === 'all' ? undefined : next)}
    />
  );
}
