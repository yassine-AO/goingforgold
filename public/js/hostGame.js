var socket = io();
var params = jQuery.deparam(window.location.search); //Gets the id from url
var timer;
var time = 20;
var state;
var leaderBoardState;

// Preload audio
var correctAudio = new Audio('/audios/Correct_answer.mp3');
var countdownAudio = new Audio('/audios/Countdown 3 seconds timer.mp3');

//When host connects to server
socket.on('connect', function() {
    //Tell server that it is host connection from game view
    socket.emit('host-join-game', params);
});

socket.on('noGameFound', function(){
    window.location.href = '../../';//Redirect user to 'join game' page
});

//countdown function
function countdownBeforeQuestion() {
    var countdown = 3;
    var countdownElement = document.getElementById('countdown');

    countdownElement.textContent = countdown;


    var countdownInterval = setInterval(function() { 
        if (countdown > 0) {
            countdown--;
            countdownElement.textContent = countdown;
            // Hide playersAnswered and timerText during countdown
            document.getElementById('playersAnswered').style.display = 'none';
            document.getElementById('timerText').style.display = 'none';
        } else {
            clearInterval(countdownInterval);
            countdownElement.textContent = '';
            updateTimer();
            // Show the question and answer elements
            document.querySelectorAll('.answer-pair').forEach(function(element) {
                element.style.display = "block";
            });
            document.getElementById('question').style.display = "block";
            // Show playersAnswered and timerText after countdown finishes
            document.getElementById('playersAnswered').style.display = 'block';
            document.getElementById('timerText').style.display = 'block';
        }
    }, 1000);

    // Play countdown audio
    countdownAudio.play();

    // Hide the question and answer elements
    document.querySelectorAll('.answer-pair').forEach(function(element) {
        element.style.display = "none";
    });
    document.getElementById('question').style.display = "none";
    // Hide playersAnswered and timerText initially
    document.getElementById('playersAnswered').style.display = 'none';
    document.getElementById('timerText').style.display = 'none';
}


socket.on('gameQuestions', function(data){
    document.getElementById('question').innerHTML = data.q1;
    document.getElementById('answer1').innerHTML = data.a1;
    document.getElementById('answer2').innerHTML = data.a2;
    document.getElementById('answer3').innerHTML = data.a3;
    document.getElementById('answer4').innerHTML = data.a4;
    var correctAnswer = data.correct;
    document.getElementById('playersAnswered').innerHTML = "Les joueurs répondu 0 / " + data.playersInGame;

    // Start countdown before question starts
    countdownBeforeQuestion();
    var clockticking = document.getElementById("clockticking");
    

    document.getElementById('leaderboard-container').style.display = "none"; // Hide the leaderboard container
    document.getElementById('leaderboard').style.display = "none";
    document.getElementById('leaderboardTitle').style.display = "none";
    document.getElementById('SHOW').style.display = "block";
    document.getElementById('square1').style.display = "none";
    document.getElementById('square2').style.display = "none";
    document.getElementById('square3').style.display = "none";
    document.getElementById('square4').style.display = "none";
    document.getElementById('nextQButton').style.display = "none";
    leaderBoardState = false;
});

// Rest of your code remains unchanged



socket.on('updatePlayersAnswered', function(data){
   document.getElementById('playersAnswered').innerHTML = "Les joueurs répondu " + data.playersAnswered + " / " + data.playersInGame; 
});

