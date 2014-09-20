var _ToasterOvenId = "55ff6c065075555339401487";
var _AustinAccessToken = "76a42c019867165fc0f527a59ca90b72de7b3a21";
var myToasterOven = new toasterOven(_ToasterOvenId, _AustinAccessToken);

var express = require('express');

var app = express(),
  request = require('request'),
  path = require('path'),
  url = require('url');
  
app.configure(function() {
  app.set('port', process.env.PORT || 80);
  app.use(express.favicon());
  app.use(app.router);
});

app.get('/toasteroven/set/:temp', function(req, res, next){
  return res.send(myToasterOven.setTemp(req.params.temp));
});

app.get('/toasteroven/off', function(req, res, next){
  return res.send(myToasterOven.off());
});

app.get('/toasteroven/broil', function(req, res, next){
  return res.send(myToasterOven.broil());
});

app.get('/toasteroven/getDoor', function(req, res, next){
  return res.send(myToasterOven.doorStatus);
});

function toasterOven(deviceID, token) {
  this.did = deviceID;
  this.parentToken = token;
  this.doorStatus = null;
  this.updating = false;
  
  this.off = function() {
    sparkPost(this.parentToken, this.did, "knob", "0");
  }

  this.broil = function() {
    sparkPost(this.parentToken, this.did, "knob", "180");
  }

  this.setTemp = function (temp) {
    temp = parseInt(temp);
    if (temp !== undefined && temp > 199 && temp < 451) {
      angle = 50 + 80*((temp-200)/250);
      sparkPost(this.parentToken, this.did, "knob", angle.toString());
    }
  }

  setInterval(function() {
    sparkGet(token, deviceID, "door", function(error, response, body) {
      console.log(body);
      body = JSON.parse(body);
      if (body !== undefined && body.result !== undefined) {
        if (body.result == 0) this.doorStatus = "open";
        else if (body.result == 1) this.doorStatus = "closed";
      } else this.doorStatus = null;
    });
  }, 500)

}

function sparkGet(token, deviceID, variable, cb) {
  console.log("https://api.spark.io/v1/devices/" + deviceID + "/" + variable + "?access_token=" + token)
  request.get(
    "https://api.spark.io/v1/devices/" + deviceID + "/" + variable + "?access_token=" + token, cb
  )
}

function sparkPost(token, deviceID, action, params) {
  request.post(
    "https://api.spark.io/v1/devices/" + deviceID + "/" + action + "?access_token=" + token,
    {form: {args: params}}, function (error, response, body) {
      if (!error && response.statusCode == 200) return body;
      else return "error";
    }
  )
}

app.listen(app.get('port'));
