import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['income', 'expense'],
            required: true,
        },
        amountCents: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: 'Suma turi būti sveikas centų skaičius',
            },
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    },
)

transactionSchema.index({
    clientId: 1,
    date: -1,
})

export const Transaction = mongoose.model(
    'Transaction',
    transactionSchema,
)