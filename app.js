'use strict';

const { name } = require('ejs');
//Set up express
const express = require('express');
const app = express();
const request = require('request')


//Setup socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cloudUrl = 'http://localhost:8181/';
const appKey = 'ltEpNMN0eYTN17WiqwWwzhTSJv7XGgnJfPfOy5LxOkokAzFuh17y5w==';
const http = require('http');
const { response } = require('express');
const res = require('express/lib/response');
const axios = require('axios');
const { Socket } = require('socket.io');
const { engine } = require('express/lib/application');
const { SocketAddress } = require('net');
let players = [];
let playersToSockets = new Map();
let socketsToPlayers = new Map();
const state = {state:0,round:1};
let audience = [];
let promptsThisRound = [];
let playersToAnswers = new Map();
let playersToPrompts = new Map();
let playersToStatus = new Map();
let promptAndAnswer = new Map();
let timer = null;
let answers_Data = new Map();
let roundPrompts = [];
let currentAnswers = [];
let leaderBoard = {};
let voted = false;
let voteRecieved = 0;
let promptToPlayer ={};
let displaySocket;



//Setup static page handling
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

//Handle client interface on /
app.get('/', (req, res) => {
  res.render('client');
});
//Handle display interface on /display
app.get('/display', (req, res) => {
  res.render('display');
  
});

// URL of the backend API
const BACKEND_ENDPOINT = process.env.BACKEND || 'http://localhost:8181';

//Start the server
function startServer() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
function error(socket, message, halt) {
  console.log('Error: ' + message);
  socket.emit('fail',message);
  if(halt) {
      socket.disconnect();
  }
}


//Chat message
function handleChat(message) {
    console.log('Handling chat: ' + message); 
    io.emit('chat',message);
}
function handleJoin(socket,data){
  
  if(players.includes(data.username)) {
    error(socket,'The user is already logged in',true);
    return;
}
  console.log('someone joined with username: ' + data.username);
  

  request.get({
    url: 'http://localhost:8181/player/login',
    json: true,
    body: {
      'username': data.username,
      'password': data.password
    },
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': 'YhOHhSYxRq4MrTUklu5OudhytadjwURZ1ZNANDXBkMNbAzFuZjI0DA=='
    }
  }, function(err, response, body) {
    if (err) {
      console.error('Error:', err);
      socket.emit('login fail',err);
      
      return;
    }
  
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', body);
    if(response.statusCode == '200' && body.result == true){
      socket.emit('login success');
      playersToSockets.set(data.username,socket);
      socketsToPlayers.set(socket,data.username);
      if(players.length <8 && state.state == 0){
        players.push(data.username);
      }else{
        audience.push(data.username);
      }
      if(players.length == 1){
        socket.emit('admin');
      }
      updateAll();
      
    }
    else {
      console.log('here now');
      socket.emit('login fail',body.msg);
    }
  });
  
}
function handelRegister(socket,data){
  
  console.log('someone registered with username: ' + data);
  request.post({
    url: 'http://localhost:8181/player/register',
    json: true,
    body: {
      'username': data.username,
      'password': data.password
    },
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': 'YhOHhSYxRq4MrTUklu5OudhytadjwURZ1ZNANDXBkMNbAzFuZjI0DA=='
    }
  }, function(err, response, body) {
    if (err) {
      console.error('Error:', err);
      socket.emit('login fail',err);
      
      return;
    }
  
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', body);
    if(response.statusCode == '200' && body.result == true){

      socket.emit('login success');
      playersToSockets.set(data.username,socket);
      socketsToPlayers.set(socket,data.username);
      
      if(players.length <8 && state.state == 0){
        players.push(data.username);
      }else{
        audience.push(data.username);
      }
      if(players.length == 1){
        socket.emit('admin');
      }
      updateAll();
    }
    else {
      console.log('here now');
      socket.emit('login fail',body.msg);
    }
  });
 
};


