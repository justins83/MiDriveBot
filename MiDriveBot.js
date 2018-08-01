const request = require('request');
const fs = require('fs');
var http = require('https');
var AWS = require('aws-sdk');
const readline = require('readline');
const proj4 = require('proj4');

var webhookPrefix = "https://discordapp.com/api/webhooks/";
var webhook = "392727461953011713/9iD33ib0JjD0RU-PWCoL9KN_VNJ3jrIiDfvAybQTvOcyU8qhU_rPrzgR2TgvczHOXp3z";
const MIHwebhook = "459410854325125121/7S_QfXcxReHKQOQBDDCSL7G1D4iiwpvEkhcyowZybg7jwhCYpnjTUzA2tR-p8MuwN7es";
const testServerwebhook = "391299150211317761/tntWFj2dMjJi7JGJrn_bjMm_rg6REL8DugFpxQ5MqrByMkMjLy3M-_EJ3CVVK9_lM_Rt";
const url = "https://mdotjboss.state.mi.us/MiDrive/incidents/AllForMap"; //"https://mdotnetpublic.state.mi.us/drive/DataServices.asmx/fetchIncidents";
var postedIDs = [];
var x = 0;
var ClosureObjToPost = [];


var s3 = new AWS.S3();
var myBucket = 'midrivebot';
var myKey = 'parsed.txt';
var reaction = ":no_entry:";

function scrapeMiDrive(err, data)
{
	if (err)
		return console.err(err);

	data.forEach(function(obj){
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
		let obj = ClosureObjToPost[index];

		webhook = MIHwebhook;
		
		reaction = ":no_entry:";
		
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
		if(msgLanes != null){
			if((msgLanes[1].indexOf("Left") > -1 || msgLanes[1].indexOf("Right") > -1 || msgLanes[1].indexOf("Center") > -1) && msgLanes[1].indexOf("Ramp") == -1)
				PostResults(index+1); //reaction = ":x:";
			else
				embedDescription += "\n**Lanes Affected**: " + msgLanes[1].trim();
		}
		if(msgEventType != null)
			embedDescription += "\n**Event Type**: " + msgEventType[1].trim();
		if(msgCounty != null)
			embedDescription += "\n**County**: " + msgCounty[1].trim();
		if(msgEventMessage != null)
			embedDescription += "\n**Event Message**: " + msgEventMessage[1].trim();
		if(msgReported != null)
			embedDescription += "\n**Reported**: " + msgReported[1].trim();
		
		var coordinatesmin = proj4('EPSG:4326', 'GOOGLE',[parseFloat(obj.longitude) ,parseFloat(obj.latitude)]);
		var coordinatesmax = proj4('EPSG:4326', 'GOOGLE',[parseFloat(obj.longitude) ,parseFloat(obj.latitude)]);

		request({
			method:'POST',
			url: webhookPrefix + webhook,
			json: {
						avatar_url:"https://i.imgur.com/z2P2zWm.png", username:"MiDrive",
					content: reaction + obj.title + "" + "\nLink: [WME](https://www.waze.com/editor/?env=usa&lon=" + obj.longitude + "&lat=" + obj.latitude + "&zoom=5)"
					+ " | [MiDrive](https://mdotnetpublic.state.mi.us/drive/Default.aspx?xmin=" + parseFloat(coordinatesmin[0] - 600) + "&xmax=" + parseFloat(coordinatesmax[0] + 600) + "&ymin=" + parseFloat(coordinatesmin[1] - 450) + "&ymax=" + parseFloat(coordinatesmax[1] + 450) + "&lc=true&lcf=false&cam=true&tb=false&bc=false&bh1=false&bh2=false&sensor=true&inc=true&mp=false&sign=false&mb=false&cps=false&aps=false&bing=false&source=social&rsp=false&rest=false&park=false&plow=false)",
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
