
const request = require('request');
const fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var http = require('https');
var parseString = require('xml2js').parseString;
var AWS = require('aws-sdk');
const readline = require('readline');
var inside = require('point-in-polygon');

var NW = [ [ 41.69621150, -84.80620470 ], [ 41.74707970, -82.71565040 ], [40.57368660, -82.68183770 ], [ 40.54522630, -84.80279780 ] ];
var NE = [[41.62058260,-82.71194720],[41.98212010,-80.51942980],[40.56682920,-80.51892620],[40.57368660,-82.68183770]];
var SW = [[40.54522630,-84.80279780],[40.56826300,-83.41627120],[38.42400810,-83.37387080],[39.09809450,-84.88311770]];
var SE = [[39.70218290,-83.39936390],[39.71772530,-80.75030830],[38.36184910,-82.40226750],[38.60882250,-83.37799080]];
var C = [[40.56826300,-83.41626050],[40.56768290,-80.58881650],[39.71669450,-80.59157260],[39.70218290,-83.39935320]];
 
var webhook = "https://discordapp.com/api/webhooks/392727461953011713/9iD33ib0JjD0RU-PWCoL9KN_VNJ3jrIiDfvAybQTvOcyU8qhU_rPrzgR2TgvczHOXp3z";
const MIHwebhook = "https://discordapp.com/api/webhooks/400685621519056896/iw75dNfL5wPI1rfaO7S8r0b2NVxQyoq3Xnmoh_XxsBVKe49rffh7dn69wovPuBYD_MfX";
const testServerwebhook = "https://discordapp.com/api/webhooks/391299150211317761/tntWFj2dMjJi7JGJrn_bjMm_rg6REL8DugFpxQ5MqrByMkMjLy3M-_EJ3CVVK9_lM_Rt";
const url = "https://mdotnetpublic.state.mi.us/drive/DataServices.asmx/fetchIncidents";
var postedIDs = [];
var x = 0;
var ClosureObjToPost = [];


var s3 = new AWS.S3();
var myBucket = 'midrivebot';
var myKey = 'parsed.txt';

function scrapeMiDrive(err, data)
{
	if (err)
		return console.err(err);

	data.d.forEach(function(obj){
		if(postedIDs.indexOf(obj.id) < 0){// && obj.message.match(/<strong>Event Type: <\/strong>(.*?)<br>/)[0] != "Other"){
			postedIDs.push(obj.id);
			ClosureObjToPost.push(obj);
		}
		console.log(obj);
	});

	if(ClosureObjToPost.length >0)
		PostResults(0);
}

function PostResults(index)
{
	if(ClosureObjToPost.length > index)
	{
		//let LAM = "";
		let obj = ClosureObjToPost[index];
		/*if(inside([ obj.Latitude[0], obj.Longitude[0] ], NW))
			LAM = "NW";
		else if(inside([ obj.Latitude[0], obj.Longitude[0] ], NE))
			LAM = "NE";
		else if(inside([ obj.Latitude[0], obj.Longitude[0] ], SW))
			LAM = "SW";
		else if(inside([ obj.Latitude[0], obj.Longitude[0] ], SE))
			LAM = "SE";
		else if(inside([ obj.Latitude[0], obj.Longitude[0] ], C))
			LAM = "Central";
		else
			LAM = "Undetermined";*/

		webhook = testServerwebhook;
		
		var msg;
		var embedDescription = "";
		var msgLocation, msgLanes, msgEventType, msgCounty, msgReported, msgEventMessage;
		msgLocation = obj.message.match(/<strong>Location: <\/strong>(.*?)<br>/);
		msgLanes = obj.message.match(/<strong>Lanes Affected:\s?<\/strong>(.*?)<br>/);
		msgEventType = obj.message.match(/<strong>Event Type: <\/strong>(.*?)<br>/);
		msgEventMessage = obj.message.match(/<strong>Event Message:\s?<\/strong>(.*?)<br>/);
		msgReported = obj.message.match(/<strong>Reported:\s?<\/strong>(.*)/);
		msgCounty = obj.message.match(/<strong>County:\s?<\/strong>(.*?)<br>/);
		
		if(msgLocation != null)
			embedDescription += "**Location**: " + msgLocation[1].trim();
		if(msgLanes != null)
			embedDescription += "\n**Lanes Affacted**: " + msgLanes[1].trim();
		if(msgEventType != null)
			embedDescription += "\n**Event Type**: " + msgEventType[1].trim();
		if(msgCounty != null)
			embedDescription += "\n**County**: " + msgCounty[1].trim();
		if(msgEventMessage != null)
			embedDescription += "\n**Event Message**: " + msgEventMessage[1].trim();
		if(msgReported != null)
			embedDescription += "\n**Reported**: " + msgReported[1].trim();
		
		
		/*if(obj.message.indexOf("Event Message") == -1){
			msg = obj.message.match(/<strong>Location: <\/strong>(.*)<br><strong>Lanes Affected:\s?<\/strong>(.*)<br><strong>Event Type: <\/strong>.*<strong>County:\s?<\/strong>(.*)<br><strong>Reported:\s?<\/strong>(.*)/);
			embedDescrpition = "**Location**: " + msg[1].trim() + "\n**Lanes Affected**: " + msg[2].trim() + "\n**Event Type**: " + msg[3].trim() +
							"\n**County**: " + msg[4].trim() + "\n**Reported**: " + msg[5].trim();
		}
		else{
			msg = obj.message.match(/<strong>Location: <\/strong>(.*)<br><strong>Lanes Affected:\s?<\/strong>(.*)<br><strong>Event Type: <\/strong>(.*)<br><strong>County:\s?<\/strong>(.*)<br><strong>Event Message:\s?<\/strong>(.*)<br><strong>Reported:\s?<\/strong>(.*)/);
			embedDescrpition = "**Location**: " + msg[1].trim() + "\n**Lanes Affected**: " + msg[1].trim() + "\n**Event Type**: " + msg[2].trim() +
							"\n**County**: " + msg[3].trim() + "\n**Event Message**:" + msg[4].trim() + "\n**Reported**: " + msg[5].trim();
		}*/
		
		request({
			method:'POST',
			url: webhook,
			json: {
						avatar_url:"https://i.imgur.com/z2P2zWm.png", username:"MiDrive",
					content: ":no_entry:" + obj.title + "" + "\nLink: [WME](https://www.waze.com/editor/?env=usa&lon=" + obj.longitude + "&lat=" + obj.latitude + "&zoom=5)",
						embeds:[{
							"description": embedDescription
						}]
					}
		});
		setTimeout(function(){PostResults(index+1);},2500);
	}
	else
	{
		//WriteToFile();
		ClosureObjToPost = [];
	}
}


