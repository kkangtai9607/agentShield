import { useState } from 'react'
import { Input, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

interface PolicyStringListEditorProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  tagColor?: string
  mono?: boolean
}

export default function PolicyStringListEditor({
  value,
  onChange,
  placeholder = '输入规则后回车添加',
  tagColor,
  mono,
}: PolicyStringListEditorProps) {
  const [input, setInput] = useState('')

  const addItem = () => {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  const removeItem = (item: string) => {
    onChange(value.filter((v) => v !== item))
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        {value.map((item) => (
          <Tag
            key={item}
            closable
            color={tagColor}
            style={mono ? { fontFamily: 'monospace' } : undefined}
            onClose={() => removeItem(item)}
          >
            {item}
          </Tag>
        ))}
        {value.length === 0 && (
          <Typography.Text type="secondary">暂无规则，请在下方添加</Typography.Text>
        )}
      </Space>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onPressEnter={addItem}
        placeholder={placeholder}
        suffix={
          <PlusOutlined
            style={{ cursor: 'pointer', color: '#1677ff' }}
            onClick={addItem}
          />
        }
      />
    </div>
  )
}
