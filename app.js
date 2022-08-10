const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");

let database;
const initializeDBandServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, "twitterClone.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DataBase error is ${error.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const validatePassword = (password) => {
  return password.length > 5;
};

const convertUserDbObjectToResponseObject = (dbObject) => {
  return {
    userId: dbObject.user_id,
    name: dbObject.name,
    userName: dbObject.username,
    password: dbObject.password,
    gender: dbObject.gender,
  };
};

const convertFollowerDbObjectToResponseObject = (dbObject) => {
  return {
    followerId: dbObject.follower_id,
    followerUserId: dbObject.follower_user_id,
    followingUserId: dbObject.following_user_id,
  };
};

const convertTweetDbObjectToResponseObject = (dbObject) => {
  return {
    tweetId: dbObject.tweet_id,
    tweet: dbObject.tweet,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};

const convertReplyDbObjectToResponseObject = (dbObject) => {
  return {
    replyId: dbObject.reply_id,
    tweetId: dbObject.tweet_id,
    reply: dbObject.reply,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};

const convertLikeDbObjectToResponseObject = (dbObject) => {
  return {
    likeId: dbObject.like_id,
    tweetId: dbObject.tweet_id,
    userId: dbObject.user_id,
    dateTime: dbObject.date_time,
  };
};
function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    const createUserQuery = `
      INSERT INTO
      user (username, password, name, gender)
      VALUES
      (
          '${username}',
          '${hashedPassword}',
          '${name}',
          '${gender}'
          )`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        const getNamesQuery = `
      SELECT
      name
      FROM
      user NATURAL JOIN follower
      WHERE
      user_id = ${userId}`;
        const namesArray = await database.all(getNamesQuery);
        response.send(
          namesArray.map((eachName) =>
            convertUserDbObjectToResponseObject(eachName)
          )
        );
      }
    });
  }
});
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        const {
          limit = 4,
          order_by = "user_id",
          order = "DESC",
        } = request.query;
        const getTweetsQuery = `
      SELECT
      *
      FROM
      user NATURAL JOIN tweet
      WHERE
      user_name = '${userName}';
      ORDER BY
      ${order_by} ${order}
      LIMIT
      ${limit}`;
        const tweetsArray = await database.all(getTweetsQuery);
        response.send(tweetsArray);
      }
    });
  }
});
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        const getNamesQuery = `
      SELECT
      name = '${name}'
      FROM
      user NATURAL JOIN follower
      WHERE
      follower_user_id = ${followerUserId}`;
        const namesArray = await database.all(getNamesQuery);
        response.send(namesArray);
      }
    });
  }
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        const { tweetId } = request.params;
        const getTweetQuery = `
      SELECT
      *
      FROM
      tweet NATURAL JOIN like NATURAL JOIN reply
      WHERE
      tweet_id = ${tweetId}`;
        if (userId === undefined) {
          response.status(401);
          response.send("Invalid Request");
        } else {
          const tweet = await database.get(getTweetQuery);
          response.send(tweet);
        }
      }
    });
  }
});

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.send("Invalid JWT Token");
        } else {
          const { tweetId } = request.params;
          const getLikeQuery = `
      SELECT
      *
      FROM
      tweet NATURAL JOIN like
      WHERE
      tweet_id = ${tweetId}`;
          if (userId === undefined) {
            response.status(401);
            response.send("Invalid Request");
          } else {
            const likesArray = await database.get(getLikeQuery);
            response.send(likesArray);
          }
        }
      });
    }
  }
);
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.send("Invalid JWT Token");
        } else {
          const { tweetId } = request.params;
          const getReplyQuery = `
      SELECT
      name,
      reply
      FROM
      user NATURAL JOIN reply
      WHERE
      user_id = ${userId}`;
          if (userId === undefined) {
            response.status(401);
            response.send("Invalid Request");
          } else {
            const replyArray = await database.all(getReplyQuery);
            response.send(replyArray);
          }
        }
      });
    }
  }
);
module.exports = app;
