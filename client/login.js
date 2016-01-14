

// TODO close sign in overlay on esc (27) need to do on whole window though

var newUserInfo;

Template.signin_overlay.onCreated(function(){
  Session.set('signinStage', 'signup');
  newUserInfo = {};
});

Template.signin_overlay.helpers({
  explanation: function(){
    var signingIn = Session.get('signingIn');
    if(typeof signingIn === 'string'){
      return signingIn
    }
  },
  onSignupStage: function(){
    return Session.equals('signinStage', 'signup');
  },
  onLoginStage: function(){
    return Session.equals('signinStage', 'login');
  },
  onInfoStage: function(){
    return Session.equals('signinStage', 'info');
  },
  onPasswordStage: function(){
    return Session.equals('signinStage', 'password');
  },
  onOnboardingStage: function(){
    return Session.equals('signinStage', 'onboarding');
  },
  twitterUser: function(){
    return Meteor.user() && !Meteor.user().username;
  }
});

Template.signin_overlay.events({
  "click .close": function(d) {
    closeSignInOverlay();
    analytics.track('Click close sign-in overlay');
  },
  "click .twitter-signin": function(d) {
    Meteor.loginWithTwitter({
      requestPermissions: ['user']
    }, function (err) {
      if (err) {
        notifyError("Twitter login failed");
        throw(err); // throw error so we see it on kadira
      } else if (!Meteor.user().username) { // if they are signing up for the first time they won't have a username yet
        Session.set('signinStage', 'info');
      } else { // otherwise they are a returning user, they are now logged in and free to proceed
        closeSignInOverlay();
        notifyLogin();
      }
    });

    analytics.track('Click login with Twitter');
  },
  "click .email-signup": function(d) {
    Session.set('signinStage', 'info');
    analytics.track('Click sign up with email');
  },
  "click .go-to-login": function(e, t){
    Session.set('signinStage', 'login');
  },
  "click .back-to-info": function(e, t){
    Session.set('signinStage', 'info');
  },
  "click .back-to-signup": function(e, t){
    Session.set('signinStage', 'signup');
  }
});


Template.info_form.onCreated(function() {
  this.signupError = new ReactiveVar();
  this.emailError = new ReactiveVar();
  this.nameError = new ReactiveVar();
  this.usernameError = new ReactiveVar();
  this.emailComplete = new ReactiveVar();
  this.nameComplete = new ReactiveVar();
  this.usernameComplete = new ReactiveVar();
  this.submitting = new ReactiveVar();
});

Template.info_form.helpers({
  tempUsername: function() {
    if (Meteor.user()) {
      return Meteor.user().tempUsername;
    }
    return;
  },
  signupError: function() {
    return Template.instance().signupError.get();
  },
  emailError: function () {
    return Template.instance().emailError.get();
  },
  nameError: function () {
    return Template.instance().nameError.get();
  },
  usernameError: function () {
    return Template.instance().usernameError.get();
  },
  submitting: function () {
    Template.instance().submitting.get()
  },
  disableSignup: function () {
    return Template.instance().submitting.get()
      || !Template.instance().emailComplete.get()
      || !Template.instance().nameComplete.get()
      || !Template.instance().usernameComplete.get()
      || Template.instance().emailError.get()
      || Template.instance().nameError.get()
      || Template.instance().usernameError.get()
  }
});

var checkEmailField =  function(e, t) {
  var email = t.$('input.signup-email').val();
  email = trimInput(email);

  console.log('11111')
  console.log(email)

  var result = checkValidEmail(email);
  if (!result.status) {
    t.emailError.set(result.message)
  } else {
    t.emailError.set(false)
    t.emailComplete.set(true);
  }
};

var checkNameField = function(e, t) {
  var name = t.$('input.signup-name').val();
  name = trimInput(name);

  var result = checkValidName(name);
  if (!result.status) {
    t.nameError.set(result.message)
  } else {
    t.nameError.set(false)
    t.nameComplete.set(true)
  }
};

var checkUsernameField = function(e, t) {
  var username = t.$(".signup-username").val();
  username = trimInput(username);
  console.log(e)

  var result = checkValidUsername(username);
  if (!result.status) {
    t.usernameError.set(result.message)
  } else {
    t.usernameError.set(false)
    t.usernameComplete.set(true)
  }
};

var checkPassword = function(e, t) {
  var p1 = t.$(".signup-password").val();

  var result = checkValidPassword(p1);
  if (!result.status) {
    t.passwordError.set(result.message);
  } else {
    t.passwordError.set(false);
    t.passwordComplete.set(true);
  }
};

var checkPasswordConfirmation = function(e, t) {
  var p1 = t.$(".signup-password").val();
  var p2 = t.$(".signup-password2").val();

  console.log('happening')

  var result2 = checkValidPasswordConfirmation(p1, p2);
  if (!result2.status) {
    t.password2Error.set(result2.message);
  } else {
    t.password2Error.set(false);
    t.password2Complete.set(true);
  }
};

