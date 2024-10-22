const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  description: { type: String, required: true },
  eventDate: { type: Date, required: true }, // Store the event date
  eventTime: { type: String, required: true }, // Store the event time as a string
  createdAt: { type: Date, default: Date.now },
  registrants: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
});

const EventModel = mongoose.model('Event', eventSchema);
module.exports = { EventModel };
