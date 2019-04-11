const express = require("express");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const app = express();
const PORT = 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['hello', 'goodbye'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

var urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID"},
  "9sm5xK": {longURL: "http://www.google.com", userID: "user2RandomID"}
};

const users = {};

app.get("/", (req,res) => {
  let templateVars = {urls: urlDatabase, user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

app.get("/hello", (req,res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/u/:shortURL",(req,res) => {
  const { shortURL } = req.params;
  let templateVars = {user: getUserObject(req.session["user_id"])};
  if (urlDatabase.shortURL === undefined) {
    templateVars['error'] = "Tiny URL does not exist.";
    res.status(400);
    res.render("urls_error", templateVars);
  } else {
    const longURL = urlDatabase.shortURL.longURL;
    res.redirect(longURL);
  }
});

app.get("/urls", (req,res) => {
  let templateVars = {urls: urlDatabase, user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    templateVars['error'] = "Please login or register first";
    res.status(401);
    res.render("urls_error", templateVars)
  } else {
    let userURLs = urlsForUser(templateVars.user.id);
    templateVars['userURLs'] = userURLs;
    res.render("urls_index", templateVars);
  }
  
});

app.get("/urls/new", (req,res) => {
  let templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    res.redirect("/login");
  } else {
    res.render("urls_new", templateVars);
  }
})

app.get("/urls/:shortURL", (req, res) => {
  const { shortURL } = req.params;
  let templateVars = {shortURL: shortURL, user: getUserObject(req.session["user_id"])};
  if(urlDatabase[shortURL] === undefined) {
    templateVars['error'] = "Tiny URL does not exist.";
    res.status(403);
    res.render("urls_error", templateVars);
  } else if (templateVars.user === undefined) {
    templateVars['error'] = "Please login or register first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if(urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars['error'] = "URL cannot be displayed. URL does not belong to user";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    templateVars[longURL] = urlDatabase[shortURL].longURL;
    res.render("urls_show", templateVars);
  }
});

app.get("/urls.json", (req,res) => {
  res.json(urlDatabase);
});

app.get("/register", (req,res) => {
  let templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    res.render("urls_register", templateVars);
  } else {
    res.redirect("/urls/");
  }
});

app.get("/login", (req,res) => {
  let templateVars = {user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    res.render("urls_login",templateVars);
  } else {
    res.redirect("/urls/");
  }
});

app.post("/login", (req,res) => {
  const { email, password} = req.body
  let templateVars = {user: getUserObject(req.session["user_id"])};
  if (email === '' || password === '') {
    res.status(400);
    templateVars['error'] = "Email or password blank";
    res.render("urls_error", templateVars);
  }
  else if (emailChecker(email)!== true) {
    res.status(403);
    templateVars['error'] = "Email not found";
    res.render("urls_error", templateVars);
  } else {
    let username = getUserNamebyEmail(email);
    if (pwChecker(username, password)===false) {
      res.status(403);
      templateVars['error'] = "Incorrect password";
      res.render("urls_error", templateVars);
    } else {
      req.session.user_id = username;
      res.redirect("/urls/");
    }
  }

});

app.post("/logout", (req,res) => {
  req.session = null;
  res.redirect("/");
});

app.post("/register", (req,res) => {
  const { email, password} = req.body;
  let templateVars = {user: getUserObject(req.session["user_id"])};
  if (email === '' || password === '') {
    res.status(400);
    templateVars['error'] = "Email or password blank";
    res.render("urls_error", templateVars);
  } else if (emailChecker(email)=== true) {
    res.status(403);
    templateVars['error'] = "Email already exists";
    res.render("urls_error", templateVars);
  } else {
    const id = generateRandomString(6);
    const hashedPassword = bcrypt.hashSync(password,10);
    users[id] = {
      id, 
      email, 
      hashedPassword
    };
    req.session.user_id = id;
    res.redirect("/urls");
  }
});

app.post("/urls", (req,res) => {
  var shortURL = generateRandomString(6);
  let templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    templateVars['error'] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    urlDatabase[shortURL] = {longURL: req.body.longURL, userID: templateVars.user.id};
    res.redirect("/urls/");
  }
});

app.post("/urls/:shortURL", (req,res) => {
  const { shortURL } = req.params;
  const { longURL } = req.body;
  let templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    templateVars['error'] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if (urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars['error'] = "URL cannot be displayed. URL does not belong to user";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    urlDatabase[shortURL] = {longURL: longURL, userID: getUserObject(req.session["user_id"]).id};
    res.redirect("/urls/")
  }
});

app.post("/urls/:shortURL/delete", (req,res) => {
  const { shortURL } = req.params;
  let templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    templateVars['error'] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if (urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars['error'] = "URL cannot be displayed. URL does not belong to user";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    delete urlDatabase[shortURL]
    res.redirect("/urls/")
  }
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
  if (bcrypt.compareSync(pw,users[username].hashedPassword))  {
    return true;
  } else {
    return false;
  }
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

function urlsForUser(id) {
  const userURLs = {};
  for (let shorturl in urlDatabase) {
    if(urlDatabase[shorturl].userID === id) {
      userURLs[shorturl] = urlDatabase[shorturl];
    }
  }
  return userURLs;
}