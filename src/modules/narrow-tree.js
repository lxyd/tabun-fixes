define(['jquery', 'module', 'basic-cfg-panel-applet'], function($, Module, BasicCfgPanelApplet) {

    function NarrowTreeModule() {
    }

    NarrowTreeModule.prototype = new Module()

    NarrowTreeModule.prototype.getLabel = function narrowTree_getLabel() {
        return "Уменьшить ширину лесенки комментов"
    }

    NarrowTreeModule.prototype.attach = function narrowTree_attach(config) {
        config = this.ensureConfig(config)

        var style = '.comment-wrapper';
        for (var i = 1; i < config.maxTreeWidth; i++) {
            style += ' .comment-wrapper';
        }
        this._style = $('<style>').text(
            style + ' { padding-left: 0 !important } '
        ).appendTo(document.head);
    }

    NarrowTreeModule.prototype.detach = function narrowTree_detach() {
        if (this._style) {
            this._style.remove()
        }
        this._style = null
    }

    NarrowTreeModule.prototype.ensureConfig = function narrowTree_ensureConfig(config) {
        config = config || {}

        config.maxTreeWidth = parseInt(config.maxTreeWidth, 10)
        if (isNaN(config.maxTreeWidth) || config.maxTreeWidth < 10 || config.maxTreeWidth > 1000) {
            config.maxTreeWidth = 60
        }

        this.saveConfig(config)

        return config
    }

    NarrowTreeModule.prototype.createCfgPanelApplet = function narrowTree_createCfgPanelApplet() {
        var txtMax = $('<input>')
            .attr('type', 'number')
            .attr('name', 'maxTreeWidth')
            .css({
                width: 40
             })
        return new BasicCfgPanelApplet(this.getLabel(), " до ", txtMax, " вложений")
    }

    return NarrowTreeModule

})
