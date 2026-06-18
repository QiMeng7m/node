import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.post.count()
  if (count > 0) return

  await prisma.post.createMany({
    data: [
      {
        title: '欢迎来到我的网站',
        summary: '这是我的第一篇文章，记录搭建这个站点的过程。',
        content: '',
        createdAt: new Date('2026-06-18'),
      },
      {
        title: '为什么选择 React + Node',
        summary: '前后端统一使用 JavaScript 生态，上手更快，迭代更灵活。',
        content: '',
        createdAt: new Date('2026-06-17'),
      },
    ],
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
