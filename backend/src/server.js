import { app } from './app.js'
import {
    connectDatabase,
    seedDatabase,
} from './data/database.js'

const PORT = 3000

async function startServer() {
    try {
        await connectDatabase()
        await seedDatabase()

        app.listen(PORT, function serverStarted() {
            console.log(
                'Serveris veikia adresu http://localhost:' + PORT,
            )
        })
    } catch (error) {
        console.error('Nepavyko paleisti serverio:', error.message)
        process.exit(1)
    }
}

startServer()
