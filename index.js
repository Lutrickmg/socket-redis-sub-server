var redis = require('redis').createClient({ url: process.env.REDIS_URL });
const ioClient = require('socket.io-client');
      uuidv4 = require('uuid/v4');

console.log('subscribe to redis');
redis.subscribe('rt-change');

redis.on('message', function(channel, message){
  var parsedMsg = JSON.parse(message);
  console.log(message);

  var socket = ioClient('master-player-svc.apps.playnetwork.com', {
    secure: true,
    reconnection: false,
    reconnectionAttempts: 0,
    timeout: 5000,
    transports: ["websocket"],
    'force new connection': true,
    query: `clientId=${parsedMsg['clientId']}&token=${parsedMsg['tokenId']}`
  });

  socket.on('disconnect', () => {
    console.log('disconnected');
  });

  socket.on('connect', () => {
    console.log('connected');
    var uuid = uuidv4()
    socket.emit('joinPlayerRoom', { mac: parsedMsg['macAddress'] });

    socket.once('joinPlayerRoom', () => {
      console.log('joined player room');
      socket.on('playerRpc', function(msg){
        if(msg['id'] == uuid){
          console.log(msg);
          socket.disconnect();
        }
      });

      socket.emit('playerRpc', {
        id: uuid,
        jsonrpc: '2.0',
        method: 'updateSettings',
        params: {
          mac: parsedMsg['macAddress'],
          objVariable: {
            Volume: parsedMsg['volume']
          },
          zoneId: 1
        }
      });
    });
  });
});
