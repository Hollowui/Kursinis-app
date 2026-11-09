import { useEffect, useState } from 'react'
import './App.css'

function App() {
    const [apiStatus, setApiStatus] = useState('Tikrinamas API...')

    useEffect(() => {
        fetch('http://localhost:3000/api/health')
            .then((response) => {
                if (!response.ok) {
                    throw new Error('API atsakė su klaida')
                }

                return response.json()
            })
            .then((data) => setApiStatus(data.message))
            .catch(() => setApiStatus('API nepasiekiamas'))
    }, [])

    return (
        <main className="dashboard">
            <header className="header">
                <div>
                    <h1>Budget Tracker</h1>
                    <p>Asmeninių finansų valdymo sistema</p>
                </div>

                <span className="status">{apiStatus}</span>
            </header>

            <section>
                <h2>Mėnesio suvestinė</h2>

                <div className="cards">
                    <article className="card income">
                        <h3>Pajamos</h3>
                        <strong>0,00 €</strong>
                    </article>

                    <article className="card expense">
                        <h3>Išlaidos</h3>
                        <strong>0,00 €</strong>
                    </article>

                    <article className="card balance">
                        <h3>Balansas</h3>
                        <strong>0,00 €</strong>
                    </article>
                </div>
            </section>
        </main>
    )
}

export default App