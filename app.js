var _ToasterOvenId = "55ff6a065075555312491887";
var _MicrowaveOvenId = "55ff6c065075555339401487"
var _AustinAccessToken = "76a42c019867165fc0f527a59ca90b72de7b3a21";

var myToasterOven = new toasterOven(_ToasterOvenId, _AustinAccessToken);
var myMicrowave = new microwave(_MicrowaveOvenId, _AustinAccessToken);

var favicon = require('serve-favicon');
var express = require('express');

var app = express(),
  request = require('request'),
  path = require('path'),
  url = require('url');
  
app.use(favicon(__dirname + '/favicon.ico'));

app.get('/toasteroven/set/:temp', function(req, res, next){
  myToasterOven.setTemp(req.params.temp, function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/toasteroven/off', function(req, res, next){
  myToasterOven.off(function (statusCode, data){
    res.status(statusCode).send(data);
  })
});

app.get('/toasteroven/broil', function(req, res, next){
  myToasterOven.broil(function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/toasteroven/getDoor', function(req, res, next){
  myToasterOven.doorStatus(function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/', function(req, res, next){
  res.status(400).send("Sorry, there's nothing here, try the toaster api"); 
})



function toasterOven(deviceID, token) {

  _this = this;

  _this.did = deviceID;
  _this.parentToken = token;
  _this.knob = null;
  
  _this.off = function(cb) {
    sparkPost(_this.parentToken, _this.did, "knob", "0", function(error, response, body) {
      if (!error) {
        _this.knob = 0;
        cb(200,"Oven set to off");
      } else cb (500, "Couldn't set spark to off")
    });
  }

  _this.broil = function(cb) {
    sparkPost(_this.parentToken, _this.did, "knob", "180", function (error, response, body) {
      if (!error) {
        _this.knob = "broil";
        cb(200,"Oven set to broil");
      } else cb(500, "Couldn't set spark to broil")
    });
  }

  _this.setTemp = function (temp, cb) {
    temp = parseInt(temp);
    if (temp !== undefined && temp > 199 && temp < 451) {
      angle = 50 + 80*((temp-200)/250);
      sparkPost(_this.parentToken, _this.did, "knob", angle.toString(), function (error, response, body) {
        if (!error) {
          _this.knob = temp;
          cb(200,"oven set to " + temp.toString());
        } else cb(500, "couldn't post temperature to the spark")
      };
    } else cb(400,"Please use a valid temperature, between 200 and 450");
  }

  _this.doorStatus = function (cb) {
    sparkGet(_this.parentToken, _this.did, "door", function (error, response, body) {
      body = JSON.parse(body);
      if (body !== undefined && body.result !== undefined) {
        if (body.result == 0) cb(200,"open");
        else if (body.result == 1) cb(200,"closed");
      } else cb(500,"error getting data from the spark");
    });
  }
}

function microwave(deviceID, token) {

  _this = this;
  _this.did = deviceID;
  _this.parentToken = token;

  _this.pause = function(cb) {
    sparkPost(_this.parentToken, _this.did, "press", "stop", function (error, response, body) {
      if (!error) cb(200, "Microwave Stopped");
      else cb(500, "Couldn't send the stop signal")
    });
  }

  _this.start = function(cb) {
    sparkPost(_this.parentToken, _this.did, "press", "start", function (error, response, body) {
      if (!error) cb(200, "Microwave Started");
      else cb(500, "Couldn't start Microwave");
    });
  }

  _this.five = function(cb) {
    sparkPost(_this.parentToken, _this.did, "press", "five", function (error, response, body) {
      if (!error) cb(200, "Five Pressed");
      else cb(500, "Couldn't press five");
    });
  }

  _this.nine = function(cb) {
    sparkPost(_this.parentToken, _this.did, "press", "nine", function (error, response, body) {
      if (!error) cb(200, "Nine Pressed");
      else cb(500, "Couldn't press nine");
    });
  }

  _this.power = function(cb) {
    sparkPost(_this.parentToken, _this.did, "press", "power", function (error, response, body) {
      if (!error) cb(200, "Power Pressed");
      else cb(500, "Couldn't press power");
    });
  }


  _this.stop = function(cb) {
    _this.pause(function(status, message) {
      if (status === 500) cb(status, message);
      else if (status === 200) _this.pause(cb);
      else cb(500, "Error stopping the microwave")
    }
  }

}

function sparkGet(token, deviceID, variable, cb) {
  request.get(
    "https://api.spark.io/v1/devices/" + deviceID + "/" + variable + "?access_token=" + token, 
    cb
  )
}

function sparkPost(token, deviceID, action, params, cb) {
  request.post(
    "https://api.spark.io/v1/devices/" + deviceID + "/" + action + "?access_token=" + token,
    {form: {args: params}}, 
    cb
  )
}

app.listen(process.env.PORT || 80);
