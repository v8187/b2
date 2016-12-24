var canvas, ctx,
	cellSize = 30,
	boardSize = cellSize * 15,
	tokenSize = cellSize *.65,
	starRadius = cellSize *.4,
	starVertexes = 5,
	starColor = '#333',
	arrowColor = '#ccc',
	colors = ['#f44', '#4f4', '#44f', '#ff4'],
	default_players = [{
		id : 1,
		name : 'Player 1',
		tokens : []
	},{
		id : 2,
		name : 'Player 2',
		tokens : []
	},{
		id : 3,
		name : 'Player 3',
		tokens : []
	},{
		id : 4,
		name : 'Player 4',
		tokens : []
	}],
	//colors = ['#555', '#888', '#aaa', '#eee'],

	//Set points for Home (Coloured) Tracks
	htData = [
		[1, 6, 1, 8, 6, 8, 6, 7, 2, 7, 2, 6],
		[9, 1, 7, 1, 7, 6, 8, 6, 8, 2, 9, 2],
		[14, 9, 14, 7, 9, 7, 9, 8, 13, 8, 13, 9],
		[6, 14, 8, 14, 8, 9, 7, 9, 7, 13, 6, 13]
	],
	// Set points for Players' Yards
	yardSide = cellSize * 6 - 1,
	yardInnerSide = cellSize * 4 - 1,
	yardP1 = cellSize * 9 + 1,
	yardP2 = cellSize * 1 + 0.5,
	yardP3 = yardP1 + yardP2,
	yards = [
	    [1, 1, yardP2, yardP2],
	    [yardP1, 1, yardP3, yardP2],
	    [yardP1, yardP1, yardP3, yardP3],
	    [1, yardP1, yardP2, yardP3]
	],
	// Data for finishing point triangles
	triangles = [
	    [6, 6, 6, 9, 7.5, 7.5],
	    [6, 6, 9, 6, 7.5, 7.5],
	    [9, 6, 9, 9, 7.5, 7.5],
	    [6, 9, 9, 9, 7.5, 7.5]
	],
	// Data for Token's default positions in Player yard
	initialPositions = [
	    [[1.7, 1.7], [3.3, 1.7], [1.7, 3.3], [3.3, 3.3]],
	    [[10.7, 1.7], [12.5, 1.7], [10.7, 3.3], [12.5, 3.3]],
	    [[10.7, 10.7], [12.5, 10.7], [10.7, 12.5], [12.5, 12.5]],
	    [[1.7, 10.7], [3.3, 10.7], [1.7, 12.5], [3.3, 12.5]]
	],
	// Data for Token's destination positions
	destinationPositions = [[6,7], [7,6], [8,7],[7,8]],
	commonTracks = [
        [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],			[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],		[7,0],
        [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],			[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],	[14,7],
        [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],		[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],	[7,14],
        [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],		[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],		[0,7]
    ],
    playerTracks = [
        commonTracks.slice(1, 52).concat([[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]]),
        commonTracks.slice(14, 52).concat(commonTracks.slice(0, 13)).concat([[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]]),
        commonTracks.slice(27, 52).concat(commonTracks.slice(0, 26)).concat([[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]),
        commonTracks.slice(40, 52).concat(commonTracks.slice(0, 39)).concat([[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]])
    ],
	// Data for direction arrows
	arrows = [
	    { line: [2.6, 6.5, 3.4, 6.5], end: [-5, -4, -5, 4] },
	    { line: [5.6, 6.4, 6.4, 5.6], end: [-6, 0, 0, 6] },
	    { line: [8.5, 2.6, 8.5, 3.4], end: [-4, -5, 4, -5] },
	    { line: [8.6, 5.6, 9.4, 6.4], end: [-6, 0, 0, -6] },
	    { line: [12.4, 8.5, 11.6, 8.5], end: [5, -4, 5, 4] },
	    { line: [9.4, 8.6, 8.6, 9.4], end: [0, -6, 6, 0] },
	    { line: [6.5, 12.4, 6.5, 11.6], end: [-4, 5, 4, 5] },
	    { line: [6.4, 9.4, 5.6, 8.6], end: [0, 6, 6, 0] },
	    { line: [1.4, 8.5, 1, 8.5, 1, 8, 1, 7.5, 1.4, 7.5], end: [-5, -4, -5, 4], startAngle: 0.5, endAngle: -0.5 },
	    { line: [6.5, 1.4, 6.5, 1, 7, 1, 7.5, 1, 7.5, 1.4], end: [-4, -5, 4, -5], startAngle: -1, endAngle: 0 },
	    { line: [13.6, 6.5, 14, 6.5, 14, 7, 14, 7.5, 13.6, 7.5], end: [5, -4, 5, 4], startAngle: -0.5, endAngle: 0.5 },
	    { line: [8.5, 13.6, 8.5, 14, 8, 14, 7.5, 14, 7.5, 13.6], end: [-4, 5, 4, 5], startAngle: 0, endAngle: -1 }
	],
	// Data for Safe cell Stars
	stars = [
	    [2.5, 8.5], [6.5, 2.5], [12.5, 6.5], [8.5, 12.5]
	],
	namePositions = [],
	textColor = '#333',
	textFont = 'italic 16px Calibri, Arial, sans-serif',
	textAlign = 'center';