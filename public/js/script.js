$(function() {
    var socket = io.connect(window.location.hostname);

    //need these to keep track of the starting count, so we can only show new data to the user
    var startingTopic1Total;
    var startingTopic2Total;
    var startingTotal;

    //tracks the lists of the the 2 topics
    var topic1List;
    var topic2List;

    //tracks the total tweets for topic1, topic2, and total
    var topic1Total;
    var topic2Total;
    var totalTweets;

    //tracks the HTML tag of the topic name. Needed because some tags have spaces.
    var topic1Tag;
    var topic2Tag;

    socket.on('connect', function() {
        console.log("Connected");
    });

    // Receive a message
    socket.on('connection', function(data) {

        topic1List = data.topic1Master;
        topic2List = data.topic2Master;

        startingTopic1Total = data.topic1Data.total;
        startingTopic2Total = data.topic2Data.total;
        startingTotal = data.topic1Data.total + data.topic2Data.total;

        //if there is not an existing search, show some options
        if(data.topic1Master == ""){
            $( "#examples" ).show();
        }

        //if there is an existing search, show it to the user!
        if(data.topic1Master != ""){
            $( "#examples" ).hide();
            $( "#go" ).show();
            // let's file in the values of the forms with the 2 topics!
            $('#t1').val(topic1List[0]);
            $('#t2').val(topic2List[0]);

            //the first time, loop through the lists and create the needed HTML
            //first, we need to make sure the topic tag/name doesn't have any spaces
            topic1Tag = topic1List[0].replace(/\s+/g, '-').toLowerCase();
            topic2Tag = topic2List[0].replace(/\s+/g, '-').toLowerCase();

            //now, let's create the HTML
            for (var i = 0; i < topic1List.length; i++) {
                $("#topic1").append('<div id="d1content">' +
             '<h1 class="topic1">'+topic1List[0]+'</h1>' +
             '<h4><span id="tweetCount-topic1">0</span> tweets</h4>' +
             '<ul class="span5" id="'+topic1Tag+'">' +
             '</ul>' +      
             '<div style="clear:both"></div>' +
             '</div>');
            }

            for (var i = 0; i < topic2List.length; i++) {
                $("#topic2").append('<div id="d2content">' +
             '<h1 class="topic2">'+topic2List[0]+'</h1>' +
             '<h4><span id="tweetCount-topic2">0</span> tweets</h4>' +
             '<ul class="span5" id="'+topic2Tag+'">' +
             '</ul>' +      
             '<div style="clear:both"></div>' +
             '</div>');
            }
        }

    });

    // Receive a message
    socket.on('newData', function(data) {

        //get new topic(s)!
        topic1List = data.topic1Master;
        topic2List = data.topic2Master;

        //reset starting total, so that when data comes in it starts off with the right number!
        startingTopic1Total = data.topic1Data.total;
        startingTopic2Total = data.topic2Data.total;
        startingTotal = data.topic1Data.total + data.topic2Data.total;

        $( "#go" ).show();
        $( "#examples" ).hide();

        //reset the old topics!
        $( "#d1content" ).remove();
        $( "#d2content" ).remove();

        // let's file in the values of the forms with the 2 topics!
        $('#t1').val(topic1List[0]);
        $('#t2').val(topic2List[0]);

        // for the top area of the page, here we do all the calculations on the total tweets and the percentage breakdown
        $("#tweetCount").text("0");

        var topic1Width = 50;
        var topic2Width = 50;     

        $("#topic1-chart").css("width", topic1Width +"%");
        $("#topic2-chart").css("width", topic2Width +"%");

        $("#topic1Data").text("waiting for data..");
        $("#topic2Data").text("waiting for data..");


        topic1List = data.topic1Master;
        topic2List = data.topic2Master;

        //the first time, loop through the lists and create the needed HTML
        //first, we need to make sure the topic tag/name doesn't have any spaces
        topic1Tag = topic1List[0].replace(/\s+/g, '-').toLowerCase();
        topic2Tag = topic2List[0].replace(/\s+/g, '-').toLowerCase();

        //the first time, loop through the lists and create the needed HTML
        for (var i = 0; i < topic1List.length; i++) {
            $("#topic1").append('<div id="d1content">' +
         '<h1 class="topic1">'+topic1List[0]+'</h1>' +
         '<h4><span id="tweetCount-topic1">0</span> tweets</h4>' +
         '<ul class="span5" id="'+topic1Tag+'">' +
         '</ul>' +      
         '<div style="clear:both"></div>' +
         '</div>');
        }

        for (var i = 0; i < topic2List.length; i++) {
            $("#topic2").append('<div id="d2content">' +
         '<h1 class="topic2">'+topic2List[0]+'</h1>' +
         '<h4><span id="tweetCount-topic2">0</span> tweets</h4>' +
         '<ul class="span5" id="'+topic2Tag+'">' +
         '</ul>' +      
         '<div style="clear:both"></div>' +
         '</div>');
        }
    });


    socket.on('data', function(data) {

        topic1Total = data.topic1Data.total - startingTopic1Total;
        topic2Total = data.topic2Data.total - startingTopic2Total;
        totalTweets = (data.topic1Data.total + data.topic2Data.total) - startingTotal;

        var tweet = data.tweet[0];
        var photoURL = data.tweet[1]; 
        var tweetURL = data.tweet[2]; 
        var topic = data.tweet[3]; 
        var topicCount = data.tweet[4]; 

    // we are going to append the current tweet to the correct place
    // first set up the html
    var html = '<li><a href='+tweetURL+' target=\'_blank\'><img src='+photoURL+' height=\'30\' width=\'30\'></li>';

    //first, we need to make sure the topic tag/name doesn't have any spaces
    topic = topic.replace(/\s+/g, '-').toLowerCase();

    //then append that to the correct topic
    $("#"+topic).append(html);

    // now let's update the number of tweets for that topic            
    $('#tweetCount-topic1').text(topic1Total);
    $('#tweetCount-topic2').text(topic2Total);

    // for the top area of the page, here we do all the calculations on the total tweets and the percentage breakdown
    $("#tweetCount").text(totalTweets);

    var topic1Width = Math.round((topic1Total / totalTweets) * 100);
    var topic2Width = Math.round((topic2Total / totalTweets) * 100);

    if((topic1Width + topic2Width) > 100){
        topic2Width = Math.floor((topic2Total / totalTweets) * 100);
    }        

    $("#topic1-chart").css("width", topic1Width +"%");
    $("#topic2-chart").css("width", topic2Width +"%");

    $("#topic1Data").text(topic1Width + "% (" + topic1Total +")");
    $("#topic2Data").text(topic2Width + "% (" + topic2Total +")");



    $('#last-update').text(new Date().toTimeString());

    });

// if they click to submit the new topics, get that info and send it to the server
$( "#button1" ).click(function() {
    var t1 = $( "#t1" ).val();
    var t2 = $( "#t2" ).val();
    console.log(t1 + " " + t2);
    if (t1 == "" || t2 == ""){
        alert( "Please do enter something for both topics! :)" );
    }
    else{
        var data = {
            topic1 : t1,
            topic2 : t2
        }
        console.log("sending... " + data);
        // Send it over sockets
        socket.emit('newData', data);
    }
});

// if they click to submit the examples, get that info and send it to the server
$( "#example1" ).click(function() {
    var t1 = "Hilary Clinton";
    var t2 = "Miley Cyrus";

    var data = {
        topic1 : t1,
        topic2 : t2
    }
        console.log("sending... " + data);
        // Send it over sockets
        socket.emit('newData', data);
});

$( "#example2" ).click(function() {
    var t1 = "pizza";
    var t2 = "salad";
    
    var data = {
        topic1 : t1,
        topic2 : t2
    }
        console.log("sending... " + data);
        // Send it over sockets
        socket.emit('newData', data);
});

$( "#example3" ).click(function() {
    var t1 = "Bieber";
    var t2 = "Obama";
    
    var data = {
        topic1 : t1,
        topic2 : t2
    }
        console.log("sending... " + data);
        // Send it over sockets
        socket.emit('newData', data);
});

})