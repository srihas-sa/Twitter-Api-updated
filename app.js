const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// Register to twitter API-1

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkuser = `select username from user where username = "${username}" ;`;
  const dbuser = await database.get(checkuser);
  if (dbuser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedpassword = await bcrypt.hash(password, 10);
      const requestQuery = `insert into user(name,username,password,gender) values('${name}','${username}','${hashedpassword}','${gender}');`;
      await database.run(requestQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// Login API-2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkuser = `select * from user where username="${username}" ;`;
  const dbUserExists = await database.get(checkuser);
  if (dbUserExists === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkpassword = await bcrypt.compare(password, dbUserExists.password);
    if (checkpassword === true) {
      const payload = { username: username };
      const jwttoken = jwt.sign(payload, "MY_SECRET_TOKEN");
      console.log(jwttoken);
      response.send({ jwttoken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Authentication of JWT TOKEN

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
  console.log(jwtToken);
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

// API-3
// rETURN LATEST TWEETS OF PEOPLE WHOM USER FOLLOWS

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);
  // get followers id's
  const getFollowerIdsQuery = `select following_user_id from follower where follower_user_id="${getuserId.user_id}" ;`;
  const getFollowerIdArray = await database.all(getFollowerIdsQuery);
  const getFollowerisds = getFollowerIdArray.map((eachUser) => {
    return eachUser.following_user_id;
  });

  const getTweetQuery = `select user.username,tweet.tweet,tweet.date_time as dateTime from user inner join tweet on user.user_id=tweet.user_id where user.user_id in (${getFollowerisds}) order by tweet.date_time desc limit 4 ;`;
  const responseresult = await database.all(getTweetQuery);
  response.send(responseresult);
});

// API-4
app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);
  // get followers id's
  console.log(getuserId.user_id);
  const getFollowerIdsQuery = `select following_user_id from follower where follower_user_id="${getuserId.user_id}" ;`;
  const getFollowerIdArray = await database.all(getFollowerIdsQuery);
  const getFollowerisds = getFollowerIdArray.map((eachUser) => {
    return eachUser.following_user_id;
  });

  const getFollowersResultQuery = `select name from user where user_id in (${getFollowerisds}) ;`;
  const responseresult = await database.all(getFollowersResultQuery);
  response.send(responseresult);
});

// API-5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);
  // get followers id's
  const getFollowerIdsQuery = `select follower_user_id from follower where following_user_id="${getuserId.user_id}" ;`;
  const getFollowerIdArray = await database.all(getFollowerIdsQuery);
  const getFollowerisds = getFollowerIdArray.map((eachUser) => {
    return eachUser.follower_user_id;
  });

  const getFollowersResultQuery = `select name from user where user_id in (${getFollowerisds}) ;`;
  const responseresult = await database.all(getFollowersResultQuery);
  response.send(responseresult);
});

// API-6

const api6output = (tweetData, likescount, replycount) => {
  return {
    tweet: tweetData.tweet,
    likes: likescount.likes,
    replies: replycount.replies,
    dateTime: tweetData.date_time,
  };
};

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  console.log(tweetId);
  let { username } = request;
  console.log(username);
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  console.log(username);
  const getuserId = await database.get(getUserTdQuery);
  // get followers id's
  console.log(username);
  const getFollowerIdsQuery = `select following_user_id from follower where follower_user_id="${getuserId.user_id}" ;`;
  console.log(username);
  const getFollowerIdArray = await database.all(getFollowerIdsQuery);
  const getFollowerisds = getFollowerIdArray.map((eachUser) => {
    return eachUser.following_user_id;
  });

  const getTweetIdQuery = `select tweet_id from tweet where user_id in (${getFollowerisds}) ;`;
  const getTweetIdArray = await database.all(getTweetIdQuery);
  const followingtweetid = getTweetIdArray.map((eachId) => {
    return eachId.tweet_id;
  });
  if (followingtweetid.includes(parseInt(tweetId))) {
    const likes_count_query = `select count(user_id) as likes from like where tweet_id=${tweetId};`;
    const likes_count = await database.get(likes_count_query);

    const reply_count_query = `select count(user_id) as replies from reply where tweet_id=${tweetId};`;
    const reply_count = await database.get(reply_count_query);

    const tweet_tweetdatabase = `select tweet,date_time from tweet where tweet_id=${tweetId};`;
    const tweet_tweetData = await database.get(tweet_tweetdatabase);
    response.send(api6output(tweet_tweetData, likes_count, reply_count));
  } else {
    response.status(401);
    response.send("Invalid Request");
    console.log("Invalid Request");
  }
});

