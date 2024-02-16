var socket = io();
var params = jQuery.deparam(window.location.search);

//When host connects to server
socket.on('connect', function() {
    // The following line is removed or updated
    // document.getElementById('players').value = "";
    
    // Tell server that it is host connection
    socket.emit('host-join', params);
});

/*socket.on('showGamePin', function(data){
   document.getElementById('gamePinText').innerHTML = data.pin;
});*/

//Adds player's name to screen and updates player count
socket.on('updatePlayerLobby', function(data){
    var playerListElement = document.getElementById('player-list');
    var playerCounterElement = document.getElementById('player_counter');

    playerListElement.innerHTML = ''; // Clear existing content

    data.players.forEach(player => {
        var playerCard = document.createElement('div');
        playerCard.classList.add('player-card');

        var playerImage = document.createElement('img');
        playerImage.src = "/assets/th_3.png"; // Replace with the path to your image
        playerImage.alt = 'Player Image';
        playerImage.classList.add('player-image');

        var playerName = document.createElement('span'); // Using 'span' for the player's name
        playerName.textContent = player.name;
        playerName.classList.add('player-name');

        playerCounterElement.textContent = 'Player Count: ' + data.playerCounter;
        playerCard.appendChild(playerImage);
        playerCard.appendChild(playerName);
        playerListElement.appendChild(playerCard);
    });
});




//Tell server to start game if button is clicked
function startGame(){
    socket.emit('startGame');
}
function endGame(){
    window.location.href = "/admin_create/";
}

//When server starts the game
socket.on('gameStarted', function(id){
    console.log('Game Started!');
    window.location.href="/host/game/" + "?id=" + id;
});

socket.on('noGameFound', function(){
   window.location.href = '../../';//Redirect user to 'join game' page
});