const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const axios = require('axios');
const favicon = require('serve-favicon');

var AccessToken = require('twilio').jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;

// Substitute your Twilio AccountSid and ApiKey details
var ACCOUNT_SID = 'ACdba73502932bf6e6034a8162bedb56fe';
var API_KEY_SID = 'SK10a271b81094eec7f06688e422eddcea';
var API_KEY_SECRET = 'r4dHFbOrXDSsx4bFUzxmsOSPxTBNaUVt';

// Create an Access Token
var accessToken = new AccessToken(
  ACCOUNT_SID,
  API_KEY_SID,
  API_KEY_SECRET
);

// Set the Identity of this token
accessToken.identity = 'hao';

// Grant access to Video
var grant = new VideoGrant();
grant.room = 'cool room';
accessToken.addGrant(grant);

// Serialize the token as a JWT
var jwt = accessToken.toJwt();
console.log(jwt);

const { connect } = require('twilio-video');

connect('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTS2YzYzNhOGJhOWM1ZmZlZWQxYjgwZjkwOGQxODAyNTZlLTE2MTAxMjE1MTIiLCJpc3MiOiJTS2YzYzNhOGJhOWM1ZmZlZWQxYjgwZjkwOGQxODAyNTZlIiwic3ViIjoiQUNkYmE3MzUwMjkzMmJmNmU2MDM0YTgxNjJiZWRiNTZmZSIsImV4cCI6MTYxMDEyNTExMiwiZ3JhbnRzIjp7ImlkZW50aXR5IjoiaGFvIiwidmlkZW8iOnt9fX0.aqV4ky8XRC2TA3ld9l_J1CvaoTXtP3kkiFWwPOoHRo0', { name:'my-new-room' }).then(room => {
  console.log(`Successfully joined a Room: ${room}`);
  room.on('participantConnected', participant => {
    console.log(`A remote Participant connected: ${participant}`);
  });
}, error => {
  console.error(`Unable to connect to Room: ${error.message}`);
});

mongoose.connect('mongodb://localhost:27017/visitme', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Database connected!');
});

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  }
  next();
}

const sessionConfig = {
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
  }
}

const app = express();

app.use(session(sessionConfig));
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport stuff
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
})

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Landing page
app.get('/', (req, res) => {
  return req.user ? res.redirect('/home') : res.render('landing');
})

// Authentication
app.get('/signup', (req, res) => {
  res.render('signup');
})

app.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password, postal } = req.body;
    const params = {
      auth: '655070743689255475666x69593',
      locate: postal,
      json: '1'
    }
    const coords = await axios.get('https://geocode.xyz', {params});
    const location = [coords.data.longt, coords.data.latt];
    const user = new User({ username, email, location });
    const newUser = await User.register(user, password);
    req.login(newUser, err => {
      if (err) next(err);
      res.redirect('/home');
    })
  } catch(err) {
    console.log(err);
    res.redirect('/signup');
  }
})

app.get('/login', (req, res) => {
  res.render('login');
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/home');
})

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

// Home page
app.get('/home', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'visits',
    populate: {
      path: 'host'
    },
  });

  res.render('index', { location: user.location, visits: user.visits });
})

app.get('/form', isLoggedIn, (req, res) => {
  res.render('form');
})

app.post('/form', isLoggedIn, async (req,res) => {
  try {
    const visitDetails = req.body.visit;
    const hostUsername = req.body.visit.host;
    const user = await User.findById(req.user._id);
    const host = await User.findOne({ username: hostUsername });
    visitDetails.host = host;
    user.visits.push(visitDetails);
    await user.save();
    res.redirect('/home');
  } catch(error) {
    console.log(error);
    res.redirect('/form');
  }
})

app.listen(3000, () => {
  console.log("SERVER IS UP!");
})

