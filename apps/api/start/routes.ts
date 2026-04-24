import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return { name: 'umbra-api', version: '0.0.1' }
})

// API v1 routes
import './routes/v1.ts'
