import { Spin, Table, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { listAdminModels } from '../../api/admin'
import type { ModelAdmin } from '../../api/types'
import { AdminPageHeader } from '../../components/layout/AdminLayout'

export default function AdminModelsPage() {
  const [items, setItems] = useState<ModelAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listAdminModels())
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
      <AdminPageHeader title="🤖 模型管理" desc="配置对外展示的模型列表" />
      <div className="admin-card">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={false}
          locale={{ emptyText: '暂无模型配置' }}
          columns={[
            { title: '显示名', dataIndex: 'label' },
            { title: 'Model ID', dataIndex: 'modelId' },
            {
              title: '标签',
              dataIndex: 'tags',
              render: (tags: string[]) => tags.map((t) => <Tag key={t}>{t}</Tag>),
            },
            {
              title: 'Vision',
              dataIndex: 'supportsVision',
              render: (v: boolean) => (v ? '是' : '否'),
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
