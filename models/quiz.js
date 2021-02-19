const mongoose = require("mongoose");

const quizSchema = mongoose.Schema({
  _id: mongoose.Types.ObjectId,
  name: { type: String, required: true },
  quizQuestions: { type: [mongoose.Types.ObjectId], ref: "Question", required: true, },
  players: { type: [{user: mongoose.Types.ObjectId, result: [{question:String,answer:String,points:Number}]}], ref: "User", },
  startTime: { type: Date, required: true, default: new Date() },
});

module.exports = mongoose.model("Quiz", quizSchema);
