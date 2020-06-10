const express=require('express');
const {google}=require('googleapis');
const mysql=require('mysql');
const passport=require('passport');
const bcrypt=require('bcrypt');
const flash = require('express-flash');
const socket=require('socket.io')
const session = require('express-session')
const bodyParser=require('body-parser')
const methodOverride = require('method-override')

const app=express();
const PORT=process.env.PORT || 7000;
//connecting to database
const db=mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '12345',
    database: 'UserInfo'
  });
  db.connect((err)=>{
    if(err){
        throw err;
    }
    console.log('Mysql connected!');
  })

//middlewares
app.set('view engine','ejs');
const initialisePassport= require('./authenticate.js');
initialisePassport(passport);
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash())
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


const OAuth2Client=require('./index')
const calendar=google.calendar({version:'v3',auth: OAuth2Client})

function getEmails(string){                      //to get the emails of the attendees
  return new Promise((resolve,reject)=>{
  if(string){
  let arr=string.split(",");
  let finalArray=[];
  for(let i=0;i<arr.length;i++){
    let email={};
    const sql="SELECT email FROM UserDetails WHERE username=?";
    db.query(sql,[arr[i]],(err,result)=>{
      if(err) return reject(err);
      email['email']=result[0].email;
      console.log(email);
      finalArray.push(email);
      if(finalArray.length===arr.length){
        return resolve(finalArray);
      }
    })
    
  }
  }
  else{
    let finalArray=[];
    const sql="SELECT email FROM UserDetails";
    db.query(sql,(err,result)=>{
      if(err) return reject(err);
      for(let i=0;i<result.length;i++){
        let email={};
        email['email']=result[i].email;
        finalArray.push(email);
        if(finalArray.length===result.length){
          return resolve(finalArray);
        }
      }

    })
  }
});
}
//inserting events into google calendar
async function eventHandler(event,startDate,endDate){
  const attendees= await getEmails(event.attendees);
  console.log(attendees);
var eventObject = {
  'summary': event.name,
  'description': 'hello and welcome',
  'start': {
    'dateTime': startDate,
    'timeZone': 'Asia/Kolkata',
  },
  'end': {
    'dateTime': endDate,
    'timeZone': 'Asia/Kolkata',
  },
  'recurrence': [
    'RRULE:FREQ=DAILY;COUNT=2'
  ],
  'attendees': [{'email':'saisandhya187@gmail.com'}],
  'reminders': {
    'useDefault': false,
    'overrides': [
      {'method': 'email', 'minutes': 24 * 60},
      {'method': 'popup', 'minutes': 10},
    ],
  },
};
calendar.events.insert({
  auth: OAuth2Client,
  calendarId: 'primary',
  resource: eventObject,
}, function(err, eventObject) {
  if (err) {
    console.log('There was an error contacting the Calendar service: ' + err);
    return;
  }
  console.log('Event created: %s', eventObject.data.htmlLink);
});
}

//routes
app.get('/',checkNotAuthenticated,(request,response)=>{
   response.render('welcome');
})
app.get('/register',checkNotAuthenticated,(request,response)=>{
   response.render('register');
})
app.post('/register', checkNotAuthenticated, async (req, res) => {
  try{
    const hashedPassword=await bcrypt.hash(req.body.password,10)
    const user={
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      password: hashedPassword
    }
    
    const sql="INSERT INTO UserDetails SET ?"
    
    
    db.query(sql,user,(err,result)=>{
      if(err) throw err;
      res.redirect('/login')
    })

  }  catch(e){
    console.log(e);
    res.redirect('/register')
  }

  })

app.get('/login',checkNotAuthenticated,(request,response)=>{
    response.render('login');
  })
