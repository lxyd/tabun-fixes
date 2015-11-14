define(['module', 'deep', 'require'], function(Module, deep, require) {

    function App(id) {
        this._id = id         // для отделения хранимых настроек разных приложений на случай, если их будет несколько
        this._moduleIds = []  // id модулей в порядке их добавления в приложение
        /**
         * _modules содержит словать id -> объект вида {
         *     id: 'module-id',   // уникальный идентификатор модуля в приложении
         *     module: {},        // объект модуля, либо добавленный в приложение явно, либо созданный с помощью
         *                        //   конструктора, полученного через require(id)
         *     installParams: [], // дополнительные параметры, привязанные к установленному модулю, например
         *                        //   служебная информация для gui-config'а
         *     initArgs: [],      // аргументы, которые будут переданы модулю при инициализации (метод init)
         * }
         */
        this._modules = {} 
        this._started = false

        // эти данные будут загружены позже
        this._configs = null // сохранённые конфиги модулей
        this._enabled = null // сохранённые данные о состоянии модулей (enabled/disabled)

        this._dirty = {}     // id модулей, которые стали dirty: они не делают update или remove до перезагрузки страницы
    }

    /**
     * Добавить модуль в приложение
     *
     * @moduleOrId    - экземпляр модуля или строковый id в таблице конструкторов модулей
     * @installParams - параметры для установки модуля:
     *     {
     *         id:             'module-id', // строковый идентификатор модуля. Optional, если в moduleOrId был передан ключ
     *         defaultEnabled: true/false,  // включён ли модуль по умолчанию, когда настроек ещё нет. Optional: по умолчанию false
     *         ...                          // прочие необязательные параметры установки для дальнейшего использования
     *     }
     * @initArgs...   - аргументы для module.init() (передаются после параметра config)
     */
    App.prototype.add = function app_addModule(moduleOrId, installParams/*, initArgs...*/) {
        this._checkStarted(false)

        installParams = installParams || {}
        var module, id
        if (typeof moduleOrId == "string") {
            id = installParams.id || moduleOrId
            module = new (require(moduleOrId))()
        } else {
            if (!installParams.id) {
                throw new Error("Install parameters must contain 'id' field")
            }
            id = installParams.id
            module = moduleOrId
        }

        this._moduleIds.push(id)
        this._modules[id] = {
            id:            id,
            module:        module,
            installParams: installParams,
            initArgs:      [].slice.call(arguments, 2),
        }

        module.onAdded(this, id)

        return this // chain
    }

    /**
     * Запустить приложение с добавленными модулями
     */
    App.prototype.start = function app_start() {
        this._checkStarted(false)

        this._started = true // больше нельзя вызвать add и start, зато можно делать всё остальное

        var data = this._loadData()
        this._configs = data.configs
        this._enabled = data.enabled

        for (var id in this._modules) {
            var moduleInfo = this._modules[id]
            if (this._enabled[id] == null && moduleInfo.installParams.defaultEnabled) {
                this._enabled[id] = true
            }

            var args = [this._configs[id] || null].concat(moduleInfo.initArgs)

            var cfg = moduleInfo.module.init.apply(moduleInfo.module, args)

            this._configs[id] = deep.clone(cfg)
        }

        this._saveData()

        for (var id in this._modules) {
            var moduleInfo = this._modules[id]
            if (this._enabled[id]) {
                moduleInfo.module.attach(deep.clone(this._configs[id]))
            }
        }

        return this // chain
    }

    App.prototype.getModuleIds = function app_getModuleIds() {
        return this._moduleIds
    }

    App.prototype.getModule = function app_getModule(id) {
        return this._modules[id].module
    }

    App.prototype.getModuleInstallParams = function app_getModuleInstallParams(moduleOrId) {
        var id = this._getModuleId(moduleOrId)
        return this._modules[id].installParams
    }

    App.prototype.isModuleEnabled = function app_isModuleEnabled(moduleOrId) {
        this._checkStarted(true)
        return this._enabled[this._getModuleId(moduleOrId)]
    }

    App.prototype.isModuleDirty = function app_isModuleDirty(moduleOrId) {
        this._checkStarted(true)
        return this._dirty[this._getModuleId(moduleOrId)]
    }

    App.prototype.setModuleEnabled = function app_setModuleEnabled(moduleOrId, enabled) {
        this._checkStarted(true)

        enabled = !!enabled
        var id = this._getModuleId(moduleOrId)

        if (this.isModuleEnabled(id) == enabled) {
            return
        }

        this._enabled[id] = enabled
        this._postSaveData()

        if (this._dirty[id]) {
            return
        }

        try {
            if (enabled) {
                this._modules[id].module.attach(deep.clone(this._configs[id]))
            } else {
                if (this._modules[id].module.detach() == false) {
                    this._dirty[id] = true
                }
            }
        } catch (err) {
            this.log("Error " + (enabled ? "enabling" : "disabling") + " module " + id, err)
            this._dirty[id] = true
            this._enabled[id] = false
        }
    }

    App.prototype.getModuleConfig = function app_getModuleConfig(moduleOrId) {
        this._checkStarted(true)
        var id = this._getModuleId(moduleOrId)
        return deep.clone(this._configs[id])
    }

    App.prototype.setModuleConfig = function app_setModuleConfig(moduleOrId, config, omitModuleUpdate) {
        this._checkStarted(true)

        var id = this._getModuleId(moduleOrId)

        if (deep.equals(this._configs[id], config)) {
            return
        }

        this._configs[id] = deep.clone(config)
        this._postSaveData()

        if (omitModuleUpdate || this._dirty[id] || !this._enabled[id]) {
            return
        }

        try {
            if (this._modules[id].module.update(config) == false) {
                this._dirty[id] = true
            }
        } catch (err) {
            this.log("Error updating module " + id, err)
            this._dirty[id] = true
            this._enabled[id] = false
        }
    }

    App.prototype.reconfigure = function app_reconfigure() {
        this._checkStarted(true)

        data = this._loadData()
        for (id in data.enabled) {
            this.setModuleEnabled(id, data.enabled[id])
        }
        for (id in data.configs) {
            this.setModuleConfig(id, data.configs[id])
        }
    }

    App.prototype.getId = function app_getId() {
        return this._id
    }

    App.prototype.log = function app_log(/*args*/) {
        if (console && console.log) {
            console.log.apply(console, arguments)
        }
    }

    App.prototype._checkStarted = function app_checkStarted(started) {
        if (this._started != started) {
            throw new Error(this._started ? "App is already started" : "App is not started yet")
        }
    }

    App.prototype._getModuleId = function app_getModuleId(moduleOrId) {
        if (typeof moduleOrId == "string") {
            return moduleOrId
        } else {
            return moduleOrId.getId()
        }
    }

    App.prototype._loadData = function app_loadData() {
        var data
        try {
            data = JSON.parse(localStorage.getItem(this._id + '-data') || "{}") || {}
            data.configs = data.configs || {}
            data.enabled = data.enabled || {}
        } catch (err) {
            this.log(err)
            data = {
                configs: {},
                enabled: {},
            }
        }
        return data
    }

    App.prototype._saveData = function app_saveData() {
        delete this._saveDataTimeout

        var data = {
            configs: this._configs,
            enabled: this._enabled,
        }

        localStorage.setItem(this._id + '-data', JSON.stringify(data))
    }

    App.prototype._postSaveData = function app_postSaveData() {
        if (!this._saveDataTimeout) {
            this._saveDataTimeout = setTimeout(this._saveData.bind(this), 0)
        }
    }

    return App
})
