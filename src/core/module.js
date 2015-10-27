define(function() {
    function Module() {
    }

    Module.prototype.onAdded = function module_onAdded(app, id) {
        this._app = app
        this._id = id
    }

    Module.prototype.isEnabled = function module_isEnabled() {
        return this._app.isModuleEnabled(this._id)
    }

    Module.prototype.isDirty = function module_isDirty() {
        return this._app.isModuleDirty(this._id)
    }

    Module.prototype.getId = function module_getId() {
        return this._id
    }

    Module.prototype.getApp = function module_getApp() {
        return this._app
    }

    Module.prototype.getInstallParams = function module_getInstallParams() {
        return this._app.getModuleInstallParams(this._id)
    }

    Module.prototype.getConfig = function module_getConfig() {
        return this._app.getModuleConfig(this._id)
    }

    Module.prototype.saveConfig = function module_saveConfig(config) {
        this._app.setModuleConfig(this._id, config, true)
    }

    // Реализации по умолчанию для методов жизненного цикла

    Module.prototype.getLabel = function module_getLabel() {
        return this._id
    }

    Module.prototype.init = function module_init(config/*, initArgs...*/) {
        return config
    }

    Module.prototype.attach = function module_attach(config) {
        throw new Error("Not implemented")
    }

    Module.prototype.update = function module_update(config) {
        if (this.detach() == false) {
            return false
        }
        this.attach(config)
        return true
    }

    Module.prototype.detach = function module_detach() {
        return false
    }

    return Module
})