async function handleAdmin(socket,action){
  console.log('handling admin action' + action);
  if(action == 'start'){
    if(players.length <3){
      console.log(players.length);
      announce('cannot start game not enough players');
    }
    else{
      state.state = 1;
    }
  }
  else if(action == 'prompt'){
    var oldprompts = await handlePrompts();
    oldprompts =oldprompts.filter(item => !promptsThisRound.includes(item));
    // console.log(oldprompts);
    shuffle(oldprompts);
    // console.log(promptsThisRound);
    
     let allprompts = [];
     let oldForRound = [];
     for(let i = 0;i<players.length;i++){
          oldForRound.push(oldprompts[i]);
     }
    
    // allprompts = allprompts.concat(promptsThisRound);
    
    //console.log(allprompts);
    if(promptsThisRound.length == 0){
      allprompts = oldForRound;
      state.state = 2;
    
    if(players.length%2 == 0){

      evenAnswers(allprompts);
    }
    else{
      console.log('doing odd now');
      oddAnswers(allprompts);
    }
    
    }else{
    
    state.state = 2;
    if(players.length%2 == 0){
      let half = players.length/2
      
      if(promptsThisRound.length < half){
        shuffle(oldprompts);
        allprompts = promptsThisRound;
        for(let i = 0; i < players.length - promptsThisRound;i++){
          let thisprompt = oldprompts[i];
          allprompts.push(thisprompt);
          
        }
      }
      else{
        shuffle(promptsThisRound);
        shuffle(oldprompts);
        for(let i = 0; i < half;i++){
          let thisprompt = promptsThisRound[i];
          allprompts.push(thisprompt);
          
        }
        for(let i =0;i < players.length - half;i++){
          let thisprompt = oldprompts[i];
          allprompts.push(thisprompt);
          
        }

      }
      
      evenAnswers(allprompts);
    }
    else{
      
      let half = (players.length+1)/2
      shuffle(promptsThisRound);
      shuffle(oldprompts);
      if(promptsThisRound.length < half){
        allprompts = promptsThisRound;
        for(let i = 0; i < players.length - promptsThisRound;i++){
          let thisprompt = oldprompts[i];
          allprompts.push(thisprompt);
         
        }
      }
      else{
        
        console.log(half);
        for(let i = 0; i < half;i++){
          let thisprompt = promptsThisRound[i];
          console.log(thisprompt);
          allprompts.push(thisprompt);
          //promptsThisRound.splice(promptsThisRound.indexOf(thisprompt,0));
        }
        console.log(allprompts);
        for(let i =0;i < players.length - half;i++){
          let thisprompt = oldprompts[i];
          allprompts.push(thisprompt);
          
        }
        //console.log(allprompts)

      }
      console.log('doing odd now');
      oddAnswers(allprompts);
    }}
    

    
    
  }
  // starting the voting stage request
  else if (action == 'vote') {
    for(let player of players){
       playersToSockets.get(player).emit('status');
    }
    
    
    // Use a promise to handle the delay
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Async function to wait for the delay
    async function performVoteLogic() {
        await delay(2000); // 2000 milliseconds (2 seconds) delay
        console.log("Delayed log");

        let procced = true;

        for (let [player, player_status] of playersToStatus) {
            console.log("checking status " + player);
            if (player_status < 3) {
                procced = false;
            }
        }

        if (procced) {
            state.state = 3;
            updateAll();
            handleVoting();
            
        } else {
            socket.emit('wait others');
        }
    }

    // Call the async function
    performVoteLogic();
}
else if(action == 'scores'){
    
    
    endVote()
   
}
else if(action == 'new round'){
  if(state.round == 3){
    state.state = 5
  }else{
  state.state = 1;
  state.round ++;
  promptsThisRound = [];
  playersToAnswers.clear(); 
  playersToPrompts.clear();
  playersToStatus.clear();
  promptAndAnswer.clear();
  answers_Data.clear();
  roundPrompts = [];
  currentAnswers = [];
  voteRecieved = 0;
  io.emit('new round');}
}


  updateAll();
}
function announce(message){
  console.log('Announcement ' + message);
  io.emit('chat',message)
}
function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

function handleSubmit(socket,prompt){
  request.post({
    url: 'http://localhost:8181/prompt/create',
    json: true,
    body: {
      'text': prompt,
      'username': socketsToPlayers.get(socket)
    },
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': 'YhOHhSYxRq4MrTUklu5OudhytadjwURZ1ZNANDXBkMNbAzFuZjI0DA=='
    }
  }, function(err, response, body) {
    if (err) {
      console.error('Error:', err)  
      socket.emit('prompt fail',body.msg);
      return;
    }
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', body);
    if(response.statusCode == '200' && body.result == true){
      socket.emit('prompt success');
      promptsThisRound.push(prompt);
      promptToPlayer[socketsToPlayers.get(socket)] = prompt;
      
      io.emit('promptToplayers',promptToPlayer);
    }else{
      socket.emit('prompt fail',body.msg);
    }

  });
  
}
// function handleVote(action){
//   console.log('someone submitted a vote ' + action);
// }
function updateAll(){
    for (let [player,socket] of playersToSockets){
     updatePlayer(socket);
    
    }
    
    let data= {players:players,state:state,audience:audience}
    io.emit('update2',data);
  
    

}
function updatePlayer(socket){
  let admin = false;
  let username = socketsToPlayers.get(socket);
  let otherPlayers = players;
  let game_state = state;
  let isaudience = false;
  if(players[0] == socketsToPlayers.get(socket)){
    admin = true;
  }
  if(audience.includes(socketsToPlayers.get(socket))){
        isaudience = true;
  }

  let data = {player:{name:username,admin:admin,audience:isaudience},players:otherPlayers,state:game_state};
  socket.emit('update',data);

}


