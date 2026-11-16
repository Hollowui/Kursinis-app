import mongoose from 'mongoose'

const recurringRuleSchema = new mongoose.Schema(
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
        frequency: {
            type: String,
            enum: ['weekly', 'monthly', 'yearly'],
            required: true,
        },
        startDate: {
            type: String,
            required: true,
        },
        endDate: {
            type: String,
            default: null,
        },
        active: {
            type: Boolean,
            default: true,
        },
        nextOccurrenceDate: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
)

export const RecurringRule = mongoose.model(
    'RecurringRule',
    recurringRuleSchema,
)
