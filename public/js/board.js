//Get Cell X and Y for given nth row and column
function cellAxis(cell, nAdjust) {
	var x = cellSize * cell[0],
	    y = cellSize * cell[1];
	
	if (nAdjust) {
	    x += nAdjust;
	    y += nAdjust;
	}
	return [x, y];
}

//Draw Polygon or polyline
function drawPath(points, adjustAxis, color, border) {
	var axis = cellAxis(points, adjustAxis);
	
	ctx.beginPath();
	ctx.moveTo(axis[0], axis[1]);
	
	var i = 1;
	do {
	    axis = cellAxis([points[++i], points[++i]], adjustAxis);
	    ctx.lineTo(axis[0], axis[1]);
	} while (i < points.length);
	ctx.closePath();
	if (color) {
	    ctx.fillStyle = color;
	    ctx.fill();
	}
	if (border){
	    ctx.stroke();
	}
}

function drawArrow(data) {
	var pts = [];
	
	for (var i = 0; i < data.line.length; i++) {
	    pts.push(data.line[i] * cellSize + 0.5);
	}
	var x2 = pts[pts.length - 2],
	    y2 = pts[pts.length - 1];
	
	ctx.save();
	ctx.fillStyle = arrowColor;
	ctx.strokeStyle = arrowColor;
	ctx.beginPath();
	ctx.moveTo(pts[0], pts[1]);
	ctx.lineTo(pts[2], pts[3]);
	if (data.startAngle != undefined) {
	    ctx.arc(pts[4], pts[5], cellSize / 2, Math.PI * data.startAngle, Math.PI * data.endAngle, false);
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.moveTo(pts[6], pts[7]);
	    ctx.lineTo(pts[8], pts[9]);
	
	}
	
	ctx.lineTo(x2 + data.end[0], y2 + data.end[1]);
	ctx.lineTo(x2 + data.end[2], y2 + data.end[3]);
	ctx.lineTo(x2, y2);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawStar(cell) {
	 ctx.save();
	ctx.strokeStyle = starColor;
	ctx.beginPath();
	for (var i = 0; i <= starVertexes * 2; ++i) {
	    var angle = i * Math.PI / starVertexes - Math.PI / 2,
	        radius = i % 2 == 0 ? starRadius : starRadius / 2.5;
	
	    ctx.lineTo(cell[0] * cellSize + 0.4 + radius * Math.cos(angle), cell[1] * cellSize + 0.4 + radius * Math.sin(angle));
	}
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
}

function drawNames(game) {
	
	var i = 0, 
		positions = [[cellSize*3, cellSize*1.5], [cellSize*12, cellSize*1.5],
		             [cellSize*12, cellSize*10.5], [cellSize*3, cellSize*10.5]],
		players = game && game.players ? game.players : default_players, 
		len = players.length;
	
	ctx.save();
	ctx.fillStyle = textColor;
	for(;i < len; i++) {
		ctx.fillText(players[i].name, positions[i][0], positions[i][1] + 2, cellSize*6);
	}
	ctx.restore();
}

function drawBoard(game) {
	// Clear the canvas first
	ctx.clearRect(0,0, canvas.width, canvas.height);
	// Draw Home (Coloured) Tracks
	for (var i = 0; i < 4; i++) {
	    drawPath(htData[i], 0.5, colors[i]);
	}

	// Draw horizontal & hertical lines for grid
	for (var i = 0; i <= 15; i++) {
	    drawPath([i, 0, i, 15], 0.5, null, 1);
	    drawPath([0, i, 15, i], 0.5, null, 1);
	}

	// Draw direction Arrows
	for (var i = 0; i < arrows.length; i++) {
	    drawArrow(arrows[i]);
	}

	for (var i = 0; i < 4; i++) {
	    // Draw finishing point triangles
	    drawPath(triangles[i], 0.5, colors[i], 1);
	
	    // Draw yard outer rectangles
	    ctx.fillRect(yards[i][0], yards[i][1], yardSide, yardSide);
	
	    // Draw yard inner rectangles
	    ctx.fillStyle = '#fff';
	    ctx.fillRect(yards[i][2], yards[i][3], yardInnerSide, yardInnerSide);
	    ctx.strokeRect(yards[i][2], yards[i][3], yardInnerSide, yardInnerSide);
	
	    //Draw safe point stars
	    drawStar(stars[i]);
	}
	
	 // Render non-moving tokens
    var i = 0, j,
		players = game.players || default_players, 
		len = players.length;
	
	for (; i < len; i++) {
		j = 0;
		for (; j < 4; j++) {
			!players[i].tokens[j].moving && players[i].tokens[j].render();
	    }
	}
	
	drawNames(game);
}