define(['jquery', 'deep', 'cfg-panel-applet'], function($, deep, CfgPanelApplet) {

    function BasicCfgPanelApplet(label/*, elements... */) {
        this._label = label
        this._elements = [].slice.call(arguments, 1)
        this._ui = null
        this._chkEnabled = null
    }

    BasicCfgPanelApplet.prototype = new CfgPanelApplet()

    BasicCfgPanelApplet.prototype.build = function basicCfgPanelApplet_build() {
        this._ui = $('<div>')
        this._chkEnabled = $('<input type="checkbox">')

        $('<label>').append(this._chkEnabled, this._label).appendTo(this._ui)

        this._ui.append(this._elements)

        this._chkEnabled.on('change', function() {
            this.updateControlsEnabled(getVal(this._chkEnabled))
        }.bind(this))

        return this._ui[0]
    }

    BasicCfgPanelApplet.prototype.setData = function basicCfgPanelApplet_setData(enabled, config) {
        CfgPanelApplet.prototype.setData.apply(this, arguments) // call to super()

        setVal(this._chkEnabled, enabled)

        this.updateControls(config)         // possibly overridden
        this.updateControlsEnabled(enabled) // possibly overridden
    }

    BasicCfgPanelApplet.prototype.getEnabled = function basicCfgPanelApplet_getEnabled() {
        return getVal(this._chkEnabled)
    }

    // functions to be overridden by children classes

    BasicCfgPanelApplet.prototype.getConfig = function basicCfgPanelApplet_getConfig() {
        var res = CfgPanelApplet.prototype.getConfig.apply(this, arguments) // call to super()

        this._ui.find('INPUT[name],TEXTAREA[name]').each(function() {
            var el = $(this)
            res[el.attr('name')] = getVal(el)
        })

        return res
    }

    BasicCfgPanelApplet.prototype.updateControls = function basicCfgPanelApplet_updateControls(config) {
        config = config || {}
        this._ui.find('INPUT[name],TEXTAREA[name]').each(function() {
            var el = $(this)
              , name = el.attr('name')

            if (name in config) {
                setVal(el, config[name])
            }
        })
    }

    BasicCfgPanelApplet.prototype.updateControlsEnabled = function basicCfgPanelApplet_updateControlsEnabled(enabled) {
        this._ui.find('INPUT[name],TEXTAREA[name]').each(function() {
            var el = $(this)
            el.attr('disabled', enabled ? null : 'disabled')
        })
    }

    // utility functions

    function getVal(el) {
        // TODO: radio
        if (el.is('INPUT[type=checkbox]')) {
            return el.is(':checked')
        } else if (el.is('INPUT[type=number]')) {
            return parseFloat(el.val())
        } else {
            return el.val()
        }
    }

    function setVal(el, val) {
        // TODO: radio
        if (el.is('INPUT[type=checkbox]')) {
            el.attr('checked', val ? 'checked' : null)
        } else {
            return el.val(val)
        }
    }

    return BasicCfgPanelApplet
})
