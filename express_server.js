const express = require("express");
const bodyParser = require("body-parser")
const app = express();
const PORT = 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

var deleteURLs = function (urlDB) {
  var obj = {};
  for (var key in urlDB) {
    obj[key] = "/urls/" + key + "/delete"
  }
  return obj;
}

app.get("/", (req,res) => {
  res.send("Hello!");
});

app.get("/hello", (req,res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/u/:shortURL",(req,res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.redirect("/urls/new")
  } else {
    const longURL = urlDatabase[req.params.shortURL];
    res.redirect(longURL)  
  }
});

app.get("/urls", (req,res) => {
  let templateVars = {urls: urlDatabase, delurls: deleteURLs(urlDatabase)};
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req,res) => {
  res.render("urls_new");
})

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]};
  res.render("urls_show", templateVars);
});
app.get("/urls.json", (req,res) => {
  res.json(urlDatabase);
});

app.post("/urls", (req,res) => {
  var shortURL = generateRandomString(6);
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls/" + shortURL);
});

app.post("/urls/:shortcode/delete", (req,res) => {
  delete urlDatabase[req.params.shortcode]
  res.redirect("/urls/")
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

function generateRandomString(num) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456879";
  for (var i = 0; i < 6; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}