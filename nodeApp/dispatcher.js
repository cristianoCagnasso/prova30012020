"use strict"
/* Questo dispatcher accetta come dinamica qualsiasi risorsa
   usa /api solo per differenziare la risposta di errore */

var url = require('url');
var fs = require('fs');
var mime = require("mime")
var queryString = require("querystring")
var stringaErrore;

var dispatcher = function() {
    this.prompt = ">_  ";
    this.listeners = {
        get: {},
        post: {},
        delete: {},
        put: {},
        patch: {}
    };
	// init() potrebbe essere richiamata come callback di listen()
    init();
}

dispatcher.prototype.addListener = function(metodo, risorsa, callback) {
    metodo = metodo.toLowerCase();
    this.listeners[metodo][risorsa] = callback;
}

dispatcher.prototype.showList = function() {
    var s = "";
    console.log("Elenco dei Listener registrati:")
    for (var key in this.listeners) {
        console.log(key);
        s += key + "<br>"
        var listeners = this.listeners[key];
        for (var key in listeners) {
            console.log(key);
            s += key + "<br>";
        }
    }
    return s;
}

//  *********************** PARTE 1  Dispatch ***************************	
dispatcher.prototype.innerDispatch = function(req, res) {
    var metodo = req.method.toLowerCase();
    // Lettura dei parametri GET 
	// (intercettati SEMPRE, qualunque sia il method della richiesta)	
    var _url = url.parse(req.url, false)
    var risorsa = _url.pathname;
    var params = _url.query || "";
	// L'utlima OR serve per intercettare i parametri get
	// nel caso di richieste lanciate direttamente dalla barra di navigazione
	    
	// lettura parametri get
	params = decodeURIComponent(params);
	try {
        // parametri get in formato JSON    
        req["get"] = JSON.parse(params);
    } catch (error) {
        // parametri get in formato url-encoded
        req["get"] = queryString.parse(params);
    }

    // log   
    console.log(this.prompt + metodo + ": " + risorsa);
    if (metodo != "get")
        console.log("parametri " + metodo + ": " + JSON.stringify(req[metodo]));
    console.log("parametri get: " + JSON.stringify(req["get"]));

    // dispatch
    if (risorsa in this.listeners[metodo]) {
        var callback = this.listeners[metodo][risorsa];
        callback(req, res);
    } else
        this.staticListener(req, res);
}

//  ******* PARTE 2 : Static e Error Listener  ************
dispatcher.prototype.staticListener = function(req, res) {
    var risorsa = url.parse(req.url).pathname;
    if (risorsa == '/')
        risorsa = "/index.html";

    // else if(risorsa == '/favicon.ico') risorsa = "/favicon.png";	

    var filename = "./static" + risorsa;

    var _this = this;
    // filename = percorso relativo o assoluto tramite __dirname
    fs.readFile(filename, function(err, content) {
        if (err)
            _this.errorListener(req, res);
        else {
            var header = { "Content-Type": mime.getType(filename) }
            res.writeHead(200, header);
            res.end(content);
        }
    });
}

dispatcher.prototype.errorListener = function(req, res) {
    var risorsa = url.parse(req.url)["pathname"];
    if (risorsa.substr(0, 4) == "/api") {
        var header = { "Content-Type": 'application/json;charset=utf-8' };
        res.writeHead(404, header);
        res.end("Risorsa non trovata");
    } else {
        var header = { "Content-Type": 'text/html;charset=utf-8' };
        res.writeHead(404, header);
        res.end(stringaErrore);
    }
}

function init (req, res) {
	 /* init() non è visibile all'esterno e non usa il THIS,
	    per cui può essere dichiarata come semplice function */
    fs.readFile("./static/error.html", function(err, content) {
        if (err)
            content = "<h1>Risorsa non trovata</h1>"
        stringaErrore = content.toString();
    });
}

//  ******* PARTE 3 : Lettura dei parametri POST **********
dispatcher.prototype.parsePostParameters = function(req, res) {
    var body = "";

    req.on("data", function(data) {
        body += data;
    });

    let _this = this;
    req.on("end", function() {
		let params;
		try {
			// parametri post formato JSON    
			params = JSON.parse(body)
		} 
		catch (error) {
			// parametri post formato url-encoded
			params = queryString.parse(body);
		}
		finally{
			var metodo = req.method.toLowerCase();
			req[metodo] = params;
			_this.innerDispatch(req, res);
		}
    });
}

dispatcher.prototype.dispatch = function(req, res) {
    if (req.method.toUpperCase() == "GET")
        this.innerDispatch(req, res);
    else
        this.parsePostParameters(req, res);
}

// export in forma anonima
module.exports = new dispatcher();