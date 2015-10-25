define(['jquery', 'deep'], function($, deep) {

    /**
     * Interface: 
     *  - build() -> HtmlElement
     *  - setData(enabled, config)
     *  - getEnabled() -> bool
     *  - getConfig() -> {}
     */
    function CfgPanelApplet() { }

    // functions to be overridden by children classes

    CfgPanelApplet.prototype.build = function cfgPanelApplet_build() {
        throw new Error("not implemented")
    }

    CfgPanelApplet.prototype.setData = function cfgPanelApplet_setData(enabled, config) {
        this.config = config
        this.enabled = enabled
    }

    CfgPanelApplet.prototype.getEnabled = function cfgPanelApplet_getEnabled() {
        return this.enabled
    }

    CfgPanelApplet.prototype.getConfig = function cfgPanelApplet_getConfig() {
        return deep.clone(this.config)
    }

    return CfgPanelApplet
})
