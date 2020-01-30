"use strict";
var mongoClient=require("mongodb").MongoClient;
var http=require("http");
var dispatcher=require("./dispatcher");
var fs=require("fs");
var jsdom=require("jsdom");
var port=8888;

dispatcher.addListener("GET", "/page.html", function(req, res){
    inviaPagStuduenti(req,res,"");
});

dispatcher.addListener("POST", "/page.html", function(req, res){
    var idStudente=req["post"]["lstStudenti"];
    console.log("id: " + idStudente);
    inviaPagStuduenti(req,res,idStudente);
});

function inviaPagStuduenti(req, res, idStudente){
    caricaDOM("./static/page.html",function(window){
        var header={"Content-Type":"text/html;charset=utf-8"};
        var $=window.$;
        mongoClient.connect("mongodb://127.0.0.1:27017",{"useNewUrlParser":true},function(err,client){
            if(err){
                error(res,{"code":500,"message":"Errore connessione db. "+err.message});
                response.end();
            }
            else{
                var db=client.db("studenti");
                var studenti=db.collection("alunni");
                var lst=$("#lstStudenti");
                studenti.find({}).toArray(function(er,results){
                    if(er){
                        error(res, {"code":500,"message":"Errore durante la query. "+er.message});
                        res.end();
                    }
                    else{
                        for(let i=0;i<results.length;i++){
                            let opt=$("<option></option>");
                            opt.val(results[i]._id);
                            opt.html(results[i].nome);
                            lst.append(opt);
                        }
                        if(idStudente!=""){
                            //Gestione listener POST
                            idStudente=parseInt(idStudente);
                            studenti.find({_id: idStudente}).toArray(function(er,results){
                                if(er){
                                    error(res, {"code":500,"message":"Errore durante la query. "+er.message});
                                    res.end();
                                }
                                else{
                                    $("#dettagli").show();
                                    console.log(results[0]);
                                    $("#txtCodice").attr("value",results[0]._id);
                                    $("#txtNome").attr("value",results[0].nome);
                                    $("#txtEta").attr("value",results[0].eta);
                                    $("#txtResidenza").attr("value",results[0].residenza);
                                    if(results[0].sports!=null)
                                        $("#txtSport").attr("value",results[0].sports);
                                    else
                                        $("#txtSport").attr("value","Nessuno sport");
                                    res.writeHead(200,header);
                                    //refresh della pagina
                                    res.end(window.document.documentElement.outerHTML);
                                }
                            });
                        }
                        else{
                            $("#dettagli").hide();
                            res.writeHead(200,header);
                            //refresh della pagina
                            res.end(window.document.documentElement.outerHTML);
                        }
                    }
                    client.close();
                });
            }
        });
    });
}

function error(res, err) {
    res.writeHead(err.code, {"Content-Type": 'text/html;charset=utf-8'});
    res.write("Codice errore: " + err.code + " - " + err.message);
}


/***********  Server ***************/
http.createServer(function(req,res){
    dispatcher.dispatch(req,res);
}).listen(port);
console.log("Server running on port " + port);

function caricaDOM(page, callback){
    var jquery="./static/jquery.js";
    var html=fs.readFileSync(page,"utf8");
    jsdom.env(html,[jquery],function(errors, window){
        if(!errors)
            callback(window);
    });
}