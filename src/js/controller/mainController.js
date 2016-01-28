
define(['jquery','q' ,'underscore','fx-mdv/model/ModelCreator'
,'fx-mdv/output/TreegridAdapter'], function($,Q,_, ModelCreator, ViewAdapter){

    'use strict'


    function MainController() {};


    MainController.prototype.init = function (opts) {

        var self = this;

        this.o = $.extend(true,{}, opts);

        this.$modelCreator = new ModelCreator;


        this.$modelCreator.init(this.o);


        this.$modelCreator._startInternModelData(_.bind(self.render, this))

    };


    MainController.prototype._initVariables  =function() {

    };


    MainController.prototype.render = function (internmodel) {

        this.$viewAdapter  = new ViewAdapter(this.o);

        this.$internModel  = this.$modelCreator.getInternModelData();

        this.$viewAdapter.init(this.$internModel);

        this.$viewAdapter._visualizeData(this.$viewAdapter._onListening());
    };


    MainController.prototype.destroy  =function() {

        this.$viewAdapter.destroy();

    };


    return MainController;
});