// Api-7
const convertLikedUsername = (dbobject) => {
  return {
    likes: dbobject,
  };
};

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const getUserTdQuery = `select user_id from user where username="${username}" ;`;
    const getuserId = await database.get(getUserTdQuery);
    // get followers id's
    const getFollowerIdsQuery = `select following_user_id from follower where follower_user_id="${getuserId.user_id}" ;`;
    const getFollowerIdArray = await database.all(getFollowerIdsQuery);
    const getFollowerisds = getFollowerIdArray.map((eachUser) => {
      return eachUser.following_user_id;
    });

    const getTweetIdQuery = `select tweet_id from tweet where user_id in (${getFollowerisds}) ;`;
    const getTweetIdArray = await database.all(getTweetIdQuery);
    const followingtweetid = getTweetIdArray.map((eachId) => {
      return eachId.tweet_id;
    });
    if (followingtweetid.includes(parseInt(tweetId))) {
      const getLikeUsersNameQuery = `select user.username as likes from user inner join like on user.user_id=like.user_id where like.tweet_id=${tweetId};`;
      const grtLikesUserNamesArray = await database.all(getLikeUsersNameQuery);
      const getlikedusernames = grtLikesUserNamesArray.map((eachUser) => {
        return eachUser.likes;
      });

      response.send(convertLikedUsername(getlikedusernames));
    } else {
      response.status(400);
      response.send("Invalid Request");
    }
  }
);

// API-8

const convertRepliesUsername = (dbobject) => {
  return {
    replies: dbobject,
  };
};

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    let { username } = request;
    const getUserTdQuery = `select user_id from user where username="${username}" ;`;
    const getuserId = await database.get(getUserTdQuery);
    // get followers id's
    const getFollowerIdsQuery = `select following_user_id from follower where follower_user_id="${getuserId.user_id}" ;`;
    const getFollowerIdArray = await database.all(getFollowerIdsQuery);
    const getFollowerisds = getFollowerIdArray.map((eachUser) => {
      return eachUser.following_user_id;
    });

    const getTweetIdQuery = `select tweet_id from tweet where user_id in (${getFollowerisds}) ;`;
    const getTweetIdArray = await database.all(getTweetIdQuery);
    const followingtweetid = getTweetIdArray.map((eachId) => {
      return eachId.tweet_id;
    });
    if (followingtweetid.includes(parseInt(tweetId))) {
      const getLikeUsersNameQuery = `select user.name,reply.reply  from user inner join reply on user.user_id=reply.user_id where reply.tweet_id=${tweetId};`;
      const grtLikesUserNamesreplyTweets = await database.all(
        getLikeUsersNameQuery
      );

      response.send(convertRepliesUsername(grtLikesUserNamesreplyTweets));
    } else {
      response.status(400);
      response.send("Invalid Request");
    }
  }
);

// API-9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);
  const getTweetIdQuery = `select tweet_id from tweet where user_id = ${getuserId.user_id};`;
  const gettweetIdArray = await database.all(getTweetIdQuery);
  const getTweetIds = gettweetIdArray.map((eachuser) => {
    return parseInt(eachuser.tweet_id);
  });
  console.log(getTweetIds);
});

//API-10

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);

  const { tweet } = request.body;
  const currentDate = new Date();
  const postRequestquery = `insert into tweet(tweet,user_id,date_time) values("${tweet}",${
    getuserId.user_id
  },'${currentDate.toISOString().replace("T", " ")}' ;`;
  const responseResult = await database.run(postRequestquery);
  const tweet_id = responseResult.lastID;
  response.send("Created a Tweet");
});

//Api-11
app.delete("/tweet/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  console.log("hello");
  console.log(tweetId);
  let { username } = request;
  console.log(username);
  const getUserTdQuery = `select user_id from user where username="${username}" ;`;
  const getuserId = await database.get(getUserTdQuery);

  const getuserListQuery = `select  tweet_id from tweet where user_id=${getuserId.user_id};`;
  const getuserListarray = await database.all(getuserListQuery);
  const getUserList = getuserListarray.map((eachTweetId) => {
    return eachTweetId.tweet_id;
  });
  console.log(getUserList);
  if (getUserList.includes(parseInt(tweetId))) {
    const deleteqyery = `delete from tweet where tweet_id=${tweetId};`;
    await database.run(deleteqyery);
    response.send("Tweet Removed");
  } else {
    response.status(400);
    response.send("Invalid Request");
  }
});

module.exports = app;
