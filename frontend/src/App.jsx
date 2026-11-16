import { useEffect, useState } from 'react'
import './App.css'

const initialForm = {
  type: 'expense',
  amount: '19.99',
  category: 'Prenumeratos',
  description: 'Mėnesinė prenumerata',
  frequency: 'monthly',
  startDate: '2026-11-01',
  endDate: '',
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Užklausa nepavyko')
  }

  return data
}

function formatMoney(amountCents) {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountCents / 100)
}

function App() {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [rules, setRules] = useState([])
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(initialForm)
  const [throughDate, setThroughDate] = useState('2026-11-30')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/clients')
      .then(({ clients: loadedClients }) => {
        setClients(loadedClients)
        setClientId(loadedClients[0]?.id || '')
      })
      .catch((requestError) => setError(requestError.message))
  }, [])

  useEffect(() => {
    if (!clientId) return

    const headers = { 'x-client-id': clientId }

    Promise.all([
      apiRequest('/api/recurring-rules', { headers }),
      apiRequest('/api/transactions', { headers }),
    ])
      .then(([rulesData, transactionsData]) => {
        setRules(rulesData.recurringRules)
        setTransactions(transactionsData.transactions)
        setError('')
      })
      .catch((requestError) => setError(requestError.message))
  }, [clientId])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function reloadClientData() {
    const headers = { 'x-client-id': clientId }
    const [rulesData, transactionsData] = await Promise.all([
      apiRequest('/api/recurring-rules', { headers }),
      apiRequest('/api/transactions', { headers }),
    ])

    setRules(rulesData.recurringRules)
    setTransactions(transactionsData.transactions)
  }

  async function submitRule(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const amountCents = Math.round(Number(form.amount) * 100)
      const body = {
        ...form,
        amountCents,
        endDate: form.endDate || null,
      }

      delete body.amount

      await apiRequest('/api/recurring-rules', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify(body),
      })
      await reloadClientData()
      setMessage('Periodinė taisyklė sukurta.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function generateTransactions() {
    setError('')
    setMessage('')

    try {
      const result = await apiRequest('/api/recurring-rules/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify({ throughDate }),
      })

      await reloadClientData()
      setMessage(
        `Sukurta operacijų: ${result.generatedTransactions.length}. ` +
        `Praleista dublikatų: ${result.skippedDuplicates}.`,
      )
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main>
      <header>
        <div>
          <h1>Budget Tracker</h1>
          <p>Pasikartojančių operacijų prototipas</p>
        </div>
        <label>
          Aktyvus klientas
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
      </header>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section>
        <h2>Nauja periodinė taisyklė</h2>
        <form onSubmit={submitRule}>
          <label>
            Tipas
            <select name="type" value={form.type} onChange={updateForm}>
              <option value="expense">Išlaidos</option>
              <option value="income">Pajamos</option>
            </select>
          </label>
          <label>
            Suma (EUR)
            <input name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={updateForm} />
          </label>
          <label>
            Kategorija
            <input name="category" required value={form.category} onChange={updateForm} />
          </label>
          <label>
            Aprašymas
            <input name="description" value={form.description} onChange={updateForm} />
          </label>
          <label>
            Dažnis
            <select name="frequency" value={form.frequency} onChange={updateForm}>
              <option value="weekly">Kas savaitę</option>
              <option value="monthly">Kas mėnesį</option>
              <option value="yearly">Kas metus</option>
            </select>
          </label>
          <label>
            Pradžios data
            <input name="startDate" type="date" required value={form.startDate} onChange={updateForm} />
          </label>
          <label>
            Pabaigos data (nebūtina)
            <input name="endDate" type="date" value={form.endDate} onChange={updateForm} />
          </label>
          <button type="submit" disabled={!clientId}>Sukurti taisyklę</button>
        </form>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <h2>Periodinės taisyklės</h2>
            <p>Generuokite visas operacijas iki pasirinktos datos.</p>
          </div>
          <div className="generate-controls">
            <input aria-label="Generuoti iki datos" type="date" value={throughDate} onChange={(event) => setThroughDate(event.target.value)} />
            <button type="button" onClick={generateTransactions} disabled={!clientId}>Generuoti</button>
          </div>
        </div>
        {rules.length === 0 ? (
          <p className="empty">Šis klientas dar neturi periodinių taisyklių.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kategorija</th><th>Suma</th><th>Dažnis</th><th>Kita data</th></tr></thead>
              <tbody>{rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.category}</td>
                  <td>{formatMoney(rule.amountCents)}</td>
                  <td>{rule.frequency}</td>
                  <td>{rule.nextOccurrenceDate}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Operacijos</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Tipas</th><th>Kategorija</th><th>Aprašymas</th><th>Suma</th></tr></thead>
            <tbody>{transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.occurrenceDate || transaction.date.slice(0, 10)}</td>
                <td>{transaction.type === 'expense' ? 'Išlaidos' : 'Pajamos'}</td>
                <td>{transaction.category}</td>
                <td>{transaction.description || '—'}</td>
                <td>{formatMoney(transaction.amountCents)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
