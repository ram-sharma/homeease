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
      });
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

  _this.recipes = {
    "pizza": [{ "time" : 900, "heat" : 400 }],
    "toast": [{ "time" : 300, "heat" : 450 }],
    "chicken": [{ "time" : 60, "heat" : 450 }, { "time" : 4800, "heat" : 400 }],
    "bacon": [{ "time" : 900, "heat" : 400 }],
    "crispy bacon": [ { "time" : 1080, "heat" : 410 }]
  }

  _this.cook = function (recipie, cb) {
    if (_this.recipies.recipie !== undefined)
      _this.setCycle(_this.recipies.recipie, cb);
    else cb(404, "Couldn't find that recipie");
  }

  _this.setCycle = function (steps, cb) {
    var cooktime = 0;
    try {
      for (step in steps) {
        setTimeout(function() {
          _this.setTemp(steps[step].heat, function() {})
        }, cooktime * 1000);
        cooktime += steps[step].time;
      }
      setTimeout(function() {
        _this.off(function() {})
      }, cooktime * 1000);
    } catch (e) {
      cb(500, "We couldn't parse your steps, sorry");
      return;
    } 
    cb(200, "Your meal will be ready in " + cooktime + " seconds");
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
      if (status === 200) _this.pause(cb);
      else cb(500, "Error stopping the microwave")
    });
  }

  _this.set = function(power, time, cb) { 
    if (power !== "high" && power !== "med" && power !== "low")
      return cb(400, "Power level must be high low or medium");
    if (isNan(time)) return cb(400, "Time must be in integer seconds");

    _this.nine(function (status, message) {
      if (status === 200) _this.nine(function (status, messages) {
        if (status === 200) _this.nine(function (status, messages) {
          if (status === 200) _this.nine(function (status, messages) {
            if (status === 200) { 
              if (power == "med") {
                _this.power(function (status, message) {
                  if (status === 200) _this.nine(function (status, message){
                    if (status === 200) {
                      setTimeout(function() {
                        _this.off(function(status, message) {})
                      }, time * 1000);
                      cb(200, "Your food will be ready in " + time + " seconds");
                    } else cb(500, "Error setting the microwave: " + message);
                  }); else cb(500, "Error setting the microwave: " + message);
                })
              } else if (power == "low") {
                _this.power(function (status, message) {
                  if (status === 200) _this.five(function (status, message){
                    if (status === 200) {
                      setTimeout(function() {
                        _this.off(function(status, message) {})
                      }, time * 1000);
                      cb(200, "Your food will be ready in " + time + " seconds");
                    } else cb(500, "Error setting the microwave: " + message);
                  }); else cb(500, "Error setting the microwave: " + message);
                })
              } else {
                setTimeout(function() {
                  _this.off(function(status, message) {})
                }, time * 1000);
                cb(200, "Your food will be ready in " + time + " seconds");
              }
            } else cb(500, "Error setting the microwave: " + message);
          }); else cb(500, "Error setting the microwave: " + message);
        }); else cb(500, "Error setting the microwave: " + message);
      }); else cb(500, "Error setting the microwave: " + message);    
    })
  }

  _this.recipes = {
    "popcorn" : [ { "time" : 150, "power" : "high" } ],
    "hot chocolate" : [ { "time" : 120, "power" : "high" }, { "time" : 180, "power" : "low" } ],
    "baked potato" : [ { "time" : 120, "power" : "high" }, { "time" : 120, "heat" : "medium" }],
    "ramen" : [ { "time" : 210, "power" : "high" } ],
    "hot pocket" : [ { "time" : 105, "power" : "high" }]
  }

  _this.cook = function (recipie, cb) {
    if (_this.recipies.recipie !== undefined)
      _this.setCycle(_this.recipies.recipie, cb);
    else cb(404, "Couldn't find that recipie");
  }

  _this.setCycle = function (steps, cb) {
    var cooktime = 0;
    try {
      for (step in steps) {
        setTimeout(function() {
          _this.set(steps[step].power, steps[step].time, function() {});
        }, cooktime * 1000);
        cooktime += steps[step].time + 2;
      }
    } catch (e) {
      cb(500, "We couldn't parse your steps, sorry");
      return;
    } cb(200, "Your meal will be ready in " + cooktime + " seconds");
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