async function handlePrompts() {
  return new Promise((resolve, reject) => {
    request.get({
      url: 'http://localhost:8181/utils/get',
      json: true,
      body: {
        'players': players,
        'language': 'en'
      },
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': 'YhOHhSYxRq4MrTUklu5OudhytadjwURZ1ZNANDXBkMNbAzFuZjI0DA=='
      }
    }, function (err, response, body) {
      if (err) {
        console.error('Error:', err);
        reject(err);
        return;
      }

      console.log('Status Code:', response.statusCode);
      let oldprompts = [];
      for (let { id: id, text: text, username: username } of body) {
        oldprompts.push(text);
      }

      resolve(oldprompts);
    });
  });
}
function oddAnswers(allprompts){
     // first i need to get the list of prompts to pick from
     let prompts = allprompts;
    //  for(let i = 0;i<players.length;i++){
    //     let prompt = allprompts[Math.floor(Math.random() * players.length)];
    //     let newArray = allprompts.filter(item => item !== prompt);
    //     allprompts = newArray;
    //     prompts.push(prompt);
    //  }
     // now i wanna send each prompt twice randomly two different users so eac user gets two prompts
     // let make a a map between players and a set of prompt
     

for (let player of players) {
    playersToPrompts.set(player, []);
}


let newPlayers = players.slice(); // Use slice to create a copy of the array
shuffle(newPlayers);
let nextPlayer = 0;
console.log('prompts to pick from ' + prompts);

for (let prompt of prompts) {
    let player1 = newPlayers[nextPlayer];
    let player2 = newPlayers[(nextPlayer + 1) % newPlayers.length];

    playersToPrompts.get(player1).push(prompt);
    if (playersToPrompts.get(player1).length === 2) {
        newPlayers.splice(newPlayers.indexOf(player1), 1);
    }

    playersToPrompts.get(player2).push(prompt);
    if (playersToPrompts.get(player2).length === 2) {
        newPlayers.splice(newPlayers.indexOf(player2), 1);
    }

    nextPlayer = (nextPlayer + 2) % newPlayers.length; // Update nextPlayer at the end
}

     for(let [player , prompts] of playersToPrompts){
          playersToSockets.get(player).emit('answer',prompts);
     }


}
function evenAnswers(allprompts){
    let playerTurn = 0;
    for(let i = 0;i <allprompts.length;i++){
        let prompt = allprompts[Math.floor(Math.random() * allprompts.length)];
        let newArray = allprompts.filter(item => item !== prompt);
        allprompts = newArray;
        let firsPlayer = playersToSockets.get(players[playerTurn]);
        playerTurn += 1;
        let secondPlayer = playersToSockets.get(players[playerTurn]);
        playerTurn += 1;
        let prompts = [prompt]
        firsPlayer.emit('answer',prompts);
        secondPlayer.emit('answer',prompts);
        console.log('answers send');
    }

}
function handleAnswers(socket,data){
    if(data.answers.length == 0){
      answers_Data.set(data.answers[0], {author: socketsToPlayers.get(socket),voters: [],score: 0 });
    }else{
      
      answers_Data.set(data.answers[0], {author: socketsToPlayers.get(socket),voters: [],score: 0 });
      answers_Data.set(data.answers[1], {author: socketsToPlayers.get(socket),voters: [],score: 0 });
    }
    for(let prompt of data.prompts){
        const theAnswer = data.answers[data.prompts.indexOf(prompt)];
        
        if(promptAndAnswer.has(prompt)){
          promptAndAnswer.get(prompt).push(theAnswer);   
        }
        else{
            promptAndAnswer.set(prompt,[theAnswer]);
        }
        
    }
    
    console.log(promptAndAnswer);
}
async function handleVoting(){
  
  for(let [prompt,answers] of promptAndAnswer){
      roundPrompts.push(prompt);
  }
  startVote(roundPrompts);
}
// function tickVote(roundPrompts,myAnswers){
//   if(state.countdown > 1){
//       state.countdown -- ;
//       console.log('countdown ' + state.countdown);

