const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/', (req, res) => {
  res.send('this is the landing page');
})

app.get('/home', (req, res) => {
  res.render('index');
})

app.listen(3000, () => {
  console.log("SERVER IS UP!");
})