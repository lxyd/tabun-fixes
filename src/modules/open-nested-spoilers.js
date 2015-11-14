define(['jquery', 'module', 'cfg-panel-applet'], function($, Module, CfgPanelApplet) {

    function OpenNestedSpoilersModule() { }

    OpenNestedSpoilersModule.prototype = new Module()

    OpenNestedSpoilersModule.prototype.init = function openNestedSpoilers_init(config) {
        config = config || {
            openOnLongClick: false,
            openOnShiftClick: false,
            alwaysOpen: false,
        }
        return config
    }

    OpenNestedSpoilersModule.prototype.getLabel = function openNestedSpoilers_getLabel() {
        return "Автоматически открывать вложенные спойлеры"
    }

    OpenNestedSpoilersModule.prototype.attach = function openNestedSpoilers_attach(config) {
        var self = this
        this.mouseDownHandler = function mouseDownHandler(ev) { return self.onMouseDown(this, ev) }
        $(document).on('mousedown', '.spoiler-title', this.mouseDownHandler)
        this.clickHandler = function clickHandler(ev) { return self.onClick(this, ev) }
        $(document).on('click', '.spoiler-title', this.clickHandler)
    }

    OpenNestedSpoilersModule.prototype.detach = function openNestedSpoilers_detach() {
        delete this._spoilerBodyIsVisibleOnMouseDown
        delete this._timeMouseDown
        if (this.mouseDownHandler) {
            $(document).off('mousedown', '.spoiler-title', this.mouseDownHandler)
            delete this.mouseDownHandler
        }
        if (this.clickHandler) {
            $(document).off('click', '.spoiler-title', this.clickHandler)
            delete this.clickHandler
        }
    }

    OpenNestedSpoilersModule.prototype.onMouseDown = function openNestedSpoilers_onMouseDown(elSpoilerTitle, ev) {
        this._spoilerBodyIsVisibleOnMouseDown = $(elSpoilerTitle).next('.spoiler-body').is(':visible')
        this._timeMouseDown = getNow()
    }

    OpenNestedSpoilersModule.prototype.onClick = function openNestedSpoilers_onClick(elSpoilerTitle, ev) {
        var cfg = this.getConfig()
        if (
                cfg.alwaysOpen ||
                cfg.openOnLongClick && this._timeMouseDown && (getNow() - this._timeMouseDown > 500) ||
                cfg.openOnShiftClick && ev.shiftKey
        ) {
            this.processNestedSpoilers(elSpoilerTitle)
        }
        delete this._timeMouseDown
    }

    OpenNestedSpoilersModule.prototype.processNestedSpoilers = function openNestedSpoilers_processNestedSpoilers(elSpoilerTitle) {
        var elSpoilerBody = $(elSpoilerTitle).next('.spoiler-body')
          , opening = !this._spoilerBodyIsVisibleOnMouseDown // if body is not yet visible, we are probably opening it

        if (opening) {
            setAllSpoilersOpen(elSpoilerBody, true)
        } else {
            window.setTimeout(function() {
                setAllSpoilersOpen(elSpoilerBody, false)
            }, 400)
        }
    }

    OpenNestedSpoilersModule.prototype.createCfgPanelApplet = function openNestedSpoilers_createCfgPanelApplet() {
        return new OpenNestedSpoilersCfgPanelApplet()
    }

    function OpenNestedSpoilersCfgPanelApplet() { }

    OpenNestedSpoilersCfgPanelApplet.prototype = new CfgPanelApplet()

    OpenNestedSpoilersCfgPanelApplet.prototype.build = function openNestedSpoilersApplet_build() {
        this.chkOnLongClick = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'openOnLongClick')
        this.chkOnShiftClick = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'openOnShiftClick')
        this.chkAlways = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'alwaysOpen')

        var div = $('<div>')
          , labelOnLongClick = $('<label>')
                .text("Открывать вложенные спойлеры при длинном клике")
                .prepend(this.chkOnLongClick)
          , labelOnShiftClick = $('<label>')
                .text("Открывать вложенные спойлеры при клике с Shift'ом")
                .prepend(this.chkOnShiftClick)
          , labelAlways = $('<label>')
                .text("Всегда открывать вложенные спойлеры")
                .prepend(this.chkAlways)

        div.append(labelOnLongClick, '<br/>', labelOnShiftClick, '<br/>', labelAlways)

        this.chkAlways.on('change', function() {
            if (this.chkAlways.is(':checked')) {
                this.chkOnLongClick.prop('checked', null)
                this.chkOnShiftClick.prop('checked', null)
            }
        }.bind(this))

        this.chkOnLongClick.on('change', function() {
            if (this.chkOnLongClick.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        this.chkOnShiftClick.on('change', function() {
            if (this.chkOnShiftClick.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        return div
    }

    OpenNestedSpoilersCfgPanelApplet.prototype.setData = function openNestedSpoilersApplet_setData(enabled, config) {
        CfgPanelApplet.prototype.setData.apply(this, arguments) // call to super()
        config = config || {}
        this.chkOnLongClick.prop('checked', config.openOnLongClick ? 'checked' : null)
        this.chkOnShiftClick.prop('checked', config.openOnShiftClick ? 'checked' : null)
        this.chkAlways.prop('checked', config.alwaysOpen ? 'checked' : null)
    }

    OpenNestedSpoilersCfgPanelApplet.prototype.getEnabled = function openNestedSpoilersApplet_getEnabled() {
        return this.chkOnLongClick.is(':checked') || this.chkOnShiftClick.is(':checked') || this.chkAlways.is(':checked')
    }

    OpenNestedSpoilersCfgPanelApplet.prototype.getConfig = function openNestedSpoilersApplet_getConfig() {
        var cfg = CfgPanelApplet.prototype.getConfig.apply(this, arguments) // call to super()
        cfg = cfg || {}

        cfg.openOnLongClick = this.chkOnLongClick.is(':checked')
        cfg.openOnShiftClick = this.chkOnShiftClick.is(':checked')
        cfg.alwaysOpen = this.chkAlways.is(':checked')

        return cfg
    }

    function getNow() {
        return Date.now ? Date.now() : new Date().getTime()
    }

    function setAllSpoilersOpen(elBlock, open) {
        $('.spoiler-body', elBlock).css('display', open ? 'block' : 'none')
    }

    return OpenNestedSpoilersModule
})
