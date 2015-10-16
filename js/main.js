/*global require, document, console*/
require.config({

    baseUrl: 'js/libs',

    paths: {
        JSON: '../../json'
    },

    shim: {
        q: {
            deps: ['jquery'],
            exports: 'q'
        }
    }

});

require(['jquery',
         'text!JSON/schema.json',
         'text!JSON/data.json',
         'handlebars',
         'alpaca'], function ($, schema, data) {

    'use strict';

    data = $.parseJSON(data);
    schema = $.parseJSON(schema);

    console.debug('olá!');
    console.debug(schema);
    console.debug(data);

    $("#placeholder").alpaca({
        schema: schema,
        data: data,
        view: 'bootstrap-display-horizontal',
        options: {
            collapsed: true,
            collapsible: true
        }
    });

});