const express = require("express");
const cookieParser = require ("cookie-parser")
const bodyParser = require("body-parser")
const app = express();
const PORT = 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};
const users = {
  "userRandomID" : {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
},
  "userRandom2ID" : {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
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
  let templateVars = {urls: urlDatabase, user: getUserObject(req.cookies["user_id"])};
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req,res) => {
  let templateVars = {user: getUserObject(req.cookies["user_id"])}
  res.render("urls_new", templateVars);
})

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: getUserObject(req.cookies["user_id"])};
  res.render("urls_show", templateVars);
});

app.get("/urls.json", (req,res) => {
  res.json(urlDatabase);
});

app.get("/register", (req,res) => {
  let templateVars = {user: getUserObject(req.cookies["user_id"])}
  res.render("urls_register", templateVars);
});

app.get("/login", (req,res) => {
  let templateVars = {user: getUserObject(req.cookies["user_id"])}
  res.render("urls_login",templateVars);
});

app.post("/login", (req,res) => {
  const { email, password} = req.body
  const username = getUserNamebyEmail(email);
  if (emailChecker(email)!== true) {
    res.status(403);
    res.send("Email not found.");
  } else {
    if (pwChecker(username, password)===false) {
      res.status(403);
      res.send("Password incorrect.");
    } else {
      res.cookie('user_id',username);
      res.redirect("/urls/");
    }
  }

});

app.post("/logout", (req,res) => {
  res.clearCookie('user_id');
  res.redirect("/login/");
});

app.post("/register", (req,res) => {

  const { email, password} = req.body;
  if (email === '' || password === '') {
    res.status(400);
    res.send("Email or username blank.")
  } else if (emailChecker(email)=== true) {
    res.status(400);
    res.send("Email already exists.")
  } else {

    const id = generateRandomString(6);
    users[id] = {
      id, 
      email, 
      password
    };
    res.cookie('user_id',id);
    res.redirect("/urls");
  }
});

app.post("/urls", (req,res) => {
  var shortURL = generateRandomString(6);
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls/" + shortURL);
});

app.post("/urls/:shortURL", (req,res) => {
  const { shortURL } = req.params;
  const { longURL } = req.body;
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls/")
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

function emailChecker(email) {
  for (var user in users) {
    if (Object.values(users[user]).indexOf(email) > -1) {
      return true;
    }    
  }
  return false;
}

function pwChecker(username, pw) {
  if (users[username].password === pw) {
    return true;
  }    
  return false;
}

function getUserObject(username) {
  for (var user in users) {
    if (users[user].id === username) {
      return users[user];
    }
  }
  return undefined;
}

function getUserNamebyEmail(email) {
  for (var user in users) {
    if (users[user].email === email) {
      return users[user].id;
    }
  }
  return undefined;
}
