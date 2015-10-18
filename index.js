var TradeOfferManager = require('steam-tradeoffer-manager');

var PLUGIN_NAME = 'vapor-storehouse';

exports.name = PLUGIN_NAME;

exports.plugin = function(VaporAPI) {
    var RETRY_TIME = 5000;
    var POLLDATA_FILENAME = 'polldata.json';

    var log = VaporAPI.getLogger();
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
                log.error('Error while retrieving API key: %s', error);
                log.error('Retrying...');

                setTimeout(setup, RETRY_TIME, cookies);

                return;
            }

            log.info('Received API key.');

            // We will also unlock family view if necessary.
            if(config && config.familyViewPIN) {
                manager.parentalUnlock(config.familyViewPIN, function(error) {
                    if(error) {
                        log.error('Error while doing parental unlock: %s', error);
                        log.error('Retrying...');

                        setTimeout(setup, RETRY_TIME, cookies);

                        return;
                    }

                    log.info('Family View has been unlocked.');
                });
            }
        });
    }

    function declineOffer(offer) {
        offer.decline(function(error) {
            if(error) {
                log.warn('Trade offer has not been declined. Retrying...');

                setTimeout(declineOffer, RETRY_TIME, offer);
            } else {
                log.info('Trade offer has been declined successfully.');
            }
        });
    }

    function getReceivedItems(offer) {
        offer.getReceivedItems(function(error, items) {
            if(error) {
                log.warn('Couldn\'t get received items: %s', error);
                log.warn('Retrying...');

                setTimeout(getReceivedItems, RETRY_TIME, offer);
            } else {
                if(items.length > 0) {
                    var names = items.map(function(item) {
                        return item.name;
                    });

                    log.info('Received items: %s', names.join(', '));
                } else {
                    log.info('I have not received any items.');
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
            log.debug('Received new poll data.');
            VaporAPI.emitEvent('writeFile', POLLDATA_FILENAME, JSON.stringify(pollData, null, 2), function(error) {
                if(error) {
                    log.warn('`writeFile` event handler returned error.');
                    VaporAPI.emitEvent('debug', error);
                }
            });
        });

        manager.on('pollFailure', function(error) {
            log.warn('Polling error detected. SteamCommunity.com is probably down.');
            VaporAPI.emitEvent('debug', error);
        });

        manager.on('newOffer', function(offer) {
            var sid = offer.partner.getSteamID64();
            var user = utils.getUserDescription(sid);

            log.info('New offer #%s from %s.', offer.id, user);

            if(utils.isAdmin(sid)) {
                offer.accept(function(error) {
                    if(error) {
                        if(error.cause) {
                            log.warn('Trade offer cannot be accepted. Reason: %s', error.cause);
                        } else {
                            log.warn('Trade offer has not been accepted. I\'ll keep retrying...');
                        }
                    } else {
                        log.info('Trade offer has been accepted successfully.');
                    }
                });
            } else {
                declineOffer(offer);
            }
        });

        manager.on('receivedOfferChanged', function(offer, oldState) {
            log.info('Offer #%s changed status from %s to %s.',
                offer.id,
                TradeOfferManager.getStateName(oldState),
                TradeOfferManager.getStateName(offer.state));

            if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
                getReceivedItems(offer);
            }
        });
    }

    // Main entry point
    var hasFileHandler = VaporAPI.hasHandler('readFile');

    if(hasFileHandler) {
        VaporAPI.emitEvent('readFile', POLLDATA_FILENAME, function(error, data) {
            if(error) {
                log.warn('Failed to load polldata from cache.');
                VaporAPI.emitEvent('debug', error);
            } else {
                try {
                    manager.pollData = JSON.parse(data);
                } catch(exception) {
                    log.warn('Failed to parse polldata.');
                    VaporAPI.emitEvent('debug', exception);
                }
            }
            init();
        });
    } else {
        init();
    }

};
