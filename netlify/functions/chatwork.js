exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return {statusCode:405, body:'Method Not Allowed'};
  }

  const token = process.env.CHATWORK_TOKEN;
  if(!token){
    return {statusCode:500, body: JSON.stringify({error:'CHATWORK_TOKEN not set'})};
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e){ return {statusCode:400, body:'Invalid JSON'}; }

  const { room_id, message, type, to_ids } = body;
  if(!room_id || !message){
    return {statusCode:400, body: JSON.stringify({error:'room_id and message are required'})};
  }

  const fetch = require('node-fetch');
  const params = new URLSearchParams();
  params.append('body', message);
  if(type === 'task' && to_ids) params.append('to_ids', to_ids);

  const endpoint = type === 'task'
    ? `https://api.chatwork.com/v2/rooms/${room_id}/tasks`
    : `https://api.chatwork.com/v2/rooms/${room_id}/messages`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-ChatWorkToken': token },
      body: params
    });
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {'Access-Control-Allow-Origin': '*'},
      body: data
    };
  } catch(e) {
    return {statusCode:500, body: JSON.stringify({error: e.message})};
  }
};
