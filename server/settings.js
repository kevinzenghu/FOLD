// get segment key to the client, while allowing it to be set from environment variable
// NOTE: this hack may not be 100% reliable (for ex when initially deploy won't update clients)
if (process.env.GA_TRACKING_KEY){
  Meteor.settings['public'].GA_TRACKING_KEY = process.env.GA_TRACKING_KEY;
}

if (process.env.NODE_ENV){
  Meteor.settings['public'].NODE_ENV = process.env.NODE_ENV;
}

// SMTP Config
smtp = {
  username: Meteor.settings.SMTP_USERNAME,
  password: Meteor.settings.SMTP_API_KEY,
  server: Meteor.settings.SMTP_SERVER,
  port: Meteor.settings.SMTP_PORT
};

process.env.MAIL_URL = 'smtp://' + encodeURIComponent(smtp.username) + ':' + encodeURIComponent(smtp.password) + '@' + encodeURIComponent(smtp.server) + ':' + smtp.port;

Mandrill.config({
  key:  Meteor.settings.MANDRILL_API_KEY  // get your Mandrill key from https://mandrillapp.com/settings/index
});

if (Meteor.settings.CLOUDINARY_API_SECRET){
  Cloudinary.config({
    cloud_name: Meteor.settings['public'].CLOUDINARY_CLOUD_NAME,
    api_key: Meteor.settings.CLOUDINARY_API_KEY,
    api_secret: Meteor.settings.CLOUDINARY_API_SECRET
  });
};
