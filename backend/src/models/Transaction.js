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
        recurringRuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RecurringRule',
            default: null,
        },
        occurrenceDate: {
            type: String,
            default: null,
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

transactionSchema.index(
    {
        clientId: 1,
        recurringRuleId: 1,
        occurrenceDate: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            recurringRuleId: { $type: 'objectId' },
        },
    },
)

export const Transaction = mongoose.model(
    'Transaction',
    transactionSchema,
)
