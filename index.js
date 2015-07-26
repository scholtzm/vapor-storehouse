var fs = require('fs');
var TradeOfferManager = require('steam-tradeoffer-manager');

module.exports = function(VaporAPI) {

    var utils = VaporAPI.getUtils();
    var log = VaporAPI.getLogger();
    var config = VaporAPI.getConfig().plugins[VaporAPI.pluginName];
    var POLLDATA_PATH = VaporAPI.getDataFolderPath() + "/polldata.json";

    var steamUser = VaporAPI.getHandler('steamUser');

    var manager = new TradeOfferManager({
        steam: steamUser,
        language: 'en'
    });

    // Restore poll data if possible.
    if(fs.existsSync(POLLDATA_PATH)) {
        try {
            manager.pollData = JSON.parse(fs.readFileSync(POLLDATA_PATH));
        } catch(err) {
            log.error("Failed to load polldata from cache.");
            log.error(err);
        }
    }

    // Register handler for event when we receive our cookies.
    VaporAPI.registerHandler({
            emitter: 'vapor',
            event: 'cookies'
        },
        function(cookies) {
            manager.setCookies(cookies, function(error) {
                if(error) {
                    log.error(error);
                    return;
                }

                log.info("Received API key.");

                // We will also unlock family view if necessary.
                if(config && config.familyViewPIN) {
                    manager.parentalUnlock(config.familyViewPIN, function(error) {
                        if(error) {
                            log.error("Error with parental unlock: " + error);
                            return;
                        }

                        log.info("Family View has been unlocked.");
                    });
                }
            });
        }
    );

    /**
     * Register different trade offer manager handlers.
     */
    manager.on('debug', log.verbose);

    manager.on('pollData', function(pollData) {
        log.debug("Received new poll data.");
        fs.writeFileSync(POLLDATA_PATH, JSON.stringify(pollData));
    });


    manager.on('newOffer', function(offer) {
        var sid = offer.partner.getSteamID64();
        var user = utils.getUserDescription(sid);

        log.info("New offer #" + offer.id + " from " + user);

        if(utils.isAdmin(sid)) {
            offer.accept(function(error) {
                if(error)
                    log.warn("Trade offer has not been accepted. I'll keep retrying ...");
                else
                    log.info("Trade offer has been accepted successfully.");
            });
        } else {
            offer.decline(function(error) {
                if(error)
                    log.warn("Trade offer has not been declined.");
                else
                    log.info("Trade offer has been declined successfully.");
            });
        }
    });


    manager.on('receivedOfferChanged', function(offer, oldState) {
        log.info("Offer #" + offer.id + " changed status from " +
            TradeOfferManager.getStateName(oldState) + " to " +
            TradeOfferManager.getStateName(offer.state));

        if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
            offer.getReceivedItems(function(error, items) {
                if(error) {
                    log.warn("Couldn\'t get received items: " + error);
                } else {
                    if(items.length > 0) {
                        var names = items.map(function(item) {
                            return item.name;
                        });

                        log.info("Received items: " + names.join(", "));
                    } else {
                        log.info("I have not received any items.");
                    }
                }
            });
        }
    });

};
