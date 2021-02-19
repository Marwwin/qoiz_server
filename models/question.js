const mongoose = require('mongoose');

const questionSchema = mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    question: { type: String, required: true },
    correctAnswers: { type: [String], required: true },
    questionValue: { type: Number, required: true },
    answerTime: { type: Number, required: true, default: 10 },
    used: { type: Boolean, required: true, default: false },
    category: { type: String, required: true, default: "General" }

});

module.exports = mongoose.model('Question', questionSchema);