//   }else{
//     clearInterval(timer);
//     timer = null;
//     endVote(roundPrompts,myAnswers);
   
//   }

// }

function startVote(roundPrompts) {
  if (roundPrompts.length == 0) {
    startScores();
  } else{
  var myPrompt = roundPrompts[0];
  currentAnswers = promptAndAnswer.get(myPrompt);
  
  
  roundPrompts.splice(0, 1);
  io.emit('vote on', myPrompt, currentAnswers);
  // timer = setInterval(() => {
  //   tickVote(roundPrompts, myAnswers); // Pass both arguments
  // }, 1000);
  }}

function endVote() {
 
    
    let data1 = answers_Data.get(currentAnswers[0]);
    let data2 = answers_Data.get(currentAnswers[1]);
    io.emit('voteScores', data1, data2);
    // timer = setInterval(() => {
    //   tickScore();
    // }, 1000);

    // state.countdown = 30;
    // startVote(roundPrompts);
  
}

// function tickScore() {
//   if (state.countdown > 1) {
//     state.countdown--;
//     console.log('countdown ' + state.countdown);
//   } else {
//     clearInterval(timer);
//     timer = null;
//   }
// }
function playerUpdate(username,score,games){
  request.put({
    url: 'http://localhost:8181/player/update',
    json: true,
    body: {
      'username': username,
      'add_to_games_played': games,
      'add_to_score': score
    },
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': 'YhOHhSYxRq4MrTUklu5OudhytadjwURZ1ZNANDXBkMNbAzFuZjI0DA=='
    }
  }, function(err, response, body) {
    if (err) {
      console.error('Error:', err);
      socket.emit('login fail',err);
      
      return;
    }
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', body);
    
  });

}

function startScores(){
  
  state.state = 4
  console.log('answwe data:', answers_Data);
  for (let [answer, data] of answers_Data) {
    if (data) { // Check if data is defined
      console.log(data);
  
      playerUpdate(data.author, data.score, 1);
  
      if (data.author in leaderBoard) {
        leaderBoard[data.author] += data.score; // Update the score for an existing player
      } else {
        leaderBoard[data.author] = data.score; // Add a new player to the leaderboard
      }
    } else {
      console.error('Invalid data:', answer, data);
    }
  }
  
  console.log(leaderBoard);
  io.emit('leaderboard',leaderBoard);
  console.log("start round scores bye");
  updateAll();

   
}








//Handle new connection
io.on('connection', socket => { 
  console.log('New connection');

  //Handle on chat message received
  socket.on('chat', message => {
    handleChat(message);
  });

  //Handle disconnection
  socket.on('disconnect', () => {
   console.log('Dropped connection');
   updateAll();
  });
  socket.on('join',data=>{
    handleJoin(socket,data);
    
  });
  socket.on('register',data=>{
    console.log("register request incoming with this data " + data);
    handelRegister(socket,data);
    
  });
  socket.on('admin',action => {
    handleAdmin(socket,action);
    
  });
  socket.on('submit',prompt =>{
     handleSubmit(socket,prompt);
    
  });
  socket.on('vote', action =>{
    handleAdmin(socket,action)
  });
  socket.on('answers',data =>{
      handleAnswers(socket,data);
  });
  socket.on('myState',player_state=>{
      console.log('got status ' + player_state + ' from player ' + socketsToPlayers.get(socket));
      playersToStatus.set(socketsToPlayers.get(socket),player_state);
      
  });
  socket.on('myAnswer',myanswer=>{
      console.log('my answer ' + socketsToPlayers.get(socket));
      answers_Data.get(myanswer).author = socketsToPlayers.get(socket);
  })
  socket.on('chose',thisanswer=>{
      
      voted = true;
      voteRecieved ++;
      playersToSockets.get(players[0]).emit('vote recieved',voteRecieved);
      console.log('chose ' + currentAnswers[thisanswer]);
      console.log(answers_Data.get(currentAnswers[thisanswer]));
      answers_Data.get(currentAnswers[thisanswer]).voters.push(socketsToPlayers.get(socket));
      answers_Data.get(currentAnswers[thisanswer]).score += 100;
  });
  socket.on('nextVote',()=>{
      voted = false;
      voteRecieved = 0;
      startVote(roundPrompts);
  }); 
  
});


//Start server
if (module === require.main) {
  startServer(roundPrompts);
}

module.exports = server;
