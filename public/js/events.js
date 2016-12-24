(function() {
	
	var socket = io(), activeGames, gameJoined, 
		canvasClick = false, activePlayer, player = {},
	
		$playerName, $overlay, $formName, $txtName,
		$screenGameSelection, $screenWait, $btnStartGame, $btnDice,
		$availableGamesList, $messageContainer, $waitMessage, $instructions, $turnInfo;
	
	function setPlayerName(evt) {
		
		evt.preventDefault();
		
		var name = $txtName.val(),
			ss = sessionStorage.getItem('___ldg');
		
		ss  = ss ? JSON.parse(ss) : null;
		
		if(name) {
			player.name = name;
			$playerName.html(name);
			
			ss ? (ss.player = player) : (ss = {player: player});
			sessionStorage.setItem('___ldg', JSON.stringify(ss));
			
			$formName.slideUp();
			$screenGameSelection.slideDown();
			showAvailableGames();
		} else {
			$txtName.focus();
			return false;
		}
	}
	
	function goToNameForm(evt) {
		
		evt.preventDefault();
		
		$overlay.show();
		$formName.slideDown();
		$screenGameSelection.hide();
		$screenWait.hide();
		$txtName.focus();
	}
	
	function goToGamesList(evt) {
		
		evt.preventDefault();
		quitGame();
		$screenGameSelection.slideDown();
		showAvailableGames();
	}
	
	function showAvailableGames() {
		var html = '',
			$tr, activeGame, availableGames = 0;
		
		$availableGamesList.html('');
		
		for(activeGame in activeGames) {
			if(activeGames.hasOwnProperty(activeGame) && !activeGames[activeGame].started) {
				availableGames++;
				$tr = $('<tr><td>' + activeGame + '</td><td>' + activeGames[activeGame].joined + '</td></tr>');
				$tr.data({game: activeGames[activeGame]});
				$availableGamesList.append($tr);
			}
		}
		!availableGames && $availableGamesList.append($('<tr><td colspan="2">No game is available to join...</td></tr>'));
	}
	
	function updateWaitScreen(game) {
		$waitMessage.html(game.joined - 1 + ' more players joined Game "' + game.id + '".<br /><br /> Wait while other players join...');
		
		if(game.joined > 1) {
			$btnStartGame.fadeIn(300);
		} else {
			$btnStartGame.hide(0);
		}
	}
	
	function quitGame() {
		
		$screenWait.hide();
		$overlay.show();
		//initGame();
		socket.emit('quitGame', gameJoined); 
		canvasClick = false;
	}
	
	function joinGame(evt) {
		
		evt.stopPropagation();
		
		var game = $(this).data('game');		
		
		if(game) {
			socket.emit('joinGame', game, player.name);
			waitForPlayers(game);
		}
	}
	
	function newGame(evt) {
		
		evt.preventDefault();
		socket.emit('createGame', player.name);
	}
	
	function updateActiveGames(data) {
		activeGames = data;
		($screenGameSelection = $('#screenGameSelection')).is(':visible') && showAvailableGames();
	}
	
	function updateControlPanel() {
		$btnDice
			.removeClass('player1 player2 player3 player4 active')
			.addClass('player' + activePlayer.index)
			.prop('disabled', player.id !== activePlayer.id);
		
		if(player.id === activePlayer.id) {
			$btnDice.addClass('active');
			
			$turnInfo.html('Your turn');
			$instructions
				.html('Roll the Dice')
				.addClass('highlight_player' + player.index);
		} else {
			$turnInfo.html(activePlayer.name+ '\'s turn');
			$instructions
				.html('&nbsp;')
				.removeClass('highlight_player' + player.index);
		}
	}
	
	function waitForPlayers(game) {
		
		$screenGameSelection.is(':visible') && $screenGameSelection.slideUp();
		updateWaitScreen(game);
		$screenWait.slideDown();
	}
	
	function startGame() {
		
		initGame(gameJoined);
		socket.emit('startGame', gameJoined);
	}
	
	function handleClick(e) {
		
		if(!canvasClick) {
			return false;
		}
		
		var mousePos = getMousePos(canvas, e),
			_curToken, i=0, dx, dy,
			_tokens = activePlayer.tokens,
			_diceResult = gameJoined.diceResult;
		
		for(;i<4;i++) {
			_curToken = _tokens[i];
			dx = mousePos.x - _curToken.x;
			dy = mousePos.y - _curToken.y;
			r = _curToken.r;
			
			if((dx * dx + dy * dy < r * r) && 
			   ((_curToken.cell === -1 && _diceResult === 6) || 
			   (_curToken.cell >= 0 && (57 -_curToken.cell > _diceResult)))) {
				canvasClick = false;
				socket.emit('tokenSelected', {
					gameId : gameJoined.id,
					playerId : _curToken.playerId,
					playerIndex : _curToken.playerIndex,
					tokenIndex : _curToken.index,
					steps : _curToken.cell === -1 ? 1 : _diceResult
				});
				return;
			}
		}
	}

	function rollDice() {
		
		$btnDice
			.removeClass('active')
			.prop('disabled', true);
		
		 socket.emit('diceRoll', {
			 gameId : gameJoined.id,
			 diceResult : Math.floor(Math.random() * (7 - 1)) + 1,
			 activePlayer : activePlayer
		 });
	}
	
	// Socket.io Event Handlers
	function onConnection(dummyGame, gamesList) {
		initGame(dummyGame);
		updateActiveGames(gamesList);
	}
	function onGameError(error) {
		$messageContainer.html(error.message);
	}
	function onGamesListUpdated(data) {
		updateActiveGames(data);
	}
	function onGameCreated(game) {

		waitForPlayers(game);
		gameJoined = game;
	}
	function onGameStarted(game) {
		
		$screenWait.slideUp();
		$overlay.hide();
		
		gameJoined = game;
		initGame(gameJoined);
		player = {};
		$.extend(player, getPlayerById(gameJoined.players, this.id));
		
		activePlayer = getActivePlayer(gameJoined.players);
		
		$btnDice.val(0).text(0);
		
		updateControlPanel();
	}
	function onGameJoined(game) {
		updateWaitScreen(game);
		
		gameJoined = game;
	}
	
	function onDiceRolled(data) {
		
		gameJoined.diceResult = data.diceResult;
		
		$btnDice
			.addClass('player' + activePlayer.index)
			.val(gameJoined.diceResult)
			.text(gameJoined.diceResult);
	}
	
	function onMoveToNextPlayer(data) {
		
		activePlayer = setActivePlayer(gameJoined.players, data.activePlayerId);
		console.log('Changing the active player to ', activePlayer.name);
		updateControlPanel();
	}
	
	function onSelectToken() {
		
		$btnDice
			.prop('disabled', true)
			.removeClass('active');
		
		$instructions
			.html('Select a token to move out')
			.addClass('highlight_player' + player.index);
		
		canvasClick = true;
	}
	
	function onMoveToken(data) {
		console.log('onMoveToken called..', data.tokenIndex, gameJoined.diceResult);
		var _token = gameJoined.players[data.playerIndex - 1].tokens[data.tokenIndex];
		
		_token.move(data.steps, gameJoined, function() {
			console.log('activePlayer.id: ', activePlayer.id, ', player.id: ', player.id);
			//if(activePlayer.id === player.id) {
				socket.emit('tokenMoved', {
					gameId : gameJoined.id,
					lastDiceResult : gameJoined.diceResult,
					activePlayerId : activePlayer.id,
					movedToken : _token
				});
			//}
		});
	}
	
	function onRollDice() {
		updateControlPanel();
	}
	
	function onGameEnded(dummyGame) {
		
		$messageContainer.html('1 Player has left the game. Please join another game.');
		gameJoined = null;
		$screenGameSelection.slideDown();
		$overlay.show();
		$screenWait.hide();
		showAvailableGames();
		initGame(dummyGame);
		player = {};
		$btnDice
			.removeClass('player1 player2 player3 player4 active')
			.prop('disabled', true)
			.val('Dice')
			.text('Dice');
		
		canvasClick = false;
	}
	
	$(document).ready(function() {
		
		var ss = sessionStorage.getItem('___ldg');
		// Store Elements references
		$playerName = $('#playerName');
		$overlay = $('#overlay').show();
		$formName = $('#formName');
		$screenGameSelection = $('#screenGameSelection');
		$screenWait = $('#screenWait');
		$txtName = $('#txtName');
		$btnStartGame = $('#btnStartGame');
		$availableGamesList = $('.activeGamesList tbody');
		$messageContainer = $('#messageContainer');
		$waitMessage = $('#waitMessage');
		$btnDice = $('#btnDice').val(0);
		$instructions = $('#instructions');
		$turnInfo = $('#turnInfo');
		
		$('#screenGame').show();
		
		if(ss) {
			player = JSON.parse(ss).player;
			socket.playerName = player.name;
			$playerName.html(player.name);
			$screenGameSelection.slideDown();
		} else {
			$formName.slideDown();
			$txtName.focus();
		}
		
		// Bind elements Events
		$formName.on('submit', setPlayerName);
		$btnStartGame.on('click', startGame);
		$('.activeGamesList tbody').on('click', 'tr', joinGame);
		$('.btn-change-name').on('click', goToNameForm);
		$('.btn-game-selection, #btnAvailableGame').on('click', goToGamesList);
		$('#btnNewGame').on('click', newGame);
		$btnDice.on('click', rollDice);
		$('#canvas1').on('click', handleClick);
	});
	
	// Socket.io Events
	socket
		.on('connected', onConnection)
		.on('gamesListUpdated', onGamesListUpdated)
		.on('gameCreated', onGameCreated)
		.on('gameError', onGameError)
		.on('gameStarted', onGameStarted)
		.on('gameEnded', onGameEnded)
		.on('gameJoined', onGameJoined)
		.on('diceRolled', onDiceRolled)
		.on('moveToNextPlayer', onMoveToNextPlayer)
		.on('selectToken', onSelectToken)
		.on('moveToken', onMoveToken)
		.on('rollDice', onRollDice);
}());
