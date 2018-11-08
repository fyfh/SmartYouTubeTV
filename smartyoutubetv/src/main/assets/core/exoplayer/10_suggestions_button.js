console.log("Scripts::Running core script suggestions_button.js");

/**
 * <a href="https://javascript.info/bubbling-and-capturing">More info</a> about event propagation
 * @param host callback with {@link needToCloseSuggestions} and {@link suggestionsIsClosed} methods
 * @constructor
 */
function SuggestionsWatcher(host) {
    function SuggestionsWatcherService() {
        var $this = this;
        var modelChangeTimeStampMS = 0;
        var relatedEventsTimeWindowMS = 1000;

        var closeSuggestions = function() {
            if ($this.host == null) {
                return;
            }

            var playerControls = Utils.$(ExoConstants.playerControlsSelector);

            if (Utils.hasClass(playerControls, ExoConstants.hiddenClass)) {
                $this.host.suggestionsIsClosed();
            } else {
                $this.host.needToCloseSuggestions();
            }

            $this.host = null;
        };

        var onBlurHandler = function() {
            var currentTimeMS = Utils.getCurrentTimeMs();
            setTimeout(function() { // change event ordering: set 'modelChangedEvent' before 'componentBlurEvent'
                var diff = Math.abs(modelChangeTimeStampMS - currentTimeMS);
                if (diff > relatedEventsTimeWindowMS) {
                    console.log("SuggestionsWatcher: simple close suggestions: " + diff);
                    closeSuggestions(); // event is standalone
                } else {
                    console.log("SuggestionsWatcher: user have clicked on thumbnail");
                }
            }, 100);
        };

        var onModelChangeHandler = function(e) {
            var backToPlayer = Utils.hasClass(e.target, ExoConstants.hiddenClass) &&
                Utils.hasClass(e.target, ExoConstants.transportShowingClass);
            if (backToPlayer) {
                console.log("SuggestionsWatcher: user navigated out from the channel or search screen");
                closeSuggestions();
                return;
            }

            modelChangeTimeStampMS = Utils.getCurrentTimeMs();
        };

        EventUtils.addListener(ExoConstants.suggestionsListSelector, ExoConstants.componentBlurEvent, onBlurHandler);
        EventUtils.addListener(ExoConstants.playerUiSelector, ExoConstants.modelChangedEvent, onModelChangeHandler);

        this.setHost = function(host) {
            this.host = host;
        };

        console.log("SuggestionsWatcher: do init...");
    }

    if (!SuggestionsWatcher.service) {
        SuggestionsWatcher.service = new SuggestionsWatcherService();
    }

    SuggestionsWatcher.service.setHost(host);
}

SuggestionsWatcher.disable = function() {
    new SuggestionsWatcher(null);
};

function SuggestionsFakeButton(selector) {
    this.selector = selector;
    this.CLOSE_SUGGESTIONS = "action_close_suggestions";
    this.retryTimes = 10;
    this.callDelayMS = 500;

    this.tryToOpenSuggestions = function() {
        var suggestionsShown = Utils.hasClass(Utils.$(ExoConstants.suggestionsListSelector), ExoConstants.focusedClass);
        if (suggestionsShown || this.retryTimes <= 0)
            return;

        this.retryTimes--;

        console.log("SuggestionsFakeButton: suggestions not showed... trying to open...");

        // we assume that no interface currently shown
        // press multiple times util suggestion will have focus
        EventUtils.triggerEvent(ExoConstants.playerUiSelector, DefaultEvents.KEY_DOWN, DefaultKeys.DOWN);

        var $this = this;
        setTimeout(function() {
           $this.tryToOpenSuggestions();
        }, this.callDelayMS);
    };

    this.openSuggestions = function() {
        console.log("SuggestionsFakeButton: showing suggestions list");

        ExoUtils.enablePlayerUi();
        this.tryToOpenSuggestions();

        // start point
        new SuggestionsWatcher(this);
    };

    this.sendClose = function() {
        if (this.alreadySent) {
            return;
        }

        var $this = this;
        // immediate close not working here, so take delay
        setTimeout(function() {
            ExoUtils.sendAction($this.CLOSE_SUGGESTIONS);
        }, 100);

        this.alreadySent = true;
    };

    this.closeSuggestions = function() {
        if (this.alreadyHidden) {
            return;
        }

        console.log("SuggestionsFakeButton::closeSuggestions");
        
        EventUtils.triggerEvent(ExoConstants.playerUiSelector, DefaultEvents.KEY_UP, DefaultKeys.ESC);

        this.alreadyHidden = true;
    };

    this.suggestionsIsClosed = function() {
        console.log("SuggestionsFakeButton: suggestionsIsClosed");

        this.sendClose();
    };

    this.needToCloseSuggestions = function() {
        console.log("SuggestionsFakeButton: needToCloseSuggestions");

        var $this = this;
        // immediate close not working here, so take delay
        setTimeout(function() {
            $this.closeSuggestions();
            $this.sendClose();
        }, this.callDelayMS);
    };

    this.getChecked = function() {
        return null; // not exists
    };

    this.setChecked = function(doChecked) {
        if (doChecked && !ExoUtils.playerIsClosed()) { // fake btn can only be checked
            console.log("SuggestionsFakeButton: opening suggestions");
            this.openSuggestions();
        }
    };
}