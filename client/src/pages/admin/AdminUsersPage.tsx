import { Spin, Table } from 'antd'
import { useEffect, useState } from 'react'
import { listUsers } from '../../api/admin'
import type { UserAdmin } from '../../api/types'
import { AdminPageHeader } from '../../components/layout/AdminLayout'
import { useTheme } from '../../theme/ThemeProvider'

export default function AdminUsersPage() {
  const { meta } = useTheme()
  const [items, setItems] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listUsers())
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <Spin />

  return (
    <section>
      <AdminPageHeader title={`👥 ${meta.usersLabel}管理`} desc="账号、角色与每日配额" />
      <div className="admin-card">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={false}
          locale={{ emptyText: '暂无用户' }}
          columns={[
            { title: '邮箱', dataIndex: 'email' },
            { title: '角色', dataIndex: 'role' },
            { title: '每日配额', dataIndex: 'dailyQuota' },
            {
              title: '今日用量',
              dataIndex: 'todayUsage',
              render: (v?: number) => v ?? '—',
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (v: boolean) => (v ? '正常' : '停用'),
            },
          ]}
        />
      </div>
    </section>
  )
}
