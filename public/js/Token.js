function Token(config) {
	
	this.size = config.size;
	this.color = config.color;
	this.position = {
		initial: config.initPos,
		destination: config.destiPos,
		current: config.initPos
	};	
	this.index = config.index;
	this.playerId = config.playerId;
	this.playerIndex = config.playerIndex;
	this.r = null;
	this.x = null;
	this.y = null;
	this.cell = -1;
	this.moving = false;
}

Token.prototype = {
		
	render: function() {
		
		var cell = this.position.current,
			size = this.size,
			axis = cellAxis(cell);
		
		this.size = size;
		this.r = this.size / 2;
		this.x = axis[0] + (cellSize / 2),
	    this.y = axis[1] + (cellSize / 2);
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fillStyle = this.color;
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	},
	
	move: function(cellsCount, game, callback) {
		
		if(cellsCount !== -1 && this.cell > 57 - cellsCount) return false;
		
		this.moving = true;
		
		var reverse = cellsCount === -1,
			self = this, tempDesi,
			cur = self.position.current,
			destCell = reverse ? -1 :  self.cell + cellsCount,
			playerIndex = getActivePlayer(game.players).index - 1,
			interval = setInterval(_frame, 20);
		
		function _frame() {
			if(!tempDesi || ((reverse ? self.cell < 0 : self.cell < destCell) && cur.join('') === tempDesi.join(''))) {
				tempDesi = playerTracks[playerIndex][reverse ? (--self.cell) : (++self.cell)];
			}
			
			var atDestiX = cur[0] === tempDesi[0],
				atDestiY = cur[1] === tempDesi[1];
			
			if(self.cell === 0 && reverse) {
				
				tempDesi = initialPositions[playerIndex].tokens[self.index - 1];
				
			} else if(atDestiX && atDestiY) {
				self.moving = false;
				clearInterval(interval);
				callback && callback(this);
				return false;
			}
			
			if(!atDestiX) {
				cur[0] = parseFloat((cur[0] + (cur[0] < tempDesi[0] ?  0.1 : -0.1)).toFixed(1))
			}
			if(!atDestiY) {
				cur[1] = parseFloat((cur[1] + (cur[1] < tempDesi[1] ?  0.1 : -0.1)).toFixed(1))
			}
			drawBoard(game);
			self.render();
		}
	}
};