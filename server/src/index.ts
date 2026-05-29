import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import router from './routes/index.js'

const app = express()
const PORT = process.env.PORT ?? 3000

const allowedOrigins = [
  process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  process.env.CLIENT_URL ?? 'http://localhost:5173',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
})

if (!process.env.DISABLE_RATE_LIMIT) {
  app.use('/api/auth/sign-in', signInLimiter)
}

// Auth handler must be mounted before express.json()
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.use('/api', router)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
