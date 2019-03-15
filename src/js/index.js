define([
    'jquery',
    'loglevel',
    '../config/errors',
    '../config/events',
    '../config/config',
    './models/modelCreator',
    './outputs/outputCreator',
    "fenix-ui-bridge",
    "amplify-pubsub"
], function ($, log, ERR, EVT, C, ModelCreator, OutputCreator, Bridge, amplify) {

    'use strict';

    function MetadataViewer(o) {
        log.info("FENIX metadata viewer");
        log.info(o);

        require("../css/fenix-ui-metadata-viewer.css");
        $.extend(true, this, C, {initial: o});

        this._parseInput();

        var valid = this._validateInput();

        if (valid === true) {

            this._initVariables();

            this._bindEventListeners();

            this._getMDSD().then(
                $.proxy(this._onGetMDSDSuccess, this),
                $.proxy(this._onGetMDSDError, this)
            );

            return this;

        } else {
            log.error("Impossible to create Metadata Viewer");
            log.error(valid)
        }
    }

    // API

    /**
     * pub/sub
     * @return {Object} MetadataViewer instance
     */
    MetadataViewer.prototype.on = function (channel, fn) {
        if (!this.channels[channel]) {
            this.channels[channel] = [];
        }
        this.channels[channel].push({context: this, callback: fn});
        return this;
    };

    /**
     * Dispose component
     */
    MetadataViewer.prototype.dispose = function () {

        this.outputCreator.dispose();

        this._unbindEventListeners();

        log.info("Metadata viewer[" + this.id + "] disposed");

        this._trigger("dispose", this.model);


    };

    // end API

    MetadataViewer.prototype._trigger = function (channel) {

        if (!this.channels[channel]) {
            return false;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0, l = this.channels[channel].length; i < l; i++) {
            var subscription = this.channels[channel][i];
            subscription.callback.apply(subscription.context, args);
        }

        return this;
    };

    MetadataViewer.prototype._parseInput = function () {

        this.$el = $(this.initial.el);
        this.model = this.initial.model;
        this.lang = this.initial.lang || C.lang;
        this.lang = this.lang.toUpperCase();

        this.cache =  this.initial.cache || C.cache;
        this.environment = this.initial.environment || C.environment;
        this.bridgeConfig = this.initial.bridge || {};
        this.specialFields = this.initial.specialFields;

        this.config = $.extend(true, {}, C.config, this.initial.config);
        this.popover = $.extend(true, {}, C.popover, this.initial.popover);

        this.whiteList = this.initial.whiteList || C.whiteList;

        this.expandAttributesRecursively = this.initial.expandAttributesRecursively || C.expandAttributesRecursively;
        this.expandAttributes = this.initial.expandAttributes || C.expandAttributes;

        this.hideExportButton = typeof this.initial.hideExportButton === 'boolean' ? this.initial.hideExportButton : C.hideExportButton;

        this.serviceProvider = this.initial.serviceProvider || undefined;
        
    };

    MetadataViewer.prototype._validateInput = function () {

        var valid = true,
            errors = [];

        //set MetadataViewer id
        if (!this.id) {

            window.fx_MetadataViewer_id >= 0 ? window.fx_MetadataViewer_id++ : window.fx_MetadataViewer_id = 0;
            this.id = String(window.fx_MetadataViewer_id);
            log.info("Set auto id to: " + this.id);
        }

        //Check if $el exist
        if (this.$el.length === 0) {
            errors.push({code: ERR.missingContainer});
            log.warn("Impossible to find MetadataViewer container");
        }

        if (!this.model) {
            errors.push({code: ERR.missingModel});
            log.warn("Impossible to find MetadataViewer model");
        }

        return errors.length > 0 ? errors : valid;

    };

    MetadataViewer.prototype._initVariables = function () {

        //pub/sub
        this.channels = {};

        this.modelCreator = new ModelCreator({
            data: this.model.hasOwnProperty("metadata") ? this.model.metadata : this.model,
            lang: this.lang,
            specialFields : this.specialFields
        });

        this.outputCreator = new OutputCreator({
            el: this.$el,
            hideExportButton: this.hideExportButton,
            popover: this.popover,
            whiteList: this.whiteList,
            config: this.config,
            expandAttributesRecursively: this.expandAttributesRecursively,
            expandAttributes: this.expandAttributes,

        });

        this.bridge = new Bridge($.extend(true, {
            environment: this.environment,
            cache: this.cache,
            serviceProvider : this.serviceProvider
        }, this.bridgeConfig));

    };

    MetadataViewer.prototype._bindEventListeners = function () {

        amplify.subscribe(EVT.export, this, this._onExport);

    };

    MetadataViewer.prototype._getMDSD = function () {

        return this.bridge.getMDSD(this.bridgeConfig);
    };

    MetadataViewer.prototype._onGetMDSDError = function (err) {

        log.error(ERR.getMDSDError);
        log.error(err);

    };

    MetadataViewer.prototype._onGetMDSDSuccess = function (mdsd) {

        log.info("MDSD loaded successfully", mdsd);

        this.mdsd = mdsd;

        this._render();

    };

    MetadataViewer.prototype._render = function () {

        log.info('Rendering...')

        this._processModel();

        this._renderOutput();

        this._trigger("ready", this.model);

    };

    MetadataViewer.prototype._processModel = function () {

        log.info('Process Model')

        this.outputModel = this.modelCreator.process(this.mdsd);

        log.info( 'this.outputModel' , this.outputModel);

    };

    MetadataViewer.prototype._renderOutput = function () {

        log.info('Render output')

        this.outputCreator.render(this.outputModel);

    };

    MetadataViewer.prototype._onExport = function () {

        this._trigger("export", this.model);

    };

    //disposition
    MetadataViewer.prototype._unbindEventListeners = function () {

        amplify.unsubscribe(EVT.export, this._onExport);

    };

    return MetadataViewer;
});