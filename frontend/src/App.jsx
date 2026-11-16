import { useEffect, useState } from 'react'
import './App.css'

const initialRecurringForm = {
  type: 'expense',
  amount: '19.99',
  category: 'Prenumeratos',
  description: 'Mėnesinė prenumerata',
  frequency: 'monthly',
  startDate: '2026-11-01',
  endDate: '',
}

function createEmptyTransactionForm() {
  return {
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

async function apiRequest(path, options) {
  const requestOptions = options || {}
  const response = await fetch(path, requestOptions)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Užklausa nepavyko')
  }

  return data
}

function formatMoney(amountCents) {
  const formatter = new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
  })

  return formatter.format(amountCents / 100)
}

function App() {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [rules, setRules] = useState([])
  const [transactions, setTransactions] = useState([])
  const [recurringForm, setRecurringForm] = useState(initialRecurringForm)
  const [transactionForm, setTransactionForm] = useState(
    createEmptyTransactionForm(),
  )
  const [throughDate, setThroughDate] = useState('2026-11-30')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(function loadClients() {
    apiRequest('/api/clients')
      .then(function saveClients(data) {
        setClients(data.clients)

        if (data.clients.length > 0) {
          setClientId(data.clients[0].id)
        }
      })
      .catch(function showError(requestError) {
        setError(requestError.message)
      })
  }, [])

  useEffect(function loadSelectedClientData() {
    if (!clientId) {
      return
    }

    const headers = {
      'x-client-id': clientId,
    }

    Promise.all([
      apiRequest('/api/recurring-rules', { headers: headers }),
      apiRequest('/api/transactions', { headers: headers }),
    ])
      .then(function saveClientData(responses) {
        const rulesData = responses[0]
        const transactionsData = responses[1]

        setRules(rulesData.recurringRules)
        setTransactions(transactionsData.transactions)
        setError('')
      })
      .catch(function showError(requestError) {
        setError(requestError.message)
      })
  }, [clientId])

  function changeClient(event) {
    setClientId(event.target.value)
    setMessage('')
    setError('')
  }

  function changeRecurringForm(event) {
    const fieldName = event.target.name
    const fieldValue = event.target.value

    setRecurringForm(function updateCurrentForm(currentForm) {
      return {
        ...currentForm,
        [fieldName]: fieldValue,
      }
    })
  }

  function changeTransactionForm(event) {
    const fieldName = event.target.name
    const fieldValue = event.target.value

    setTransactionForm(function updateCurrentForm(currentForm) {
      return {
        ...currentForm,
        [fieldName]: fieldValue,
      }
    })
  }

  function changeThroughDate(event) {
    setThroughDate(event.target.value)
  }

  async function reloadClientData() {
    const headers = {
      'x-client-id': clientId,
    }

    const responses = await Promise.all([
      apiRequest('/api/recurring-rules', { headers: headers }),
      apiRequest('/api/transactions', { headers: headers }),
    ])

    const rulesData = responses[0]
    const transactionsData = responses[1]

    setRules(rulesData.recurringRules)
    setTransactions(transactionsData.transactions)
  }

  async function submitTransaction(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const amountCents = Math.round(
      Number(transactionForm.amount) * 100,
    )

    const requestBody = {
      type: transactionForm.type,
      amountCents: amountCents,
      category: transactionForm.category,
      description: transactionForm.description,
      date: transactionForm.date,
    }

    try {
      await apiRequest('/api/transactions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify(requestBody),
      })

      await reloadClientData()
      setTransactionForm(createEmptyTransactionForm())
      setMessage('Operacija sėkmingai sukurta.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function submitRecurringRule(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const amountCents = Math.round(
      Number(recurringForm.amount) * 100,
    )

    const requestBody = {
      type: recurringForm.type,
      amountCents: amountCents,
      category: recurringForm.category,
      description: recurringForm.description,
      frequency: recurringForm.frequency,
      startDate: recurringForm.startDate,
      endDate: recurringForm.endDate || null,
    }

    try {
      await apiRequest('/api/recurring-rules', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify(requestBody),
      })

      await reloadClientData()
      setMessage('Periodinė taisyklė sukurta.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function generateTransactions() {
    setMessage('')
    setError('')

    try {
      const result = await apiRequest(
        '/api/recurring-rules/generate',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-client-id': clientId,
          },
          body: JSON.stringify({
            throughDate: throughDate,
          }),
        },
      )

      await reloadClientData()

      const generatedCount = result.generatedTransactions.length
      const duplicateCount = result.skippedDuplicates
      const resultMessage =
        'Sukurta operacijų: ' + generatedCount + '. ' +
        'Praleista dublikatų: ' + duplicateCount + '.'

      setMessage(resultMessage)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function renderClientOption(client) {
    return (
      <option key={client.id} value={client.id}>
        {client.name}
      </option>
    )
  }

  function renderRuleRow(rule) {
    return (
      <tr key={rule.id}>
        <td>{rule.category}</td>
        <td>{formatMoney(rule.amountCents)}</td>
        <td>{rule.frequency}</td>
        <td>{rule.nextOccurrenceDate}</td>
      </tr>
    )
  }

  function renderTransactionRow(transaction) {
    let transactionDate = transaction.date.slice(0, 10)
    let transactionType = 'Pajamos'
    let description = transaction.description

    if (transaction.occurrenceDate) {
      transactionDate = transaction.occurrenceDate
    }

    if (transaction.type === 'expense') {
      transactionType = 'Išlaidos'
    }

    if (!description) {
      description = '-'
    }

    return (
      <tr key={transaction.id}>
        <td>{transactionDate}</td>
        <td>{transactionType}</td>
        <td>{transaction.category}</td>
        <td>{description}</td>
        <td>{formatMoney(transaction.amountCents)}</td>
      </tr>
    )
  }

  function renderRules() {
    if (rules.length === 0) {
      return (
        <p className="empty">
          Šis klientas dar neturi periodinių taisyklių.
        </p>
      )
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kategorija</th>
              <th>Suma</th>
              <th>Dažnis</th>
              <th>Kita data</th>
            </tr>
          </thead>
          <tbody>{rules.map(renderRuleRow)}</tbody>
        </table>
      </div>
    )
  }

  return (
    <main>
      <header>
        <div>
          <h1>Budget Tracker</h1>
          <p>Asmeninių finansų ir periodinių operacijų prototipas</p>
        </div>

        <label>
          Aktyvus klientas
          <select value={clientId} onChange={changeClient}>
            {clients.map(renderClientOption)}
          </select>
        </label>
      </header>

      {message && (
        <p className="notice success">{message}</p>
      )}

      {error && (
        <p className="notice error">{error}</p>
      )}

      <section>
        <h2>Nauja operacija</h2>

        <form onSubmit={submitTransaction}>
          <label>
            Tipas
            <select
              name="type"
              value={transactionForm.type}
              onChange={changeTransactionForm}
            >
              <option value="expense">Išlaidos</option>
              <option value="income">Pajamos</option>
            </select>
          </label>

          <label>
            Suma (EUR)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={transactionForm.amount}
              onChange={changeTransactionForm}
            />
          </label>

          <label>
            Kategorija
            <input
              name="category"
              required
              value={transactionForm.category}
              onChange={changeTransactionForm}
            />
          </label>

          <label>
            Aprašymas
            <input
              name="description"
              value={transactionForm.description}
              onChange={changeTransactionForm}
            />
          </label>

          <label>
            Data
            <input
              name="date"
              type="date"
              required
              value={transactionForm.date}
              onChange={changeTransactionForm}
            />
          </label>

          <button type="submit" disabled={!clientId}>
            Pridėti operaciją
          </button>
        </form>
      </section>

      <section>
        <h2>Nauja periodinė taisyklė</h2>

        <form onSubmit={submitRecurringRule}>
          <label>
            Tipas
            <select
              name="type"
              value={recurringForm.type}
              onChange={changeRecurringForm}
            >
              <option value="expense">Išlaidos</option>
              <option value="income">Pajamos</option>
            </select>
          </label>

          <label>
            Suma (EUR)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={recurringForm.amount}
              onChange={changeRecurringForm}
            />
          </label>

          <label>
            Kategorija
            <input
              name="category"
              required
              value={recurringForm.category}
              onChange={changeRecurringForm}
            />
          </label>

          <label>
            Aprašymas
            <input
              name="description"
              value={recurringForm.description}
              onChange={changeRecurringForm}
            />
          </label>

          <label>
            Dažnis
            <select
              name="frequency"
              value={recurringForm.frequency}
              onChange={changeRecurringForm}
            >
              <option value="weekly">Kas savaitę</option>
              <option value="monthly">Kas mėnesį</option>
              <option value="yearly">Kas metus</option>
            </select>
          </label>

          <label>
            Pradžios data
            <input
              name="startDate"
              type="date"
              required
              value={recurringForm.startDate}
              onChange={changeRecurringForm}
            />
          </label>

          <label>
            Pabaigos data (nebūtina)
            <input
              name="endDate"
              type="date"
              value={recurringForm.endDate}
              onChange={changeRecurringForm}
            />
          </label>

          <button type="submit" disabled={!clientId}>
            Sukurti taisyklę
          </button>
        </form>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <h2>Periodinės taisyklės</h2>
            <p>Generuokite visas operacijas iki pasirinktos datos.</p>
          </div>

          <div className="generate-controls">
            <input
              aria-label="Generuoti iki datos"
              type="date"
              value={throughDate}
              onChange={changeThroughDate}
            />

            <button
              type="button"
              onClick={generateTransactions}
              disabled={!clientId}
            >
              Generuoti
            </button>
          </div>
        </div>

        {renderRules()}
      </section>

      <section>
        <h2>Operacijos</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipas</th>
                <th>Kategorija</th>
                <th>Aprašymas</th>
                <th>Suma</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map(renderTransactionRow)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
