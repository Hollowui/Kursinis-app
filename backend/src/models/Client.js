import mongoose from 'mongoose'

const clientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
)

export const Client = mongoose.model('Client', clientSchema)