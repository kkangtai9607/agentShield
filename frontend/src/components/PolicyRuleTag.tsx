import { Tag } from 'antd'

interface PolicyRuleTagProps {
  children: string
  color?: string
  mono?: boolean
  icon?: string
}

export default function PolicyRuleTag({ children, color, mono, icon }: PolicyRuleTagProps) {
  return (
    <Tag
      color={color}
      style={{
        marginBottom: 8,
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? 12 : undefined,
      }}
    >
      {icon ? `${icon} ` : ''}{children}
    </Tag>
  )
}
