const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// Jonny sa att man ska ha följande!!
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect(process.env.mongo);
// Port for server
const port = process.env.PORT || 3000;
app.use(cors());

// Normal server stuff routing etc.

app.use(morgan("dev"));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

const questionRoutes = require("./routes/questions");
const quizsRoutes = require("./routes/quizs");
const usersRoutes = require("./routes/users");

app.use("/questions", questionRoutes);
app.use("/quizs", quizsRoutes);
app.use("/users", usersRoutes);

app.use((req, res, next) => {
  const error = new Error("Requested resource not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  next;
  res.status(error.status || 500).json({
    status: error.status,
    error: error.message,
  });
});
//app.use(function(req, res, next) {
//  res.header("Access-Control-Allow-Origin", 'http://localhost:8080'); 
//  res.header("Access-Control-Allow-Credentials", true);
//  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//  res.header("Access-Control-Allow-Headers",
//'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json,Authorization');
//  next();
//});

const server = require("http").createServer(app);
const options = {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
};

const io = require("socket.io")(server, {});

let gamesList = new Map();
let clientList = [];

///////////////////////////////////////////////
// RANDOM ID GENERATOR //
//////////////////////////////////////////////
let guid = () => {
  let s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  //return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'
  return s4() + '-' + s4() + '-' + s4() + '-' + s4();
}

/////////////////////////////////////////////////////////////////
// THE CLASS FOR THE GAME OBJECT //
////////////////////////////////////////////////////////////////
function Game(players, quiz, id, admin) {
  this.id = id;
  this.players = players;
  this.quiz = quiz;
  this.currentQuestion = -1;
  this.recievedAnswers = 0;
  this.round = 0;
  this.gameAdmin = admin
}
Game.prototype.nextRound = function (answer) {
  if (this.currentQuestion >= 0) {
    this.players = answer;
  }
  return this.quiz.quizQuestions[this.currentQuestion++].question;
}
Game.prototype.getName = function () {
  return this.quiz.name
}
// THE PLAYER CLASS

function Player(name, id, socket) {
  this.name = name;
  this.id = id;
  this.socketID = socket.id;
  this.socket = socket;
  this.currentGame = "";
  this.answers = [],
    this.round = 0;
}

//////////////////////////////////
// SOCKETS AHEAD //
/////////////////////////////////

// When socket is connected
io.on("connect", (socket) => {

  socket.on("update-waiting-room",() =>{
   updateWaitingRoom();
 
  });

  // When new player joins put him in the waiting-room and add a Player object to clientList
  socket.on("newplayer", (data) => {
    console.log("new player")
    socket.join("waiting-room");
    clientList.push(new Player(data.name, data.id, socket));
    updateClientList();
  });
  socket.on("removeplayer", (data) => {
    console.log("remove player")
    socket.leave("waiting-room");
    clientList = clientList.filter((player) => player.socketID.toString() != socket.id.toString());
    updateClientList(socket.id);
  });

  // What happens when a round is over
  socket.on("roundFinished", (request) => {
    console.log(request.game)
    const currentGame = gamesList.get(request.game);
    const questions = currentGame.quiz.quizQuestions;
    const currentPlayer = currentGame.players.filter(x => x.id == request.playerID)[0]
    console.log("Game: " + currentGame.id + " round " + currentGame.round)
    // If it is not the starting round store the players answer
    if (currentPlayer.round > 0) {
      currentPlayer.answers.push(request.answer)
    }
    // If the questions run out the game is over
    // Send everyone their answers
    if (questions.length <= currentPlayer.round) {
      let data = [];
      for (q in questions) {
        data.push(questions[q].question + ": " + currentPlayer.answers[q]);
      }
      io.to(currentPlayer.socketID).emit("gameOver", data);
      io.to(currentGame.gameAdmin).emit("adminGameOver", {
        game: currentGame.id,
        questions: questions,
        player: currentPlayer.name,
        playerID: currentPlayer.id,
        socketID: currentPlayer.socketID,
        answers: currentPlayer.answers
      });
    }
    // If there are still answers left send the next one 
    else {
      console.log("New Round!!")
      console.log(questions)
      io.to(currentPlayer.socketID).emit("newRound", { question: questions[currentPlayer.round++].question, time: 15 });
    }
  })
  // When a user leaves the site
  socket.on("disconnect", (n) => {
    console.log("Disconnected ");
    console.log(socket.id.toString());
    // Filter the disconnected user from the clientList
    clientList = clientList.filter((player) => player.socketID.toString() != socket.id.toString());
    //console.log(clientList);
    updateClientList();
  });

  // If an admin sends a request
  socket.on("admin", (request) => {
    console.log(request.type);
    // If getWaitingRoom
    // Return the clientList without the socket, it will crash with the socket
    if (request.type == "getWaitingRoom") {
      console.log("sending waiting room")
      socket.emit("admin", clientList.map(p => {
        return {
          name: p.name,
          id: p.id
        }
      }));
      // For admin to send messages to players
    } else if (request.type == "sendMsg") {
      io.to(request.reciever).emit("private", request.message);
      // Start game. Create a new Game object.
    } else if (request.type == "startGame") {
      const tempGame = new Game(clientList, request.quiz, guid(), socket.id);
      gamesList.set(tempGame.id, tempGame);
      // Join all players to a Room with the gameID
      for (player of clientList) {
        player.socket.join(tempGame.id);
      }
      io.to(tempGame.id).emit("starting", { time: 10, gameID: tempGame.id });
    } else if (request.type == "closeGame") {
      console.log("Closing game")
      request.playerScore.forEach(player => {
        io.to(player.socketID).emit("gameResults", player)
      });

    }
  });
});
// This updates how many players are online to the players and also list of all players to admins
function updateClientList(sender) {
  const newList = clientList.map(p => {
    return {
      name: p.name,
      id: p.id
    }
  });
  
  io.to(sender).emit(
    "messageChannel", {
    "message": "Get Ready!! There are " + clientList.length + " players online",
    "list": newList
  });
  io.to("waiting-room").emit(
    "messageChannel", {
    "message": "Get Ready!! There are " + clientList.length + " players online",
    "list": newList
  });
  // need to remove the socket from the clientList so it wont crash
  updateWaitingRoom()
  // io.sockets broadcasts to all clients but only admins are on the admin channel
  io.sockets.emit("admin-waiting-room", newList);
}
function updateWaitingRoom(){
  const newList = clientList.map(p => {
    return {
      name: p.name,
      id: p.id
    }
  });
  io.emit("waiting-room",{
    "list": newList
  });
}

server.listen(port, (d) => { console.log("Server running on port" + port) });

module.exports = app;
