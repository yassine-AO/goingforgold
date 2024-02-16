//Import dependencies
const path = require('path');
const http = require('http');
const express = require('express');
const {instrument} = require("@socket.io/admin-ui")
const socketIO = require('socket.io');




//Import classes
const {LiveGames} = require('./utils/liveGames');
const {Players} = require('./utils/players');

const publicPath = path.join(__dirname, '../public');
var app = express();
var server = http.createServer(app);

var io = require('socket.io')(server, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});

var games = new LiveGames();
var players = new Players();

//Mongodb setup
var MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var url = "mongodb://localhost:27017";

var createdGame;
var playerCounter = 0;
var totalPlayerPerc = 0; 
var tenPassed = false;
var twentyPassed = false;
var thirtyPassed = false;    
var finalRoundhere = false;

app.use(express.static(publicPath));

//Starting server on port 3000
server.listen(3000, () => {   
    console.log("Server started on port 3000");
});    

instrument(io, {auth: false})


//When a connection to server is made from client
io.on('connection', (socket) => {
    
    //When host connects for the first time
    socket.on('host-join', (data) =>{ 
        
        //Check to see if id passed in url corresponds to id of kahoot game in database
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("kahootDB");
            var query = { id:  parseInt(data.id)};
            dbo.collection('kahootGames').find(query).toArray(function(err, result){
                if(err) throw err;
                
                //A kahoot was found with the id passed in url 
                if(result[0] !== undefined){
                    var gamePin = Math.floor(Math.random()*90000) + 10000; //new pin for game

                    games.addGame(gamePin, socket.id, false, {playersAnswered: 0, questionLive: false, gameid: data.id, question: 1}); //Creates a game with pin and host id

                    var game = games.getGame(socket.id); //Gets the game data

                    socket.join(game.pin);//The host is joining a room based on the pin

                    console.log('Game Started with pin:', game.pin); 

                    createdGame = game.pin
                }else{
                    socket.emit('noGameFound');
                }
                db.close();
            });
        });
        
    });
    
    //When the host connects from the game view
    socket.on('host-join-game', (data) => {
        var oldHostId = data.id;
        var game = games.getGame(oldHostId);//Gets game with old host id

        if(game){
            game.hostId = socket.id;//Changes the game host id to new host id
            socket.join(game.pin);
            var playerData = players.getPlayers(oldHostId);//Gets player in game
            for(var i = 0; i < Object.keys(players.players).length; i++){
                if(players.players[i].hostId == oldHostId){
                    players.players[i].hostId = socket.id;
                }
            }
            var gameid = game.gameData['gameid'];
            MongoClient.connect(url, function(err, db){
                if (err) throw err;
    
                var dbo = db.db('kahootDB');
                var query = { id:  parseInt(gameid)};
                dbo.collection("kahootGames").find(query).toArray(function(err, res) {
                    if (err) throw err;
                    
                    var question = res[0].questions[0].question;
                    var answer1 = res[0].questions[0].answers[0];
                    var answer2 = res[0].questions[0].answers[1];
                    var answer3 = res[0].questions[0].answers[2];
                    var answer4 = res[0].questions[0].answers[3];
                    var correctAnswer = res[0].questions[0].correct;
                    
                    socket.emit('gameQuestions', {
                        q1: question,
                        a1: answer1,
                        a2: answer2,
                        a3: answer3,
                        a4: answer4,
                        correct: correctAnswer,
                        playersInGame: playerData.length
                    });
                    db.close();
                });
            });
            
            
            io.to(game.pin).emit('gameStartedPlayer');
            game.gameData.questionLive = true;
        }else{
            socket.emit('noGameFound');//No game was found, redirect user
        }
    });
    
    //When player connects for the first time
    socket.on('player-join', (params) => {

        var gameFound = false; //If a game is found with pin provided by player

        

        MongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
            if (err) {
                console.error('Database connection error', err);
                return;
            }
    
            var dbo = client.db('kahootDB');
           
            dbo.collection('Users').findOne({ id: parseInt(params.pin) }, function(err, user) {
                if (err) {
                    console.error('Error fetching user', err);
                    client.close();
                    return;
                }
                
                if (user) {
               
                    let Name = user.name;

                    //For each game in the Games class
                    for(var i = 0; i < games.games.length; i++){
                        //If the pin is equal to one of the game's pin


                            let sumplayers = players.getPlayerbyID(params.pin)

                            if (sumplayers){
                                socket.emit('noGameFound'); //check if player already logged in 
                            }

                            var gameLiveNow = games.getGameByPin(createdGame); //Get the game live staus based on gamePin
                            console.log("game live staus : ", gameLiveNow.gameLive);

                            if(gameLiveNow.gameLive){
                                socket.emit('noGameFound'); //check if the game already started
                            }

                            console.log('Player connected to game');
                            
                            var hostId = games.games[i].hostId; //Get the id of host of game
                            
                            players.addPlayer(hostId, socket.id, Name, {score: 0, answer: 0}, params.pin); //add player to game

                            playerCounter++;
                            socket.join(createdGame); //Player is joining room based on pin

                            var playersList = players.getPlayers(hostId); //Getting all players in game
                            var playersData = {
                                    players: playersList,
                                    playerCounter: playerCounter
                                };
                                                        
                            io.to(createdGame).emit('updatePlayerLobby', playersData);//Sending host player data to display
                            
                            totalPlayerPerc = Math.floor(playerCounter * 0.2); 
                            console.log('total jdid howaa', totalPlayerPerc, "num dial players ", playerCounter);
                            gameFound = true; //Game has been found
                    }       
                } else {
                    console.log('No user found with the given pin');    
                    socket.emit('noGameFound');//Player is sent back to 'join' page because game was not found with pin
                } 
            });
        });
    });
    


    //When the player connects from game view
    socket.on('player-join-game', (data) => {
        var player = players.getPlayer(data.id);
        if(player){
            var game = games.getGame(player.hostId);
            socket.join(game.pin);
            player.playerId = socket.id;//Update player id with socket id
            
            var playerData = players.getPlayers(game.hostId);
            socket.emit('playerGameData', playerData);
        }else{
            socket.emit('noGameFound');//No player found
        }
        
    });
    
    //When a host or player leaves the site
    socket.on('disconnect', () => {
        var game = games.getGame(socket.id); //Finding game with socket.id
        //If a game hosted by that id is found, the socket disconnected is a host
        if(game){
            //Checking to see if host was disconnected or was sent to game view
            if(game.gameLive == false){
                games.removeGame(socket.id);//Remove the game from games class
                console.log('Game ended with pin:', game.pin);

                var playersToRemove = players.getPlayers(game.hostId); //Getting all players in the game

                //For each player in the game
                for(var i = 0; i < playersToRemove.length; i++){
                    players.removePlayer(playersToRemove[i].playerId); //Removing each player from player class
                }

                io.to(game.pin).emit('hostDisconnect'); //Send player back to 'join' screen
                socket.leave(game.pin); //Socket is leaving room
            }
        }else{
            //No game has been found, so it is a player socket that has disconnected
            var player = players.getPlayer(socket.id); //Getting player with socket.id
            //If a player has been found with that id
            if(player){
                var hostId = player.hostId;//Gets id of host of the game
                var game = games.getGame(hostId);//Gets game data with hostId
                var pin = game.pin;//Gets the pin of the game
                
                if(game.gameLive == false){
                    players.removePlayer(socket.id);//Removes player from players class
                    playerCounter--;

                    var playersList = players.getPlayers(hostId); //Gets remaining players in game

                    var playersData = {
                            players: playersList,
                            playerCounter: playerCounter
                        };

                    io.to(pin).emit('updatePlayerLobby', playersData);//Sends data to host to update screen
                    socket.leave(pin); //Player is leaving the room
            
                }
            }
        }
        
    });

    
    



    
    //Sets data in player class to answer from player
    socket.on('playerAnswer', function(num){
        var player = players.getPlayer(socket.id);
        var hostId = player.hostId;
        var playerNum = players.getPlayers(hostId);
        var game = games.getGame(hostId);

       

        if(game.gameData.questionLive == true){//if the question is still live
            player.gameData.answer = num;
            game.gameData.playersAnswered += 1;
            
            socket.on('disconnect', () => {
                if (game && game.gameLive) {
                    // Remove player from the game
                    players.removePlayer(socket.id);
                    playerCounter--;
    
                    // Update remaining player data
                    var playersList = players.getPlayers(hostId);
                    var playersData = {
                        players: playersList,
                        playerCounter: playerCounter
                    };
    
                    playerNum--;
                    io.to(game.hostId).emit('updatePlayerLobby', playersData);
                    io.to(game.pin).emit('updateGameForPlayers', playersData);
                }
            });



            
            var gameQuestion = game.gameData.question;
            var gameid = game.gameData.gameid;
            
            MongoClient.connect(url, function(err, db){
                if (err) throw err;
    
                var dbo = db.db('kahootDB');
                var query = { id:  parseInt(gameid)};
                dbo.collection("kahootGames").find(query).toArray(function(err, res) {
                    if (err) throw err;
                    var correctAnswer = res[0].questions[gameQuestion - 1].correct;
                    //Checks player answer with correct answer
                    if(num == correctAnswer){
                        player.gameData.score += 100;
                        io.to(game.pin).emit('getTime', socket.id);
                        socket.emit('answerResult', true);
                    }

                    //Checks if all players answered
                    if(game.gameData.playersAnswered == playerNum.length){
                        game.gameData.questionLive = false; //Question has been ended bc players all answered under time
                        var playerData = players.getPlayers(game.hostId);
                        io.to(game.pin).emit('questionOver', playerData, correctAnswer);//Tell everyone that question is over
                    }else{
                        //update host screen of num players answered
                        io.to(game.pin).emit('updatePlayersAnswered', {
                            playersInGame: playerNum.length,
                            playersAnswered: game.gameData.playersAnswered
                        });
                    }

                    db.close();
                });
            });
           
        }
    });
    
    socket.on('getScore', function(){
        var player = players.getPlayer(socket.id);
        socket.emit('newScore', player.gameData.score); 
    });
    
    socket.on('time', function(data){
        var time = data.time / 20;
        time = time * 100;
        var playerid = data.player;
        var player = players.getPlayer(playerid);
        player.gameData.score += time;
    });
    
    
    
    socket.on('timeUp', function(){
        var game = games.getGame(socket.id);
        game.gameData.questionLive = false;
        var playerData = players.getPlayers(game.hostId);
        
        var gameQuestion = game.gameData.question;
        var gameid = game.gameData.gameid;
            
            MongoClient.connect(url, function(err, db){
                if (err) throw err;
    
                var dbo = db.db('kahootDB');
                var query = { id:  parseInt(gameid)};
                dbo.collection("kahootGames").find(query).toArray(function(err, res) {
                    if (err) throw err;
                    var correctAnswer = res[0].questions[gameQuestion - 1].correct;
                    io.to(game.pin).emit('questionOver', playerData, correctAnswer);
                    
                    db.close();
                });
            });
    });
    
    socket.on('nextQuestion', function(){
        
        var playerData = players.getPlayers(socket.id);
        var game = games.getGame(socket.id); // get number of the question

        console.log("Current question number trr:", game.gameData.question);
        console.log("the number of players who will get  ", totalPlayerPerc)

        playerData.forEach(player => {
            console.log("Player:", player.name, "Score:", player.gameData.score);
        });

        //Reset players current answer to 0
        for(var i = 0; i < Object.keys(players.players).length; i++){
            if(players.players[i].hostId == socket.id){
                players.players[i].gameData.answer = 0;
            }
        }
        
        var game = games.getGame(socket.id);
        game.gameData.playersAnswered = 0;
        game.gameData.questionLive = true;
        
        var gameid = game.gameData.gameid;
        
        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        if(game.gameData.question === 10 && !tenPassed || game.gameData.question === 15 && !twentyPassed || game.gameData.question === 20 && !thirtyPassed){

            // here, if the question is three, and the threee never passed , then it goes , but we do not increment , plus , the passed is now true , that means
            //the condition is not met , so it goes to the regular question , and increments.
            if(game.gameData.question === 10){tenPassed = true;}
            if(game.gameData.question === 15){twentyPassed = true;}
            if(game.gameData.question === 20){thirtyPassed = true;}

            // Sort players by score in descending order
            var leaderboard = playerData.sort((a, b) => b.gameData.score - a.gameData.score);
        
            // Emit leaderboard to all clients
            io.to(game.pin).emit('showLeaderboard', { leaderboard: leaderboard, totalPlayerPerc: totalPlayerPerc });
        
            console.log("Leaderboard :", leaderboard);

            console.log("The numbeeer ", totalPlayerPerc);
            // Ensure there are enough players in the game
            if(leaderboard.length > totalPlayerPerc){
                
                // Loop through the number of players you want to remove
                for(var i = 0; i < totalPlayerPerc; i++){
                    // Calculate index of player to remove (starting from the lowest score)
                    var playerIndexToRemove = leaderboard.length - 1 - i;
                    var playerToRemove = leaderboard[playerIndexToRemove];
        
                    // Emit 'noGameFound' to the player
                    io.to(playerToRemove.playerId).emit('noGameFound');
        
                    // Remove player from game
                    players.removePlayer(playerToRemove.playerId);
        
                    // Update player counter
                    playerCounter--;
                }    
           
                // Fetch the updated list of players
                var updatedPlayerData = players.getPlayers(game.hostId);
        
                // Emit updated player data to the host and all players  
                io.to(game.hostId).emit('updatePlayerLobby', {
                    players: updatedPlayerData,
                    playerCounter: playerCounter
                });
                io.to(game.pin).emit('updateGameForPlayers', updatedPlayerData);
            }


        }else if(game.gameData.question === 25 && !finalRoundhere){

            if(game.gameData.question === 25){finalRoundhere = true;}

            //to check mnb3d bach tkon general leaderboard whda lfo9 ???
            var leaderboard = playerData.sort((a, b) => b.gameData.score - a.gameData.score);

            //mnb3d khss nhydo kooooolchi ila 5 
            var topPlayers = leaderboard.slice(0, 5);

            // Calculate the total number of players excluding the top 5
            var totalNew = Math.max(playerData.length - 5, 0);

            io.to(game.pin).emit('showLeaderboard', { leaderboard: leaderboard, totalPlayerPerc: totalNew });

            if (leaderboard.length > 5) {
                // Loop through the number of players beyond the top 5
                for (var i = 5; i < leaderboard.length; i++) {
                    // Emit 'noGameFound' to the player
                    io.to(leaderboard[i].playerId).emit('noGameFound');
          
                    // Remove player from the game
                    players.removePlayer(leaderboard[i].playerId);
        
                    // Update player counter
                    playerCounter--;
                }

                var updatedPlayerData = players.getPlayers(game.hostId);

                 
                io.to(game.hostId).emit('updatePlayerLobby', {
                    players: updatedPlayerData,
                    playerCounter: playerCounter
                });
                io.to(game.pin).emit('updateGameForPlayers', updatedPlayerData);
            }

        }
        else{
            
            //we increment questions here , we only need incrementation in the regular questions
            game.gameData.question += 1;

            MongoClient.connect(url, function(err, db){
                if (err) throw err;
    
                var dbo = db.db('kahootDB');
                var query = { id:  parseInt(gameid)};
                dbo.collection("kahootGames").find(query).toArray(function(err, res) {
                    if (err) throw err;
                    
                    if(res[0].questions.length >= game.gameData.question){
                        var questionNum = game.gameData.question;
                        questionNum = questionNum - 1;
                        var question = res[0].questions[questionNum].question;
                        var answer1 = res[0].questions[questionNum].answers[0];
                        var answer2 = res[0].questions[questionNum].answers[1];
                        var answer3 = res[0].questions[questionNum].answers[2];
                        var answer4 = res[0].questions[questionNum].answers[3];
                        var correctAnswer = res[0].questions[questionNum].correct;

                        socket.emit('gameQuestions', {
                            q1: question,
                            a1: answer1,
                            a2: answer2,
                            a3: answer3,
                            a4: answer4,
                            correct: correctAnswer,
                            playersInGame: playerData.length
                        });
                        db.close();
                    }else{
                        var playersInGame = players.getPlayers(game.hostId);

                        // Sort players by score in descending order
                        playersInGame.sort((a, b) => b.gameData.score - a.gameData.score);

                        // Extract the top 5 players
                        var topPlayers = playersInGame.slice(0, 5);

                        // Emit the names to the game room
                        io.to(game.pin).emit('GameOver', {
                            num1: topPlayers[0] ? topPlayers[0].name : "",
                            num2: topPlayers[1] ? topPlayers[1].name : "",
                            num3: topPlayers[2] ? topPlayers[2].name : "",
                            num4: topPlayers[3] ? topPlayers[3].name : "",
                            num5: topPlayers[4] ? topPlayers[4].name : ""
                        });

                    }
                });
            });    
        
        io.to(game.pin).emit('nextQuestionPlayer');
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////////

        // INSERT DATA TO BACKUP
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;

            var dbo = db.db('kahootDB');
            var backupCollection = dbo.collection('BACKUP');

            // Delete all documents from the 'BACKUP' collection
            backupCollection.deleteMany({}, function (err, res) {
                if (err) throw err;

                console.log('All documents deleted from BACKUP collection');

                // Insert the data into the 'BACKUP' collection
                backupCollection.insertOne({
                    CurrentQuestion: game.gameData.question,
                    Players: playerData
                }, function (err, res) {
                    if (err) throw err;

                    console.log('New data inserted into BACKUP collection');

                    // Close the connection to 'BACKUP' collection
                    backupCollection = null;
                    db.close();
                });
            });
        });
        ///////////////////////////////////////
        
          
    });  
    
    //When the host starts the game
    socket.on('startGame', () => {
        var game = games.getGame(socket.id);//Get the game based on socket.id
        game.gameLive = true;
        socket.emit('gameStarted', game.hostId);//Tell player and host that game has started
    });
    
    //Give user game names data
    socket.on('requestDbNames', function(){
        
        MongoClient.connect(url, function(err, db){
            if (err) throw err;
    
            var dbo = db.db('kahootDB');
            dbo.collection("kahootGames").find().toArray(function(err, res) {
                if (err) throw err;
                socket.emit('gameNamesData', res);
                db.close();
            });
        });
        
         
    });
    

    
    socket.on('refreshGames', () => {
        console.log("Refreshing games...");

        // Remove all players from the games and clear the games array
        for (const game of games.games) {
            console.log(`Removing players from game with hostId ${game.hostId}`);
            const playersToRemove = players.getPlayers(game.hostId);
            for (const player of playersToRemove) {
                players.removePlayer(player.playerId);
                playerCounter--;
                console.log(`Had lplayer with ID MCHAAA ${player.playerId}`);
            }
        }
        games.games = []; 

        
        playerCounter = 0;
        console.log("Player counter reset to 0");

   
    });



    
    socket.on('newQuiz', function(data){
        MongoClient.connect(url, function(err, db){
            if (err) throw err;
            var dbo = db.db('kahootDB');
            dbo.collection('kahootGames').find({}).toArray(function(err, result){
                if(err) throw err;
                var num = Object.keys(result).length;
                if(num == 0){
                	data.id = 1
                	num = 1
                }else{
                	data.id = result[num -1 ].id + 1;
                }
                var game = data;
                dbo.collection("kahootGames").insertOne(game, function(err, res) {
                    if (err) throw err;
                    db.close();
                });
                db.close();
                socket.emit('startGameFromCreator', num);
            });
            
        });
        
        
    });
    
});
