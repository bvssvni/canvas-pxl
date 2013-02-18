/**
 * canvas-pxl, 16x16 pixel editor that saves and reads from url.
 *
 * @version 0.000, http://isprogrammingeasy.blogspot.no/2012/08/angular-degrees-versioning-notation.html
 * @license GNU Lesser General Public License, http://www.gnu.org/copyleft/lesser.html
 * @author  Sven Nilsen, http://www.cutoutpro.com
 * @created 2008-06-15
 * @updated 2012-07-06
 * @link    http://www.github.com/bvssvni/canvas-pxl
 */

var workarea_id = "workarea";
var pencil_id = "pencil";
var eraser_id = "eraser";
var color_picker_id = "colorPicker";
var selected_color_id = "selectedColor";
var preview_id = "preview";
var preview2_id = "preview2";
var preview4_id = "preview4";
var square_colors = [];
var squares = [];
var scale_x = 32;
var scale_y = 32;
var selected_color = [0, 0, 0, 1];
var workarea_width = 0;
var workarea_height = 0;
var workarea_context = null;
var workarea_background_style = "#FFFFFF";
var grid_style = "#888888";
var grid_width = 16;
var grid_height = 16;

$(function() {
  $( "#tool" ).buttonset();
});

function mousePos(canvas, event) {
	var rect = canvas.getBoundingClientRect();
	return [event.clientX - rect.left, event.clientY - rect.top];
}

function openAsPNG(id) {
	var canvas = document.getElementById(id);
	window.open(canvas.toDataURL("image/png"));
	return false;
}

function renderLine(ctx, x1, y1, x2, y2) {
	if (ctx == null) throw "Missing argument \"ctx\"";
	if (x1 == null) throw "Missing argument \"x\"";
	if (y1 == null) throw "Missing argument \"y\"";
	if (x2 == null) throw "Missing argument \"x2\"";
	if (y2 == null) throw "Missing argument \"y2\"";
	
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

// LZW-compress a string
function lzw_encode(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i=1; i<data.length; i++) {
        currChar=data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        }
        else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase=currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i=0; i<out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}

