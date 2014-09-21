var _ToasterOvenId = "55ff6a065075555312491887";
var _MicrowaveOvenId = "55ff6c065075555339401487";
var _AustinAccessToken = "76a42c019867165fc0f527a59ca90b72de7b3a21";

var myToasterOven = new toasterOven(_ToasterOvenId, _AustinAccessToken);
var myMicrowave = new microwave(_MicrowaveOvenId, _AustinAccessToken);

var myTwillioNumber = "+12487668844";

var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var express = require('express');

var app = express(),
  request = require('request'),
  path = require('path'),
  url = require('url');
  
app.use(favicon(__dirname + '/favicon.ico'));
app.use(bodyParser.json());

app.get('/toasteroven/set/:temp', function(req, res, next){
  myToasterOven.setTemp(req.params.temp, function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/toasteroven/cook/:recipe', function(req, res, next){
  myToasterOven.cook(req.params.recipe,function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/toasterOven/:route', function(req, res, next){
  calling = req.params.route;
  if (calling === undefined || (calling !== "getDoor" && calling !== "off" && calling !== "broil"))
    res.status(400).send("Please use an existing endpoint");
  else {
    myToasterOven[calling](function (statusCode, data){
      res.status(statusCode).send(data);
    })
  }
});

app.get('/microwave/set/:time', function(req, res, next){
  power = req.query.power || "high";
  myMicrowave.set(power, req.params.time, function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/microwave/cook/:recipe', function(req, res, next){
  myMicrowave.cook(req.params.recipe, function (statusCode, data) {
    res.status(statusCode).send(data);
  });
});

app.get('/microwave/:route', function(req, res, next){
  calling = req.params.route;
  if (calling === undefined || (calling !== "pause" && calling !== "start" 
    && calling !== "five" && calling !== "nine" && calling !== "power" && calling !== "stop"))
    res.status(400).send("Please use an existing endpoint");
  else {
    myMicrowave[calling](function (statusCode, data){
      res.status(statusCode).send(data);
    })
  }
});

app.post('/witai', function (req, res, next) {
  if (req.body.intent === "cook") {
    recipe = req.body.food.value;
    if (myToasterOven.hasOwnProperty(recipe)) {
      myToasterOven.cook(recipe, function (statusCode, data) {
        return res.status(statusCode).send(data);
      });
    } else if (myMicrowave.hasOwnProperty(recipe)) {
      myMicrowave.cook(recipe, function (statusCode, Data) {
        return res.status(statusCode).send(Data);
      });
    } else return res.status(404).send("We don't know that recipe");
  } else if (req.body.intent === "general_cook") {
    if (req.body.temperature !== undefined) {
      if (req.body.duration !== undefined) {
        myToasterOven.setCycle([{"time":req.body.duration.value, "heat":req.body.temperature.value.temperature}],
          (req.body.food !== undefined)? req.body.food.value : "food", function (statusCode, Data) {
            return res.status(statusCode).send(Data);
          }
        );
      } else myToasterOven.setTemp(req.body.temperature.value.temperature, function (statusCode, Data) {
        return res.status(statusCode).send(Data);
      })
    } else if (req.body.duration !== undefined) {
      powerSet = "high"
      if (req.body.power) {
        if (req.body.power.value === "half") powerSet = "low";
        if (req.body.power.value === "med" || req.body.power.value === "low") powerSet = req.body.power.value;
      }
      myMicrowave.set(powerSet, req.body.duration.value, function (statusCode, Data) {
        return res.status(statusCode).send(Data);
      })
    } else res.status(400).send("Neither of our appliances support that cook")
  } else if (req.body.intent === "demo") {
    if (req.body.appliance.value === "microwave") myMicrowave.cook("zapDemo", function (statusCode, Data){
      return res.status(statusCode).send(Data);
    }); else if (req.body.appliance.value === "oven") myToasterOven.cook("toastDemo", function (statusCode, Data){
      return res.status(statusCode).send(Data)
    })
  }
})

app.get('/', function(req, res, next){
  res.status(400).send("Sorry, there's nothing here, try the toasteroven or microwave apis"); 
})

function toasterOven(deviceID, token) {

  var _this = this;
  var did = deviceID;
  var parentToken = token;

  _this.knob = null;
  _this.getTemp = function(cb) {
    if (_this.knob !== null) cb(200, _this.knob);
    else cb(404, "Current temp not Known");
  }

  _this.setTemp = function (temp, cb) {
    temp = parseInt(temp);
    if (temp !== undefined && temp > 199 && temp < 451) {
      angle = 50 + 80*((temp-200)/250);
      sparkPost(parentToken, did, "knob", angle.toString(), function (error, response, body) {
        if (!error) {
          _this.knob = temp;
          cb(200,"oven set to " + temp.toString());
        } else cb(500, "couldn't post temperature to the spark")
      });
    } else cb(400,"Please use a valid temperature, between 200 and 450");
  }
  
  _this.off = function(cb) {
    sparkPost(parentToken, did, "knob", "0", function(error, response, body) {
      if (!error) {
        _this.knob = 0;
        cb(200,"Oven set to off");
      } else cb (500, "Couldn't set spark to off")
    });
  }

  _this.broil = function(cb) {
    sparkPost(parentToken, did, "knob", "180", function (error, response, body) {
      if (!error) {
        _this.knob = "broil";
        cb(200,"Oven set to broil");
      } else cb(500, "Couldn't set spark to broil")
    });
  }

  _this.getDoor = function (cb) {
    sparkGet(parentToken, did, "door", function (error, response, body) {
      body = JSON.parse(body);
      if (body !== undefined && body.result !== undefined) {body
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
    "crispy bacon": [ { "time" : 1080, "heat" : 410 }],
    "toastDemo" : [{"time":10, "heat": 450 }, {"time":15, "heat": 200}]
  }

  _this.cook = function (recipe, cb) {
    if (_this.recipes[recipe] !== undefined)
      _this.setCycle(_this.recipes[recipe], recipe, cb);
    else cb(404, "Couldn't find that recipe");
  }

  _this.setCycle = function (steps, name, cb) {
    var cooktime = 0;
    try {
      for (var i = 0; i < steps.length; i++) {
        doSetTimeout(steps[i], cooktime);
        cooktime += steps[i].time + 1;
      }
      setTimeout(function() {_this.off(function(){})}, cooktime * 1000);
    } catch (e) {
      cb(500, "We couldn't parse your steps, sorry");
      return;
    } 
    if (myTwillioNumber !== null) {
      setTimeout(function() {sendMessage(myTwillioNumber, "Your " + name + " is now ready to eat")}, (cooktime - 2)*1000);
      return cb(200, name + "will be ready in " + cooktime + " seconds. You'll get a reminder at " + myTwillioNumber); 
    }
    else return cb(200, name + "will be ready in " + cooktime + " seconds.");
  }

  var doSetTimeout = function(step, cooktime) {
    setTimeout(function() {
      _this.setTemp(step.heat, function() {})
    },cooktime*1000);
  }

}

function microwave(deviceID, token) {

  var _this = this;
  var did = deviceID;
  var parentToken = token;

  _this.pause = function(cb) {
    sparkPost(parentToken, did, "press", "stop", function (error, response, body) {
      if (!error) cb(200, "Microwave Stopped");
      else cb(500, "Couldn't send the stop signal")
    });
  }

  _this.start = function(cb) {
    sparkPost(parentToken, did, "press", "start", function (error, response, body) {
      if (!error) cb(200, "Microwave Started");
      else cb(500, "Couldn't start Microwave");
    });
  }

  _this.five = function(cb) {
    sparkPost(parentToken, did, "press", "five", function (error, response, body) {
      if (!error) cb(200, "Five Pressed");
      else cb(500, "Couldn't press five");
    });
  }

  _this.nine = function(cb) {
    sparkPost(parentToken, did, "press", "nine", function (error, response, body) {
      if (!error) cb(200, "Nine Pressed");
      else cb(500, "Couldn't press nine");
    });
  }

  _this.power = function(cb) {
    sparkPost(parentToken, did, "press", "power", function (error, response, body) {
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
    if (isNaN(time)) return cb(400, "Time must be in integer seconds");

    sparkPost(parentToken, did, "set", time.toString() + ' ,' + power, function (error, response, body) {
      if (!error) {
        body = JSON.parse(body);
        if (body !== undefined && body.result !== undefined) {
          cb(200, body.result);
        } else cb(500, "error getting data from the spark");
      } else cb(500, "Couldn't set up the cook: " + error);
    });
  }

  _this.recipes = {
    "popcorn" : [ { "time" : 150, "power" : "high" } ],
    "hot chocolate" : [ { "time" : 120, "power" : "high" }, { "time" : 180, "power" : "low" } ],
    "baked potato" : [ { "time" : 120, "power" : "high" }, { "time" : 120, "heat" : "medium" }],
    "ramen" : [ { "time" : 210, "power" : "high" } ],
    "hot pocket" : [ { "time" : 105, "power" : "high" }],
    "zapDemo" : [{"time":5, "power":"high"}, {"time":10, "power":"low"}]
  }

  _this.cook = function (recipe, cb) {
    if (_this.recipes[recipe] !== undefined)
      _this.setCycle(_this.recipes[recipe], recipe, cb);
    else cb(404, "Couldn't find that recipe");
  }

  _this.setCycle = function (steps, name, cb) {
    var cooktime = 0;
    try {
      for (var i = 0; i < steps.length; i++) {
        doSetTimeout(steps[i], cooktime);
        cooktime += steps[i].time + 4;
      }
    } catch (e) {
      cb(500, "We couldn't parse your steps, sorry");
      return;
    } 
    if (myTwillioNumber !== null) {
      setTimeout(function() {sendMessage(myTwillioNumber, "Your " + name + " is now ready to eat")}, (cooktime - 2)*1000);
      return cb(200, name + "will be ready in " + cooktime + " seconds. You'll get a reminder at " + myTwillioNumber); 
    }
    else return cb(200, name + "will be ready in " + cooktime + " seconds.");
  }

  var doSetTimeout = function(step, cooktime) {
    setTimeout(function() {
      _this.set(step.power, step.time, function() {})
    },cooktime*1000);
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

function sendMessage(number, message) {
  var twilio = require('twilio')
  var client = new twilio.RestClient('AC75cd8b6fc138c4352d187d58c1c3270f', '19846d24bf0edd4d22979d681f1066bd')

  client.sms.messages.create({
    to: number,
    from:'+12486394931',
    body: message
  }, function(error, message) {    
    if (!error) console.log('Sent: ' + message.sid + " on " + message.dateCreated);
    else console.log('Error sending to ' + number);
  })
}

app.listen(process.env.PORT || 80);
