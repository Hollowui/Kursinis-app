 import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    CLIENT_A_ID,
    CLIENT_B_ID,
} from './store.js'
import { Client } from '../models/Client.js'
import { Transaction } from '../models/Transaction.js'

const rootDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../..',
)

dotenv.config({
    path: resolve(rootDirectory, '.env'),
})

export function isDatabaseConnected() {
    return mongoose.connection.readyState === 1
}

export async function connectDatabase() {
    const databaseUri = process.env.MONGODB_URI

    if (!databaseUri) {
        console.warn(
            'MONGODB_URI nenustatytas. Duomenys bus laikomi atmintyje.',
        )
        return false
    }

    await mongoose.connect(databaseUri)
    console.log('Prisijungta prie MongoDB')

    return true
}

export async function seedDatabase() {
    if (!isDatabaseConnected()) {
        return
    }

    await Client.updateOne(
        { _id: CLIENT_A_ID },
        {
            $setOnInsert: {
                name: 'Klientas A',
                code: 'client-a',
            },
        },
        { upsert: true },
    )

    await Client.updateOne(
        { _id: CLIENT_B_ID },
        {
            $setOnInsert: {
                name: 'Klientas B',
                code: 'client-b',
            },
        },
        { upsert: true },
    )

    const transactionCount = await Transaction.countDocuments()

    if (transactionCount === 0) {
        await Transaction.create([
            {
                clientId: CLIENT_A_ID,
                type: 'expense',
                amountCents: 4500,
                category: 'Maistas',
                description: 'Parduotuvė',
                date: new Date('2026-11-01'),
            },
            {
                clientId: CLIENT_B_ID,
                type: 'expense',
                amountCents: 2500,
                category: 'Transportas',
                description: 'Kuras',
                date: new Date('2026-11-02'),
            },
        ])
    }
}
