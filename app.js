var path = require('path'),
	express = require('express'),
	app = express(),
	http = require('http'),
	server = http.Server(app),
	io = require('socket.io')(server);

// Variables to store Application's data/states
var sockets = {},
	games = {},
	_log = console.log,
	
	MAX_GAMES = 10,
	MAX_PLAYERS = 4,
	SAFE_CELLS = ['16', '62', '81', '126', '138', '812', '613', '28'],
	COLORS = ['#f44', '#4f4', '#44f', '#ff4'];

//Express Middleware for serving static files
app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(3000, function(){
  _log('listening on *:3000');
});

function getUniqueGameID() {
	var a = Math.floor(100000 + Math.random() * 900000) + '';
	a = a.substring(2);
	
	if(games[a]) {
		getUniqueGameID();
	} else {
		return a;
	}
}

function getGameObj(id, players, joined) {
	return {
		id: id || null,
		joined: joined || 0,
		players: (players && players.length) ? players :null,
		started: false,
		isMoving: false,
		isOver: false,
		diceResult : null
	};
}

function getGameByPlayer(playerId) {
	
	var id, game;
	
	for(id in games) {
		game = games[id];
		
		if(games.hasOwnProperty(game.id) && game.players) {
			//game.players.indexOf(playerId) >= 0
			var players = game.players,
				len = players.length,
				i = 0;
			
			for(; i< len; i++) {
				if(players[i].id === playerId) {
					return game;
				}
			}
		}
	}
	return null;
}

function getActivePlayer(players) {
	return players.filter(function(argPlayer) {
		return argPlayer.active;
	})[0];
}

function setActivePlayer_Random(players) {
	players[Math.floor(Math.random() * players.length)].active = true;
}

function setActivePlayer_Next(players) {
	
	var actPlayer = getActivePlayer(players),
		nextPlayer = players[(actPlayer.index === players.length) ? 0 : actPlayer.index];
	
	actPlayer.active = false;
	
	nextPlayer.active = true;
	
	return nextPlayer;
}


function parseSocketId(id) {
	return (id && id.indexOf('/#') === 0) ? id.replace('/#', '') : id;
}

function tokensOnTrack(tokens, steps) {
	
	return tokens.filter(function(token) {
		return token.cell >= 0 && token.cell < 57 && 57 - token.cell > steps;
	});
}

function tokensYetToStart(tokens) {
	
	return tokens.filter(function(token) {
		return token.cell === -1;
	});
}

function otherPlayersTokensAtCell(cellXY, game, excludePlayerId) {
	
	var gameTokens  = [];
	_log('cellXY:', cellXY);
	_log('excludePlayerId:', excludePlayerId);
	game.players.forEach(function(player) {
		
		if(player.id === excludePlayerId) return;
		gameTokens = gameTokens.concat(player.tokens);
	})
	_log('gameTokens length:', gameTokens.length);
	return gameTokens.filter(function(token) {
		_log('token.cell === cellXY', token.position.current.join(''), cellXY, token.position.current.join('') === cellXY);
		return token.position.current.join('') === cellXY && SAFE_CELLS.indexOf(token.cell) === -1;
	});
}

function tokensCanMove(tokens, stepsToGo) {
	
	return tokens.filter(function(token) {
		return (57 - token.cell) >= stepsToGo;
	});
}

function startGame(game) {
	
	games[game.id] = game;
	game = games[game.id];
	game.started = true;
	
	setActivePlayer_Random(game.players);
	
	io.to(game.id).emit('gameStarted', game);
	io.emit('gamesListUpdated', games);
	_log('Game "%s" started with %s players', game.id, game.joined);
}

