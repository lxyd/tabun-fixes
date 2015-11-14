define(['jquery', 'module'], function($, Module) {
    function FixAsideToolbarModule() { }

    FixAsideToolbarModule.prototype = new Module()

    FixAsideToolbarModule.prototype.getLabel = function fixAsideToolbar_getLabel() {
        return "Починить расположение боковой панели"
    }

    FixAsideToolbarModule.prototype.attach = function fixAsideToolbar_attach(config) {
        this._style = $('<style>').text(
                'ASIDE.toolbar { width: 1; height: 1; overflow: visible; } ' +
                'ASIDE.toolbar SECTION { position: fixed; right: 0; top: 30%; }'
        ).appendTo(document.head)
    }

    FixAsideToolbarModule.prototype.detach = function fixAsideToolbar_detach() {
        if (this._style) {
            this._style.remove()
        }
        delete this._style
    }

    return FixAsideToolbarModule
})
