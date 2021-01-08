const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const axios = require('axios');

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
    const { username, email, password, postalcode } = req.body;
    const params = {
      auth: '655070743689255475666x69593',
      locate: postalcode,
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
  const user = await User.findById(req.user._id);
  console.log(user.location);

  res.render('index', { location });
})

app.listen(3000, () => {
  console.log("SERVER IS UP!");
})