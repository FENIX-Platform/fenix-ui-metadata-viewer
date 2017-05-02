define([
    'jquery',
    'loglevel',
    '../../config/specialMetadataAttributes',
    'moment'
], function ($, log, SpecialFields, Moment) {

    'use strict';

    var o = {
        viewerOptions: {
            isFenixMetadata: true
        },
        defaultOptions: {
            LANG: 'fr',
            DEFAULT_LANG: 'en',
            TITLE_ATTRIBUTE: 'title',
            DESCRIPTION_ATTRIBUTE: 'description',
            NOVALUE_OBJECT: {
                'noValue': true
            },
            HARMONIZE_TITLE: true
        },
        metadataOptions: {
            PROPERTIES_ATTR: 'properties',
            TYPE_ATTRIBUTE: 'type',
            SORTABLE_ATTRIBUTE: 'propertyOrder',
            STRING_TYPE: 'string',
            NUMBER_TYPE: 'number',
            BOOLEAN_TYPE: 'boolean',
            OBJECT_TYPE: 'object',
            ARRAY_TYPE: 'array',
            REF_TYPE: '$ref',
            PATTERN_PROPERTIES: "patternProperties",
            SYMBOL_PATTERN_PROPERTIES: ".{1,}",
            TITLE_I18N: 'title_i18n',
            TITLE_DEFAULT: 'title',
            DESC_I18N: 'description_i18n',
            DESC_DEFAULT: 'description',
            ITEMS_PROPERTIES: 'items',
            SUBSTR_ROOT_DEFINITIONS: 14,
            CODES: 'codes',
            HAS_CHILDREN: 'hasChildren',
            BEAN: 'bean',
            DATE_FORMAT: 'format'

        }
    };

    function ModelCreator(opts) {

        this.o = $.extend(true, {}, this.o, o, opts);

        return this;
    }

    /**
     * Return the processed model
     * @param data
     * @returns {{title, model}}
     */
    ModelCreator.prototype.process = function (data) {

        this.$mdsd = data;

        this._initInternModelData();

        this._startInternModelData();

        return this._getInternModelData();

    };

    ModelCreator.prototype._getInternModelData = function () {

        return {'title': this.$title, 'model': this.$internDataModel};
    };

    ModelCreator.prototype._initInternModelData = function () {

        this.$definitions = this.$mdsd.definitions;
        this.$properties = this.$mdsd.properties;
        this.$lang = this.o.lang.toLowerCase();
        this.$title = this._getTitleFromData();
        this.$specialFields = this.o.specialFields || SpecialFields;
    };

    ModelCreator.prototype._startInternModelData = function () {

        var data = this.o.data,
            properties = this.$properties;

        this.$internDataModel = this._prepareInternModelData(data, properties, 0);

    };

    ModelCreator.prototype._isASpecialAttribute = function (attribute) {
        return typeof this.$specialFields[attribute] !== 'undefined';
    };

    ModelCreator.prototype._prepareInternModelData = function (data, metadata, counter) {

        var result = [];

        var metadataSorted = this._sortMetadataByPropertyOrder(metadata);

        for (var i = 0, length = metadataSorted.length; i < length; i++) {

            var attribute = metadataSorted[i][0];

            if (this.o.viewerOptions.isFenixMetadata && this._isASpecialAttribute(attribute)
                && data[attribute] && data[attribute] != '' && data[attribute]['codes'] && data[attribute]['codes'].length > 0) {

                    result.push(this._handleFenixCodes(data, metadata, attribute));

            } else {

                if (data[attribute] && data[attribute] != '') {

                    if (this._isCaseBase(metadata[attribute])) {
                        result.push(this._addBaseModel(metadata[attribute], data[attribute], attribute));
                    }

                    else if (this._isObjectAttribute(metadata[attribute])) {
                        // 1: exists properties attribute
                        // 2: exists pattern properties
                        // 3: exists a reference

                        if (this._existsPropertiesAttribute(metadata[attribute])) {
                            var temporaryObject = {};
                            temporaryObject = this._addRecursiveModel(metadata[attribute], attribute);

                            temporaryObject['value'] = this._prepareInternModelData(data[attribute], metadata[attribute][this.o.metadataOptions.PROPERTIES_ATTR], counter + 1)
                            result.push(temporaryObject);

                        }

                        else if (this._existsPatternProperties(metadata[attribute]) && this._existsPatternPropertiesValue(data[attribute])) {
                            var temporaryObject = {};
                            temporaryObject = this._addPatternModel(metadata[attribute], data[attribute], attribute);
                            result.push(temporaryObject);
                        }

                        else if (this._existsAReference(metadata[attribute])) {
                            var temporaryObject = {};

                            temporaryObject = this._addRecursiveModel(metadata[attribute], attribute);
                            var refAttribute = this._getAttributeFromReference(metadata[attribute]);
                            temporaryObject['value'] = this._prepareInternModelData(data[attribute], this.$definitions[refAttribute][this.o.metadataOptions.PROPERTIES_ATTR], counter + 1);
                            result.push(temporaryObject);

                        }

                    }
                    else if (this._isAnArrayAttribute(metadata[attribute])) {
                        var temporaryObject = {};
                        temporaryObject = this._addArrayModel(metadata[attribute], attribute);

                        if (this._isASimpleArrayItem(metadata[attribute])) {
                            this._fillNoChildrenAttribute(temporaryObject);
                            temporaryObject['value'] = data[attribute];
                            result.push(temporaryObject);
                        }
                        else if (this._isARefArrayItem(metadata[attribute])) {
                            this._fillChildrenAttribute(temporaryObject);
                            temporaryObject['value'] = [];
                            var refAttribute = this._getAttributeFromReference(metadata[attribute][this.o.metadataOptions.ITEMS_PROPERTIES]);

                            for (var j = 0, lengthArray = data[attribute].length; j < lengthArray; j++) {

                                temporaryObject['value'] = temporaryObject['value'].concat(this._prepareInternModelData(data[attribute][j], this.$definitions[refAttribute][this.o.metadataOptions.PROPERTIES_ATTR], counter + 1));
                            }
                            result.push(temporaryObject);
                        }
                    }
                }
            }
        }

        counter--;

        if (counter == -1) this.$internDataModel = result;

        return result;
    };

    ModelCreator.prototype._sortMetadataByPropertyOrder = function (metadata) {

        var sortedElements = [];

        for (var attribute in metadata) {
            sortedElements.push([attribute, metadata[attribute][this.o.metadataOptions.SORTABLE_ATTRIBUTE]])
        }
        sortedElements.sort(function (a, b) {
            return a[1] - b[1]
        });
        return sortedElements;
    };

    ModelCreator.prototype._existsPatternPropertiesValue = function (objectWithPattern) {
        if (objectWithPattern[(this.$lang).toUpperCase()] && objectWithPattern[(this.$lang).toUpperCase()] !== '') {
            return true
        } else if (objectWithPattern[(this.o.defaultOptions.DEFAULT_LANG).toUpperCase()] && objectWithPattern[(this.o.defaultOptions.DEFAULT_LANG).toUpperCase()] !== '') {
            return true
        } else {
            return false;
        }
    };

    ModelCreator.prototype._existsPropertiesAttribute = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.PROPERTIES_ATTR) && this._getObjectKeys(objectMetadata[this.o.metadataOptions.PROPERTIES_ATTR]).length > 0
    };

    ModelCreator.prototype._existsPatternProperties = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.PATTERN_PROPERTIES) &&
            this._getObjectKeys(objectMetadata[this.o.metadataOptions.PATTERN_PROPERTIES]).length > 0
    };

    ModelCreator.prototype._existsAReference = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.REF_TYPE) &&
            this._getObjectKeys(objectMetadata[this.o.metadataOptions.REF_TYPE]).length > 0
    };

    ModelCreator.prototype._isObjectAttribute = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.TYPE_ATTRIBUTE) &&
            objectMetadata[this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.OBJECT_TYPE;
    };

    ModelCreator.prototype._isAnArrayAttribute = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.TYPE_ATTRIBUTE) &&
            objectMetadata[this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.ARRAY_TYPE;
    };

    ModelCreator.prototype._getTitleFromData = function () {
        var result = "";

        if (typeof this.o.data[this.o.defaultOptions.TITLE_ATTRIBUTE] === "object") {

            if (this.o.data[this.o.defaultOptions.TITLE_ATTRIBUTE][this.$lang.toUpperCase()]) {
                result = this.o.data[this.o.defaultOptions.TITLE_ATTRIBUTE][this.$lang.toUpperCase()];
            } else {
                result = this.o.data[this.o.defaultOptions.TITLE_ATTRIBUTE][this.o.defaultOptions.DEFAULT_LANG.toUpperCase()]
            }
        }

        delete this.o.data[this.o.defaultOptions.TITLE_ATTRIBUTE];
        delete this.$properties[this.o.defaultOptions.TITLE_ATTRIBUTE];

        return result;
    };

    ModelCreator.prototype._addRecursiveModel = function (metadata, attribute) {
        var result = {};
        this._fillTitle(metadata, attribute, result);
        this._fillDescription(metadata, attribute, result);
        this._fillAttributeBean(attribute, result);
        this._fillChildrenAttribute(result);
        return result;
    };

    ModelCreator.prototype._addArrayModel = function (metadata, attribute) {
        var result = {};
        this._fillTitle(metadata, attribute, result);
        this._fillDescription(metadata, attribute, result);
        this._fillAttributeBean(attribute, result);
        return result;
    };

    ModelCreator.prototype._addBaseModel = function (metadata, data, attribute) {
        var result = {};
        this._fillTitle(metadata, attribute, result);
        this._fillDescription(metadata, attribute, result);
        this._fillAttributeBean(attribute, result);
        this._fillNoChildrenAttribute(result);
        var value = (metadata[this.o.metadataOptions.DATE_FORMAT] && metadata[this.o.metadataOptions.DATE_FORMAT] == 'date') ?
            Moment(new Date(data)).format("DD/MM/YYYY") : data;
        result['value'] = value;
        return result;
    };

    ModelCreator.prototype._addPatternModel = function (metadata, data, attribute) {
        var result = {};
        this._fillTitle(metadata, attribute, result);
        this._fillDescription(metadata, attribute, result);
        this._fillAttributeBean(attribute, result);
        this._fillNoChildrenAttribute(result);
        result['value'] = (data[this.$lang.toUpperCase()]) ? data[this.$lang.toUpperCase()] : (data[this.o.defaultOptions.DEFAULT_LANG.toUpperCase()]);
        return result;
    };

    ModelCreator.prototype._fillTitle = function (metadata, attribute, result) {
        if (metadata[this.o.metadataOptions.TITLE_I18N] && metadata[this.o.metadataOptions.TITLE_I18N][this.$lang] && metadata[this.o.metadataOptions.TITLE_I18N][this.$lang] != '') {
            result[this.o.defaultOptions.TITLE_ATTRIBUTE] =
                metadata[this.o.metadataOptions.TITLE_I18N][this.$lang].charAt(0).toUpperCase() +
                metadata[this.o.metadataOptions.TITLE_I18N][this.$lang].substr(1).toLowerCase();
        } else if (metadata[this.o.metadataOptions.TITLE_DEFAULT]) {
            result[this.o.defaultOptions.TITLE_ATTRIBUTE] =
                metadata[this.o.metadataOptions.TITLE_DEFAULT].charAt(0).toUpperCase() +
                metadata[this.o.metadataOptions.TITLE_DEFAULT].substr(1).toLowerCase();
        } else {
            result[this.o.defaultOptions.TITLE_ATTRIBUTE] = attribute.charAt(0).toUpperCase() + attribute.substr(1).toLowerCase();
        }
    };

    ModelCreator.prototype._fillDescription = function (metadata, attribute, result) {
        if (metadata[this.o.metadataOptions.DESC_I18N] && metadata[this.o.metadataOptions.DESC_I18N][this.$lang] && metadata[this.o.metadataOptions.DESC_I18N][this.$lang] != '') {
            result[this.o.defaultOptions.DESCRIPTION_ATTRIBUTE] =
                metadata[this.o.metadataOptions.DESC_I18N][this.$lang];
        } else if (metadata[this.o.metadataOptions.DESC_DEFAULT]) {
            result[this.o.defaultOptions.DESCRIPTION_ATTRIBUTE] = metadata[this.o.metadataOptions.DESC_DEFAULT]
        } else {
            result[this.o.defaultOptions.DESCRIPTION_ATTRIBUTE] = '';
        }
    };

    ModelCreator.prototype._isCaseBase = function (objectMetadata) {
        return objectMetadata.hasOwnProperty('type') && (
            objectMetadata[this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.STRING_TYPE ||
            objectMetadata[this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.NUMBER_TYPE ||
            objectMetadata[this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.BOOLEAN_TYPE)
    };

    ModelCreator.prototype._isASimpleArrayItem = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.ITEMS_PROPERTIES) && (
            objectMetadata[this.o.metadataOptions.ITEMS_PROPERTIES][this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.STRING_TYPE ||
            objectMetadata[this.o.metadataOptions.ITEMS_PROPERTIES][this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.NUMBER_TYPE ||
            objectMetadata[this.o.metadataOptions.ITEMS_PROPERTIES][this.o.metadataOptions.TYPE_ATTRIBUTE] === this.o.metadataOptions.BOOLEAN_TYPE)
    };

    ModelCreator.prototype._isARefArrayItem = function (objectMetadata) {
        return objectMetadata.hasOwnProperty(this.o.metadataOptions.ITEMS_PROPERTIES) &&
            objectMetadata[this.o.metadataOptions.ITEMS_PROPERTIES][this.o.metadataOptions.REF_TYPE] &&
            this._getObjectKeys(objectMetadata[this.o.metadataOptions.ITEMS_PROPERTIES][this.o.metadataOptions.REF_TYPE]).length > 0
    };

    ModelCreator.prototype._isASpecialAttribute = function (attribute) {
        return typeof this.$specialFields[attribute] !== 'undefined';
    };

    ModelCreator.prototype._handleFenixCodes = function (data, metadata, attribute) {
        var result = {};

        this._fillTitle(metadata[attribute], attribute, result);
        this._fillDescription(metadata[attribute], attribute, result);
        this._fillAttributeBean(attribute, result);
        this._fillNoChildrenAttribute(result);
        var codes = data[attribute]['codes'];

        result['value'] = [];
        for (var i = 0, length = codes.length; i < length; i++) {
            if (codes[i].label) {
                var labelValue = (typeof codes[i].label[this.$lang] !== 'undefined') ? codes[i].label[this.$lang] : codes[i].label[this.o.defaultOptions.DEFAULT_LANG.toUpperCase()];
                result['value'].push(labelValue);
            } else {
                result['value'].push('');
            }
        }
        return result;
    };

    ModelCreator.prototype._fillAttributeBean = function (attributeObject, result) {
        result[this.o.metadataOptions.BEAN] = attributeObject;
    };

    ModelCreator.prototype._fillChildrenAttribute = function (result) {
        result[this.o.metadataOptions.HAS_CHILDREN] = true;
    };

    ModelCreator.prototype._fillNoChildrenAttribute = function (result) {
        result[this.o.metadataOptions.HAS_CHILDREN] = false;
    };

    ModelCreator.prototype._getAttributeFromReference = function (objectMetadata) {
        return objectMetadata[this.o.metadataOptions.REF_TYPE].substr(this.o.metadataOptions.SUBSTR_ROOT_DEFINITIONS)
    };

    // Override of Object.keys for compatibility with IE
    ModelCreator.prototype._getObjectKeys = function (obj) {
            var keys = [];

            for (var i in obj) {
                if (obj.hasOwnProperty(i)) keys.push(i);
            }

            return keys;
    };

    return ModelCreator;
});