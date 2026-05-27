import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import router from './routes/index.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CLIENT_URL ?? 'http://localhost:5173'
    if (!origin || origin === allowed || origin.startsWith('http://localhost:')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// Auth handler must be mounted before express.json()
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.use('/api', router)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
