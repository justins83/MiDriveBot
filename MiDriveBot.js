
const request = require('request');
const fs = require('fs');
var http = require('https');
var AWS = require('aws-sdk');
const readline = require('readline');
var inside = require('point-in-polygon');

 
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
		//console.log(obj);
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
		WriteToFile();
		ClosureObjToPost = [];
	}
}


function xmlToJson(url, callback) {
    var json = '';
	
	request.get(url, (error, response, body) => {
	   json = JSON.parse(body);
	   callback(null, json);
	  //console.log(json);
	});
}


function WriteToFile()
{
	//fs.unlinkSync('posted.txt');
	/*var file = fs.createWriteStream('parsed.txt');
	file.on('error', function(err) { console.log(err);});
	postedIDs.forEach(function(v) {if(v != ""){ file.write(v + '\n'); }});
	file.end();*/
	
	let params = {Bucket: myBucket, Key: myKey, Body: postedIDs.join('\n')};
     s3.putObject(params, function(err, data) {
         if (err) {
             console.log(err)
         } else {
             console.log("Successfully uploaded data to myBucket/myKey");
         }

      });
}

function ReadFromFile()
{
	/*if(fs.existsSync('parsed.txt'))
	{
		var array = fs.readFileSync('parsed.txt').toString().split("\n");
		for(i in array) {
			postedIDs.push(array[i]);
		}
		xmlToJson(url, scrapeMiDrive);
	}*/
	
	console.log("Reading S3");
	let params = {Bucket: myBucket, Key: myKey};
	const rl = readline.createInterface({
		input: s3.getObject(params).createReadStream()
	});

	rl.on('line', function(line) {
		postedIDs.push(line);
	})
	.on('close', function() {
		xmlToJson(url, scrapeMiDrive);
		setInterval(function(){
			console.log("Interval!");
			xmlToJson(url, scrapeMiDrive);}, 600000);
	});
}

ReadFromFile();
