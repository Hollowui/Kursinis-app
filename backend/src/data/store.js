export const CLIENT_A_ID = '000000000000000000000001'
export const CLIENT_B_ID = '000000000000000000000002'

function createInitialTransactions() {
    return [
        {
            id: 'transaction-a-1',
            clientId: CLIENT_A_ID,
            type: 'expense',
            amountCents: 4500,
            category: 'Maistas',
            description: 'Parduotuvė',
            date: '2026-11-01T00:00:00.000Z',
        },
        {
            id: 'transaction-b-1',
            clientId: CLIENT_B_ID,
            type: 'expense',
            amountCents: 2500,
            category: 'Transportas',
            description: 'Kuras',
            date: '2026-11-02T00:00:00.000Z',
        },
    ]
}

export const store = {
    clients: [
        {
            id: CLIENT_A_ID,
            name: 'Klientas A',
        },
        {
            id: CLIENT_B_ID,
            name: 'Klientas B',
        },
    ],
    transactions: createInitialTransactions(),
    recurringRules: [],
}

export function resetStore() {
    store.transactions = createInitialTransactions()
    store.recurringRules = []
}
