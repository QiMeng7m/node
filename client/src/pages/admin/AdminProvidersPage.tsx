import { Spin, Table } from 'antd'
import { useEffect, useState } from 'react'
import { listProviders } from '../../api/admin'
import type { ProviderAdmin } from '../../api/types'
import { AdminPageHeader } from '../../components/layout/AdminLayout'

export default function AdminProvidersPage() {
  const [items, setItems] = useState<ProviderAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listProviders())
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
      <AdminPageHeader
        title="🔌 Provider 管理"
        desc="添加 API 密钥，密钥只存在服务器里 🔐"
      />
      <div className="admin-card">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={false}
          locale={{ emptyText: '暂无 Provider，请在后端配置或添加' }}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '类型', dataIndex: 'type' },
            { title: 'Base URL', dataIndex: 'baseURL', ellipsis: true },
            { title: '密钥', dataIndex: 'apiKeyMasked' },
            {
              title: '状态',
              dataIndex: 'enabled',
              render: (v: boolean) => (v ? '✅ 启用' : '⏸ 停用'),
            },
          ]}
        />
      </div>
    </section>
  )
}