function xmlToJson(url, callback) {
  //var req = http.get(url, function(res) {
    var json = '';
	
	request.get(url, (error, response, body) => {
	   json = JSON.parse(body);
	   callback(null, json);
	  //console.log(json);
	});
/*
    res.on('data', function(chunk) {
      json += chunk;
    });

    res.on('error', function(e) {
      callback(e, null);
    }); 

    res.on('timeout', function(e) {
      callback(e, null);
    }); 

    res.on('end', function() {
		console.log("read from URL\n");
		console.log(json);
      //parser.parseString(json, function(err, result) {
      //  callback(null, result);
      //});
    });
  });*/
}


function WriteToFile()
{
	//fs.unlinkSync('posted.txt');
	var file = fs.createWriteStream('parsed.txt');
	file.on('error', function(err) { console.log(err);});
	postedIDs.forEach(function(v) {if(v != ""){ file.write(v + '\n'); }});
	file.end();
	
	/*let params = {Bucket: myBucket, Key: myKey, Body: postedIDs.join('\n')};
     s3.putObject(params, function(err, data) {
         if (err) {
             console.log(err)
         } else {
             console.log("Successfully uploaded data to myBucket/myKey");
         }

      });*/
}

function ReadFromFile()
{
	if(fs.existsSync('parsed.txt'))
	{
		var array = fs.readFileSync('parsed.txt').toString().split("\n");
		for(i in array) {
			postedIDs.push(array[i]);
		}
		xmlToJson(url, scrapeMiDrive);
	}
	
	/*console.log("Reading S3");
	let params = {Bucket: myBucket, Key: myKey};
	const rl = readline.createInterface({
		input: s3.getObject(params).createReadStream()
	});

	rl.on('line', function(line) {
		postedIDs.push(line);
		console.log(line);
	})
	.on('close', function() {
		xmlToJson(url, scrapeMiDrive);
		setInterval(function(){
			console.log("Interval!");
			xmlToJson(url, scrapeMiDrive);}, 600000);
	});*/
}

/*function checkcheck (x, y, cornersX, cornersY) {

	var i, j=cornersX.length-1 ;
	var  oddNodes=false;

	var polyX = cornersX;
	var polyY = cornersY;

	for (i=0; i<cornersX.length; i++) {
		if ((polyY[i]< y && polyY[j]>=y ||  polyY[j]< y && polyY[i]>=y) &&  (polyX[i]<=x || polyX[j]<=x)) {
		  oddNodes^=(polyX[i]+(y-polyY[i])/(polyY[j]-polyY[i])*(polyX[j]-polyX[i])<x); 
		}
		j=i; 
	}

	  return oddNodes;
}*/

ReadFromFile();
