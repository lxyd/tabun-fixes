define(['jquery', 'module', 'app', 'cfg-panel-applet'], function($, Module, App, CfgPanelApplet) {

    function WhatsNewModule() { }

    WhatsNewModule.prototype = new Module()

    WhatsNewModule.prototype.init = function whatsNew_init(config, text) {
        config = config || {}

        if (config.installed && config.text != text) {
            this._alertText = "Юзерскрипт tabun-fixes обновился!\nЧто нового:\n" + $("<p>").html(text.replace(/\<br\/?\>/g, "\n")).text()
        }

        config.installed = true
        config.text = text

        return config
    }

    WhatsNewModule.prototype.attach = function whatsNew_attach(config) {
        if (this._alertText) {
            alert(this._alertText)
        }

        delete this._alertText
    }

    WhatsNewModule.prototype.detach = function whatsNew_detach() {
        return true
    }

    WhatsNewModule.prototype.createCfgPanelApplet = function whatsNew_createCfgPanelApplet() {
        return new WhatsNewCfgPanelApplet()
    }

    function WhatsNewCfgPanelApplet() { }

    WhatsNewCfgPanelApplet.prototype = new CfgPanelApplet()

    WhatsNewCfgPanelApplet.prototype.build = function whatsNewApplet_build() {
        return this.div = $('<div>')
    }

    WhatsNewCfgPanelApplet.prototype.setData = function whatsNewApplet_setData(enabled, config) {
        CfgPanelApplet.prototype.setData.apply(this, arguments) // call to super()
        this.div.html('<strong>Что нового:</strong><br/>' + config.text)
    }

    return WhatsNewModule

})
