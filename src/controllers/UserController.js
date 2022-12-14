require("dotenv").config();
const UserModel = require("../models/UserModel");
const NoteModel = require("../models/NoteModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function getUser(id) {
  const user = await UserModel.findOne({ _id: id }).exec();
  return user;
}

module.exports = {
  register: async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.render("registerError");
    }

    try {
      const userExists = await UserModel.findOne({ email: email }).exec();
      if (userExists) {
        return res.render("registerExists");
      }

      const salt = await bcrypt.genSalt(15);
      const passwordHash = await bcrypt.hash(password, salt);
      const newUser = new UserModel({
        username,
        email,
        password: passwordHash,
      });

      await newUser.save();
      return res.render("login");
    } catch (error) {
      return res.json({ error: "Error on Register" });
    }
  },
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("loginError");
    }

    try {
      const user = await UserModel.findOne({ email: email }).exec();

      if (!user) {
        return res.render("loginError");
      } else {
        const checkPassword = await bcrypt.compare(password, user.password);

        if (!checkPassword) {
          return res.render("login", {
            status: {
              Error: true,
            },
          });
        } else {
          const secret = process.env.SECRET;
          const token = jwt.sign({ email: user.email }, secret, {
            expiresIn: "1d",
          });
          res.cookie("token", token, {
            maxAge: 3600000000,
            httpOnly: false,
          });
          res.redirect("/notes");
        }
      }
    } catch (error) {
      res.status(400).json({ error: "error on login" });
    }
  },
  getUser: async (id) => {
    const user = await UserModel.findOne({ _id: id }).exec();

    return user;
  },
  editProfile: async (req, res) => {
    let user = await UserModel.findOne({ _id: req.id }).exec();
    const { username } = req.body;

    await UserModel.updateOne(
      { _id: req.id },
      {
        $set: {
          username: username || user.username,
        },
      }
    );
    user = await UserModel.findOne({ _id: req.id }).exec();
    res.render("profile", {
      user: user,
      status: {
        saved: true,
      },
    });
  },
  getLogin: async (req, res) => {
    if (!req.headers.cookie) {
      res.render("login");
    } else {
      const token = req.headers.cookie.split("=")[1];
      const secret = process.env.SECRET;
      jwt.verify(token, secret, async (err, decoded) => {
        if (err) {
          res.render("login");
        } else {
          req.email = decoded.email;
          await UserModel.findOne({ email: decoded.email })
            .exec()
            .then((user) => {
              res.redirect("/notes");
            })
            .catch((err) => {
              res.status(401).json({ error: err });
            });
        }
      });
    }
  },
  getProfile: async (req, res) => {
    const user = await getUser(req.id);

    res.render("profile", {
      user,
      status: {
        saved: false,
      },
    });
  },
  getRegister: async (req, res) => {
    res.render("register");
  },
};
