import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'
import { SECTION_CARD_STYLE } from '../utils/policy'

interface PolicySectionCardProps {
  title: string
  description?: string
  children: ReactNode
  loading?: boolean
}

export default function PolicySectionCard({
  title,
  description,
  children,
  loading,
}: PolicySectionCardProps) {
  return (
    <Card
      title={title}
      loading={loading}
      style={SECTION_CARD_STYLE}
      styles={{ header: { borderBottom: '1px solid #e6f0ff' } }}
    >
      {description && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {description}
        </Typography.Paragraph>
      )}
      {children}
    </Card>
  )
}
