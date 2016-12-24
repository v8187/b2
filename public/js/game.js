

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

function tokensOnTrack(game) {
	
	var i = 0, _token, _tokens = [];
	
	for(;i< 4;i++) {
		_token = getActivePlayer(game.players).tokens[i];
		_token.cell >= 0 && _token.cell < 58 &&   _tokens.push(_token);
	}
	return _tokens;
}

function tokensAtCell(cellNo, game) {
	
	var i = 0, _token, _tokens = [];
	
	for(;i< 4;i++) {
		_token = getActivePlayer(game.players).tokens[i];
		_token.cell === cellNo &&  _tokens.push(_token);
	}
	return _tokens;
}

function getPlayerById(players, id) {
	return players.filter(function(argPlayer) {
		return argPlayer.id === id;
	})[0];
}

function getActivePlayer(players) {
	return players.filter(function(argPlayer) {
		return argPlayer.active;
	})[0];
}

function setActivePlayer(players, id) {
	return players.filter(function(argPlayer) {
		return argPlayer.active = (argPlayer.id === id);
	})[0];
}

function initGame(game) {
	
	canvas = document.getElementById('canvas1');
	ctx = canvas.getContext('2d');	
	canvas.width = boardSize + 10;
	canvas.height = boardSize + 1;
	ctx.lineWidth = 1;
	ctx.font = textFont;
	ctx.textAlign = textAlign;
	
	 // Initiate Tokens
    var i = 0, j, 
    	players = game.players || default_players, 
    	len = players.length;
    
    for (; i < len; i++) {
    	j = 0;
    	for (; j < 4; j++) {
    		var tknId = '' + i + j;
    		players[i].tokens[j] = new Token({
    			index: j,
    			playerIndex: players[i].index,
    			playerId: players[i].id,
    			size: tokenSize,
    			color: colors[i],
    			initPos: initialPositions[i][j],
    			destiPos: destinationPositions[i]
    		});
        }
    }
    drawBoard(game);
}