function endGame(socketId) {
	
	socketId = parseSocketId(socketId);
	// Remove player from Game to which he/she is joined and end the game
	var gameWithPlayer = getGameByPlayer(socketId);
	
	// If player joined any game, reset and end that game 
	if(gameWithPlayer) {
		games[gameWithPlayer.id] = getGameObj(gameWithPlayer.id);
		
		io.to(gameWithPlayer.id).emit('gameEnded', getGameObj());
		_log('Game "%s" ended because Player "%s" has left.', gameWithPlayer.id, socketId);
		io.emit('gamesListUpdated', games);
	}
}

function onCreateGame(playerName) {
	
	if(Object.keys(games).length === MAX_GAMES) {
		io.emit('gameError', {message: 'Cannot create new game.' + '\n' + 'Maximum 10 games can be created at a moment.'});
		
		return false;
	}
	
	var uniId = getUniqueGameID();
	this.playerName = playerName;
	games[uniId] = getGameObj(uniId, [{
		index : 1,
		active : false,
		id : parseSocketId(this.id),
		name : playerName,
		tokens : [],
		color : COLORS[0]
	}], 1);
	
	this.join(uniId);
	_log('New game "%s" created.', uniId);
	
	io.emit('gamesListUpdated', games);
	this.emit('gameCreated', games[uniId]);
}

function onJoinGame(game, playerName) {
	
	var gameItem = games[game.id];
	this.playerName = playerName;
	if(!gameItem) {
		this.emit('gameError', {message: 'Game with id "' + game.id + '" does not exist.'});
		return false;
	} else {
		if(gameItem.joined < MAX_PLAYERS && !gameItem.started) {
			 gameItem.joined++;
			 !gameItem.players && (gameItem.players = []);
			 gameItem.players.push({
				 index : gameItem.joined,
				 active : false,
				 id: parseSocketId(this.id),
				 name: playerName,
				 tokens : [],
				 color : COLORS[gameItem.joined - 1]
			 });
			 this.join(gameItem.id);
			 io.to(gameItem.id).emit('gameJoined', gameItem);
			 _log('New player (socket Id: %s) joined game "%s". Total %s players have joined this game.', this.id, gameItem.id, gameItem.joined);
		 } else {
			 this.emit('gameError', {message: 'Cannot join game "' + game.id + '".'});
			 return false;
		 }
	}
	// Start the game if maximum players joined
	(gameItem.joined === MAX_PLAYERS) && startGame(gameItem);
	io.emit('gamesListUpdated', games);
}

function onStartGame(game) {
	
	startGame(game);
}

function onDiceRoll(data) {
	
	var _game = games[data.gameId],
		_diceResult = data.diceResult,
		_activePlayer = getActivePlayer(_game.players),
	 	_lenTokensCanMove = tokensCanMove.call(this, _activePlayer.tokens, _diceResult).length,
	 	_yetToStart = tokensYetToStart.call(this, _activePlayer.tokens), 
	 	_lenToStart = _yetToStart.length,
	 	_tokensOnTrack = tokensOnTrack.call(this, _activePlayer.tokens, _diceResult), 
	 	_lenOnTrack = _tokensOnTrack.length;
	
	_log('diceResult : ' + _diceResult, ', _activePlayer : ' + _activePlayer.name, ', _tokensCanMove : ' + _lenTokensCanMove,
			', _yetToStart : ' + _lenToStart, ', _tokensOnTrack : '+ _lenOnTrack);
	
	io.to(data.gameId).emit('diceRolled', data);
	
	if(!_lenTokensCanMove || 
	  (_diceResult < 6 && (!_lenOnTrack) || (_lenTokensCanMove === 1 && _lenToStart))) {
		_log('onDiceRoll -> Emit : moveToNextPlayer');
		io.to(data.gameId).emit('moveToNextPlayer', {
			activePlayerId : setActivePlayer_Next(_game.players).id
		});
		
	} else if((_lenTokensCanMove === 1) || (_lenOnTrack === 1 && _diceResult < 6)) {
		
		if(_lenTokensCanMove === 1 && _diceResult === 6 && _lenToStart === 1) {
			_tokenIndex = _yetToStart[0].index;
			_steps = 1;
		} else {
			_tokenIndex = _tokensOnTrack[0].index;
			_steps = _diceResult;
		}
		
		_log('onDiceRoll -> Emit : moveToken');
		games[data.gameId].pendingMoves = games[data.gameId].players.length;
		io.to(data.gameId).emit('moveToken', {
			gameId : _game.id,
			playerId : _activePlayer.id,
			playerIndex : _activePlayer.index,
			tokenIndex : _tokenIndex,
			steps : _steps
		});
	} else if(_lenTokensCanMove > 1) {
		_log('onDiceRoll -> Emit : selectToken');
		this.emit('selectToken');
	}
}

