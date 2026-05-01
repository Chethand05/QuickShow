import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {type: String, required: true, ref: 'User', index: true},
    show: {type: String, required: true, ref: 'Show', index: true},
    amount: {type: Number, required: true},
    bookedSeats: {type: Array, required: true},
    isPaid: {type: Boolean,  default:false, index: true},
    paymentLink: {type: String},
},{timestamps: true })

// Add indexes for frequently queried fields
bookingSchema.index({ user: 1 });
bookingSchema.index({ show: 1 });
bookingSchema.index({ isPaid: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;