socket.on('questionOver', function(playerData, correct){
    clearInterval(timer);
    var answer1 = 0;
    var answer2 = 0;
    var answer3 = 0;
    var answer4 = 0;
    var total = 0;
    //Hide elements on page
    document.getElementById('playersAnswered').style.display = "none";
    document.getElementById('timerText').style.display = "none";
    
    //Shows user correct answer with effects on elements
    if(correct == 1){
        document.getElementById('answer2').style.filter = "grayscale(100%)";
        document.getElementById('answer3').style.filter = "grayscale(100%)";
        document.getElementById('answer4').style.filter = "grayscale(100%)";
        var current = document.getElementById('answer1').innerHTML;
        document.getElementById('answer1').innerHTML = "✅" + " " + current;
    }else if(correct == 2){
        document.getElementById('answer1').style.filter = "grayscale(100%)";
        document.getElementById('answer3').style.filter = "grayscale(100%)";
        document.getElementById('answer4').style.filter = "grayscale(100%)";
        var current = document.getElementById('answer2').innerHTML;
        document.getElementById('answer2').innerHTML = "✅" + " " + current;
    }else if(correct == 3){
        document.getElementById('answer1').style.filter = "grayscale(100%)";
        document.getElementById('answer2').style.filter = "grayscale(100%)";
        document.getElementById('answer4').style.filter = "grayscale(100%)";
        var current = document.getElementById('answer3').innerHTML;
        document.getElementById('answer3').innerHTML = "✅" + " " + current;
    }else if(correct == 4){
        document.getElementById('answer1').style.filter = "grayscale(100%)";
        document.getElementById('answer2').style.filter = "grayscale(1100%)";
        document.getElementById('answer3').style.filter = "grayscale(100%)";
        var current = document.getElementById('answer4').innerHTML;
        document.getElementById('answer4').innerHTML = "✅" + " " + current;
    }
    
    // Play correct answer audio
    correctAudio.play();
    
    for(var i = 0; i < playerData.length; i++){
        if(playerData[i].gameData.answer == 1){
            answer1 += 1;
        }else if(playerData[i].gameData.answer == 2){
            answer2 += 1;
        }else if(playerData[i].gameData.answer == 3){
            answer3 += 1;
        }else if(playerData[i].gameData.answer == 4){
            answer4 += 1;
        }
        total += 1;
    }
    
    //Gets values for graph
    var answer1t = answer1 / total * 100;
    var answer2t = answer2 / total * 100;
    var answer3t = answer3 / total * 100;
    var answer4t = answer4 / total * 100;
    
    document.getElementById('square1').style.width = answer1t + "%";
    document.getElementById('total1').textContent = answer1;

    document.getElementById('square2').style.width = answer2t + "%";
    document.getElementById('total2').textContent = answer2;

    document.getElementById('square3').style.width = answer3t + "%";
    document.getElementById('total3').textContent = answer3 ;

    document.getElementById('square4').style.width = answer4t + "%";
    document.getElementById('total4').textContent = answer4 ;

    // Display the squares and their totals
    if(answer1 != 0){document.getElementById('square1').style.display = "block";}
    if(answer2 != 0){document.getElementById('square2').style.display = "block";}
    if(answer3 != 0){document.getElementById('square3').style.display = "block";}
    if(answer4 != 0){document.getElementById('square4').style.display = "block";}

    // Show the stats container with bars
    document.getElementById('nextQButton').style.display = "block";
});

function nextQuestion(){
    document.getElementById('nextQButton').style.display = "none";
    document.getElementById('square1').style.display = "none";
    document.getElementById('square2').style.display = "none";
    document.getElementById('square3').style.display = "none";
    document.getElementById('square4').style.display = "none";
    
    document.getElementById('answer1').style.filter = "none";
    document.getElementById('answer2').style.filter = "none";
    document.getElementById('answer3').style.filter = "none";
    document.getElementById('answer4').style.filter = "none";
    
    
    document.getElementById('playersAnswered').style.display = "block";
    document.getElementById('timerText').style.display = "block";
    document.getElementById('num').innerHTML = " 10";
    
    if (leaderBoardState) {

        document.getElementById('leaderboard-container').style.display = "none"; // Hide the leaderboard container
        document.getElementById('leaderboard').style.display = "none";
        document.getElementById('leaderboardTitle').style.display = "none";
        document.getElementById('SHOW').style.display = "block";
        leaderBoardState = false;
    }

    socket.emit('nextQuestion'); //Tell server to start new question
}