function onTokenSelected(data) {
	games[data.gameId].pendingMoves = games[data.gameId].players.length; 
	io.to(data.gameId).emit('moveToken', data);
}

function onTokenMoved(data) {
	games[data.gameId].pendingMoves--;
	_log('onTokenMoved: Pending moves',games[data.gameId].pendingMoves);
	if(games[data.gameId].pendingMoves) {
		return false;
	}
	_log('onTokenMoved :', data.activePlayerId, getActivePlayer(games[data.gameId].players).id);
	//getActivePlayer(games[data.gameId].players).tokens[data.tokenIndex] = data.movedToken;
	games[data.gameId].players[data.movedToken.playerIndex - 1].tokens[data.movedToken.index] = data.movedToken;
	
	var _otherPlayersTokensAtCell = otherPlayersTokensAtCell(data.movedToken.position.current.join(''), games[data.gameId], getActivePlayer(games[data.gameId].players).id),
		_lenOtherPlayersTokensAtCell = _otherPlayersTokensAtCell.length;
	_log('_lenOtherPlayersTokensAtCell:',_lenOtherPlayersTokensAtCell);
	if(_lenOtherPlayersTokensAtCell) {
		games[data.gameId].pendingMoves = games[data.gameId].players.length * _lenOtherPlayersTokensAtCell;
		_otherPlayersTokensAtCell.forEach(function(token) {
			io.to(data.gameId).emit('moveToken', {
				gameId : data.gameId,
				playerId : token.playerId,
				playerIndex : token.playerIndex,
				tokenIndex : token.index,
				killed : true,
				originalData: data
			});
		});
		
		return false;
	}
	
	_log('data.lastDiceResult : ' , data.lastDiceResult);
	if(data.lastDiceResult === 6) {
		_log('onTokenMoved -> Emit : rollDice');
		sockets[data.activePlayerId].emit('rollDice');
	} else {
		_log('onTokenMoved -> Emit : moveToNextPlayer');
		io.to(data.gameId).emit('moveToNextPlayer', {
			activePlayerId : setActivePlayer_Next(games[data.gameId].players).id
		});
	}
}

function onQuitGame(game) {
	
	endGame(this.id);
}

function onDisconnect() {
	
	// Remove the new socket
	delete sockets[parseSocketId(this.id)];
	_log('Socket (%s) disconnected. %s sockets are connected.', this.playerName, Object.keys(sockets).length);
	endGame(this.id);
}

io.on('connection', function (socket) {
	
	// On Connection, send the Dummy game & the active games list to client
	socket.emit('connected', getGameObj(), games);
	
	// Store the new socket
	sockets[parseSocketId(socket.id)] = socket;
	_log('New Socket (%s) connected. Total %s sockets are connected.', socket.id, Object.keys(sockets).length);
	
	socket.on('disconnect', onDisconnect);
	socket.on('createGame', onCreateGame);
	socket.on('joinGame', onJoinGame);
	socket.on('startGame', onStartGame);
	socket.on('quitGame', onQuitGame);
	socket.on('diceRoll', onDiceRoll);
	socket.on('tokenSelected', onTokenSelected);
	socket.on('tokenMoved', onTokenMoved);
});