Template.info_form.helpers({
  initialName: function(){
    if (newUserInfo.profile && newUserInfo.profile.name ){
      return newUserInfo.profile.name
    } else {
      var user = Meteor.user();
      if(user && user.profile && user.profile.name){
        return user.profile.name;
      }
    }
  },
  initialEmail: function(){
    if (newUserInfo.email){
      return newUserInfo.email
    }
  },
  initialUsername: function(){
    if (newUserInfo.username){
      return newUserInfo.username
    } else {
      var user = Meteor.user();
      if(user && user.tempUsername){
        return user.tempUsername;
      }
    }
  },

})
Template.info_form.events({
  'blur input.signup-email': checkEmailField,
  'keypress input.signup-email': function(e,t) {
    if (enterPress(e)) {
      checkEmailField(e, t);
    }
  },
  'blur input.signup-name': checkNameField,
  'keypress input.signup-name': function(e,t) {
    if (enterPress(e)) {
      checkNameField(e, t);
    }
  },
  'blur input.signup-username': checkUsernameField,
  'keypress input.signup-username': function(e,t) {
    checkUsernameField(e, t);
  },
  'submit': function (e, t) {
    var key;
    e.preventDefault();

    if(t.submitting.get()){
      return
    } else {
      t.submitting.set(true)
    }

    if (t.emailError.get() || t.usernameError.get()) {
      t.signupError.set('Please fix errors in required fields');
      t.submitting.set(false);
      return;
    } else {
      t.signupError.set(null);
    }

    var inputs = t.$('#info-form').serializeArray();
    var userInfo = {};
    _.each(inputs, function (input) {
      key = input['name'];
      value = input['value'];
      userInfo[key] = value;
    });

    if (Meteor.user()) { // if just finishing signup and already created a user via twitter
      Meteor.call('updateInitialTwitterUserInfo', userInfo, function (err) {
        t.submitting.set(false);
        if (err) {
          t.signupError.set(err.reason || err.error);
        } else {
          Session.set('signinStage', 'onboarding');
          notifyLogin();
          analytics.track('New user signed up', {label: 'twitter'});
        }
      });
    } else { // if email user

      newUserInfo = {
        email: userInfo.email,
        username: userInfo.username,
        profile: {
          "name": userInfo.name
        }
      };

      Meteor.call('validateUserInfo', newUserInfo, function(err) {
        t.submitting.set(false);
        if (err) {
          if (err.error === 'username') {
            t.usernameError.set(err.reason || err.error);
          } else if (err.error === 'email') {
            t.emailError.set(err.reason || err.error);
          } else {
            t.signupError.set(err.reason || err.error);
          }

        } else {
          Session.set('signinStage', 'password');
        }
      });
    }
  }
});



Template.password_form.onCreated(function() {
  this.signupError = new ReactiveVar();
  this.passwordError = new ReactiveVar();
  this.password2Error = new ReactiveVar();
  this.passwordComplete = new ReactiveVar();
  this.password2Complete = new ReactiveVar();
  this.disableSignup = new ReactiveVar();
  this.submitting = new ReactiveVar();
});

Template.password_form.helpers({
  signupError: function() {
    return Template.instance().signupError.get();
  },
  passwordError: function () {
    return Template.instance().passwordError.get();
  },
  password2Error: function () {
    return Template.instance().password2Error.get();
  },
  submitting: function () {
    return Template.instance().submitting.get();
  },
  disableSignup: function () {
    return Template.instance().submitting.get()
      || !Template.instance().passwordComplete.get()
      || !Template.instance().password2Complete.get()
      || Template.instance().passwordError.get()
      || Template.instance().password2Error.get()
  }
});


Template.password_form.events({
  'blur input.signup-password': checkPassword,
  'keypress input.signup-password': function(e,t) {
    if (enterPress(e)) {
      checkPassword(e, t);
    }
  },
  'keypress input.signup-password2': function(e,t) {
    //if (enterPress(e)) {
      checkPasswordConfirmation(e, t);
    //}
  },
  'submit': function (e, t) {
    e.preventDefault();
    checkPassword(e, t);
    checkPasswordConfirmation(e, t);

    if(t.submitting.get()){
      return
    } else {
      t.submitting.set(true)
    }

    if (t.passwordError.get()|| t.password2Error.get()) {
      t.signupError.set('Please fix errors in required fields');
      t.submitting.set(false);
      return;
    } else {
      t.signupError.set(null);
    }

    var inputs = t.$('#password-form').serializeArray();
    var userInfo = {};
    _.each(inputs, function (input) {
      var key = input['name'];
      value = input['value'];
      userInfo[key] = value;
    });

    newUserInfo.password = userInfo.password;

    Accounts.createUser(newUserInfo, function(err) {
      t.submitting.set(false);
      if (err) {
        t.signupError.set(err.reason || err.error);
      } else {
        Session.set('signinStage', 'onboarding');
        notifyLogin();
        analytics.track('New user signed up', {label: 'email'});
      }
    });
  }
});


Template.onboarding_screen.events({
  'click a, click button': function(){
    closeSignInOverlay();
  }
});

Template.login_form.onCreated(function() {
  this.loginError = new ReactiveVar(false);
});

Template.login_form.helpers({
  loginError: function() {
    return Template.instance().loginError.get();
  }
});

Template.login_form.events({
  'keypress input': function(e, template) {
    template.loginError.set(false);
  },
  'submit #login-form' : function(e, template) {
    e.preventDefault();

    inputs = template.$('#login-form').serializeArray();
    user_info = {};
    _.each(inputs, function(input) {
        var key = input['name'];
        value = input['value'];
        user_info[key]=value;
      });
    Meteor.loginWithPassword(user_info.username.toLowerCase(), user_info.password, function(err){
      if (err) {
        template.loginError.set(err.reason);
      } else {
        notifyLogin();
        closeSignInOverlay();
      }
      return;
    })
  }
});
