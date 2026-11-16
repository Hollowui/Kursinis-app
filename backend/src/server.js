import { app } from './app.js'

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Serveris veikia adresu http://localhost:${PORT}`)
})
