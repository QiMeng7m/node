import { Spin, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { listAdminFeatures } from '../../api/admin'
import type { FeatureAdmin } from '../../api/types'
import { AdminPageHeader } from '../../components/layout/AdminLayout'

export default function AdminFeaturesPage() {
  const [items, setItems] = useState<FeatureAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listAdminFeatures())
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
      <AdminPageHeader title="🎀 Feature 管理" desc="场景模板与 system prompt 配置" />
      <div className="admin-card">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={false}
          locale={{ emptyText: '暂无 Feature 配置' }}
          columns={[
            {
              title: '场景',
              render: (_, r) => `${r.icon ?? '🎀'} ${r.name}`,
            },
            { title: 'ID', dataIndex: 'id' },
            { title: '分类', dataIndex: 'category' },
            {
              title: '模型策略',
              dataIndex: 'modelPolicy',
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (v: boolean) => (v ? '启用' : '停用'),
            },
          ]}
        />
      </div>
    </section>
  )
}
