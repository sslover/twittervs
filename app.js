/**
 * Module dependencies.
 */
var express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , twitter = require('ntwitter')
  , cronJob = require('cron').CronJob
  , _ = require('underscore')
  , path = require('path');

// create a file system to write to the json file
var fs = require('fs');
var tweetJSON = [];

//Create an express app
var app = express();

//Create the HTTP server with the express app as an argument
var server = http.createServer(app);

// Twitter topics array. We want a list for allTopics, and then we will check that list against the 2 topic lists
var allTopics = [];
var topic1 =  [];
var topic2 = [];

//These object structures keep track of the total number of tweets for each category, and a map of all the topics and how many tweets they've each gotten
var topic1List = {
    total: 0,
    topics: {}
};

var topic2List = {
    total: 0,
    topics: {}
};

var currentTweet;
var currentPhotoURL;
var currentTweetURL;

//Set the topic lists to zero.
_.each(topic1, function(v) { topic1List.topics[v] = 0; });
_.each(topic2, function(v) { topic2List.topics[v] = 0; });


//Generic Express setup
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
// setup template engine - we're using Hogan-Express
app.set('view engine', 'html');
app.set('layout','layout');
app.engine('html', require('hogan-express')); // https://github.com/vol4ok/hogan-express
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

//We're using bower components so add it to the path to make things easier
app.use('/components', express.static(path.join(__dirname, 'components')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// the dataObject we are sending to the page, includes all the data we need
var dataObject = {
  topic1Master: topic1,
  topic2Master: topic2,
  topic1Data: topic1List, 
  topic2Data: topic2List,
  tweet: []
};

//Our only route! Render it with the current topic1List and topic2List
app.get('/', function(req, res) {
	res.render('index.html');
});

//Start a Socket.IO listen
var sockets = io.listen(server);

//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});

//If the client just connected, give them fresh data!
sockets.sockets.on('connection', function(socket) { 

  socket.emit('connection', dataObject);

  //If someone enters new data, let's update it!
  socket.on('newData', function (data) { 

      console.log("new data!!! " + data.topic1 + " " + data.topic2);

      //clear out the arrays
      allTopics = [];
      topic1 = [];
      topic2 = [];

      //now rebuild the arrays
      allTopics.push(data.topic1);
      allTopics.push(data.topic2);

      topic1.push(data.topic1);
      topic2.push(data.topic2);

      dataObject.topic1Master = topic1;
      dataObject.topic2Master = topic2;    

      //now reset the total
      topic1List.total = 0;
      topic2List.total = 0;

      //then clear out everything in the map
      _.each(topic1, function(v) { topic1List.topics[v] = 0; });
      _.each(topic2, function(v) { topic2List.topics[v] = 0; });

      console.log("sending + $$$ + " + JSON.stringify(dataObject));
      sockets.sockets.emit('newData', dataObject);

      //Set up the twitter component
      var t = new twitter({
            consumer_key: process.env.consumer_key, 
            consumer_secret: process.env.consumer_secret,
            access_token_key: process.env.access_token_key,
            access_token_secret: process.env.access_token_secret
      });

      //Tell the twitter API to filter on the allTopics, and then we will see if the topics are in our topic1 or topic2 list
      // Here, we are filtering the location to just tweets in the United States
      t.stream('statuses/filter', { track: allTopics}, function(stream) {

        //We have a connection. Now watch the 'data' event for incomming tweets.
        stream.on('data', function(tweet) {

          //These variables are used to indicate whether a topic was actually mentioned.
          var topic1Claimed = false;
          var topic2Claimed = false;

          //Make sure it was a valid tweet
          if (tweet.text !== undefined) {

            //We're gunna do some indexOf comparisons and we want it to be case agnostic.
            var text = tweet.text.toLowerCase();

            //Go through every topic1 and then topic2 and see if it was mentioned. If so, increment its counter and
            //set its 'claimed' variable to true to indicate something was mentioned so we can increment
            //the 'total' counter!
            _.each(topic1, function(v) {
                if (text.indexOf(v.toLowerCase()) !== -1) {
                          topic1List.topics[v]++;
                          topic1Claimed = true;
                          dataObject.tweet.push(tweet.text);
                          dataObject.tweet.push(tweet.user.profile_image_url);
                          dataObject.tweet.push("https://twitter.com/" + tweet.user.screen_name +"/status/" + tweet.id_str);
                          dataObject.tweet.push(v);
                          dataObject.tweet.push(topic1List.topics[v]);
                    }
            });

            _.each(topic2, function(v) {
                if (text.indexOf(v.toLowerCase()) !== -1) {
                          topic2List.topics[v]++;
                          topic2Claimed = true;
                          dataObject.tweet.push(tweet.text);
                          dataObject.tweet.push(tweet.user.profile_image_url);
                          dataObject.tweet.push("https://twitter.com/" + tweet.user.screen_name +"/status/" + tweet.id_str);
                          dataObject.tweet.push(v);
                          dataObject.tweet.push(topic2List.topics[v]);
                    }

            });

            //If something was mentioned, increment the total counter and send the update to all the clients
            if (topic1Claimed) {
                //send tweet to master json
                //writeFile(tweet);
                //Increment total
                topic1List.total++;
                //Send to all the clients
                sockets.sockets.emit('data', dataObject);
                dataObject.tweet.length = 0; 
            }

            if (topic2Claimed) {
                //send tweet to master json
                //writeFile(tweet);
                //Increment total
                topic2List.total++;
                //Send to all the clients
                sockets.sockets.emit('data', dataObject);
                dataObject.tweet.length = 0; 

            }
          }
        });
      });
  });

});



function writeFile(tweet){

  var newJSON = JSON.stringify(tweet);
  tweetJSON.push(newJSON);
  console.log(tweetJSON.length);
  fs.writeFile('tweets.json', tweetJSON, function(err) {
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
  }); 

}

//Reset everything on a new day!
new cronJob('0 0 0 * * *', function(){
    //Reset the total
    topic1List.total = 0;
    topic2List.total = 0;

    //Clear out everything in the map
    _.each(topic1, function(v) { topic1List.topics[v] = 0; });
    _.each(topic2, function(v) { topic2List.topics[v] = 0; });

    //Send the update to the clients
    sockets.sockets.emit('data', dataObject);

}, null, true);

//Create the server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