// Decompress an LZW-encoded string
function lzw_decode(s) {
    var dict = {};
    var data = (s + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        }
        else {
			phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}

function posToGrid(x, y) {
	if (x == null) throw "Missing argument \"x\"";
	if (y == null) throw "Missing argument \"y\"";
	
	var gx = Math.floor(x / scale_x);
	var gy = Math.floor(y / scale_y);
	return [gx, gy];
}

function erasePixel(x, y) {
	var n = squares.length;
	for (var i = 0; i < n; i++) {
		var square = squares[i];
		var sx = square[0];
		var sy = square[1];
		if (sx == x && sy == y) {
			squares.splice(i, 1);
			square_colors.splice(i, 1);
			break;
		}
	}
}

function pickColorAt(x, y) {
	var n = squares.length;
	for (var i = 0; i < n; i++) {
		var square = squares[i];
		var sx = square[0];
		var sy = square[1];
		if (sx == x && sy == y) {
			return square_colors[i];
		}
	}
	
	// Return white as default.
	return [255, 255, 255];
}

function addSquare(x, y, color) {
	squares.push([x, y]);
	square_colors.push(color);
}

function renderGrid() {
	var ctx = workarea_context;
	ctx.strokeStyle = grid_style;
	var w = workarea_width;
	var h = workarea_height;
	var n = Math.ceil(workarea_width / scale_x);
	for (var i = 0; i < n; i++) {
		var p = i * scale_x;
		renderLine(ctx, 0, p, w, p);
		renderLine(ctx, p, 0, p, h);
	}
}

function renderSquares() {
	var ctx = workarea_context;
	for (var i = 0; i < squares.length; i++) {
		var c = square_colors[i];
		var str = "rgba("+c[0]+","+c[1]+","+c[2]+","+c[3]+")";
		ctx.fillStyle = str;
		
		var square = squares[i];
		var x = square[0] * scale_x;
		var y = square[1] * scale_y;
		
		ctx.fillRect(x, y, scale_x, scale_y);
	}
}

function renderPreview(id, scale) {
	var preview = document.getElementById(id);
	var ctx = preview.getContext("2d");
	var w = preview.width;
	var h = preview.height;
	ctx.fillStyle = workarea_background_style;
	ctx.fillRect(0, 0, w, h);
	for (var i = 0; i < squares.length; i++) {
		var c = square_colors[i];
		var str = "rgba("+c[0]+","+c[1]+","+c[2]+","+c[3]+")";
		ctx.fillStyle = str;
		
		var square = squares[i];
		var x = square[0] * scale;
		var y = square[1] * scale;
		
		ctx.fillRect(x, y, scale, scale);
	}
}

function renderWorkArea() {
	var workarea = document.getElementById(workarea_id);
	var ctx = workarea.getContext("2d");
	workarea_context = ctx;
	workarea_width = workarea.width;
	workarea_height = workarea.height;
	
	ctx.fillStyle = workarea_background_style;
	ctx.fillRect(0, 0, workarea_width, workarea_height);
	
	renderSquares();
	renderGrid();
	
	renderPreview(preview_id, 1);
	renderPreview(preview2_id, 2);
	renderPreview(preview4_id, 4);
}

function makeAddPixel(id) {
	var box = document.getElementById(id);
	var dragging = false;
	var pencil = document.getElementById(pencil_id);
	var eraser = document.getElementById(eraser_id);
	var colorPicker = document.getElementById(color_picker_id);
	var selectedColor = document.getElementById(selected_color_id);
	
	var addPixel = function(event) {
		if (!dragging) {
			return false;
		}
		
		var shouldPickColor = colorPicker.checked;
		var shouldErase = eraser.checked || pencil.checked;
		var shouldAddSquare = pencil.checked;
		
		var pos = mousePos(box, event);
		var x = pos[0];
		var y = pos[1];
		var gridPos = posToGrid(pos[0], pos[1]);
		var gx = gridPos[0];
		var gy = gridPos[1];
		var color = selected_color;
		
		
		if (shouldErase) {
			erasePixel(gx, gy);
		}
		if (shouldAddSquare) {
			addSquare(gx, gy, color);
		}
		if (shouldPickColor) {
			var c = pickColorAt(gx, gy);
			selectedColor.color.fromRGB(c[0]/255, c[1]/255, c[2]/255);
		}
		
		renderWorkArea();
		return false;
	}
	
	var mousedown = function(event) {
		event = event || window.event;
		
		dragging = true;
		return addPixel(event);
	}
	box.addEventListener("mousedown", mousedown, true);
	
	var mousemove = function(event) {
		event = event || window.event;
		box.style.cursor = "crosshair";
		
		return addPixel(event);
	}
	box.addEventListener("mousemove", mousemove, true);
	
	var mouseup = function(event) {
		dragging = false;
		box.style.cursor = "default";
		
		return false;
	}
	box.addEventListener("mouseup", mouseup, true);
}

function onLoad() {
	// Set prototype function.
	String.prototype.setCharAt = function(index, chr) {
		if(index > this.length-1) return str;
		return this.substr(0,index) + chr + this.substr(index+1);
	}
	
	readData();
	
	makeAddPixel(workarea_id);
	
	renderWorkArea();
}

function readData() {
	var str = window.location.search;
	if (str.length == 0 || str.indexOf("?data=") != 0) {
		return;
	}
	
	str = str.substring(str.indexOf("?data=") + "?data=".length);
	str = lzw_decode(decodeURIComponent(str));
	setData(str);
}

function setData(str) {
	var w = grid_width;
	var f = function(i) {
		return (str.charCodeAt(i) + (256 - 49)) % 256;
	}
	var n = Math.floor(str.length / 3);
	for (var i = 0; i < n; i++) {
		var r = f(3 * i + 0);
		var g = f(3 * i + 1);
		var b = f(3 * i + 2);
		var a = 1;
		if (r < 255 || g < 255 || b < 255) {
			var x = i % w;
			var y = Math.floor(i / w);
			addSquare(x, y, [r, g, b, a]);
		}
	}
}

function getData() {
	var str = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
	var w = grid_width;
	var f = function(val) {
		return String.fromCharCode((val + 49) % 256);
	}
	var stride = w * 3;
	for (var i = 0; i < squares.length; i++) {
		var square = squares[i];
		var p = 3 * square[0] + stride * square[1];
		var c = square_colors[i];
		str = str.setCharAt(p+0, f(c[0]));
		str = str.setCharAt(p+1, f(c[1]));
		str = str.setCharAt(p+2, f(c[2]));
	}
	return str;
}

function updateUrl() {
	var str = lzw_encode(getData());
	window.location.href = "?data=" + encodeURIComponent(str);
}

function onClear() {
	window.location.href = "?";
}

function updateColor(color) {
	var r = Math.round(255 * color.rgb[0]);
	var g = Math.round(255 * color.rgb[1]);
	var b = Math.round(255 * color.rgb[2]);
	var a = 1;
	selected_color = [r, g, b, a];
}

