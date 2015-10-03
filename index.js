var fs = require('fs');
var TradeOfferManager = require('steam-tradeoffer-manager');

var PLUGIN_NAME = 'vapor-storehouse';

exports.name = PLUGIN_NAME;

exports.plugin = function(VaporAPI) {
    var RETRY_TIME = 5000;
    var POLLDATA_FILENAME = 'polldata.json';

    var utils = VaporAPI.getUtils();
    var config = VaporAPI.data || {};
    var steamUser = VaporAPI.getHandler('steamUser');

    var manager = new TradeOfferManager({
        steam: steamUser,
        language: 'en'
    });

    function setup(cookies) {
        manager.setCookies(cookies, function(error) {
            if(error) {
                VaporAPI.emitEvent('message:error', 'Error while retrieving API key: ' + error);
                VaporAPI.emitEvent('message:error', 'Retrying...');

                setTimeout(setup, RETRY_TIME, cookies);

                return;
            }

            VaporAPI.emitEvent('message:info', 'Received API key.');

            // We will also unlock family view if necessary.
            if(config && config.familyViewPIN) {
                manager.parentalUnlock(config.familyViewPIN, function(error) {
                    if(error) {
                        VaporAPI.emitEvent('message:error', 'Error while doing parental unlock: ' + error);
                        VaporAPI.emitEvent('message:error', 'Retrying...');

                        setTimeout(setup, RETRY_TIME, cookies);

                        return;
                    }

                    VaporAPI.emitEvent('message:info', 'Family View has been unlocked.');
                });
            }
        });
    }

    function declineOffer(offer) {
        offer.decline(function(error) {
            if(error) {
                VaporAPI.emitEvent('message:warn', 'Trade offer has not been declined. Retrying...');

                setTimeout(declineOffer, RETRY_TIME, offer);
            } else {
                VaporAPI.emitEvent('message:info', 'Trade offer has been declined successfully.');
            }
        });
    }

    function getReceivedItems(offer) {
        offer.getReceivedItems(function(error, items) {
            if(error) {
                VaporAPI.emitEvent('message:warn', 'Couldn\'t get received items: ' + error);
                VaporAPI.emitEvent('message:warn', 'Retrying...');

                setTimeout(getReceivedItems, RETRY_TIME, offer);
            } else {
                if(items.length > 0) {
                    var names = items.map(function(item) {
                        return item.name;
                    });

                    VaporAPI.emitEvent('message:info', 'Received items: ' + names.join(', '));
                } else {
                    VaporAPI.emitEvent('message:info', 'I have not received any items.');
                }
            }
        });
    }

    function init() {
        // Register handler for event when we receive our cookies.
        VaporAPI.registerHandler({emitter: 'vapor', event: 'cookies'}, setup);

        /**
         * Register different trade offer manager handlers.
         */
        manager.on('pollData', function(pollData) {
            VaporAPI.emitEvent('message:debug', 'Received new poll data.');
            VaporAPI.emitEvent('writeFile', POLLDATA_FILENAME, JSON.stringify(pollData, null, 2), function(error) {
                if(error) {
                    VaporAPI.emitEvent('message:warn', '`writeFile` event handler returned error.');
                    VaporAPI.emitEvent('debug', error);
                }
            });
        });

        manager.on('pollFailure', function(error) {
            VaporAPI.emitEvent('message:warn', 'Polling error detected. SteamCommunity.com is probably down.');
            VaporAPI.emitEvent('debug', error);
        });

        manager.on('newOffer', function(offer) {
            var sid = offer.partner.getSteamID64();
            var user = utils.getUserDescription(sid);

            VaporAPI.emitEvent('message:info', 'New offer #' + offer.id + ' from ' + user);

            if(utils.isAdmin(sid)) {
                offer.accept(function(error) {
                    if(error) {
                        if(error.cause) {
                            VaporAPI.emitEvent('message:warn', 'Trade offer cannot be accepted. Reason: ' + error.cause);
                        } else {
                            VaporAPI.emitEvent('message:warn', 'Trade offer has not been accepted. I\'ll keep retrying...');
                        }
                    } else {
                        VaporAPI.emitEvent('message:info', 'Trade offer has been accepted successfully.');
                    }
                });
            } else {
                declineOffer(offer);
            }
        });

        manager.on('receivedOfferChanged', function(offer, oldState) {
            VaporAPI.emitEvent('message:info',
                'Offer #' +
                offer.id +
                ' changed status from ' +
                TradeOfferManager.getStateName(oldState) +
                ' to ' +
                TradeOfferManager.getStateName(offer.state));

            if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
                getReceivedItems(offer);
            }
        });
    }

    // Main entry point
    var hasFileHandler =
        VaporAPI.hasHandler({emitter: 'plugin', plugin: PLUGIN_NAME, event: 'readFile'}) ||
        VaporAPI.hasHandler({emitter: '*', event: 'readFile'});

    if(hasFileHandler) {
        VaporAPI.emitEvent('readFile', POLLDATA_FILENAME, function(error, data) {
            if(error) {
                VaporAPI.emitEvent('debug', error);
                init();
            } else {
                try {
                    manager.pollData = JSON.parse(data);
                } catch(e) {
                    VaporAPI.emitEvent('message:warn', 'Failed to load polldata from cache.');
                    VaporAPI.emitEvent('debug', error);
                }
                init();
            }
        });
    } else {
        init();
    }

};
