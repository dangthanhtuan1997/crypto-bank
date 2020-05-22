const passport = require('passport');
const bcrypt = require('bcrypt');
const config = require('../config');
const User = require('../model/user.model');

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy((username, password, done) => {
	User.findOne({ username: username }, (err, user) => {
		if (err) { return done(err); }
		if (!user) {
			return done(null, false, { message: 'Incorrect username or password' });
		}
		bcrypt.compare(password, user.password, (err, isMatch) => {
			if (err) return done(err, null);
			if (isMatch) {
				return done(null, user);
			}
			return done(null, false, { message: 'Incorrect username or password' });
		});
	});
}));

module.exports = passport;