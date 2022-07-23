'use strict';

require('dotenv').config();

const fs = require('fs');
const _ = require('lodash');
const AWS = require("aws-sdk");
const Discord = require('discord.js');

const client = new Discord.Client();

const TOKEN = process.env.DISCORD_TOKEN;

client.login(TOKEN);



const bucket = process.env.BUCKET;
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY 
});

const datafilename = "discord/"+"data";

const checkEnv = ()=>{
  if(!process.env.DISCORD_TOKEN ){

    console.log("Please set up your secrete token in environment variable first.")
    return false
  } else return true
}


const createFileInS3 = async (filename, jsondata) => {
  const params = {
        Bucket: bucket,
        Key: filename 
  }
 
  return s3
        .putObject({
            Bucket: bucket,
            Key: filename,
            Body: jsondata
        }).promise()   
}

const checkLogin = (callback) => {
  try{
      client.on('ready', () => {
        console.log("USER : ", client.user.id)
        console.info(`Logged in as ${client.user.tag}!`);
        return callback(true)
      });
    
    }catch(err){
      console.log('Error in signing')
      console.error(err);
      return false
  }
}


const getAllChats = async (init, lastMsg) =>{
  let channelArray = [];
  let msgArr = [];
  let lastMessage = {}
  let channels = client.channels;

  for (let eachChn of Object.keys(channels)) {
      let channelDetails = channels[eachChn];      
      if(typeof channelDetails === "object"){       
        for (let value of channelDetails.values()) {
          if(value.type == 'text'){
            channelArray.push(value);

          }
        } 
      }
  }
  let allMessages = await Promise.all(_.map(channelArray, async (eachChannel)=>{
      let chnId = eachChannel.id;
      let retObj = {
        "channel_name" : eachChannel.name,
        "channel_id" : eachChannel.id,
        "channel_last_msg_id": eachChannel.lastMessageID,
        "channel_messages": []
      }
      let msgs = []

      let channelDet = {};
      let offSetVal = 0;
      let options = {
        limit: 100
      }
      if(!init){
         channelDet = _.find(lastMsg, function(u) {
            if(u.channel_id == eachChannel.id){
              return u; 
            }
        });

      }
      


      const fetched =  await client.channels.cache.get(chnId).messages
      .fetch(options)
      .then(messages => {
                messages.forEach(m => {

                  if(init){
                    if(m.content.length > 1){
                      let msgObj = {
                        id: m.id,
                        message_text : m.content,
                        date: m.createdTimestamp,
                        date_formatted: new Date(m.createdTimestamp * 1000).toLocaleString("en-US"),
                        author: {
                          user_name: m.author.username,
                          user_id: m.author.id,
                          is_bot: m.author.bot
                        }
                      }
                      msgs.push(msgObj)
                      //console.log(`${m.content} - ${m.author.username}`)
                    }

                  }else{
                    if(m.content.length > 1 && m.id > channelDet.channel_last_msg_id){
                      let msgObj = {
                        id: m.id,
                        message_text : m.content,
                        date: m.createdTimestamp,
                        date_formatted: new Date(m.createdTimestamp * 1000).toLocaleString("en-US"),
                        author: {
                          user_name: m.author.username,
                          user_id: m.author.id,
                          is_bot: m.author.bot
                        }
                      }
                      msgs.push(msgObj)
                      //console.log(`${m.content} - ${m.author.username}`)
                    }

                  }
                  
                    
                })
            }
      );

      retObj["channel_messages"] = msgs;
      if(msgs.length >0 ){
        return retObj
      } else return null
      
   })
   )

  let lastMsgs = _.compact(_.map(allMessages, (each)=>{
      if(each &&  each.channel_id)
        return _.pick(each, ['channel_id', "channel_last_msg_id","channel_name"])
  }));
  if(lastMsgs.length > 0){
    let currTime = Date.now()

    let isDataCreated = await createFileInS3(datafilename+"_"+currTime+".json", JSON.stringify(_.compact(allMessages)))

    if (!isDataCreated.ETag || isDataCreated.ETag.length  == 0 ){
        console.log("Error in saving data file at "+Date.now().toLocaleString())
        console.log(isDataCreated)
    }
    console.log('Data file saved at : ')
    console.log(Date(Date.now()).toLocaleString('en-US', { timeZone: "Asia/Delhi" }))

    

    return lastMsgs
  }else {
    console.log("No new messages found to save.")
    return null

  }
  
}

module.exports.scrape = () => {
    let preReq = checkEnv()
    if(!preReq){
      return false
    }
    
   
  checkLogin(async function (data){

    if(data){

      console.log('Login success : ',data);
      let lstMsg = []
      let lstMessageStore = []
          lstMsg =  await getAllChats(true, lstMsg);
      if(lstMsg && lstMsg.length > 0){
          lstMessageStore = lstMsg
      }
      
      let interval = process.env.CALL_INTERVAL ? parseInt(process.env.CALL_INTERVAL) : 86400000;

      setInterval(async function tick() {
        console.log("Inside timeout...")
        lstMsg = await getAllChats(false, lstMessageStore);
        if(lstMsg && lstMsg.length > 0){
            lstMessageStore = lstMsg
        }
      }, 
      interval);

    }
   });
};