function updateTimer(){
    time = 10;
    timer = setInterval(function(){
        time -= 1;
        document.getElementById('num').textContent = " " + time;
        if(time == 0){
            socket.emit('timeUp');
        }
    }, 1000);
}
socket.on('GameOver', function(data){
    document.getElementById('nextQButton').style.display = "none";
    document.getElementById('square1').style.display = "none";
    document.getElementById('square2').style.display = "none";
    document.getElementById('square3').style.display = "none";
    document.getElementById('square4').style.display = "none";
    
    document.getElementById('answer1').style.display = "none";
    document.getElementById('answer2').style.display = "none";
    document.getElementById('answer3').style.display = "none";
    document.getElementById('answer4').style.display = "none";
    document.getElementById('timerText').innerHTML = "";
    document.getElementById('question').innerHTML = "Félicitations !!👏👏";
    document.getElementById('playersAnswered').innerHTML = "";
    
    document.getElementById('SHOW').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    
    document.getElementById('winner1').style.display = "block";
    document.getElementById('winner2').style.display = "block";
    document.getElementById('winner3').style.display = "block";
    document.getElementById('winner4').style.display = "none";
    document.getElementById('winner5').style.display = "none";
    document.getElementById('winnerTitle').style.display = "block";
    document.getElementById('winnerTitle').style.color = "#ffffff";
    document.getElementById('winner1').style.color = "#FFD700";
    document.getElementById('winner2').style.color = "#FFD700";
    document.getElementById('winner3').style.color = "#FFD700";


    
    document.getElementById('winner1').innerHTML = "🥇. " + data.num1;
    document.getElementById('winner2').innerHTML = "🥈. " + data.num2;
    document.getElementById('winner3').innerHTML = "🥉. " + data.num3;
    document.getElementById('winnerTitle').innerHTML ="Bravo à nos superstars du jeu Going for Gold! 🌟 Vous avez tous été fantastiques! 🎉  "

});



socket.on('showLeaderboard', function(data){
    var leaderboard = data.leaderboard;

    // Store the leaderboard data in localStorage
    localStorage.setItem('leaderboardData', JSON.stringify(leaderboard));
    localStorage.setItem('playerPercentage', JSON.stringify(data.totalPlayerPerc));


    var leaderboardElement = document.getElementById('leaderboard');
    
    // Clear existing leaderboard entries
    leaderboardElement.innerHTML = '';

    // Create player entries based on the leaderboard data
    leaderboard.forEach((player, index) => {
        // Create the rank element and add class
        var rank = document.createElement('div');
        rank.className = 'player-rank'; // Assign class name
        rank.textContent = (index + 1) + '.';

        // Create the name element and add class
        var name = document.createElement('div');
        name.className = 'player-name'; // Assign class name
        name.textContent = player.name;

        // Create the score element and add class
        var score = document.createElement('div');
        score.className = 'player-score'; // Assign class name
        score.textContent = player.gameData?.score || 'No score';

        // Create the player entry container, add class, and append the rank, name, and score
        var playerEntry = document.createElement('div');
        playerEntry.className = 'player-entry'; // Assign class name

        if (index >= leaderboard.length - data.totalPlayerPerc) {
            playerEntry.classList.add('to-be-removed');
        } 

        playerEntry.appendChild(rank);
        playerEntry.appendChild(name);
        playerEntry.appendChild(score);

        // Append the player entry to the leaderboard
        leaderboardElement.appendChild(playerEntry);
    });

    // Show leaderboard
    
    document.getElementById('leaderboard').style.display = "grid";
    document.getElementById('leaderboardTitle').style.display = "block"; 
    document.getElementById('leaderboard-container').style.display = "block"; // Hide the leaderboard container
    document.getElementById('SHOW').style.display = "none";
    document.getElementById('nextQButton').style.display = "block";
    leaderBoardState = true;
    window.open('leaderBoardPage.html');
});





socket.on('getTime', function(player){
    socket.emit('time', {
        player: player,
        time: time
    });
});



