import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { UPLOAD_ROOT } from './lib/attachments.js'
import { assertEnv } from './lib/env.js'
import { apiRouter } from './routes/api.js'
assertEnv()

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOAD_ROOT))
app.use('/api', apiRouter)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
