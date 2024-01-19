const app = require('express')();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  cors: { origin: '*' }
});

const mysql = require('mysql');

const database = mysql.createPool({
  host: 'sql8.freemysqlhosting.net',
  user: 'sql8678150',
  port:"3306",
  password: 'v5S8La6HLQ',
  database: 'sql8678150',
});

database.on('connection', (connection) => {
  console.log('Connected to database');
});

// Database connection function
const getConnection = (callback) => {
  database.getConnection((err, connection) => {
    callback(err, connection);
  });
};


//use port 3000 or check for enviroment variable named PORT 
const port = process.env.PORT || 3001;
var currentRoom = "default";

//Run whe client connects
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.join(currentRoom);



  socket.on('message', (message) => {
    database.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }

      // Perform your database operations using the 'connection' object
      var values = [message.text, message.date, message.sender, message.room]
      var sqlInsert = "INSERT INTO `sql8678150`.`message` (`text`, `date`, `sender`, `room`) VALUES (?,?,?,?);"
      var sqlSelect = "SELECT text,date,sender,room FROM `sql8678150`.`message`;"
      connection.query(sqlInsert, values, (queryError, results) => {
        connection.release(); // Release the connection back to the pool

        if (queryError) {
          console.error('Error executing query:', queryError);
          return;
        }

        console.log('Query results:', results);
      });
    });
    console.log(message);
    //Sent as soon as a user conne
    io.to(message.room).emit('message', message);
  });
  socket.on('post', (post) => {
    database.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }

      // Perform your database operations using the 'connection' object
      var values = [post.user_name, post.user_postion, post.institution, post.post_time, post.text_message,]
      var sqlInsert = "INSERT INTO `sql8678150`.`post` (`user_name`, `user_postion`, `institution`, `post_time`,`text_message`) VALUES (?,?,?,?,?);"

      connection.query(sqlInsert, values, (queryError, results) => {
        connection.release(); // Release the connection back to the pool

        if (queryError) {
          console.error('Error executing query:', queryError);
          return;
        }

        console.log('Query results:', results);
      });
    });



  });

  socket.on('saveGroup', (group) => {
    database.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }

      // Perform your database operations using the 'connection' object
      var values = [group.name, group.description, group.participant, group.role]
      var sqlInsert = "INSERT INTO `sql8678150`.`groups` ( `name`, `description`, `participant` ,`role`) VALUES (?,?,?,?);"

      connection.query(sqlInsert, values, (queryError, results) => {
        connection.release(); // Release the connection back to the pool

        if (queryError) {
          console.error('Error executing query:', queryError);
          return;
        }

        console.log('Query results:', results);
      });
    });

  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  socket.on('joinRoom', (room) => {

    currentRoom = room;
    socket.join(room);
    database.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }
      var sqlSelect = "SELECT text,date,sender,room FROM `sql8678150`.`message` Where room = ?;"
      connection.query(sqlSelect, room, (queryError, results) => {
        connection.release(); // Release the connection back to the pool
        const msgList = [];
        if (queryError) {
          console.error('Error executing query:', queryError);
          return;
        }
        results.forEach(function (msg) {
          msgList.push(msg);
          io.in(room).emit('message', msg);
          console.log('My Query results:', { text: msg.text, date: msg.date, sender: msg.sender, room: msg.room });
        });


      });
    });

  });
  //send old posst
  database.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      return;
    }
    var sqlSelect = "SELECT user_name,user_postion,institution,post_time,text_message FROM `sql8678150`.`post`"
    connection.query(sqlSelect, (queryError, results) => {
      connection.release(); // Release the connection back to the pool
      const msgList = [];
      if (queryError) {
        console.error('Error executing query:', queryError);
        return;
      }
      io.emit('postList', results);
    });
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected!');
  });


  socket.on('Login', (details) => {
    database.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }



      var sqlSelect = "SELECT alumni_space_account.account_id, tut_alumni.name, tut_alumni.surname FROM `sql8678150`.alumni_space_account INNER JOIN `sql8678150`.tut_alumni ON alumni_space_account.account_id = tut_alumni.account_id;";
      connection.query(sqlSelect, (queryError, results) => {
        connection.release(); // Release the connection back to the pool

        if (queryError) {
          console.error('Error executing query:', queryError);
          return;
        }
        console.log('My entered details: ', details);
        var found = false;

        var list = [];

        results.forEach(function (user) {


          if (user.email === details.email && user.password === details.password) {
            found = true;
            io.emit('userDetails', user);
            io.emit('currentUser', user);
            console.log('Login Query results:', user);
          } else {
            list.push(user)
          }

        });
        io.emit('userList', list);
        console.log('my list', results);
        io.emit('loginResults', found);

      });
    });

  });
});

module.exports = app;

httpServer.listen(port, () => console.log(`listening on port ${port}`));