app.post('/login',checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/users/home',
  failureRedirect: '/login',
  failureFlash: true
}))
app.get('/users/home',checkAuthenticated,(request,response)=>{
  response.render('home',{name: request.user.name,username: request.user.username});
})
app.delete('/users/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})
app.get('/event/new',checkAuthenticated,(request,response)=>{
  response.render('createEvent');
})
app.post('/event/new',checkAuthenticated,(req,res)=>{
  try{
    const event={
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      timeEvent: req.body.time,
      createdBy: req.user.username,
      eventType: req.body.type,
      attendees: req.body.attendees
    }
    let startDate=new Date(event.startDate);
    let endDate=new Date(event.endDate);
    eventHandler(event,startDate,endDate);
    const sql="INSERT INTO Events SET ?"
    db.query(sql,event,(err,result)=>{
      if(err) throw err;
      const sql1="SELECT id FROM Events WHERE name=? AND createdBy=?"
      db.query(sql1,[req.body.name,req.user.username],(err,result1)=>{
        if(err) throw err
        const id=result1[0].id
        res.redirect(`/event/invite/${id}`);
      })
    })
  }
  catch(e){
   console.log(e)
  }
})
app.get('/event/invite/:id',checkAuthenticated,(request,response)=>{
  response.render('createInvite',{id: request.params.id});
})

app.post('/event/invite/:id',checkAuthenticated,(req,res)=>{
  try{
    console.log(req.body);
    const sql="INSERT INTO Invitation SET ?"
    db.query(sql,req.body,(err,result)=>{
      if(err) throw err;
      res.redirect(`/view/invite/${req.params.id}`);
    })
  }
  catch(e){
    console.log(e);
  }
})
app.get('/view/invite/:id',checkAuthenticated,(request,response)=>{
  const sql="SELECT head,body,footer FROM Invitation WHERE id=?"
  db.query(sql,[request.params.id],(err,result)=>{
    if(err) throw err;
    response.render('viewInvitation',{invitation : result[0]});
  })
})
app.get('/view/events/:name',checkAuthenticated,(request,response)=>{
  const sql="SELECT name,startDate,endDate,timeEvent,createdBy,acceptedBy,rejectedBy,eventType,attendees FROM Events"
  db.query(sql,(err,result)=>{
    if(err) throw err;
    response.render('viewEvents',{events : result,host : request.params.name,length : result.length});
  })
})
app.post('/num',checkAuthenticated,(request,response)=>{
    try{
      var str=request.body.accept;
      console.log(str)
      const split=str.split(" ");
      console.log(split,split[1],typeof(split[1]));
      
      if(split[0] !== 'Accept'){
        const sql="UPDATE Events SET rejectedBy=CONCAT(rejectedBy,' ',?) WHERE id=?"
        db.query(sql,[request.user.username,split[1]],(err,result)=>{
          if(err) throw err;
        })
      }
      else{
        const sql="UPDATE Events SET acceptedBy=CONCAT(acceptedBy,' ',?) WHERE id=?"
        db.query(sql,[request.user.username,split[1]],(err,result)=>{
          if(err) throw err;
        })
        const sql1="UPDATE UserDetails SET attending=CONCAT(attending,' ',?) WHERE username=?"
        db.query(sql1,[split[1],request.user.username],(err,result)=>{
          if(err) throw err;
        })
      } 
      return response.end('done');
    } catch(e){
      console.log(e);
    }

})
app.post('/preference',checkAuthenticated,(request,response)=>{
  try {
    var data={
      EventId: request.body.EventId,
      noAdults: request.body.noAdults,
      noChildren: request.body.noChildren,
      setBy: request.user.username,
      food: request.body.food,
      eventCreatedBy: request.body.eventCreatedBy
    }
    console.log(data);
    const sql="INSERT INTO Preferences SET ?"
    db.query(sql,data,(err,result)=>{
      if(err) throw err;
    })
    response.end('done')
  } catch (error) {
    console.log(error);
    
  }
})
app.get('/dashboard/:name',checkAuthenticated, async (request,response)=>{
  try{
    function executor(){
      return new Promise((resolve,reject)=>{
        const sql="SELECT * FROM Events WHERE createdBy=?"
        db.query(sql,[request.params.name],(err,result)=>{
          if(err) return reject(err);
          return resolve(result);
        })  
      });
    } 
    function executor2(){
      return new Promise((resolve,reject)=>{
        let acceptedArray=[];
        const sql1="SELECT attending FROM UserDetails WHERE username=?"
        db.query(sql1,[request.params.name],(err,result1)=>{
          if(err) return reject(err);
          const attending=result1[0].attending
          const split=attending.split(" ");
          for(let i=1;i<=split.length;i++){
            const sql2="SELECT * FROM Events WHERE id=?"
            db.query(sql2,[split[i]],(err,result2)=>{
              if(err) return reject(err);
              acceptedArray.push(result2[0]);
              if(acceptedArray.length===split.length-1){
                return resolve(acceptedArray);
              }
            })
          }
        }) 
     })
    }
  const createdArray=await executor();
  console.log(createdArray);
  const acceptedArray=await executor2();
  console.log(acceptedArray);
  response.render('dashboard',{events: createdArray,accepts: acceptedArray});
}
  catch(e){
    console.log(e);
  }
})
app.get('/attendance/:name',async (request,response)=>{
 try{ 
   function executor3(){
    return new Promise((resolve,reject)=>{
  const sql="SELECT * FROM Events WHERE createdBy=?"
  db.query(sql,[request.params.name],(err,result)=>{
    if(err) reject(err);
    let alter=result;
    if(result.length===0){
      console.log('You have not created any event');
      return resolve(alter);
    }
    else{
      for(let i=0;i<result.length;i++){
        if(result[i].acceptedBy.length===0){
          let arr=[];
          alter[i].acceptedBy=[];
          if(i===result.length-1){
            return resolve(alter);
          }
        }
        else{
          let arr=result[i].acceptedBy.split(" ");
          arr.splice(0,1);
          alter[i].acceptedBy=arr;
          if(i===result.length-1){
            return resolve(alter);
          }
        }
        
      }
    
    }
  }) 
});  
}
  const alterArray=await executor3();
  console.log('altered array after promise:',alterArray)
  response.render('attendance',{attendance: alterArray})
 }catch(e){
   console.log(e);
 }
})
app.post('/attendance',(request,response)=>{
  var body=request.body.present
  console.log(body,request.body.id);
  var str=body.join(",");
  const sql="UPDATE Events SET attendance=? WHERE id=?";
  db.query(sql,[str,request.body.id],(err,result)=>{
    if(err) throw err;
    console.log(result);
  })
  response.end('done');
})
//authenticating function
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/users/home')
  }
  next()
}

const server=app.listen(PORT,()=>{
    console.log(`Server is listening at ${PORT}`);
})
var io=socket(server);
io.on('connection', function(socket){
  console.log("Socket established with id: " + socket.id);
 
  socket.on('disconnect', function () {
   console.log("Socket disconnected: " + socket.id);
  });
 
 });

