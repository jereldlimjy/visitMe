const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const Visit = require('./models/visit');
const axios = require('axios');
const flash = require('connect-flash');
const favicon = require('serve-favicon');
const methodOverride = require('method-override');

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
app.use(flash());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

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
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
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
    const { username, link, email, password, postal } = req.body;
    const params = {
      auth: '655070743689255475666x69593',
      locate: postal,
      json: '1'
    }
    const coords = await axios.get('https://geocode.xyz', {params});
    const location = [coords.data.longt, coords.data.latt];
    const user = new User({ username, email, link, location });
    const newUser = await User.register(user, password);
    req.login(newUser, err => {
      if (err) next(err);
      res.redirect('/home');
    })
  } catch(err) {
    console.log(err);
    req.flash('error', err.message);
    res.redirect('/signup');
  }
})

app.get('/login', (req, res) => {
  res.render('login');
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
  res.redirect('/home');
})

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

// Home page
app.get('/home', isLoggedIn, async (req, res) => {
  // const user = await User.findById(req.user._id).populate({
  //   path: 'visits',
  //   populate: {
  //     path: 'host'
  //   },
  // });
  
  // Query for visits and visitors, sorted according to startTime and filtered to show future visits/visitors
  const cutoff = new Date();

  const user = await User.findById(req.user._id);
  const visits = await Visit.find({ visitor: user, endTime: { $gt: cutoff } }).sort({startTime: '1'}).populate('host');
  const visitors = await Visit.find({ host: user, endTime: { $gt: cutoff } }).sort({startTime: '1'}).populate('visitor');

  res.render('index', { location: user.location, visits, visitors });
})

// Add new visit
app.get('/form', isLoggedIn, (req, res) => {
  res.render('form');
})

app.post('/form', isLoggedIn, async (req,res) => {
  try {
    const visitDetails = req.body.visit;
    const visitor = await User.findById(req.user._id);
    const host = await User.findOne({ username: req.body.visit.host });
    visitDetails.host = host;
    visitDetails.visitor = visitor;
    const visit = new Visit(visitDetails);
    await visit.save();
    req.flash('success', 'New visit added!');
    res.redirect('/home');
  } catch(error) {
    console.log(error);
    req.flash('error', error.message);
    res.redirect('/form');
  }
})

// Delete a visit
app.delete('/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Visit.findByIdAndDelete(id);
    req.flash('success', 'Successfully removed visit!');
    res.redirect('/home');
  } catch (e) {
    req.flash('error', 'Oh no! Something went wrong :( Please try again!');
    res.redirect('/home');
  }
})

app.get('*', (req, res) => {
  res.redirect('/');
})

app.listen(3000, () => {
  console.log("SERVER IS UP!");
})