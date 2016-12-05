define([
    'loglevel',
    'jquery',
    '../../../src/js/index',
    '../assets/uneca_population.json',
    '../assets/gift',
], function (log, $, MetadataViewer, UnecaModel, GiftModel) {

    'use strict';

    var s = {
            STANDARD: "#standard",
            SECOND: "#second",
            DISPOSE_BTN: "[data-role='dispose']"
        },
        empty_model = {data: []},
        error_model = {},
        lang = 'fr',
        valid_model = UnecaModel,
        environment = "production";

    function Dev() {

        this._importThirdPartyCss();

        console.clear();

        log.setLevel('silent'); //trace silent

        this.start();
    }

    Dev.prototype.start = function () {
        log.trace("Test started");
        this._render();
    };

    Dev.prototype._render = function () {

        this._renderStandard();

        this._renderSecond();

    };

    Dev.prototype._renderStandard = function () {

        log.trace("Rendering standard metadata viewer: start");

        var metadataViewer = new MetadataViewer({
            model: GiftModel,
            lang: lang,
            environment: environment,
            el: s.STANDARD,
            specialFields : {
                "metadataLanguage": true,
                "language": true,
                "characterSet": true,
                "disseminationPeriodicity": true,
                "confidentialityStatus": true,
                "referencePeriod": true,
                "referenceArea": true,
                "coverageSectors": true,
                "coverageGeographic": true,
                "updatePeriodicity": true,
                "projection": true,
                "ellipsoid": true,
                "datum": true,
                "typeOfProduct": true,
                "processing": true,
                "topologyLevel": true,
                "typeOfCollection": true,
                "collectionPeriodicity": true,
                "originOfCollectedData": true,
                "dataAdjustment": true
            },
            hideExportButton: false,
            bridge : {
                serviceProvider : "http://fenixrepo.fao.org/cdn/",
                mdsdService : "mdsd/gift/mdsd.json"
            },
            expandAttributesRecursively: ['meContent'],
            popover: {
                placement: 'left'
            }
        })
            .on("ready", function (model) {
                log.warn("listening 'ready' event");
                log.warn(model);

                $(s.DISPOSE_BTN).on("click", function () {
                    metadataViewer.dispose();
                })
            })
            .on("export", function (model) {
                log.warn("listening 'export' event");
                log.warn(model);
            });

        log.trace("Rendering standard metadata viewer: end");
    };

    Dev.prototype._renderSecond = function () {

        log.trace("Rendering second metadata viewer: start");

        var metadataViewer = new MetadataViewer({
            model: valid_model,
            lang: lang,
            el: s.SECOND,
            environment: environment,
        });

        log.trace("Rendering second metadata viewer: end");
    };

    // utils

    Dev.prototype._importThirdPartyCss = function () {

        //Bootstrap
        require("bootstrap");

        require("../../../node_modules/jquery-treegrid-webpack/css/jquery.treegrid.css");

    };

    return new Dev();

});