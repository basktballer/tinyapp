const express = require("express");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const methodOverride = require("method-override");
const app = express();
const PORT = 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  keys: ["hello", "goodbye"],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
app.use(methodOverride('_method'));

function generateRandomString(num) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456879";
  for (let i = 0; i < num; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function emailChecker(email) {  // check if email exists in users object
  for (const user in users) {
    if (Object.values(users[user]).indexOf(email) > -1) {
      return true;
    }    
  }
  return false;
}

function pwChecker(username, pw) {  // check if entered password matches the stored hash password for user
  if (bcrypt.compareSync(pw,users[username].hashedPassword))  {
    return true;
  } else {
    return false;
  }
}

function getUserObject(username) { // return user object if found, if not found condition is handled elsewhere
  for (const user in users) {
    if (users[user].id === username) {
      return users[user];
    }
  }
  return undefined;
}

function getUserNamebyEmail(email) { // return userID given the email
  for (const user in users) {
    if (users[user].email === email) {
      return users[user].id;
    }
  }
  return undefined;
}

function urlsForUser(id) {  // return list of urls created by given userID
  const userURLs = {};
  for (const shorturl in urlDatabase) {
    if(urlDatabase[shorturl].userID === id) {
      userURLs[shorturl] = urlDatabase[shorturl];
    }
  }
  return userURLs;
}

const urlDatabase = {}; // {shortURL: {longURL: #####, userID: #####, pageViews: #####, uniqueVisotirs: ##### visits: visits[{timestamp:#####, uniqueID: #####}] }}
const users = {}; // {id: {userid: #####, email: #####, password: #####}}

app.get("/", (req,res) => {
  const templateVars = {urls: urlDatabase, user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

app.get("/u/:shortURL",(req,res) => {
  const { shortURL } = req.params;
  const templateVars = {user: getUserObject(req.session["user_id"])};
  if (urlDatabase[shortURL] === undefined) {
    templateVars["error"] = "Tiny URL does not exist.";
    res.status(404);
    res.render("urls_error", templateVars);
  } else {
    const longURL = urlDatabase[shortURL].longURL;
    const visit = {};
    if (req.session.visitorID === undefined) {
      req.session.visitorID = generateRandomString(8);
      urlDatabase[shortURL].uniqueVisitors += 1;     
    }
    visit['timestamp'] = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    visit['uniqueID'] = req.session.visitorID;
    urlDatabase[shortURL].visits.push(visit);
    urlDatabase[shortURL].pageViews += 1;
    res.redirect(longURL);
  }
});

app.get("/urls", (req,res) => {
  const templateVars = {urls: urlDatabase, user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    templateVars["error"] = "Please login or register first";
    res.status(401);
    res.render("urls_error", templateVars)
  } else {
    let userURLs = urlsForUser(templateVars.user.id);
    templateVars["userURLs"] = userURLs;
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/new", (req,res) => {
  const templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    res.redirect("/login");
  } else {
    res.render("urls_new", templateVars);
  }
})

app.get("/urls/:shortURL", (req, res) => {
  const { shortURL } = req.params;
  const templateVars = {shortURL: shortURL, user: getUserObject(req.session["user_id"])};
  if(urlDatabase[shortURL] === undefined) {
    templateVars["error"] = "Tiny URL does not exist.";
    res.status(404);
    res.render("urls_error", templateVars);
  } else if (templateVars.user === undefined) {
    templateVars["error"] = "Please login or register first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if(urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars["error"] = "URL cannot be displayed. URL does not belong to user";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    templateVars["longURL"] = urlDatabase[shortURL].longURL;
    templateVars["pageViews"] = urlDatabase[shortURL].pageViews;
    templateVars["visits"] = urlDatabase[shortURL].visits;
    templateVars["uniqueVisitors"] = urlDatabase[shortURL].uniqueVisitors;
    res.render("urls_show", templateVars);
  }
});

app.get("/urls.json", (req,res) => {
  res.json(urlDatabase);
});

app.get("/register", (req,res) => {
  const templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    res.render("urls_register", templateVars);
  } else {
    res.redirect("/urls/");
  }
});

app.get("/login", (req,res) => {
  const templateVars = {user: getUserObject(req.session["user_id"])};
  if (templateVars.user === undefined) {
    res.render("urls_login",templateVars);
  } else {
    res.redirect("/urls/");
  }
});

app.post("/login", (req,res) => {
  const { email, password} = req.body
  const templateVars = {user: getUserObject(req.session["user_id"])};
  if (email === "" || password === "") {
    res.status(400);
    templateVars["error"] = "Please fill in all fields";
    res.render("urls_error", templateVars);
  }
  else if (emailChecker(email)!== true) {
    res.status(403);
    templateVars["error"] = "Email not found";
    res.render("urls_error", templateVars);
  } else {
    const username = getUserNamebyEmail(email);
    if (pwChecker(username, password)===false) {
      res.status(403);
      templateVars["error"] = "Incorrect password";
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
  const templateVars = {user: getUserObject(req.session["user_id"])};
  if (email === "" || password === "") {
    res.status(400);
    templateVars["error"] = "Please fill in all fields";
    res.render("urls_error", templateVars);
  } else if (emailChecker(email)=== true) {
    res.status(403);
    templateVars["error"] = "Email already exists";
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
  const shortURL = generateRandomString(6);
  const templateVars = {user: getUserObject(req.session["user_id"])}
  if (templateVars.user === undefined) {
    templateVars["error"] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    urlDatabase[shortURL] = {longURL: req.body.longURL, userID: templateVars.user.id, pageViews: 0, uniqueVisitors: 0, visits: [] };
    res.redirect("/urls/");
  }
});

app.put("/urls/:shortURL", (req,res) => {
  const { shortURL } = req.params;
  const { longURL } = req.body;
  const templateVars = {user: getUserObject(req.session["user_id"])}
  if(urlDatabase[shortURL] === undefined) {
    templateVars["error"] = "Tiny URL does not exist.";
    res.status(404);
    res.render("urls_error", templateVars);
  } else if (templateVars.user === undefined) {
    templateVars["error"] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if (urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars["error"] = "URL cannot be displayed. URL does not belong to user";
    res.status(401);
    res.render("urls_error", templateVars);
  } else {
    urlDatabase[shortURL] = {longURL: longURL, userID: getUserObject(req.session["user_id"]).id};
    res.redirect("/urls/")
  }
});

app.delete("/urls/:shortURL/delete", (req,res) => {
  const { shortURL } = req.params;
  const templateVars = {user: getUserObject(req.session["user_id"])}
  if(urlDatabase[shortURL] === undefined) {
    templateVars['error'] = "Tiny URL does not exist.";
    res.status(404);
    res.render("urls_error", templateVars);
  } else if (templateVars.user === undefined) {
    templateVars["error"] = "Please login first";
    res.status(401);
    res.render("urls_error", templateVars);
  } else if (urlDatabase[shortURL].userID !== templateVars.user.id) {
    templateVars["error"] = "URL cannot be displayed. URL does not belong to user";
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

