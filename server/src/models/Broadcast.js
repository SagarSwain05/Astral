import mongoose from 'mongoose';

// Admin-dispatched alert broadcast (e.g. simulated national "Red Alert")
const broadcastSchema = new mongoose.Schema(
    {
        level: {
            type: String,
            enum: ['info', 'warning', 'red'],
            default: 'red',
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        asteroidId: {
            type: String, // optional neo_reference_id this alert concerns
        },
        isSimulation: {
            type: Boolean,
            default: true,
        },
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        issuedByName: String,
        recipients: Number, // connected sockets at dispatch time
    },
    { timestamps: true }
);

broadcastSchema.index({ createdAt: -1 });

const Broadcast = mongoose.model('Broadcast', broadcastSchema);

export default Broadcast;
