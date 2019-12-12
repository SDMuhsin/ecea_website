var express = require("express");
var bodyParser = require("body-parser");
var multer = require("multer");
var mongoose = require("mongoose");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var nodemailer = require('nodemailer');

var app = express();
var upload = multer();

app.set("view engine", "pug");
app.set("views", "./views");

app.use(cookieParser());
app.use(session({secret:"shhhhh"}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(upload.array());

//ENCRYPTION
let data = "example";
let buff = new Buffer(data);
let base64data = buff.toString('base64');
console.log(base64data);

let buff2 = new Buffer(base64data, 'base64');
let text1 = buff2.toString('ascii');
console.log(text1);

//ENCRYPTION
 
//NODEMAILER
var transporter = nodemailer.createTransport({
	service:'gmail',
	auth:{
		user: "sdmuhsin3011@gmail.com",
		pass: "30111998easypass"
	}
});

//MONGO DB MONGOOSE SET UP
const uri = "mongodb+srv://sdmuhsin:dbsdmuhsin3011@cluster0-spwju.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect( uri ,{useNewUrlParser:true,useUnifiedTopology:true}, (err,db)=>{if(err){console.log("ERROR CONNECTING TO DB");console.log(err);}else{console.log("Succesfully connected to atlas");}});

//schema
var accountSchema = mongoose.Schema({
	name:String,
	Password:String,
	instituteemail:String,
	personalemail:String,
	regnumber:String,
	
	adminaccess:Number,
	
	studyyear:Number,
	designation:String,
	ecearank:String,
	
	stage1verification:String,
	stage2verification:String,
	stage3verification:String,
	
	stage1verificationcode:Number,
	stage2verificationcode:Number,
	stage3verificationcode:Number,
	
	secretsessionnumber:Number,
	
	interests:[String],
	interviewquestions:[{Type:String,question:String,answer:String}]
});
var accountModel = mongoose.model( "accountModel", accountSchema);



//UTILITY FUNCTIONS
function returnSessionData( req){
	return {
					userloggedin:req.session.userloggedin,
					userpersonalemailemail:req.session.userpersonalemail,
					userinstituteemail:req.session.userinstituteemail,
					userstage1verification:req.session.stage1verification,
					userstage2verification:req.session.stage2verification,
					userstage3verification:req.session.stage3verification,
					userstudyyear:req.session.userstudyyear
				
	};
}
//GET REQUUESTS---------------------------------------------------
//Home Page
app.get("/", ( req, res ) => {
	res.render( "homepage", {...returnSessionData(req)} );
}); 
//Sign up form
app.get("/signup", ( req, res) => {
	res.render("signup",{loggedin:req.session.loggedin})
})
//Login form
app.get("/login", ( req,res ) => {
	console.log("Logged in?", req.session.userloggedin );
	if(req.session.userloggedin){
		res.render("loggedin", {...returnSessionData(req)});
	}else{
		res.render("login")
	}
});
//Logout request !IMPORTANT
app.get("/logout", function( req,res ){
	req.session.destroy();
	console.log("SESSION DESTROYED");
	res.render("homepage");
})
//Show users
app.get("/showusers", function( req,res ){
	var users = [];
	accountModel.find({},function( err,resp){
		if(err){res.send("Server side error, try again");console.log(err);}
		else{
			console.log(res);
			
			var secondYears = resp.filter((item) => {return item.studyyear==2 && item.stage1verification=="complete" && item.stage2verification =="complete" && item.stage3verification =="complete"}).map((item) => {return [item.name,item.regnumber]});
			console.log(secondYears);
			var thirdYears = resp.filter((item) => {return item.studyyear==3 && item.stage1verification=="complete" && item.stage2verification =="complete" && item.stage3verification =="complete"}).map((item) => {return [item.name,item.regnumber]});
			console.log(thirdYears);
			var fourthYears = resp.filter((item) => {return item.studyyear==4 && item.stage1verification=="complete" && item.stage2verification =="complete" && item.stage3verification =="complete"}).map((item) => {return [item.name,item.regnumber]});
			console.log(fourthYears);
			
			res.render("showusers", {...returnSessionData(req),thirdYears:thirdYears,secondYears:secondYears,fourthYears:fourthYears});
		}
	})
})

//Update user profile page
app.get("/updateprofilepage", function( req, res){
	
	if(!req.session.userloggedin){
		res.render("homepage", {...returnSessionData(req)});
	}else{
		
		
		
		accountModel.findOne({instituteemail: req.session.userinstituteemail}, function( err, resp){
			if(err){res.render("error",{message:"server side error, try again"});console.log(err);}
			//Calculate how many question fields
			var numberOfQuestions = resp.interviewquestions.length;
			
			//update page
			res.render("editprofile", {
				...returnSessionData(req),
				 
				name:resp.name,
				studyyear:resp.studyyear,
				designation:resp.designation,
				regnumber:resp.regnumber,
				ecearank:resp.ecearank,
				instituteemail:resp.instituteemail,
				personalemail:resp.personalemail,
				interests:resp.interests.join(","),
				interviewquestions:resp.interviewquestions
			})
		});
	}
})

app.get("/profile/:userreg", function( req,res ){
	
	accountModel.findOne({regnumber:req.params.userreg}, function( err,resp){
		if(err){res.render("error", {...returnSessionData(req),message:"Server side error, try again"});console.log(err);}
		else{
			console.log("-----Request for viewing profile of" + req.params.userreg);
			//console.log(resp);
			if(resp == null){
				res.render("error",{...returnSessionData(req),message:"This profile does not exist"});
			}else if( resp.stage3verification != "complete"){
				res.render("error",{...returnSessionData(req),message:"This user's account is not verified"});
			}else{
				console.log("Loading interview questions of user.....");
				console.log(resp.interviewquestions);
				// PUBLIC PROFILE
				res.render("profilepage",{...returnSessionData(req),
					display_username:resp.name,
					display_userregnumber:resp.regnumber,
					display_interests:resp.interests,
					display_interviewquestions:resp.interviewquestions
				});
			}
		}
		
	})
});

app.get("/admin", function( req,res ){
	
	if(req.session.userloggedin){
		//CHeck if user is admin
		accountModel.findOne({instituteemail:req.session.userinstituteemail},function(err,resp){
			if(err){res.render("error",{...returnSessionData(req),message:"Server side error, try again"});console.log(err);}
			else{
				
				if(resp.adminaccess){
					console.log("++++++++++++++++++ Admin login");
					
					//find all users
					accountModel.find(function(err,resp){
						if(err){res.render("error",{...returnSessionData(req),message:"Server side error, try again"});console.log(err);}
						else{
							resp.Password = "************";
							res.render("admin",{...returnSessionData(req),message:"Admin",users:resp})
						}
					});
					
					
				}
				else{
					res.render("error",{...returnSessionData(req),message:"You dont have admin access"});
					console.log("+++++++++++++++++++Attempted admin access by " + userinstituteemail);
				}
			}
		});
	}
	else{
		res.render("error",{...returnSessionData(req),message:"Restricted Access"});
	}
});
//submit questions
app.get("/submitquestions", function( req,res ){
	
	if( !req.session.userloggedin || (req.session.userstudyyear!=3 && req.session.userstudyyear!=4)){
		res.render("error",{message:"Restricted access"});
	}else{
		//Find previous questions
		accountModel.findOne({instituteemail:req.session.userinstituteemail},function(err,resp){
			if(err){res.render("error",{message:"Server side error, try again"});console.log(err);}
			else{
				res.render("questionform", {...returnSessionData(req),interviewquestions:resp.interviewquestions});
			}
			
		})
		
		
	}
})

//---------------------------------------------------------------
//POST REQUESTS--------------------------------------------------
//---------------------------------------------------------------
//SIGN UP
app.post("/signup", ( req,res ) => {
	console.log(req.body);
	//res.render("signup",{loggedin:req.session.loggedin,firststage:"complete",message:"Account registered, login"})
	
	//Check if passwords match
	if( req.body.password1 != req.body.password2 ){
			res.render("signup",{loggedin:req.session.loggedin,message:"Passwords didnt match"});
	}else{
		
		//Handle student sign up
		if(req.body.designation == "student"){
			//Verifying institute ID
			var l = req.body.instituteemail.length;
			var isNitcId = req.body.instituteemail.slice( l-11, l) == "@nitc.ac.in";
			var isECE = req.body.instituteemail.slice(l-13,l-11) == "ec";
			var message = "";//To tell user what part of id is wrong
			
			console.log( "Department :" + req.body.instituteemail.slice(l-13,l-11)  );
			//First check if from NITC
			if( isNitcId){
				//Then check if ECE
				if( isECE ){
					//Success, check year
					if( Number(req.body.instituteemail.slice( l-19, l-17 )) < 61){
						
						var joinedYear = "20" + req.body.instituteemail.slice( l-19, l-17 );
						var joinedMonth = 6;
						
						var today = new Date();
						var todayYear = today.getFullYear();
						var todayMonth = today.getMonth();
						
						console.log( todayMonth, todayYear, "Today");
						console.log("joined", joinedYear);
						var studyYear = 0;
						if( Number(todayMonth) >= Number(joinedMonth)){
							studyYear = Number(todayYear) - Number(joinedYear) + 1;
						}else {
							studyYear = Number(todayYear) - Number(joinedYear);
						}
						console.log( "Year of study : " + String(studyYear));
						//To check if first year
						if( studyYear <= 1 && req.body.instituteemail.slice(l - 20, l-19 ) == 'b'){
							res.render("signup",{message:"First years aren't allowed to register, if you are not a first year, contact ecea rep"});
						}else if( studyYear > 4 && req.body.instituteemail.slice(l - 20, l-19 ) == 'b'){
							res.render("signup",{message:"Alumni must select 'Alumni' under designation dropdown"});
						}else{
							console.log("Confirmed study year, checking for duplicate accounts");
							accountModel.find({instituteemail:req.body.instituteemail}, function( err, resp){
								console.log("RESPONSE FROM FIND :",resp);
								if(err){console.log("Error trying find duplicate sign up");res.render("signup",{message:"An error on our side occured, try again"});}
								else{
									console.log("RESPONSE FROM FIND :",resp);
									if( !resp.length ){
										//SUCCESS
										
										//scramble password
										var data = req.body.password1;
										var buffencode = new Buffer(data);
										var base64data = buffencode.toString('base64');
										
										console.log("Encoded password : " + base64data);
										//STORE
										var newAccount = new accountModel({
											name:req.body.name,
											Password:base64data,
											instituteemail:req.body.instituteemail,
											personalemail:req.body.email,
											regnumber:req.body.instituteemail.slice(l-20,l-11),
											
											studyyear:studyYear,
											designation:"Student",
											ecearank:"",
											
											stage1verification:"",
											stage2verification:"",
											stage3verification:"",
											
											stage1verificationcode:Math.floor(Math.random() * 10000),
											stage2verificationcode:Math.floor(Math.random() * 10000),
											stage3verificationcode:Math.floor(Math.random() * 10000),
											
											secretsessionnumber:Math.floor(Math.random() * 10000)												
										});
										//Save to database
										newAccount.save(function(err, account){
											if(err){console.log("Error trying to save sign up");res.render("signup",{message:"An error on our side occured, try again"});}
											else{
											res.render("signup",{loggedin:req.session.loggedin,firststage:"complete",message:"Account registered, login to complete verification"});
											console.log("Succesful signup",newAccount);
											}
										});
										
										//STORE
										
										
										//SUCCESS
									}else{
										//DUPLICATE ACCOUNT
										res.render("signup", {message:"Your account is already registered with us, try logging in"});
									}
								}
								
							})

						
						}
					
					}else{
						//From the 90s.....
						res.render("signup",{message:"Alumni must select 'Alumni' under designation dropdown"});
					}
				}else{
					message+= "User is not from ECE department, please check your institute ID";
					res.render("signup", {loggedin:req.session.loggedin,message:message});
				}
				
			}else{
				console.log(req.body.instituteemail.slice( l-11, l));
				message+= " The institute ID you entered does not belong to the institute, please check again.";
				res.render("signup", {loggedin:req.session.loggedin,message:message});
			}
		}
		
	}
	
});

//LOGIN

app.post("/login", ( req,res ) => {
	console.log("Logged in?",req.session.userloggedin );

	
	console.log("Login request recieved", req.body);
	//Check if email exists
	accountModel.find({personalemail:req.body.email}, function( err, resp){
		if(err){console.log("Login error, email");res.render("login",{message:"An error on our side, try again"});}
		else{
			console.log("Initiating login........");
			if( !resp.length){
				console.log("Email not found.........");
				//IF EMAIL ISNT FOUND
				res.render("login",{message:"Email not found"});
			}else{
				console.log("Email found.........");
				//IF EMAIL IS FOUND
				//Check if passwords match
				
				//decrytp password
				var data = resp[0].Password;
				var buff = new Buffer(data,"base64");
				var decodedpass = buff.toString("ascii");
				
				if( decodedpass == req.body.password1){
					//PASSWORD MATCHED
					console.log("password matched.........");
					
					
					//---------------------START SESSION STUFF-------------------------//
					req.session.userloggedin = true;
					req.session.userpersonalemail = resp[0].personalemail;
					req.session.userinstituteemail = resp[0].instituteemail;
					req.session.stage1verification = resp[0].stage1verification;
					req.session.stage2verification = resp[0].stage2verification;
					req.session.stage3verification = resp[0].stage3verification;
					
					req.session.username = resp[0].name;
					req.session.userregnumber = resp[0].regnumber;
					req.session.userstudyyear = resp[0].studyyear;
					//---------------------END SESSION STUFF-------------------------//
					
					//send user to logged in screen
					res.render("loggedin", {...returnSessionData(req)
						});
					
				}else{
					console.log("passwords did not match.........", req.body.password1, resp[0].Password);
					

					
					res.render("login",{message:"Account found, but password is incorrect!"});
				}
			}
		}
	})
	
});
//verification
app.post("/verification",( req,res ) => {
	console.log("Verification request recieved", req.body);
	
	//check stage number
	
	if( req.body.formidentifier == "stage1"){
		console.log("STAGE 1.......");
		
		accountModel.find({instituteemail:req.session.userinstituteemail},function(err, resp){
				if(err){console.log("Error");res.send("Server side error, try again");}
				
				try{console.log(resp,req.body.stage1verificationcode, resp[0].stage1verificationcode);
				if( Number(req.body.stage1verificationcode) == resp[0].stage1verificationcode ){
					
					//CODE CONFIRMED
					req.session.stage1verification = "complete";
					
					//Update database
					accountModel.update({instituteemail:req.session.userinstituteemail},{stage1verification:"complete"},function(err,res){
						if(err){console.log("FAILED TO UPDATE TO DATABASE");}
						console.log("Succesfully updated verficaition data to database");
					});
					
					res.render("loggedin",{...returnSessionData(req)});
				}else{
					res.render("loggedin", {...returnSessionData(req),stage1message:"Incorrect code"});
				}}
				catch{}
		});
	}else if(req.body.formidentifier == "stage2"){
		
		console.log("STAGE 2.......");
		accountModel.find({instituteemail:req.session.userinstituteemail},function(err, resp){
				if(err){console.log("Error");res.send("Server side error, try again");}
				
				try{console.log(resp,req.body.stage2verificationcode, resp[0].stage2verificationcode);
				if( Number(req.body.stage2verificationcode) == resp[0].stage2verificationcode ){
					//CODE CONFIRMED
					req.session.stage2verification = "complete";
					
					//Update database
					accountModel.update({instituteemail:req.session.userinstituteemail},{stage2verification:"complete"},function(err,res){
						if(err){console.log("FAILED TO UPDATE TO DATABASE");}
						console.log("Succesfully updated verficaition data to database");
					});
					
					res.render("loggedin",{...returnSessionData(req)});
				}else{
					res.render("loggedin", {...returnSessionData(req),stage2message:"Incorrect code"});
				}}
				catch{}
		});
	}else if(req.body.formidentifier == "sendcodes"){
		
		console.log("Sending codes to " + req.session.userpersonalemail + " and " + req.session.userinstituteemail );
		//search database for the codes
		accountModel.find({instituteemail:req.session.userinstituteemail},function(err, resp){
				if(err){console.log("Error");res.send("Server side error, try again");}
				
				try{
					console.log( resp[0].stage1verificationcode , resp[0].stage2verificationcode);
					//EMAIL TO PERSONAL EMAIL
					var mailOptions = {
						from: "sdmuhsin3011@gmail",
						to:resp[0].personalemail,
						subject:"ECEA Account Verification",
						text:"Your verification code for stage 1 is " + resp[0].stage1verificationcode
					};
					transporter.sendMail( mailOptions, function( err, info){
	
						if(err){console.log(err)}
						else{console.log("Email sent, info :" + info.response)};
					});
					//EMAIL TO institute email
					mailOptions = {
						from: "sdmuhsin3011@gmail",
						to:resp[0].instituteemail,
						subject:"ECEA Account Verification",
						text:"Your verification code for stage 2 is " + resp[0].stage2verificationcode
					};
					transporter.sendMail( mailOptions, function( err, info){
	
						if(err){console.log(err)}
						else{console.log("Email sent, info :" + info.response)};
					});
					//SUCCESS
					res.render("loggedin",{...returnSessionData(req)});
				}
				catch{}
		});
	}else{
		res.render("loggedin", {...returnSessionData()});}
});

//update user profile
app.post("/updateprofile", function( req,res ){
	
	
	try{
		console.log("-----User " + req.session.userinstituteemail + " has requested an update");
		console.log(req.body);
		//update
		var formCopy = req.body;
		var rawString = formCopy.interests;
		
		formCopy.interests = formCopy.interests.split(",");
		accountModel.updateOne({regnumber:req.body.regnumber},req.body, function( err,resp){
			if(err){res.render("error",{message:"Server side error, try again"});console.log(err);}
			else{
				console.log("-----Profile of user updated");
				console.log(resp);
				res.render("homepage",{...returnSessionData(req)});
			}
			
		});
	}
	catch{}
})

//submit questions
app.post("/submitquestions", function( req,res ){
	
	if(req.session.userloggedin){
		console.log("-----REQUEST to submit a question");
		console.log(req.body);
		
		accountModel.findOne({instituteemail:req.session.userinstituteemail}, function(err,resp){
			if(err){console.log(err);res.render("error",{message:"Error, try again"});}
			else{
				console.log("-----User identified, showing current questions....");
				console.log(resp.interviewquestions);
				
				var newQuestionList = resp.interviewquestions;
				//console.log("checkpoint",typeof(resp.interviewquestions),typeof(req.body));
				newQuestionList.push(req.body);
				//console.log("checkpoint");
				//UPDATE
				accountModel.updateOne({instituteemail:req.session.userinstituteemail}, {interviewquestions:newQuestionList}, function(err,resp){
					if(err){console.log(err);res.render("error",{message:"Error, try again"});}
					else{
						console.log("Succesfully updated interviewquestions");
						
						res.render("questionform",{...returnSessionData(req),succesfulsubmission:true,interviewquestions:newQuestionList})
					}
				});
			}
		})
	}
})

//admin stage 3 verification
app.post("/adminverification", function( req,res ){
	if(req.session.userloggedin){
		
		//check if user is an admin
		accountModel.findOne({instituteemail:req.session.userinstituteemail}, function(err,resp){
			if(err){res.render("error",{message:"server side error, try again"});console.log(err);}
			else{
				if(resp.adminaccess){
					//ADMIN Verified
					console.log("++++++++ Admin has verfied user " + req.body);
					accountModel.updateOne({regnumber:req.body.regnumbertoverify}, {stage3verification:"complete"},function( err, resp2){
						if(err){res.render("error",{message:"server side error, try again"});console.log(err);}
						else{
							console.log("++++++++User to verify accessed and verified");
							// UPDATE COMPLETE
							resp.Password = "****";
							console.log("ADMIN :" ,resp);
							res.render("error",{...returnSessionData(req),message:"Succesfully verfied user, go back and refresh to continue"});
						}
					});
				}
				else{
					res.render("error",{message:"You do not have admin access"});
				}
			}
		});
	}
	else{
		res.render("error");
	}
})
app.listen(process.env.PORT ||3000);