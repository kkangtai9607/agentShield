import { Space, Tag, Typography } from 'antd'
import { CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons'
import { getPermTag } from '../utils/policy'
import { getToolLabel } from '../utils/displayMaps'
import { resolveRoleLabel } from '../utils/roleLabels'

type PermType = 'allow' | 'deny' | 'warn'

function tagForItem(item: { text: string; type: PermType }) {
  if (item.type === 'allow') {
    return (
      <Tag color="success" icon={<CheckOutlined />} style={{ marginBottom: 8 }}>
        {item.text}
      </Tag>
    )
  }
  if (item.type === 'deny') {
    return (
      <Tag color="error" icon={<CloseOutlined />} style={{ marginBottom: 8 }}>
        {item.text}
      </Tag>
    )
  }
  return (
    <Tag color="warning" icon={<WarningOutlined />} style={{ marginBottom: 8 }}>
      {item.text}
    </Tag>
  )
}

function permToType(perm: string | undefined): PermType {
  if (perm === 'allow') return 'allow'
  if (perm === 'deny') return 'deny'
  return 'warn'
}

interface RolePermissionCardProps {
  role: string
  rolePermissions?: Record<string, Record<string, string>>
}

export default function RolePermissionCard({ role, rolePermissions }: RolePermissionCardProps) {
  const perms = rolePermissions?.[role] ?? {}
  const items = Object.entries(perms).map(([tool, perm]) => ({
    text: `${getToolLabel(tool)}：${getPermTag(perm).text}`,
    type: permToType(perm),
  }))

  return (
    <div>
      <Typography.Text strong>
        当前身份权限（{resolveRoleLabel(role)}）
      </Typography.Text>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
        由当前场景策略包控制，JWT 身份不可伪造
      </Typography.Paragraph>
      <Space wrap size={[8, 8]}>
        {items.length > 0 ? (
          items.map((item) => <span key={item.text}>{tagForItem(item)}</span>)
        ) : (
          <Typography.Text type="secondary">暂无该身份的权限配置</Typography.Text>
        )}
      </Space>
    </div>
  )
}
