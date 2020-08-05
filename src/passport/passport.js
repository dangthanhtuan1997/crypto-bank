const passport = require('passport');
const bcrypt = require('bcrypt');
const config = require('../config');
const User = require('../model/user.model');
const Teller = require('../model/teller.model');
const Admin = require('../model/admin.model');

const LocalStrategy = require('passport-local').Strategy;

passport.use('user', new LocalStrategy((username, password, done) => {
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

passport.use('teller', new LocalStrategy((username, password, done) => {
	Teller.findOne({ username: username }, (err, user) => {
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

passport.use('admin', new LocalStrategy((username, password, done) => {
	Admin.findOne({ username: username }, (err, user) => {
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