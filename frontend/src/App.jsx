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
  let data = null

  if (response.status !== 204) {
    data = await response.json()
  }

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

function calculateSummary(transactions) {
  let income = 0
  let expense = 0

  transactions.forEach(function addTransaction(transaction) {
    if (transaction.type === 'income') {
      income += transaction.amountCents
    } else {
      expense += transaction.amountCents
    }
  })

  return {
    income: income,
    expense: expense,
    balance: income - expense,
  }
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
  const [editingTransactionId, setEditingTransactionId] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([])

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
    setEditingTransactionId('')
    setTransactionForm(createEmptyTransactionForm())
    setSelectedTransactionIds([])
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

  function changeTypeFilter(event) {
    setTypeFilter(event.target.value)
  }

  function changeCategoryFilter(event) {
    setCategoryFilter(event.target.value)
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

    let requestPath = '/api/transactions'
    let requestMethod = 'POST'

    if (editingTransactionId) {
      requestPath += '/' + editingTransactionId
      requestMethod = 'PATCH'
    }

    try {
      await apiRequest(requestPath, {
        method: requestMethod,
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify(requestBody),
      })

      await reloadClientData()
      setTransactionForm(createEmptyTransactionForm())
      setEditingTransactionId('')

      if (requestMethod === 'POST') {
        setMessage('Operacija sėkmingai sukurta.')
      } else {
        setMessage('Operacija sėkmingai atnaujinta.')
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function startEditingTransaction(event) {
    const transactionId = event.currentTarget.dataset.transactionId
    const transaction = transactions.find(function findTransaction(item) {
      return item.id === transactionId
    })

    if (!transaction) {
      return
    }

    setEditingTransactionId(transaction.id)
    setTransactionForm({
      type: transaction.type,
      amount: (transaction.amountCents / 100).toFixed(2),
      category: transaction.category,
      description: transaction.description || '',
      date: transaction.date.slice(0, 10),
    })
    setMessage('Redaguojama pasirinkta operacija.')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditingTransaction() {
    setEditingTransactionId('')
    setTransactionForm(createEmptyTransactionForm())
    setMessage('')
  }

  async function removeTransaction(event) {
    const transactionId = event.currentTarget.dataset.transactionId
    const confirmed = window.confirm(
      'Ar tikrai norite ištrinti šią operaciją?',
    )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest('/api/transactions/' + transactionId, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientId,
        },
      })

      await reloadClientData()
      setSelectedTransactionIds(function removeDeletedId(currentIds) {
        return currentIds.filter(function keepId(currentId) {
          return currentId !== transactionId
        })
      })
      setMessage('Operacija ištrinta.')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function toggleTransactionSelection(event) {
    const transactionId = event.currentTarget.dataset.transactionId

    setSelectedTransactionIds(function updateSelection(currentIds) {
      if (currentIds.includes(transactionId)) {
        return currentIds.filter(function removeId(currentId) {
          return currentId !== transactionId
        })
      }

      return currentIds.concat(transactionId)
    })
  }

  function toggleAllVisibleTransactions() {
    const visibleIds = visibleTransactions.map(
      function getTransactionId(transaction) {
        return transaction.id
      },
    )
    const allVisibleSelected = visibleIds.length > 0 &&
      visibleIds.every(function checkSelected(transactionId) {
        return selectedTransactionIds.includes(transactionId)
      })

    setSelectedTransactionIds(function updateSelection(currentIds) {
      if (allVisibleSelected) {
        return currentIds.filter(function keepHiddenId(transactionId) {
          return !visibleIds.includes(transactionId)
        })
      }

      return Array.from(new Set(currentIds.concat(visibleIds)))
    })
  }

  async function removeSelectedTransactions() {
    const selectedCount = selectedTransactionIds.length
    const confirmed = window.confirm(
      'Ar tikrai norite ištrinti pažymėtas operacijas: ' +
      selectedCount + '?',
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await apiRequest('/api/transactions/bulk', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify({
          transactionIds: selectedTransactionIds,
        }),
      })

      await reloadClientData()
      setSelectedTransactionIds([])
      setMessage(
        'Ištrinta operacijų: ' + result.deletedCount + '.',
      )
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeRuleTransactions(event) {
    const ruleId = event.currentTarget.dataset.ruleId
    const confirmed = window.confirm(
      'Ar tikrai norite ištrinti visas šios taisyklės operacijas?',
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await apiRequest(
        '/api/recurring-rules/' + ruleId + '/transactions',
        {
          method: 'DELETE',
          headers: {
            'x-client-id': clientId,
          },
        },
      )

      await reloadClientData()
      setSelectedTransactionIds([])
      setMessage(
        'Ištrinta taisyklės operacijų: ' + result.deletedCount + '.',
      )
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeRecurringRule(event) {
    const ruleId = event.currentTarget.dataset.ruleId
    const confirmed = window.confirm(
      'Ar tikrai norite pašalinti šią periodinę taisyklę? ' +
      'Jau sukurtos operacijos liks istorijoje.',
    )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest('/api/recurring-rules/' + ruleId, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientId,
        },
      })

      await reloadClientData()
      setMessage('Periodinė taisyklė pašalinta.')
      setError('')
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
        <td>
          <div className="row-actions">
            <button
              className="text-button danger-button"
              type="button"
              data-rule-id={rule.id}
              onClick={removeRuleTransactions}
            >
              Trinti operacijas
            </button>
            <button
              className="text-button danger-button"
              type="button"
              data-rule-id={rule.id}
              onClick={removeRecurringRule}
            >
              Trinti taisyklę
            </button>
          </div>
        </td>
      </tr>
    )
  }

  function renderTransactionRow(transaction) {
    const transactionDate = transaction.date.slice(0, 10)
    let transactionType = 'Pajamos'
    let description = transaction.description

    if (transaction.type === 'expense') {
      transactionType = 'Išlaidos'
    }

    if (!description) {
      description = '-'
    }

    return (
      <tr key={transaction.id}>
        <td>
          <input
            className="selection-checkbox"
            type="checkbox"
            aria-label="Pažymėti operaciją"
            data-transaction-id={transaction.id}
            checked={selectedTransactionIds.includes(transaction.id)}
            onChange={toggleTransactionSelection}
          />
        </td>
        <td>{transactionDate}</td>
        <td>{transactionType}</td>
        <td>{transaction.category}</td>
        <td>{description}</td>
        <td>{formatMoney(transaction.amountCents)}</td>
        <td>
          <div className="row-actions">
            <button
              className="text-button"
              type="button"
              data-transaction-id={transaction.id}
              onClick={startEditingTransaction}
            >
              Redaguoti
            </button>
            <button
              className="text-button danger-button"
              type="button"
              data-transaction-id={transaction.id}
              onClick={removeTransaction}
            >
              Trinti
            </button>
          </div>
        </td>
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
              <th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>{rules.map(renderRuleRow)}</tbody>
        </table>
      </div>
    )
  }

  const summary = calculateSummary(transactions)
  const visibleTransactions = transactions.filter(
    function filterTransaction(transaction) {
      const matchesType = typeFilter === 'all' ||
        transaction.type === typeFilter
      const normalizedCategory = transaction.category.toLowerCase()
      const normalizedFilter = categoryFilter.toLowerCase()
      const matchesCategory = normalizedCategory.includes(normalizedFilter)

      return matchesType && matchesCategory
    },
  )
  const allVisibleSelected = visibleTransactions.length > 0 &&
    visibleTransactions.every(function checkSelected(transaction) {
      return selectedTransactionIds.includes(transaction.id)
    })

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

      <div className="summary-grid">
        <article className="summary-card income-card">
          <span>Pajamos</span>
          <strong>{formatMoney(summary.income)}</strong>
        </article>
        <article className="summary-card expense-card">
          <span>Išlaidos</span>
          <strong>{formatMoney(summary.expense)}</strong>
        </article>
        <article className="summary-card balance-card">
          <span>Balansas</span>
          <strong>{formatMoney(summary.balance)}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Kasdienės operacijos</p>
            <h2>
              {editingTransactionId
                ? 'Redaguoti operaciją'
                : 'Nauja operacija'}
            </h2>
          </div>
          {editingTransactionId && (
            <button
              className="secondary-button"
              type="button"
              onClick={cancelEditingTransaction}
            >
              Atšaukti redagavimą
            </button>
          )}
        </div>

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
            {editingTransactionId ? 'Išsaugoti' : 'Pridėti operaciją'}
          </button>
        </form>
      </section>

      <section className="panel">
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

      <section className="panel">
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Istorija</p>
            <h2>Operacijos</h2>
            <p>
              Rodoma {visibleTransactions.length} iš {transactions.length}
            </p>
          </div>
          <div className="filters">
            <select
              aria-label="Filtruoti pagal tipą"
              value={typeFilter}
              onChange={changeTypeFilter}
            >
              <option value="all">Visi tipai</option>
              <option value="income">Pajamos</option>
              <option value="expense">Išlaidos</option>
            </select>
            <input
              aria-label="Filtruoti pagal kategoriją"
              placeholder="Ieškoti kategorijos"
              value={categoryFilter}
              onChange={changeCategoryFilter}
            />
          </div>
        </div>

        <div className="table-wrap">
          {selectedTransactionIds.length > 0 && (
            <div className="bulk-actions">
              <strong>
                Pažymėta: {selectedTransactionIds.length}
              </strong>
              <button
                className="danger-action-button"
                type="button"
                onClick={removeSelectedTransactions}
              >
                Ištrinti pažymėtas
              </button>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>
                  <input
                    className="selection-checkbox"
                    type="checkbox"
                    aria-label="Pažymėti visas matomas operacijas"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleTransactions}
                  />
                </th>
                <th>Data</th>
                <th>Tipas</th>
                <th>Kategorija</th>
                <th>Aprašymas</th>
                <th>Suma</th>
                <th>Veiksmai</th>
              </tr>
            </thead>

            <tbody>
              {visibleTransactions.map(renderTransactionRow)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
