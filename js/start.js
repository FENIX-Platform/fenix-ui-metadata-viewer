/*global define, JSONEditor, swal, document */
define(['jquery',
        'handlebars',
        'faostat_commons',
        'FAOSTAT_THEME',
        'fx-report',
        'text!fenix_ui_metadata_viewer/html/templates.hbs',
        'i18n!fenix_ui_metadata_viewer/nls/translate',
        'text!fenix_ui_metadata_viewer/config/application_settings.json',
        'sweetAlert',
        'jsonEditor'], function ($, Handlebars, FAOSTATCommons, FAOSTAT_THEME, FENIX_UI_REPORTS,
                     templates, translate, application_settings) {

    'use strict';

    function FUIMDV() {

        this.CONFIG = {

            lang: 'en',
            edit: false,
            domain: 'GT',
            schema: null,
            data: null,
            lang_faostat: 'E',
            application_name: 'faostat',
            placeholder_id: 'placeholder',
            url_mdsd: 'http://faostat3.fao.org/d3s2/v2/mdsd',
            url_pdf_service: 'http://fenixapps2.fao.org/fenixExport',
            url_wds_table: 'http://fenixapps2.fao.org/wds_5.1/rest/table/json',
            url_d3s: 'http://faostat3.fao.org/d3s2/v2/msd/resources/metadata/uid',
            rendered: false,
            metadata_sections: [],
            editors: {},

            /* Events to destroy. */
            callback: {
                onMetadataRendered: null
            }

        };

    }

    FUIMDV.prototype.isRendered = function () {
        return this.CONFIG.rendered;
    };

    FUIMDV.prototype.isNotRendered = function () {
        return !this.CONFIG.rendered;
    };

    /**
     * This is the entry method to configure the module.
     *
     * @param config Custom configuration in JSON format to extend the default settings.
     */
    FUIMDV.prototype.init = function (config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Fix the language, if needed. */
        this.CONFIG.lang = this.CONFIG.lang !== null ? this.CONFIG.lang : 'en';

        /* Cast application settings. */
        if (typeof application_settings === 'string') {
            application_settings = $.parseJSON(application_settings);
        }

        /* Store FAOSTAT language. */
        this.CONFIG.lang_faostat = FAOSTATCommons.iso2faostat(this.CONFIG.lang);

        /* Apply FAOSTAT theme for json-editor. */
        JSONEditor.defaults.themes.faostat_theme = JSONEditor.AbstractTheme.extend(FAOSTAT_THEME);

        /* Extend string editor. */
        JSONEditor.defaults.editors.string = JSONEditor.defaults.editors.string.extend(this.custom_string_editor);

        /* Load the structure. */
        var source, template, dynamic_data, html;
        source = $(templates).filter('#viewer_structure').html();
        template = Handlebars.compile(source);
        dynamic_data = {};
        html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).html(html);

        /* Store the container. */
        //this.CONFIG.container = document.getElementById(this.CONFIG.placeholder_id);

        /* Load the schema from DB, if needed. */
        this.CONFIG.schema === null ? this.load_schema_from_db() : this.create_editor();

    };

    FUIMDV.prototype.load_schema_from_db = function () {

        /* This... */
        var that = this;

        /* Load JSON schema. */
        $.ajax({

            url: this.CONFIG.url_mdsd,
            type: 'GET',
            dataType: 'json',

            success: function (response) {

                /* Cast the result, if required. */
                that.CONFIG.schema = response;
                if (typeof that.CONFIG.schema === 'string') {
                    that.CONFIG.schema = $.parseJSON(response);
                }

                /* Initiate JSON editor. */
                that.create_editor();

            },

            error: function (a) {
                swal({
                    title: translate.error,
                    type: 'error',
                    text: a.responseText
                });
            }

        });

    };

    FUIMDV.prototype.create_editor = function () {

        /* Variables. */
        var source, template, dynamic_data, html, editor_config, q, metadata_section, local_settings;

        /* Refactor schema. */
        this.CONFIG.schema = this.refactor_schema(this.CONFIG.schema);

        /* Common editor settings. */
        editor_config = {
            theme: 'faostat_theme',
            iconlib: 'fontawesome4',
            disable_edit_json: true,
            disable_properties: true,
            collapsed: true,
            disable_array_add: true,
            disable_array_delete: true,
            disable_array_reorder: true,
            disable_collapse: false,
            remove_empty_properties: false,
            expand_height: true
        };

        /* Initiate editors, one for each section. */
        for (q = 0; q < this.CONFIG.metadata_sections.length; q += 1) {
            metadata_section = this.CONFIG.metadata_sections[q];
            this.CONFIG.editors[metadata_section] = {};
            local_settings = $.extend(true, {}, editor_config);
            local_settings.schema = this.CONFIG.schema[metadata_section];
            try {
                this.CONFIG.editors[metadata_section] = new JSONEditor(document.getElementById(metadata_section + '_placeholder'), local_settings);
            } catch (ignore) {

            }
        }

        /* Remove unwanted labels. */
        $(this.CONFIG.container).find('div:first').find('h3:first').empty();
        $(this.CONFIG.container).find('div:first').find('p:first').empty();

        /* Add Export to PDF button. */
        source = $(templates).filter('#export_pdf_button_structure').html();
        template = Handlebars.compile(source);
        dynamic_data = {
            export_pdf_label: translate.export_pdf_label
        };
        html = template(dynamic_data);
        $('#export_button_placeholder').html(html);

        /* Bind listener. */
        this.export_pdf();

        /* Load data, if needed. */
        if (this.CONFIG.data !== null) {
            this.populate_editor();
        } else {
            this.load_data();
        }
        //this.CONFIG.data !== null ? this.populate_editor() : this.load_data();

    };

    FUIMDV.prototype.export_pdf = function () {
        $('#export_pdf_button').click({url_pdf_service: this.CONFIG.url_pdf_service,
                                       uid: this.CONFIG.domain,
                                       lang: this.CONFIG.lang,
                                       filename: 'FAOSTAT_metadata_' + this.CONFIG.domain + '_' + this.CONFIG.lang + '.pdf'}, function (e) {
            var url, payload, fenix_export;
            url = e.data.url_pdf_service;
            payload = {
                input: {
                    config: {
                        uid: e.data.uid
                    }
                },
                output: {
                    config: {
                        lang: e.data.lang.toUpperCase(),
                        fileName: e.data.filename
                    }
                }
            };
            fenix_export = new FENIX_UI_REPORTS();
            fenix_export.init('metadataExport');
            fenix_export.exportData(payload, url);
        });
    };

    FUIMDV.prototype.refactor_schema = function (json) {
        var section_regex, properties, key, out = {}, q, metadata_section;
        json.properties.meIdentification = {};
        json.properties.meIdentification.propertyOrder = 1;
        json.properties.meIdentification.type = 'object';
        json.properties.meIdentification.title = translate.identification;
        json.properties.meIdentification.properties = {};
        section_regex = /[me]{2}[A-Z]/;
        properties = json.properties;
        for (key in properties) {
            if (!section_regex.test(key)) {
                if (key === 'title') {
                    json.properties.meIdentification.properties.title_fenix = json.properties[key];
                } else {
                    json.properties.meIdentification.properties[key] = json.properties[key];
                }
                delete json.properties[key];
            }
        }

        /* Store metadata sections. */
        for (q = 0; q < Object.keys(json.properties).length; q += 1) {
            this.CONFIG.metadata_sections.push(Object.keys(json.properties)[q]);
        }

        /* Split the original schema in 7 sub-schemas. */
        for (q = 0; q < this.CONFIG.metadata_sections.length; q += 1) {
            metadata_section = this.CONFIG.metadata_sections[q];
            out[metadata_section] = {};
            out[metadata_section].$schema = json.$schema;
            out[metadata_section].definitions = json.definitions;
            out[metadata_section].type = 'object';
            out[metadata_section].title = metadata_section.substring(2).toUpperCase();
            out[metadata_section].properties = json.properties[metadata_section].properties;
        }

        /* Return object contains the sections of the metadata as separate JSON Schema objects. */
        return out;
    };

    FUIMDV.prototype.apply_settings = function (data) {

        /* Apply application settings. */
        var settings = application_settings[this.CONFIG.application_name],
            key;

        /* Filter by blacklist... */
        if (settings.blacklist !== null && settings.blacklist.length > 0) {
            settings.blacklist.forEach(function (setting) {
                try {
                    delete data[setting.toString()];
                } catch (ignore) {

                }
            });
        } else {
            for (key in data) {
                if ($.inArray(key, settings.whitelist) < 0) {
                    try {
                        delete data[key.toString()];
                    } catch (ignore) {

                    }
                }
            }
        }

        return data;
    };

    FUIMDV.prototype.load_data = function (editor) {

        /* This... */
        var that = this,
            d3s_id;

        /* ID to be used for D3S. */
        d3s_id = this.CONFIG.domain !== null ? this.CONFIG.domain : this.CONFIG.group;

        /* Load JSON schema. */
        $.ajax({

            url: this.CONFIG.url_d3s + '/' + d3s_id.toUpperCase() + '?full=true',
            type: 'GET',
            dataType: 'json',

            success: function (response) {

                /* Cast the result, if required. */
                that.CONFIG.data = response;
                if (typeof that.CONFIG.data === 'string') {
                    that.CONFIG.data = $.parseJSON(response);
                }

                /* Populate editor. */
                that.populate_editor();

            },

            error: function (a) {
                swal({
                    title: translate.error,
                    type: 'error',
                    text: a.responseText
                });
            }

        });

    };

    FUIMDV.prototype.populate_editor = function () {

        /* Variables. */
        var section_regex, properties, key, q, metadata_section;

        /* Apply application settings. */
        this.CONFIG.data = this.apply_settings(this.CONFIG.data);

        /* Display the editor... */
        if (this.CONFIG.data !== undefined) {

            /* Regular expression test to reorganize metadata sections. */
            this.CONFIG.data.meIdentification = {};
            section_regex = /[me]{2}[A-Z]/;
            properties = this.CONFIG.data;
            for (key in properties) {
                if (!section_regex.test(key)) {
                    if (key === 'title') {
                        this.CONFIG.data.meIdentification.title_fenix = this.CONFIG.data[key];
                    } else {
                        this.CONFIG.data.meIdentification[key] = this.CONFIG.data[key];
                    }
                    delete this.CONFIG.data[key];
                }
            }

            /* Populate the editor. */
            for (q = 0; q < this.CONFIG.metadata_sections.length; q += 1) {
                try {
                    metadata_section = this.CONFIG.metadata_sections[q];
                    this.CONFIG.editors[metadata_section].setValue(this.CONFIG.data[metadata_section]);
                } catch (ignore) {
                }
            }

            /* Disable editing. */
            if (!this.CONFIG.edit) {
                for (q = 0; q < this.CONFIG.metadata_sections.length; q += 1) {
                    metadata_section = this.CONFIG.metadata_sections[q];
                    try {
                        this.CONFIG.editors[metadata_section].disable();
                        $('#' + metadata_section + '_placeholder').find('.btn.btn-default.json-editor-btn-collapse').click();
                    } catch (ignore) {
                    }
                }
            }

        } else {
            this.display_courtesy_message();
        }

        /* Rendered. */
        this.CONFIG.rendered = true;

        /* Invoke user function. */
        if (this.CONFIG.callback.onMetadataRendered) {
            this.CONFIG.callback.onMetadataRendered();
        }

    };

    FUIMDV.prototype.display_courtesy_message = function () {
        var source, template, dynamic_data, html;
        source = $(templates).filter('#courtesy_message').html();
        template = Handlebars.compile(source);
        dynamic_data = {
            message: translate.courtesy
        };
        html = template(dynamic_data);
        this.CONFIG.container.html(html);
    };

    FUIMDV.prototype.custom_string_editor = {

        setValue: function (value, initial, from_template) {

            var d, sanitized, changed;

            if (this.template && !from_template) {
                return;
            }

            if (value === null) {
                value = '';
            } else if (typeof value === "object") {
                value = JSON.stringify(value);
            } else if (typeof value !== "string") {
                value = '' + value;
            }

            /* Convert milliseconds to valid date. */
            if (this.format === 'date') {
                try {
                    d = new Date(parseFloat(value));
                    value = d.toISOString().substring(0, 10);
                } catch (ignore) {

                }
            }

            if (value === this.serialized) {
                return;
            }

            /* Sanitize value before setting it */
            sanitized = this.sanitize(value);

            if (this.input.value === sanitized) {
                return;
            }

            this.input.value = sanitized;

            /* If using SCEditor, update the WYSIWYG */
            if (this.sceditor_instance) {
                this.sceditor_instance.val(sanitized);
            } else if (this.epiceditor) {
                this.epiceditor.importFile(null, sanitized);
            } else if (this.ace_editor) {
                this.ace_editor.setValue(sanitized);
            }

            changed = from_template || this.getValue() !== value;

            this.refreshValue();

            if (initial) {
                this.is_dirty = false;
            } else if (this.jsoneditor.options.show_errors === "change") {
                this.is_dirty = true;
            }

            if (this.adjust_height) {
                this.adjust_height(this.input);
            }

            /* Bubble this setValue to parents if the value changed */
            this.onChange(changed);

        }

    };

    return FUIMDV;

});