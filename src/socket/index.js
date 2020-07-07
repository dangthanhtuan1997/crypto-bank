var socketio = require('socket.io');

module.exports = function (httpServer) {
    var clients = [];
    const io = socketio(httpServer);

    io.on('connection', (socket) => {
        socket.on('init', (accountNumber) => {
            socket.accountNumber = accountNumber;
        });
    });

    return io;
};