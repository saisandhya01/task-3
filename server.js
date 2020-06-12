const express=require('express');
const {google}=require('googleapis');
const mysql=require('mysql');
const bcrypt=require('bcrypt');
const flash = require('express-flash');
const session = require('express-session')
const bodyParser=require('body-parser')

const app=express();
const PORT=process.env.PORT || 7000;
const TWO_HOURS=1000*60*60*2;
const {
  NODE_ENV='development',
  SESS_NAME='name',
  SESS_SECRET='secret',
  SESS_LIFETIME=TWO_HOURS
} =process.env
const IN_PROD=NODE_ENV==='production';

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
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash())
app.use(session({
  name:SESS_NAME,
  resave:false,
  saveUninitialized:false,
  secret:SESS_SECRET,
  cookie:{
      maxAge:SESS_LIFETIME,
      sameSite: true,
      secure: IN_PROD
  }
}))


const OAuth2Client=require('./index')
const calendar=google.calendar({version:'v3',auth: OAuth2Client})

function getEmails(string){                      //to get the emails of the attendees
  return new Promise((resolve,reject)=>{
  if(string){
  let arr=string.split(",");
  let finalArray=[];
  for(let i=0;i<arr.length;i++){
    let email={};
    const sql="SELECT email FROM userdetails WHERE username=?";
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
    const sql="SELECT email FROM userdetails";
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
//adding event to google calendar
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
  'attendees': [{'email':'saisandhya187@gmail.com'}],  //attendees
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
    const sql="INSERT INTO userdetails SET ?"
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
app.post('/login',checkNotAuthenticated,(req,res)=>{
  try {
    const sql="SELECT * FROM userdetails WHERE username=?"
        db.query(sql,[req.body.username],async (err,rows)=>{
            if(err) throw err;
            const user=rows[0];
            if(rows.length===0){
                req.flash('error','No user with the given username found')
                res.redirect('/login');
            }
            if(await bcrypt.compare(req.body.password,user.password)){
                req.session.user=user;
                res.redirect('/users/home');
            }
            else{
                req.flash('error','Password incorrect!');
                res.redirect('/login');       
               }
        
        })
    
  } catch (error) {
    console.log(error);
    res.redirect('/login');
  }
})
app.get('/users/home',checkAuthenticated,(request,response)=>{
  response.render('home',{name: request.session.user.name,username: request.session.user.username});
})
app.post('/logout',checkAuthenticated,(req,res)=>{
  req.session.destroy(err=>{
      if(err){
          return res.redirect('/home');
      }
      res.clearCookie(SESS_NAME);
      res.redirect('/login');
  })
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
      eventTime: req.body.time,
      createdBy: req.session.user.username,
      eventType: req.body.type,
      attendees: req.body.attendees
    }
    let startDate=new Date(event.startDate);
    let endDate=new Date(event.endDate);
    eventHandler(event,startDate,endDate);
    const sql="INSERT INTO events SET ?"
    db.query(sql,event,(err,result)=>{
      if(err) throw err;
      const sql1="SELECT id FROM events WHERE name=? AND createdBy=?"
      db.query(sql1,[req.body.name,req.session.user.username],(err,result1)=>{
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
    const sql="INSERT INTO invitations SET ?"
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
  const sql="SELECT head,body,footer FROM invitations WHERE id=?"
  db.query(sql,[request.params.id],(err,result)=>{
    if(err) throw err;
    response.render('viewInvitation',{invitation : result[0]});
  })
})
app.get('/view/events/:name',checkAuthenticated,(request,response)=>{
  const sql="SELECT name,startDate,endDate,eventTime,createdBy,acceptedBy,rejectedBy,eventType,attendees FROM events"
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
        const sql="UPDATE events SET rejectedBy=CONCAT(rejectedBy,' ',?) WHERE id=?"
        db.query(sql,[request.session.user.username,split[1]],(err,result)=>{
          if(err) throw err;
        })
      }
      else{
        const sql="UPDATE events SET acceptedBy=CONCAT(acceptedBy,' ',?) WHERE id=?"
        db.query(sql,[request.session.user.username,split[1]],(err,result)=>{
          if(err) throw err;
        })
        const sql1="UPDATE userdetails SET attending=CONCAT(attending,' ',?) WHERE username=?"
        db.query(sql1,[split[1],request.session.user.username],(err,result)=>{
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
      eventId: request.body.EventId,
      noAdults: request.body.noAdults,
      noChildren: request.body.noChildren,
      setBy: request.session.user.username,
      food: request.body.food,
      eventCreatedBy: request.body.eventCreatedBy
    }
    console.log(data);
    const sql="INSERT INTO preferences SET ?"
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
        const sql="SELECT * FROM events WHERE createdBy=?"
        db.query(sql,[request.params.name],(err,result)=>{
          if(err) return reject(err);
          return resolve(result);
        })  
      });
    } 
    function executor2(){
      return new Promise((resolve,reject)=>{
        let acceptedArray=[];
        const sql1="SELECT attending FROM userdetails WHERE username=?"
        db.query(sql1,[request.params.name],(err,result1)=>{
          if(err) return reject(err);
          const attending=result1[0].attending
          const split=attending.split(" ");
          for(let i=1;i<=split.length;i++){
            const sql2="SELECT * FROM events WHERE id=?"
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
  const sql="SELECT * FROM events WHERE createdBy=?"
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
  const sql="UPDATE events SET attendance=? WHERE id=?";
  db.query(sql,[str,request.body.id],(err,result)=>{
    if(err) throw err;
    console.log(result);
  })
  response.end('done');
})
//authenticating middleware function
function checkAuthenticated(req,res,next){
  if(!req.session.user){
      res.redirect('/login');
  }
  else{
      next();
  }
}
function checkNotAuthenticated(req,res,next){
  if(req.session.user){
      res.redirect('/home');
  }
  else{
      next();
  }
}

const server=app.listen(PORT,()=>{
    console.log(`Server is listening at ${PORT}`);
})


