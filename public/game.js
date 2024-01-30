var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        connected: false,
        messages: [],
        chatmessage: '',
        username: '',
        password: '',
        prompt: '',
        player_state : 0,
        state : {state: 0,round: 1},
        isModalOpen : false,
        fail_message : '',
        players : [],
        me : {name: '',admin:false,audience:false},
        prompToanswer: [],
        answer:'',
        answer2: '',
        answers:[],
        isInputDisabled: false,
        promptToAnswers: new Map(),
        promptOnVote : 'default prompt',
        firstAnswer: '',
        secondAnswer: '',
        shouldVote: true,
        answer1Votes : [],
        answer2Votes: [],
        vote1Author: '',
        vote2Author: '',
        voting: true,
        isVoteDisabled: false,
        scoreList: {},
        voteRecieved: 0,
        playerToPrompt: {},
        audience:[],   
        
    },
    mounted: function() {
        connect(); 
    },
    methods: {
        handleChat(message) {
            if(this.messages.length + 1 > 10) {
                this.messages.pop();
            }
            this.messages.unshift(message);
        },
        chat() {
            socket.emit('chat',this.chatmessage);
            this.chatmessage = '';
        },
        register(){ 
            console.log("doing a register les go ");
            data = {username:this.username,password:this.password};
            socket.emit('register',data);
            this.username = '';
            this.password = '';
        },
        login(){
            console.log("doing a login les go ");
            data = {username:this.username,password:this.password};
            socket.emit('join',data);
            this.username = '';
            this.password = '';

        },
        closeModal(){
            this.isModalOpen = false;
        },
        openModal(){
            console.log('opening modal');
            this.isModalOpen = true;
        },
        fail(message){
            this.error = message;
            setTimeout(clearError,3000);

        },
        admin(command){
            if(command == 'scores'){
                this.voting = false;
                
            }
            socket.emit('admin',command);
        },
        update(data){
            console.log('updating now');
            this.players = data.players;
            this.state = data.state;
            this.me = data.player
            console.log('game state is ' + this.state.state);
        },
        update2(data){
            this.players = data.players;
            this.state = data.state;
            
            
        },
        submit(){
            socket.emit('submit',this.prompt);
            
            
        },
        answerEvent(prompts){
            this.prompToanswer = prompts;
        },
        submitAnswer(){
            this.player_state = 3;
            this.isInputDisabled = true;
            let data = {prompts:this.prompToanswer,answers:[this.answer]};
            
            if(this.prompToanswer.length == 2){
                data = {prompts:this.prompToanswer,answers:[this.answer,this.answer2]};
            }
            console.log(data);
            
            socket.emit('answers',data);
            socket.emit('myState',app.player_state);
        },
        voteOn(prompt,answers){
            this.promptOnVote = prompt;
            this.firstAnswer = answers[0];
            this.secondAnswer = answers[1];
        },
        choice1(){
            this.isVoteDisabled = true;
            socket.emit('chose',0);
        },
        choice2(){
            this.isVoteDisabled = true
            socket.emit('chose',1)
        },
        nextVote(){
            this.voteRecieved = 0;
            this.voted = false;
            socket.emit('nextVote');
        },
        newRound(){
            this.player_state = 1;
            prompToanswer: []
            this.answer = ''
            this.answer2 = ''
            this.answers = []
            this.isInputDisabled = false
            this.promptToAnswers.clear();
            this.promptOnVote ='default prompt';
            this.firstAnswer = '';
            this.secondAnswer = '';
            this.shouldVote = true;
            this.answer1Votes = [];
            this.answer2Votes = [];
            this.vote1Author = '';
            this.vote2Author =  ''
            this.voting = true;
            this.isVoteDisabled = false;


        }

        

    
    }
});


function connect() {
    //Prepare web socket
    socket = io();

    //Connect
    socket.on('connect', function() {
        //Set connected state to true
        app.connected = true;
    });

    //Handle connection error
    socket.on('connect_error', function(message) {
        alert('Unable to connect: ' + message);
    });

    //Handle disconnection
    socket.on('disconnect', function() {
        alert('Disconnected');
        app.connected = false;
    });

    //Handle incoming chat message
    socket.on('chat', function(message) {
        app.handleChat(message);
    });
    socket.on('login success',function() {
        console.log('login succesful');
        app.player_state = 1;
    
    });
    socket.on('login fail',function(msg) {
        console.log('lgin failure show message cause ' + msg); 
        app.fail_message = msg;
        var myModal = new bootstrap.Modal(document.getElementById('myModal'));
        myModal.show();
       
        
        
    });
    socket.on('admin',function(){
        console.log('i am the admin here');
        app.me.admin = true;
    });
    socket.on('fail',function(message){
        app.fail(message);
    });
    socket.on('update',function(data){
        app.update(data)
    });
    socket.on('prompt fail',function(msg) {
        console.log('prompt failure show message cause ' + msg); 
        app.fail_message = msg;
        var myModal = new bootstrap.Modal(document.getElementById('myModal2'));
        myModal.show();
       
        
        
    });
    socket.on('prompt success',function() {
        console.log('prompt success');
        app.prompt = '';
    
    });
    socket.on('answer',function(prompts){
        console.log('we got the prompt to answer ' + prompts);
        app.answerEvent(prompts);
    });
    socket.on('status',function(){
        socket.emit('myState',app.player_state);
    });
    socket.on('wait others',function(){
        var myModal = new bootstrap.Modal(document.getElementById('myModal3'));
        myModal.show();

    });
    socket.on('vote on',function(prompt,answers){
        app.isVoteDisabled = false;
        app.voting = true;
        if(app.prompToanswer.includes(prompt)){
            app.promptOnVote = prompt;
            app.shouldVote = false;
            if(answers.includes(app.answer)){
                socket.emit('myAnswer',app.answer);
            }else{
                socket.emit('myAnswer',app.answer2);
            }
        }
        else{
            console.log('should vote');
            app.shouldVote = true;
            app.voteOn(prompt,answers);}
    });
    socket.on('voteScores',function(data1,data2){
        console.log('got vote scores');
        app.vote1Author = data1.author;
        app.vote2Author = data2.author;
        app.answer1Votes = data1.voters;
        app.answer2Votes = data2.voters;
        app.voting = false;
    });
    socket.on('leaderboard',function(details){
        console.log('got a leaderboard ' + details);
        app.scoreList = details;
        
    });
    socket.on('new round',function(){
        app.newRound();
    });
    socket.on('vote recieved',function(voteRecieved){
        app.voteRecieved = voteRecieved;
    });
    socket.on('update2',function(data){
        app.update2(data);
    });
    socket.on('promptToplayers',function(prompttoplayers){
        app.playerToPrompt = prompttoplayers;
    });
   
    



    


}
