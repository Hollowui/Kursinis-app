import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (request, response) => {
    response.json({
        status: 'ok',
        message: 'Budget Tracker API veikia',
    })
})

app.listen(PORT, () => {
    console.log(`Serveris veikia adresu http://localhost:${PORT}`)
})