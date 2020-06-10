const localStrategy=require('passport-local').Strategy
const bcrypt=require('bcrypt')
const mysql=require('mysql')
const dbConfig=require('./database.js')
const db=mysql.createConnection(dbConfig)  
db.connect((err)=>{
    if(err){
        throw err;
    }
    console.log('Mysql passport connected!');
  })
  
function initialize(passport){
    const authenticateUser= (username,password,done)=>{
        const sql="SELECT * FROM UserDetails WHERE username=?"
        db.query(sql,[username],async (err,rows)=>{
            if(err) done(err);
            const user=rows[0];
            if(rows.length===0){
                return done(null,false,{message :'No user with the given Username found'})
            }
            if(await bcrypt.compare(password,user.password)){
                return done(null,user)
            }
            else{
                return done(null,false,{message: 'Password incorrect!'})         
               }
        
        })
        
    
    }
    
    passport.serializeUser((user,done)=> done(null,user.id))
    passport.deserializeUser((id,done)=> {
        const sql="SELECT * FROM UserDetails WHERE id=?"
        db.query(sql,[id],(err,rows)=>{
          if(err) throw err
          done(null,rows[0])
        });
    });
    passport.use(new localStrategy({ usernameField :'username',passwordField: 'password'},authenticateUser))
}
module.exports=initialize;
