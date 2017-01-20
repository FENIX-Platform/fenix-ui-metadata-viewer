define(function () {

    "use strict";

    return {

        cache: false,

        lang: 'EN',

        environment : "develop",

        popover: {
            placement: 'right',
            html: true,
            trigger: 'focus',
            animation: true,
            title: '<span class="text-info"><strong>Description</strong></span>' +
            '<button type="button" data-toggle="popover" data-trigger="focus" class="close" >&times;</button>'
        },

        config: {
            initialState: 'collapsed',
            indentTemplate: '<span class="treegrid-indent fx-indent"></span>',
            expanderTemplate: '<span class="treegrid-expander fx-expand"></span>',
            expanderExpandedClass: 'treegrid-expander-expanded',
            expanderCollapsedClass: 'treegrid-expander-collapsed'
        },

        whiteList: {
            /* 'uid': true,
             contacts: true,
             "pointOfContact": true,
             "organization": true,
             "organizationUnit": true,
             "position": true,
             "role": true*/
        },

        hideExportButton: true,

        expandAttributes: [],

        expandAttributesRecursively: []

    };
});
