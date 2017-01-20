define([
    'jquery',
    'loglevel',
    '../../config/config',
    '../../config/events',
    '../../html/template.hbs',
    'amplify-pubsub',
    'jquery-treegrid-webpack'
], function ($, log, C, EVT, Template, amplify, treegrid) {

    'use strict';

    var o = {
        'identifiers': {
            noParentId: 'noParent',
            depth_level: 'depth-level',
            parent_class: 'treegrid-parent-',
            treegrid_class: 'treegrid-',
            bean: {
                title: 'title',
                desc: 'description',
                bean_name: 'bean'
            }
        },
        visualizationInfo: {
            container: '.container'
        },
        s: {
            'table_container': '.fx-md-viewer-container',
            'description_class': '.fx-md-viewer-description',
            'popover_class': '.popover',
            'treegrid_expander_arrow': 'span.treegrid-expander',
            EXPORT : '[data-role="export"]'
        }
    };

    function OutputCreator(options) {

        this.o = $.extend(true, {}, o, options);

        this.$el = $(this.o.el);
        this.$whitelist = this.o.whiteList;
        this.$treegridSettings = this.o.config;
        this.$popoverSettings = this.o.popover;
        this.hideExportButton = this.o.hideExportButton;
        this.expandAttributesRecursively = this.o.expandAttributesRecursively;
        this.expandAttributes = this.o.expandAttributes;

    }

    /**
     * render view
     */
    OutputCreator.prototype.render = function (model) {



        this.$visualizationData = this._transformDataToVisualizationModel(model.model, 'noParent', 0);

        this.$dataForTreeGRid = {'title_resource': model.title, 'data': this.$visualizationData, 'hideExportButton': this.hideExportButton};

        if (Object.keys(this.$whitelist).length > 0) {
            this.$dataForTreeGRid.data = this._filterWhiteList();
        }

        var templateToAdd = Template;
        var $compiled = templateToAdd(this.$dataForTreeGRid);

        this.$el.empty();
        this.$el.append($compiled);
        var r = this.$el.find(this.o.s.table_container).treegrid(this.$treegridSettings);


        
        if (r) {
            this._bindEventListeners();
            this._checkExpandNodesOptions();
        }

    };

    /**
     * dispose component
     */
    OutputCreator.prototype.dispose = function () {

        this._unbindListeners();

        this.$el.empty();
    };

    OutputCreator.prototype._transformDataToVisualizationModel = function (model, parentBean, levelCounter) {

        var result = [],
            className;
        for (var i = 0, length = model.length; i < length; i++) {

            if (model[i].hasChildren && model[i].hasChildren === true) {

                className = (parentBean != 'noParent') ?
                'treegrid-' + model[i]['bean'] + ' ' + 'treegrid-parent-' + parentBean + ' ' + 'depth-level-' + levelCounter + ' element' + ' fx-expand' :
                'treegrid-' + model[i]['bean'] + ' ' + parentBean + ' ' + 'depth-level-' + levelCounter + ' treegrid-collapsed' + ' element' + ' fx-expand';

                result.push({
                    'title': model[i]['title'],
                    'desc': model[i]['description'],
                    'bean': model[i]['bean'],
                    'parentBean': parentBean,
                    'className': className
                });

                result = result.concat(this._transformDataToVisualizationModel(model[i]['value'], model[i]['bean'], levelCounter + 1))
            }

            else if (model[i].hasChildren === false) {
                className = (parentBean != 'noParent') ?
                'treegrid-' + model[i]['bean'] + ' ' + 'treegrid-parent-' + parentBean + ' ' + 'depth-level-' + levelCounter + ' element' + ' fx-expand' :
                'treegrid-' + model[i]['bean'] + ' ' + parentBean + ' ' + 'depth-level-' + levelCounter + ' element' + ' fx-expand';

                result.push({
                    'title': model[i]['title'],
                    'desc': model[i]['description'],
                    'bean': model[i]['bean'],
                    'value': model[i]['value'],
                    'parentBean': parentBean,
                    'className': className
                })
            }
        }
        return result;
    };

    OutputCreator.prototype._bindEventListeners = function () {

        var self = this;

        // create description popover
        this.$el.find(self.o.s.description_class, self.$el).on('click', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if ( self.$el.find(self.o.s.popover_class, self.$el)) {
                self.$el.find(self.o.s.popover_class, self.$el).popover('destroy');
            }

            self.$el.find(this, self.$el).popover(self.$popoverSettings);
            self.$el.find(this, self.$el).popover('show');
        });

        // destroy popovers when clicking in the context but out of the buttons
        this.$el.on("click", function (e) {
            e.stopImmediatePropagation();
            log.info('el - event');
            if (!event.target.hasAttribute('data-toggle')) {
                self._destroyPopups(event, self);
            }
        });

        // on click on the row
        this.$el.find(this.o.s.table_container + " tr > td", self.$el).on("click", function (event) {
            log.info(event.target);
            // if it is not an element of bootstrap
            if (!event.target.hasAttribute('data-toggle')) {
                event.stopImmediatePropagation();
                var parent = $(this, self.$el).parents("tr").first();
                parent.treegrid('toggle');
                log.info('tc - event')
            }
            self._destroyPopups(event, self);

        });

        // on click on the arrow
        this.$el.find(self.o.s.treegrid_expander_arrow, self.$el).on('click', function (event) {
            event.stopImmediatePropagation();
            log.info('arrow - event');
            self._destroyPopups(event, self);
        });

        this.$el.find(self.o.s.EXPORT).on("click", function() {
           amplify.publish(EVT.export);
        })
    };

    OutputCreator.prototype._destroyPopups = function (e, context) {

        var that = context;
        if (($(that.o.s.popover_class, that.$el).has(e.target).length == 0) || $(e.target, that.$el).is('.close')) {
            $(that.o.s.popover_class, that.$el).popover('destroy');
        }
    };

    OutputCreator.prototype._filterWhiteList = function () {

        var result = [];
        for (var i = 0, length = this.$dataForTreeGRid.data.length; i < length; i++) {
            if (this.$whitelist[this.$dataForTreeGRid.data[i]['bean']] && this.$whitelist[this.$dataForTreeGRid.data[i]['bean']] == true) {
                result.push(this.$dataForTreeGRid.data[i]);
            }
        }

        return result;
    };

    OutputCreator.prototype._checkExpandNodesOptions = function () {

        var opts = [this.expandAttributesRecursively, this.expandAttributes];

        for (var i = 0; i < opts.length; i++) {
            if (opts[i] && opts[i].length > 0) {
                for (var j = 0; j < opts[i].length; j++) {
                    (i == 0) ? this.$el.find('.treegrid-' + opts[i][j], this.$el).treegrid('expandRecursive') : $('.treegrid-' + opts[i][j], this.$el).treegrid('expand');
                }
            }
        }
    };

    OutputCreator.prototype._unbindListeners = function () {
        this.$el.find(this.o.s.description_class, this.$el).off();
        this.$el.find(this.o.s.table_container + " tr > td", this.$el).off();
        this.$el.find(this.o.s.treegrid_expander_arrow, this.$el).off();
        this.$el.find(this.o.s.EXPORT).off();

        this.$el.off();
    };

    return OutputCreator;
});