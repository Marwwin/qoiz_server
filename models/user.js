const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    username: { type: String, required: true },
    password: { type: String, required: true },
    allPoints: { type: Number, default: 0},
    allWins: { type: Number , default: 0},
    userType: {type: String, required: true, default: "quizzer"}
});

module.exports = mongoose.model('User', userSchema);