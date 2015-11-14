define(['module'], function(Module) {
    function SyncConfigAmongTabsModule() { }

    SyncConfigAmongTabsModule.prototype = new Module()

    SyncConfigAmongTabsModule.prototype.attach = function syncConfigAmongTabs_attach(config) {
        this.onWindowFocus = this.syncConfig.bind(this)
        window.addEventListener('focus', this.onWindowFocus)
    }

    SyncConfigAmongTabsModule.prototype.detach = function syncConfigAmongTabs_detach() {
        window.removeEventListener('focus', this.onWindowFocus)
        delete this.onWindowFocus
    }

    SyncConfigAmongTabsModule.prototype.syncConfig = function syncConfigAmongTabs_syncConfig() {
        this.getApp().reconfigure()
    }

    return SyncConfigAmongTabsModule
})
