/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Facebook bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Facebook's Messenger APIs
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Follow the instructions here to set up your Facebook app and page:

    -> https://developers.facebook.com/docs/messenger-platform/implementation

  Run your bot from the command line:

    page_token=<MY PAGE TOKEN> verify_token=<MY_VERIFY_TOKEN> node facebook_bot.js

  Use localtunnel.me to make your bot available on the web:

    lt --port 3000

# USE THE BOT:

  Find your bot inside Facebook to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.page_token) {
    console.log('Error: Specify page_token in environment');
    process.exit(1);
}

if (!process.env.verify_token) {
    console.log('Error: Specify verify_token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;

var controller = Botkit.facebookbot({
    debug: true,
    access_token: process.env.page_token,
    verify_token: process.env.verify_token,
});

var client = require('twilio')(accountSid, authToken);

var bot = controller.spawn({});



controller.setupWebserver(process.env.port || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});


controller.hears(['hello', 'hi'], 'message_received', function(bot, message) {


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});


controller.hears(['text my wife'], 'message_received', function(bot, message) {
    bot.startConversation(message, function(err, convo) {
        if (!err) {
            convo.ask('Sure! What would you like to say?', function(response, convo) {
                var textMessage = response.text;
                client.messages.create({
                    body: textMessage,
                    to: process.env.TWILIO_TO_NUMBER,
                    from: process.env.TWILIO_FROM_NUMBER
                }, function(err, message) {
                    process.stdout.write(message.sid);
                });
            });
        }
    });
});


controller.hears(['call me (.*)', 'my name is (.*)'], 'message_received', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is your name', 'who are you'], 'message_received', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('My name is Chappi');
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                            pattern: 'yes',
                            callback: function(response, convo) {
                                // since no further messages are queued after this,
                                // the conversation will end naturally with status == 'completed'
                                convo.next();
                            }
                        }, {
                            pattern: 'no',
                            callback: function(response, convo) {
                                // stop the conversation. this will cause it to end with status == 'stopped'
                                convo.stop();
                            }
                        }, {
                            default: true,
                            callback: function(response, convo) {
                                convo.repeat();
                                convo.next();
                            }
                        }]);

                        convo.next();

                    }, {
                        'key': 'nickname'
                    }); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');

                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');


                                });

                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});



//order 

controller.hears(['(.*)(get|want|order|would like)(.*)pizza(.*)'], 'message_received', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (1 == 0) {
            bot.reply(message, 'What kind of pizza would you like ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (user && user.name) {
                    convo.say('!');
                    convo.ask('What kind of pizza would you like?', function(response, convo) {
                        convo.ask('You want me to buy you ' + response.text + '?', [{
                            pattern: 'yes',
                            callback: function(response, convo) {
                                // since no further messages are queued after this,
                                // the conversation will end naturally with status == 'completed'
                                convo.next();
                            }
                        }, {
                            pattern: 'no',
                            callback: function(response, convo) {
                                // stop the conversation. this will cause it to end with status == 'stopped'
                                convo.stop();
                            }
                        }, {
                            default: true,
                            callback: function(response, convo) {
                                convo.repeat();
                                convo.next();
                            }
                        }]);

                        convo.next();

                    }, {
                        'key': 'choice'
                    }); // store the results in a field called choice

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will get you that pizza...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.pizzaType = convo.extractResponse('choice');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Here is the options for ' + user.pizzaType + ' you selected.');
                                });

                                if (user.pizzaType.toLowerCase().indexOf('pepperoni') > -1) { //(.*)(pepperoni)(.*)pizza(.*)
                                    bot.reply(message, {
                                        attachment: {
                                            'type': 'template',
                                            'payload': {
                                                'template_type': 'generic',
                                                'elements': [{
                                                    'title': 'Classic pepperoni pizza',
                                                    'image_url': 'https://cache.dominos.com/olo/3_16_1/assets/build/market/US/_en/images/img/products/thumbnails/S_PIZZA.jpg',
                                                    'subtitle': 'Dominos Online Ordering',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Place order'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Pepperoni Pizza'
                                                    }]
                                                }, {
                                                    'title': 'PEPPERONI LOVERs',
                                                    'image_url': 'https://www.pizzahut.com/assets/w/tile/thor/Pepperoni_Lovers_Pizza.png',
                                                    'subtitle': 'Classic marinara sauce piled high with cheese and over 50% more authentic, old-world pepperoni hand-placed on your pizza',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'View Item'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'PEPPERONI'
                                                    }]
                                                }]
                                            }
                                        }
                                    });
                                } else if (user.pizzaType.toLowerCase().indexOf('cheese') > -1) {

                                    bot.reply(message, {
                                        attachment: {
                                            'type': 'template',
                                            'payload': {
                                                'template_type': 'generic',
                                                'elements': [{
                                                    'title': 'Classic cheese pizza',
                                                    'image_url': 'https://cdn.nexternal.com/cincyfav3/images/larosas_cheese_pizzas1.jpg',
                                                    'subtitle': 'Dominos Online Ordering',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Place order'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Pepperoni Pizza'
                                                    }]
                                                }, {
                                                    'title': 'Cheese Pizza',
                                                    'image_url': 'http://cdn.schwans.com/media/images/products/56719-1-1540.jpg',
                                                    'subtitle': 'Classic cheese piled high with cheese',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'View Item'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Cheese Pizza'
                                                    }]
                                                }]
                                            }
                                        }
                                    });
                                }

                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');

                        }
                    });
                }
            });
        }
    });
});

controller.on('message_received', function(bot, message) {
    bot.reply(message, 'Chappi is glad he could help.');
    return false;
});