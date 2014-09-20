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
  myToasterOven.doorStatus(res);
});

function toasterOven(deviceID, token) {

  _this = this;

  _this.did = deviceID;
  _this.parentToken = token;
  _this.updating = false;
  _this.knob = null;
  
  _this.off = function() {
    sparkPost(_this.parentToken, _this.did, "knob", "0");
    _this.knob = 0;
  }

  _this.broil = function() {
    sparkPost(_this.parentToken, _this.did, "knob", "180");
    _this.knob = "broil"
  }

  _this.setTemp = function (temp) {
    temp = parseInt(temp);
    if (temp !== undefined && temp > 199 && temp < 451) {
      _this.knob = temp;
      angle = 50 + 80*((temp-200)/250);
      sparkPost(_this.parentToken, _this.did, "knob", angle.toString());
    }
  }

  _this.doorStatus = function (res) {
    sparkGet(_this.parentToken, _this.did, "door", function(error, response, body) {
      body = JSON.parse(body);
      if (body !== undefined && body.result !== undefined) {
        if (body.result == 0) res.send("open");
        else if (body.result == 1) res.send("closed");
      } else res.send("error");
    });
  }
}

function sparkGet(token, deviceID, variable, cb) {
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
