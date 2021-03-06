// ==UserScript==
// @name    Tabun fixes
// @version    30.11
// @description    Несколько улучшений для табуна
//
// @updateURL https://raw.githubusercontent.com/lxyd/tabun-fixes/master/dist/tabun-fixes.meta.js
// @downloadURL https://raw.githubusercontent.com/lxyd/tabun-fixes/master/dist/tabun-fixes.user.js
//
// @grant none
//
// @include  http://tabun.everypony.ru/*
// @match    http://tabun.everypony.ru/*
// @include  http://tabun.everypony.info/*
// @match    http://tabun.everypony.info/*
// @include  https://tabun.everypony.ru/*
// @match    https://tabun.everypony.ru/*
// @include  https://tabun.everypony.info/*
// @match    https://tabun.everypony.info/*
// @author   eeyup
// ==/UserScript==

(function(document, fn) {
    var script = document.createElement('script')
    script.setAttribute("type", "text/javascript")
    script.textContent = '(' + fn + ')(window, window.document, jQuery)'
    document.body.appendChild(script) // run the script
    document.body.removeChild(script) // clean up
})(document, function(window, document, $) {

// a bit of mimic require.js's way to define a module, but
// - no dynamic file loading (!)
// - no module hierarchy supported: module name is interpreted as a plain string
// - no requirejs plugins, no shim etc

var define = (function() {

    var awaiting = {}
      , unresolved = {}
      , modules = {}
      , nextName = null

    /**
     *  Define a module with a given name in a way syntactically close to require.js
     *
     *  Ways to call:
     *
     *  1) define('module-name', ['deps', 'list'], module)
     *  2) define('module-name', module)
     *
     *  3) define('next-module-name', [])   - speciall call with name and no module is
     *                                           meant to be used by a build system to
     *                                           set next-module-name for future calls
     *  4) define(['deps', 'list'], module) - like #1 but using next-module-name as name
     *  5) define(module)                   - like #2 but using next-module-name as name
     *
     */
    function define(name, deps, module) {
        if (typeof name == 'string' && Array.isArray(deps) && !module) {
            nextName = name
            return
        }

        if (typeof name != 'string') {
            if (!nextName) {
                throw new Error("Module name no set. Be sure to pass module name or call define('next-name', []) before defining a module")
            }
            module = deps
            deps = name
            name = nextName
        }

        if (typeof module == 'undefined') {
            module = deps
            deps = null
        }

        if (defined(name) || awaiting[name]) {
            throw new Error("Module '" + name + "' already defined")
        }

        nextName = null // consume next-module-name
        deps = deps || []

        awaiting[name] = {
            deps:   deps,
            module: module,
        }

        deps.forEach(function(d) {
            if (!defined(d)) {
                unresolved[d] = unresolved[d] || []
                unresolved[d].push(name)
            }
        })

        tryToDefineAwaiting(name)
    }

    function tryToDefineAwaiting(name) {
        var m = awaiting[name]
        if (m && m.deps.every(defined)) {
            modules[name] = createModule(m.module, m.deps)
            delete awaiting[name]

            ;(unresolved[name] || []).forEach(tryToDefineAwaiting)
            delete unresolved[name]
        }
    }

    function createModule(module, deps) {
        if (typeof module == 'function') {
            return module.apply(null, deps.map(require))
        } else {
            return module
        }
    }

    function require(name) {
        if (!defined(name)) {
            throw new Error("Module '" + name + "' not defined")
        }
        return modules[name]
    }

    function defined(name) {
        return typeof modules[name] != 'undefined'
    }

    modules['require'] = require

    return define

})()

define('app', [])
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
            if (this._modules[id]) {
                this.setModuleEnabled(id, data.enabled[id])
            }
        }
        for (id in data.configs) {
            if (this._modules[id]) {
                this.setModuleConfig(id, data.configs[id])
            }
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

define('deep', [])
define({

    clone: function deepClone(o) {
        var r, i, keys
        if (o && typeof o == 'object') {
            r = Array.isArray(o) ? [] : {}
            keys = Object.keys(o)
            for (i = 0; i < keys.length; i++) {
                r[keys[i]] = deepClone(o[keys[i]])
            }
        }
        return r || o
    },

    equals: function deepEquals(a, b) {
        if (!a || typeof a != 'object') {
            return a === b
        }
        if (!b || typeof b != 'object' || Array.isArray(a) != Array.isArray(b)) {
            return false
        }
        var ka = Object.keys(a)
        if (ka.length != Object.keys(b).length) {
            return false
        }
        for (var i = 0; i < ka.length; i++) {
            if (!(ka[i] in b)) {
                return false
            }
            if (!deepEquals(a[ka[i]], b[ka[i]])) {
                return false
            }
        }
        return true
    },

})

define('hook', [])
define(function() {

    // configuration values before, after, orig, proxies look like:
    // [{
    //     "key": obj,
    //     "vals": {
    //         "someFieldName": fieldValueOrArrayOfValues,
    //         ...
    //     },
    // }]
    var cfg = {
            before: [],
            after: [],
            orig: [],
            proxies: [],
        }

    var global = this

    /**
     *  Add a function to be run before (after) execution some other
     *  function available at root.path
     *
     *  @param root   - optional, global object if ommited
     *  @param path   - path to root's field
     *  @param fn     - function to execute before (after) root.path
     *                  if fn returns false, execution is terminated
     *  @param options {
     *      after : boolean - execute fn after function (default false)
     *      force : boolean - force re-writing a proxy even if already written
     *                        (for the case it has been removed somewhere else)
     *  }
     */
    function addHook(root, path, fn, options) {
        var args = parseArgs.apply(this, arguments)
        root = args.root
        path = args.path
        fn = args.fn
        options = args.options

        var cur = getPath(root, path)

        if (typeof cur != 'function') {
            throw new Error("Only functions might be hooked")
        }

        addCfgElement(options.after ? cfg.after : cfg.before, root, path, fn)

        var proxy = getCfg(cfg.proxies, root, path)
          , orig = getCfg(cfg.orig, root, path)
        var write = false
        if (!proxy) {
            // proxy was not written yet
            orig = cur
            proxy = createProxy(root, path, cur)
            write = true
        } else if (cur !== proxy && options.force) {
            // proxy was written, but currently there is another function at root[path]
            // according to the force option, consider proxy to be thrown away
            orig = cur
            proxy = createProxy(root, path, cur)
            write = true
        }
        // otherwise consider proxy written and functional (but possibly hidden behind another proxy)

        if (write) {
            setCfg(cfg.orig, root, path, orig)
            setCfg(cfg.proxies, root, path, proxy)
            setPath(root, path, proxy)
        }
    }

    /**
     *  Remove previously added hook
     *
     *  @param root   - optional, global object if ommited
     *  @param path   - path to root's field
     *  @param fn     - function to execute before (after) root.path
     *                  if fn returns false, execution is terminated
     *  @param options {
     *      after : boolean - execute fn after function (default false)
     *  }
     */
    function removeHook(root, path, fn, options) {
        var args = parseArgs.apply(this, arguments)
        root = args.root
        path = args.path
        fn = args.fn
        options = args.options

        removeCfgElement(options.after ? cfg.after : cfg.before, root, path, fn)

        if ((getCfg(cfg.after, root, path)||[]).length + (getCfg(cfg.before, root, path)||[]).length == 0) {
            removeAllHooks(root, path)
        }
    }

    function removeAllHooks(root, path) {
        var args = parseArgs.apply(this, arguments)
        root = args.root
        path = args.path

        removeCfg(cfg.before, root, path)
        removeCfg(cfg.after, root, path)

        var orig = getCfg(cfg.orig, root, path)
          , proxy = getCfg(cfg.proxies, root, path)
          , cur = getPath(root, path)

        // replace function with orig if we are currently on top of proxy chain
        if (cur === proxy) {
            setPath(root, path, orig)
        }
        // if cur !== proxy, leak a bit of memory by leaving and forgetting
        // our proxy in root.path proxy chain
        removeCfg(cfg.proxies, root, path)
        removeCfg(cfg.orig, root, path)
    }

    function parseArgs(root, path, fn, options) {
        if (typeof root == 'string') {
            options = fn
            fn = path
            path = root
            root = global
        }
        if (!root) {
            root = global
        }
        if (!path) {
            throw new Error("Path must not be empty")
        }
        if (typeof options == 'boolean') {
            options = { after: options }
        } else {
            options = options || {}
        }

        var p = path.split('.')
        for (var i = 0; i < p.length-1; i++) {
            root = root[p[i]]
            path = p[i+1]
            if (!root) {
                throw new Error("Path not found: " + p[i])
            }
        }

        return {
            root:    root,
            path:    path,
            fn:      fn,
            options: options,
        }
    }

    function createProxy(root, path, orig) {
        return function() {
            return doProxy(root, path, orig, arguments)
        }
    }

    function doProxy(root, path, orig, args) {
        var hooks
          , res
          , origRes

        hooks = getCfg(cfg.before, root, path) || []

        // if any before-hook returns a value, stop
        // execution and return that value
        for (var i = 0; i < hooks.length; i++) {
            try {
                res = hooks[i].call(root, args)
            } catch (err) {
                return
            }
            if (typeof res != 'undefined') {
                return res
            }
        }

        origRes = orig.apply(root, args)

        hooks = getCfg(cfg.after, root, path) || []

        for (var i = 0; i < hooks.length; i++) {
            try {
                res = hooks[i].call(root, origRes, args)
            } catch (err) {
                return
            }
            if (typeof res != 'undefined') {
                return res
            }
        }

        return origRes
    }

    function getPath(root, path) {
        return root[path]
    }

    function setPath(root, path, val) {
        root[path] = val
    }

    function getCfg(cfg, key, path) {
        return (findCfgForKey(cfg, key)||{})[path]
    }

    function setCfg(cfg, key, path, val) {
        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            vals = {}
            cfg.push({
                key:  key,
                vals: vals,
            })
        }
        vals[path] = val
    }

    function removeCfg(cfg, key, path) {
        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            return
        }
        delete vals[path]
        if (Object.keys(vals).length == 0) {
            removeCfgForKey(cfg, key)
        }
    }

    function addCfgElement(cfg, key, path, val) {
        removeCfgElement(cfg, key, path, val)

        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            vals = {}
            cfg.push({
                key:  key,
                vals: vals,
            })
        }
        vals[path] = vals[path] || []
        if (!Array.isArray(vals[path])) {
            throw new Error("Cannot add to non-array element")
        }
        vals[path].push(val)
    }

    function removeCfgElement(cfg, key, path, val) {
        var vals = findCfgForKey(cfg, key)
        if (!vals || !(path in vals)) {
            return
        }

        var idx = -1
        for (var i = 0; i < vals[path].length; i++) {
            if (vals[path][i] === val) {
                idx = i
                break
            }
        }

        if (idx >= 0) {
            vals[path].splice(idx, 1)
        }

        if (vals[path].length == 0) {
            delete vals[path]
        }

        if (Object.keys(vals).length == 0) {
            removeCfgForKey(cfg, key)
        }
    }

    function findCfgForKey(cfg, key) {
        for (var i = 0; i < cfg.length; i++) {
            var o = cfg[i]
            if (key == o.key) {
                return o.vals
            }
        }
    }

    function removeCfgForKey(cfg, key) {
        var idx = -1
        for (var i = 0; i < cfg.length; i++) {
            var o = cfg[i]
            if (key == o.key) {
                idx = i
                break
            }
        }

        if (idx >= 0) {
            cfg.splice(idx, 1)
        }
    }

    return {
        add:       addHook,
        remove:    removeHook,
        removeAll: removeAllHooks,
    }
})

define('module', [])
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

define('add-onclick-to-spoilers', [])
/**
 * Этот модуль добавляет пустой атрибут onclik к заголовкам спойлеров,
 * чтобы VimFx воспринимал спойлеры как кликабельный объект и давал
 * кликать по ним без мышки, с помощью клавиатуры
 */
define(['jquery', 'module', 'ls-hook'], function($, Module, lsHook) {

    function AddOnClickToSpoilersModule() {
    }

    AddOnClickToSpoilersModule.prototype = new Module()

    AddOnClickToSpoilersModule.prototype.attach = function addOnClickToSpoilers_attach(config) {
        this._hook = this.onDataLoaded.bind(this)
        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)

        this.addAttr()
    }

    AddOnClickToSpoilersModule.prototype.detach = function addOnClickToSpoilers_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)
        this._hook = null

        this.removeAttr()
    }

    AddOnClickToSpoilersModule.prototype.onDataLoaded = function addOnClickToSpoilers_onDataLoaded() {
        this.addAttr()
    }

    AddOnClickToSpoilersModule.prototype.addAttr = function addOnClickToSpoilers_addAttr() {
        $('.spoiler-title').each(function() {
            if (!this.hasAttribute('onclick')) {
                this.setAttribute('onclick', '')
            }
        })
    }

    AddOnClickToSpoilersModule.prototype.removeAttr = function addOnClickToSpoilers_removeAttr() {
        // в старой версии табуна спойлеры создавались с onclick="return true;"
        // соответственно, из этих спойлеров удалять атрибут не будем: удаляем только
        // пустые атрибуты, созданные этим плагином
        $('.spoiler-title').each(function() {
            if (this.getAttribute('onclick') == '') {
                this.removeAttribute('onclick')
            }
        })
    }

    return AddOnClickToSpoilersModule
})

define('alter-links-to-mirrors', [])
define(['module'], function(Module) {

    function AlterLinksToMirrorsModule() { }

    AlterLinksToMirrorsModule.prototype = new Module()

    AlterLinksToMirrorsModule.prototype.init = function alterLinksToMirrors_init(config) {
        this.host = window.location.host

        this.mirrors = [
            'tabun.everypony.ru',
            'tabun.everypony.info',
            'табун.всепони.рф',
        ].filter(function(h) {
            return h != this.host
        })

        return config
    }

    AlterLinksToMirrorsModule.prototype.getLabel = function alterLinksToMirrors_getLabel() {
        return "Открывать ссылки на другие зеркала (" +
            this.mirrors.join(', ') + ") на текущем зеркале (" +
            this.host + ")"
    }

    AlterLinksToMirrorsModule.prototype.attach = function alterLinksToMirrors_attach(config) {
        this.handler = (function(ev) {
            this.changeAnchorHrefForClick(closestAnchor(ev.target))
        }).bind(this)
        document.addEventListener('click', this.handler, true)
    }

    AlterLinksToMirrorsModule.prototype.detach = function alterLinksToMirrors_detach() {
        document.removeEventListener('click', this.handler, true)
        this.handler = null
    }

    AlterLinksToMirrorsModule.prototype.changeAnchorHrefForClick = function alterLinksToMirrors_changeAnchorHrefForClick(a) {
        if (!isAnchorWithHref(a) || this.mirrors.indexOf(a.hostname) < 0 || isSiteRootAnchor(a)) {
            // Ничего не трогаем, если нам дали не элемент <a>,
            // либо элемент <a> без атрибута href,
            // либо ссылку на левый сайт, не являющийся зеркалом табуна
            // Также ссылки на корни зеркал трогать не будем:
            // они, вероятно, ведут туда намеренно
            return
        }

        var backup = a.href

        // на время клика подменим hostname
        a.hostname = this.host

        // сразу после клика вернём всё как было
        setTimeout(function() {
            a.href = backup
        }, 0)
    }

    function closestAnchor(el) {
        while (el instanceof HTMLElement) {
            if (el.nodeName.toUpperCase() == 'A') {
                return el
            } else {
                el = el.parentNode
            }
        }

        return null
    }

    function isAnchorWithHref(el) {
        return el instanceof HTMLElement &&
            el.nodeName.toUpperCase() == 'A' &&
            el.href
    }

    function isSiteRootAnchor(a) {
        return !a.pathname || a.pathname == '/'
    }

    return AlterLinksToMirrorsModule
})

define('alter-same-page-links', [])
define(['module'], function(Module) {

    var mirrors = [
        'tabun.everypony.ru',
        'tabun.everypony.info',
        'табун.всепони.рф',
    ]

    function AlterSamePageLinksModule() { }

    AlterSamePageLinksModule.prototype = new Module()

    AlterSamePageLinksModule.prototype.init = function alterSamePageLinks_init(config) {
        this.cssClass = this.getApp().getId() + '-same-page-anchor'
        return config
    }

    AlterSamePageLinksModule.prototype.getLabel = function alterSamePageLinks_getLabel() {
        return "При клике на ссылку на коммент, находящийся на текущей странице, сразу скроллить на него (такие ссылки будут зеленеть при наведении)"
    }

    AlterSamePageLinksModule.prototype.attach = function alterSamePageLinks_attach(config) {
        this.clickHandler = this.onClick.bind(this)
        this.mouseOverHandler = this.onMouseOver.bind(this)
        this.mouseOutHandler = this.onMouseOut.bind(this)
        document.addEventListener('click', this.clickHandler)
        document.addEventListener('mouseover', this.mouseOverHandler)
        document.addEventListener('mouseout', this.mouseOutHandler)

        this.style = $('<style>').text(
                'A.' + this.cssClass + ', ' +
                'A.' + this.cssClass + ':hover, ' +
                'A.' + this.cssClass + ':visited {color: #0A0 !important}')
            .appendTo(document.head)
    }

    AlterSamePageLinksModule.prototype.detach = function alterSamePageLinks_detach() {
        document.removeEventListener('click', this.clickHandler)
        document.removeEventListener('mouseover', this.mouseOverHandler)
        document.removeEventListener('mouseout', this.mouseOutHandler)
        this.clickHandler = null
        this.mouseOverHandler = null
        this.mouseOutHandler = null

        this.style.remove()
        this.style = null

        $('A.' + this.cssClass).removeClass(this.cssClass)
    }

    AlterSamePageLinksModule.prototype.onClick = function alterSamePageLinks_onClick(ev) {
        if (
                ev.which != null && ev.which != 1 ||
                ev.button != null && ev.button != 0
        ) {
            return
        }

        var a = closestAnchor(ev.target)
          , id = getLinkedCommentId(a)

        if (!isSamePageComment(id)) {
            return
        }

        if (ev.defaultPrevented) {
            return // something has already handled this event
        }

        // TODO : remove this line
        window.location.hash = "comment" + id

        /* TODO : uncomment this part
        // update #hash part of the url avoiding immediate scrolling via mungling anchor's name
        var elCommentAnchor = $('#comment_id_' + id + ' A[name="comment' + id + '"]')
        elCommentAnchor.attr('name', 'mungle-comment' + id)
        window.location.hash = "comment" + id
        elCommentAnchor.attr('name', 'comment' + id)

        // TODO : implement for new tabun version
        // smooth scroll to the element
        ls.comments.scrollToComment(id)

        // TODO : remember clicked link and add back link to the target comment
        */

        ev.stopImmediatePropagation()
        ev.preventDefault()
        return false
    }

    AlterSamePageLinksModule.prototype.onMouseOver = function alterSamePageLinks_onMouseOver(ev) {
        var a = closestAnchor(ev.target)
        if (isSamePageComment(getLinkedCommentId(a))) {
            $(a).addClass(this.cssClass)
        }
    }

    AlterSamePageLinksModule.prototype.onMouseOut = function alterSamePageLinks_onMouseOut(ev) {
        var a = closestAnchor(ev.target)
        $(a).removeClass(this.cssClass)
    }

    function closestAnchor(el) {
        while (el instanceof HTMLElement) {
            if (el.nodeName.toUpperCase() == 'A') {
                return el
            } else {
                el = el.parentNode
            }
        }

        return null
    }

    function isAnchorWithHref(el) {
        return el instanceof HTMLElement &&
            el.nodeName.toUpperCase() == 'A' &&
            el.href
    }

    var reCommentInPath = new RegExp('^/comments/([^/]+)/*$')
      , reCommentInHash = new RegExp('^#comment(.+)$')

    function getLinkedCommentId(a) {
        var res
        if (!isAnchorWithHref(a)) {
            return null
        }
        if (mirrors.indexOf(a.host) < 0) {
            return null
        }
        if (null != (res = (reCommentInPath.exec(a.pathname)||[])[1])) {
            return res
        }
        if (null != (res = (reCommentInHash.exec(a.hash)||[])[1])) {
            return res
        }
        return null
    }

    function isSamePageComment(id) {
        return id != null && document.getElementById('comment_id_' + id) != null
    }

    return AlterSamePageLinksModule
})

define('autospoiler-images', [])
define(['jquery', 'module', 'basic-cfg-panel-applet', 'ls-hook'], function($, Module, BasicCfgPanelApplet, lsHook) {
    function AutospoilerImagesModule() { }

    AutospoilerImagesModule.prototype = new Module()

    AutospoilerImagesModule.prototype.init = function autospoilerImages_init(config) {
        config = config || {
            width: 1000,
            height: 500,
            inCommentsOnly: true,
        }
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    AutospoilerImagesModule.prototype.getLabel = function autospoilerImages_getLabel() {
        return "Автоматически спойлерить картинки"
    }

    AutospoilerImagesModule.prototype.attach = function autospoilerImages_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    AutospoilerImagesModule.prototype.detach = function autospoilerImages_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    AutospoilerImagesModule.prototype.processPage = function autospoilerImages_processPage() {
        $('IMG').not('.spoiler-body IMG').each(function(_, e) {
            // HACK: XXX: 40 px is arbitrary non-loaded image width
            // TODO: implement more reliable way to determine not loaded image
            if (e.width > 40 || e.height > 40) {
                this.processImage(e)
            } else {
                // either wait for full load
                // or just let the img element find out the image's size
                this.waitForImage(e)
            }
        }.bind(this))
    }

    AutospoilerImagesModule.prototype.unprocessPage = function autospoilerImages_unprocessPage() {
        $('SPAN.spoiler').each(function(_, e) {
            var data = $(e).data(this.attrName)
            if (data && data.spoileredElement) {
                e.parentNode.insertBefore(data.spoileredElement, e)
                e.parentNode.removeChild(e)
            }
        }.bind(this))
    }

    AutospoilerImagesModule.prototype.waitForImage = function autospoilerImages_waitForImage(e) {
        var timeout = setTimeout(function() {
                this.processImage(e)
            }.bind(this), 1000)
          , loadListener = function() {
                clearTimeout(timeout)
                this.processImage(e)
            }.bind(this)

        e.addEventListener('load', loadListener)
    }

    AutospoilerImagesModule.prototype.processImage = function autospoilerImages_processImage(e) {
        // HACK: prevent rare double-spoilering
        if ($(e).is('.spoiler IMG')) {
            return
        }
        // HACK: prevent processing image after module is disabled
        if (!this.isEnabled()) {
            return
        }

        var cfg = this.getConfig()

        if (cfg.inCommentsOnly && !$(e).is('.comment IMG')) {
            return
        }

        if (e.width > cfg.width) {
            this.spoiler(e, 'ширина ' + e.width + 'px')
        } else if (e.height > cfg.height) {
            this.spoiler(e, 'высота ' + e.height + 'px')
        }
    }

    AutospoilerImagesModule.prototype.spoiler = function autospoilerImages_spoiler(img, reason) {
        var spoilerBody
        $(img).after(
            $('<SPAN>')
                .attr('class', 'spoiler')
                .data(this.attrName, { spoileredElement: img })
                .append(
                    $('<SPAN>')
                        .attr('class', 'spoiler-title')
                        .attr('onclick', '')
                        .text('[КАРТИНКА (' + reason + ')]'),
                    spoilerBody = $('<SPAN>')
                        .attr('class', 'spoiler-body')
                        .css({display: 'none'})
                )
        )
        spoilerBody.append(img)
    }

    AutospoilerImagesModule.prototype.createCfgPanelApplet = function autospoilerImages_createCfgPanelApplet() {
        var txtWidth = $('<input>')
            .attr('type', 'text')
            .attr('name', 'width')
            .css({
                width: 35,
             })
        var txtHeight = $('<input>')
            .attr('type', 'text')
            .attr('name', 'height')
            .css({
                width: 35,
             })
        var chkInCommentsOnly = $('<input>')
            .attr('type', 'checkbox')
            .attr('name', 'inCommentsOnly')
        var lblInCommentsOnly = $('<label>')
            .text(' автоспойлерить только в комментариях')
            .prepend(chkInCommentsOnly)

        return new BasicCfgPanelApplet(
                "Автоматически спойлерить картинки", " больше", txtWidth, "px шириной или ", txtHeight, "px высотой",
                " (&nbsp;", lblInCommentsOnly, ")"
        )
    }

    return AutospoilerImagesModule
})

define('basic-cfg-panel-applet', [])
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

        res = res || {}
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

define('cfg-panel-applet', [])
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

define('cfg-panel', [])
define(['jquery', 'module', 'app', 'basic-cfg-panel-applet', 'img/gear'], function($, Module, App, BasicCfgPanelApplet, imgGear) {

    function CfgPanel() { }

    CfgPanel.prototype = new Module()

    CfgPanel.prototype.attach = function cfgPanel_attach(config) {
        this._collectApplets()

        this._btn = $('<a href="#">').css({
            background: 'url("' + imgGear + '") no-repeat 50% 50%',
            width: 16,
            height: 24,
            display: 'inline-block',
            verticalAlign: 'bottom',
            position: 'relative',
            bottom: -3
        }).on('click', function() {
            if (this._dialog) {
                this._closeDialog()
            } else {
                this._openDialog()
            }
            return false
        }.bind(this))

        $('#widemode').append(this._btn)
    }

    CfgPanel.prototype.detach = function cfgPanel_detach() {
        this._closeDialog()
        this._btn.remove()
        this._btn = null
        return true
    }

    CfgPanel.prototype._collectApplets = function cfgPanel_collectApplets() {
        this._columns = []
        var curColIdx = 1
        this.getApp().getModuleIds().forEach(function(id) {
            var module = this.getApp().getModule(id)
              , params = (module.getInstallParams() || {}).cfgPanel

            if (!params || params.skip) {
                return
            }
            curColIdx = params.column || curColIdx

            var col = this._columns[curColIdx] = this._columns[curColIdx] || []
              , applet
            if (module.createCfgPanelApplet) {
                applet = module.createCfgPanelApplet()
            } else {
                applet = new BasicCfgPanelApplet(module.getLabel())
            }
            col.push({
                id: id,
                module: module,
                applet: applet,
            })
        }, this)
        this._columns = this._columns.filter(function(c) { return c && c.length })
    }

    CfgPanel.prototype._closeDialog = function cfgPanel_closeDialog() {
        this._dialog.remove()
        this._dialog = null
    }

    CfgPanel.prototype._openDialog = function cfgPanel_createUi() {
        this._dialog = $('<div>')
        this._applets = {}
        var tds = []
        this._columns.forEach(function(col, colIdx) {
            col.forEach(function(applet) {
                td = tds[colIdx] = tds[colIdx] || $('<td>')
                this._applets[applet.id] = {
                    id: applet.id,
                    applet: applet.applet,
                    module: applet.module,
                    ui: $(applet.applet.build())
                            .css('margin-bottom', '10px')
                            .css('background', applet.module.isDirty() ? '#FDD' : 'none') // TODO : theme
                            .appendTo(td),
                }
            }.bind(this))
        }.bind(this))

        this._dialog = $('<div>').attr('id', this.getApp().getId() + '-cfg-panel').css({
            position: 'fixed',
            right: 6,
            bottom: 30,
            width: 450 * tds.length,
            zIndex: 10000,
            background: 'White', // TODO : theme
            border: "1px solid Silver", // TODO : theme
            borderRadius: 6,
            padding: 10
        })
        
        $('<div>').text("Настройки userscript'а TabunFixes").css({
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 15
        }).appendTo(this._dialog)

        var table = $('<table>').css({
            border: "none",
            width: "100%"
        }).appendTo(this._dialog)

        var tr = $('<tr>').appendTo(table)
        var tdCss = {
            padding: '5px',
            verticalAlign: 'top'
        }
        var tdWidth = Math.floor(100 / tds.length) + '%'

        tds.forEach(function(td, i) {
            td.attr('width', tdWidth).css(tdCss).appendTo(tr)
            if (i > 0) {
                td.css('border-left', '1px solid #EEE') // TODO : theme
            }
        }.bind(this))

        var ctlPanel = $('<div>').appendTo(this._dialog)

        $('<a href="#">').text("Сохранить конфигурацию").on('click', function() {
            if (this._saveConfig()) {
                this._closeDialog()
            }
            return false
        }.bind(this)).appendTo(ctlPanel)

        $('<a href="#">').text("Отмена").css('float', 'right').on('click', function() {
            this._closeDialog()
            return false
        }.bind(this)).appendTo(ctlPanel)

        $(document.body).append(this._dialog)

        this._setAppletsData()
    }

    CfgPanel.prototype._setAppletsData = function cfgPanel_setAppletsData() {
        var app = this.getApp()
        for (id in this._applets) {
            var a = this._applets[id]
            a.applet.setData(app.isModuleEnabled(a.module), app.getModuleConfig(a.module))
        }
    }

    CfgPanel.prototype._saveConfig = function cfgPanel_saveConfig() {
        var app = this.getApp()
          , res = true
          , errs = null
          , cfgs = {}
          , enab = {}

        for (id in this._applets) {
            var a = this._applets[id]
            try {
                cfgs[id] = a.applet.getConfig()
                enab[id] = a.applet.getEnabled()
            } catch (err) {
                res = false
                errs = (errs ? errs + "\n" : "") + err.message
            }
        }

        if (!res) {
            alert("Ошибка сохранения конфига" + (errs ? ":\n" + errs : ""))
            return false
        }

        for (id in this._applets) {
            var a = this._applets[id]
            app.setModuleConfig(a.module, cfgs[id])
            app.setModuleEnabled(a.module, enab[id])
        }

        return true
    }

    return CfgPanel

})

define('fast-scroll-to-comment', [])
define(['jquery', 'module', 'hook'], function($, Module, hook) {

    function FastScrollToCommentModule() {
    }

    FastScrollToCommentModule.prototype = new Module()

    FastScrollToCommentModule.prototype.attach = function fastScrollToComment_attach(config) {
        this._hook = this.onGoToComment.bind(this)
        hook.add('ls.comments.goToNextComment', this._hook)
    }

    FastScrollToCommentModule.prototype.detach = function fastScrollToComment_detach() {
        hook.remove('ls.comments.goToNextComment', this._hook)
        this._hook = null
    }

    FastScrollToCommentModule.prototype.onGoToComment = function fastScrollToComment_onGoToComment() {
        $(window).stop(true)
    }

    return FastScrollToCommentModule

})

define('fav-as-icon', [])
define(['jquery', 'module', 'img/star-big-checked', 'img/star-big-unchecked', 'img/star-small-checked', 'img/star-small-unchecked'], function($, Module, imgStarBigChecked, imgStarBigUnchecked, imgStarSmallChecked, imgStarSmallUnchecked) {
    function FavAsIconModule() { }

    FavAsIconModule.prototype = new Module()

    FavAsIconModule.prototype.getLabel = function favAsIcon_getLabel() {
        return 'Заменить "В избранное" на звёздочку'
    }

    FavAsIconModule.prototype.attach = function favAsIcon_attach(config) {
        this.style = $('<style>').text(
            '.comment-info .favourite:before        { ' + genFavBeforeStyle(11, 11, imgStarSmallUnchecked) + ' }' +
            '.comment-info .favourite.active:before { ' + genFavBeforeStyle(11, 11, imgStarSmallChecked)   + ' }' +
            '.topic-info .favourite:before          { ' + genFavBeforeStyle(11, 11, imgStarSmallUnchecked) + ' }' +
            '.topic-info .favourite.active:before   { ' + genFavBeforeStyle(11, 11, imgStarSmallChecked)   + ' }' +
            '.table-talk .favourite:before          { ' + genFavBeforeStyle(17, 17, imgStarBigUnchecked)   + ' }' +
            '.table-talk .favourite.active:before   { ' + genFavBeforeStyle(17, 17, imgStarBigChecked)     + ' }' +

            '.comment-info .favourite { ' + genFavStyle(11, 11) + ' }' +
            '.topic-info .favourite   { ' + genFavStyle(11, 11) + ' }' +
            '.table-talk .favourite   { ' + genFavStyle(17, 17) + ' }' +
            '.topic-info-favourite.favourite { padding:0 !important; margin:6px 11px 6px 0px }'
        ).appendTo(document.head)
    }

    FavAsIconModule.prototype.detach = function favAsIcon_detach() {
        if (this.style) {
            this.style.remove()
        }
        this.style = null
    }

    function genFavBeforeStyle(w, h, img) {
        return 'width:'+w+'px; height:'+h+'px; display:inline-block; content:" "; background:url("'+img+'")'
    }

    function genFavStyle(w, h) {
        return 'width:'+w+'px; height:'+h+'px; display:inline-block; overflow:hidden'
    }

    return FavAsIconModule
})

define('favicon-unread-count', [])
define(['module', 'ls-hook', 'img/favicon'], function(Module, lsHook, imgFavicon) {

    function FaviconUnreadCountModule() { }

    FaviconUnreadCountModule.prototype = new Module()

    FaviconUnreadCountModule.prototype.getLabel = function faviconUnreadCount_getLabel() {
        return "В иконке сайта показывать кол-во непрочитанных комментов"
    }

    FaviconUnreadCountModule.prototype.attach = function faviconUnreadCount_attach(config) {
        this.onCheckNeeded = this.checkAndUpdateFavicon.bind(this)
        this.data = this.prepareData()

        this.data.eFavicon.onload = function() {
            this.checkAndUpdateFavicon()
            if (!window.MutationObserver) {
                this.interval = setInterval(this.onCheckNeeded, 1000)
            } else {
                this.observer = new MutationObserver(this.onCheckNeeded)

                var o = document.getElementById('new_comments_counter')
                if (o) {
                    this.observer.observe(o, {childList:true,characterData:true,subtree:true})
                }
            }
        }.bind(this)

        this.data.eFavicon.src = imgFavicon
    }

    FaviconUnreadCountModule.prototype.detach = function faviconUnreadCount_detach() {
        if (this.interval) {
            clearInterval(this.interval)
        }
        if (this.observer) {
            observer.disconnect()
        }
        delete this.interval
        delete this.observer
        delete this.onCheckNeeded

        // revert favicon
        if (this.data) {
            this.data.eFavLink.setAttribute('href', this.data.bakHref)
            reAttachEl(this.data.eFavLink)
        }
        delete this.data
    }

    FaviconUnreadCountModule.prototype.prepareData = function faviconUnreadCount_prepareCanvas() {
        var eFavLink = document.head.querySelector('LINK[rel~="icon"]')
          , bakHref = eFavLink.getAttribute('href')
          , eFavicon = new Image()
          , curCnt = 0
          , eCanvas = document.createElement('canvas')
          , ctx = eCanvas.getContext('2d')
          , dimen = 64
          , pad = 4
          , fontSizeXX = -1
          , fontSizeXXX = -1
          , fontSize1k = -1
          , fontSizeMoreThan1k = -1

        eCanvas.setAttribute('width', dimen)
        eCanvas.setAttribute('height', dimen)

        // calculate font sizes
        for (var s = 32; s > 0; s--) {
            setFontSize(ctx, s)
            if (fontSizeXX == -1 && ctx.measureText("'00").width < dimen - 2*pad) {
                fontSizeXX = s
            }
            if (fontSizeXXX == -1 && ctx.measureText("000").width < dimen - 2*pad) {
                fontSizeXXX = s
            }
            if (fontSize1k == -1 && ctx.measureText("1k").width < dimen - 2*pad) {
                fontSize1k = s
            }
            if (fontSizeMoreThan1k == -1 && ctx.measureText(">1k").width < dimen - 2*pad) {
                fontSizeMoreThan1k = s
            }
            if (fontSizeXX > -1 && fontSizeXXX > -1 && fontSize1k > -1 && fontSizeMoreThan1k > -1) {
                break
            }
        }

        return {
            bakHref:            bakHref,
            eFavLink:           eFavLink,
            eFavicon:           eFavicon,
            eCanvas:            eCanvas,
            ctx:                ctx,
            fontSizeXX:         fontSizeXX,
            fontSizeXXX:        fontSizeXXX,
            fontSize1k:         fontSize1k,
            fontSizeMoreThan1k: fontSizeMoreThan1k,
            dimen:              dimen,
            pad:                pad,
        }
    }


    FaviconUnreadCountModule.prototype.checkAndUpdateFavicon = function faviconUnreadCount_checkAndUpdateFavicon() {
        if (!this.data) {
            return
        }
        var cnt = getCountToDisplay()
        if (cnt != this.data.curCnt) {
            this.data.curCnt = cnt
            this.redraw()
        }
    }

    FaviconUnreadCountModule.prototype.redraw = function faviconUnreadCount_redraw() {
        var w = this.data.eFavicon.width
          , h = this.data.eFavicon.height
          , dimen = this.data.dimen
          , curCnt = this.data.curCnt

        this.data.ctx.clearRect(0, 0, dimen, dimen)

        if (w > 0 && h > 0) {
            // draw favicon
            this.data.ctx.scale(dimen/w, dimen/h)
            this.data.ctx.drawImage(this.data.eFavicon, 0, 0)
            this.data.ctx.scale(w/dimen, h/dimen)
        }

        // draw text
        if (curCnt == 0) {
            // do nothing
        } else if (curCnt < 100) {
            this.drawCnt(curCnt, this.data.fontSizeXX)
        } else if (curCnt < 1000) {
            this.drawCnt(curCnt, this.data.fontSizeXXX)
        } else if (curCnt == 1000) {
            this.drawCnt('1k', this.data.fontSize1k)
        } else {
            this.drawCnt(">1k", this.data.fontSizeMoreThan1k)
        }

        // force browser to redraw
        this.data.eFavLink.setAttribute('href', this.data.eCanvas.toDataURL())
        reAttachEl(this.data.eFavLink)
    }

    FaviconUnreadCountModule.prototype.drawCnt = function faviconUnreadCount_drawCnt(sCnt, fontSize) {
        var ctx = this.data.ctx
          , dimen = this.data.dimen
          , pad = this.data.pad

        setFontSize(ctx, fontSize)
        var m = ctx.measureText(sCnt)

        ctx.fillStyle = "rgba(255,255,255,0.8)"

        ctx.fillRect(dimen - 2*pad - m.width, dimen - 2*pad - fontSize, m.width + 2*pad, fontSize + 2*pad)

        ctx.fillStyle = "black"
        ctx.shadowColor = "white"
        ctx.shadowOffsetX = -2
        ctx.shadowOffsetY = -2
        ctx.shadowBlur = 5
        ctx.fillText(sCnt, dimen - pad - m.width, dimen - pad)
    }

    function setFontSize(ctx, size) {
        ctx.font = size + 'pt Sans'
    }

    function reAttachEl(e) {
        var eNext = e.nextSibling
          , eParent = e.parentNode
        eParent.removeChild(e)
        if (eNext) {
            eParent.insertBefore(e, eNext)
        } else {
            eParent.appendChild(e)
        }
    }

    function getCountToDisplay() {
        var el = document.getElementById('new_comments_counter')
        if (!el) {
            return 0
        }
        if (el && el.offsetWidth) {
            return parseInt(el.textContent.trim())
        } else {
            return 0
        }
    }

    return FaviconUnreadCountModule

})

define('fix-aside-toolbar', [])
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

define('format-date', [])
/**
 * Переформатирует дату/время, представленную в виде строки isoDateTime, например 2013-02-06T23:01:33+04:00
 * в требуемый формат. Допустимые элементы формата:
 * - yyyy, yy - год (четыре или две цифры)
 * - M, MM, MMM, MMMM - месяц (одна/две цифры или сокращённое/полное название)
 * - d, dd - день
 * - H, HH - час
 * - m, mm - минуты
 * - s, ss - секунды
 *
 * @param strDate - дата в формате isoDateTime
 * @param strFormat - строка формата
 * @param bToLocal - конвертировать ли дату в локальную из той зоны, в которой она представлена
 *
 * @return переформатированные дату/время
 */
define(function() {
    var aMonthsLong = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
      , aMonthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']

    function padIntWithZero(x) {
        return x < 10 ? '0' + x : '' + x
    }

    return function formatDate(strDate, strFormat, bToLocalDate) {
        var arr
        if (!bToLocalDate) {
            arr = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(strDate)
        } else {
            var d = new Date(strDate)
            arr = [
                null,
                '' + d.getFullYear(),
                padIntWithZero(d.getMonth() + 1),
                padIntWithZero(d.getDate()),
                padIntWithZero(d.getHours()),
                padIntWithZero(d.getMinutes()),
                padIntWithZero(d.getSeconds()),
                padIntWithZero(d.getMilliseconds()),
            ]
        }
        return strFormat.replace(/(?:\\([\\yMdHms]))|(yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s)/g, function(whole, escaped, pattern) {
            if (escaped) {
                return escaped
            }
            switch (pattern) {
                case 'yyyy': return arr[1]
                case 'yy'  : return arr[1].substring(2)
                case 'MMMM': return aMonthsLong[parseInt(arr[2], 10)-1]
                case 'MMM' : return aMonthsShort[parseInt(arr[2], 10)-1]
                case 'MM'  : return arr[2]
                case 'M'   : return parseInt(arr[2], 10)
                case 'dd'  : return arr[3]
                case 'd'   : return parseInt(arr[3], 10)
                case 'HH'  : return arr[4]
                case 'H'   : return parseInt(arr[4], 10)
                case 'mm'  : return arr[5]
                case 'm'   : return parseInt(arr[5], 10)
                case 'ss'  : return arr[6]
                case 's'   : return parseInt(arr[6], 10)
            }
        })
    }
})

define('img-alt-to-title', [])
define(['jquery', 'module', 'ls-hook'], function($, Module, lsHook) {
    function ImgAltToTitleModule() { }

    ImgAltToTitleModule.prototype = new Module()

    ImgAltToTitleModule.prototype.init = function imgAltToTitle_init(config) {
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    ImgAltToTitleModule.prototype.getLabel = function imgAltToTitle_getLabel() {
        return "Показывать атрибуты ALT у картинок всплывающими подсказками"
    }

    ImgAltToTitleModule.prototype.attach = function imgAltToTitle_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    ImgAltToTitleModule.prototype.detach = function imgAltToTitle_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    ImgAltToTitleModule.prototype.processPage = function imgAltToTitle_processPage() {
        var self = this
          , cfg = self.getConfig()

        $('IMG[alt]').each(function() {
            var el = $(this)

            if (!el.data(self.attrName)) {
                var origTitle = el.attr('title')
                  , alt = (el.attr('alt')||'').trim()
                  , title = (origTitle||'').trim()

                el.data(self.attrName, {
                    origTitle: origTitle,
                })

                if (!alt) {
                    return
                }

                if (title) {
                    title = alt + '(' + title + ')'
                } else {
                    title = alt
                }

                el.attr('title', title)
            }
        })
    }

    ImgAltToTitleModule.prototype.unprocessPage = function imgAltToTitle_unprocessPage() {
        var self = this

        $('IMG[alt]').each(function() {
            var el = $(this)
              , data = el.data(self.attrName)

            if (data) {
                if (data.origTitle == null) {
                    el.removeAttr('title')
                } else {
                    el.attr('title', data.origTitle)
                }
                el.removeData(self.attrName)
            }
        })
    }

    return ImgAltToTitleModule
})

define('ls-hook', [])
/**
 * Эмулируем несколько хуков livestreet CMS, нужных для работы скрипта,
 * но недоступных в новой версии табуна
 */
define(function() {

    var hooks = {
        ls_comments_load_after: [],
        ls_userfeed_get_more_after: [],
    }
    var interval
      , observer
      , global = this
      , lastCommentsCount
      , lastArticlesCount
      , lastCommentIds = []
      , lastArticleIds = []

    function isObserving() {
        return interval || observer
    }

    function stopObserving() {
        if (interval) {
            clearInterval(interval)
            interval = null
        }
        if (observer) {
            observer.disconnect()
            observer = null
        }
    }

    function startObserving() {
        if (!window.MutationObserver) {
            interval = setInterval(checkAndInvoke, 100)
        } else {
            observer = new MutationObserver(checkAndInvoke)

            var o

            o = document.getElementById('userfeed_loaded_topics')
            if (o) {
                observer.observe(o, {childList:true})
            }

            o = document.getElementById('content')
            if (o) {
                observer.observe(o, {childList:true})
            }

            o = document.getElementById('count-comments')
            if (o) {
                observer.observe(o, {childList:true,characterData:true,subtree:true})
            }
        }
        initHooks()
    }

    function addLsHook(key, fn) {
        hooks[key].push(fn)
        if (!isObserving()) {
            startObserving()
        }
    }

    function removeLsHook(key, fn) {
        var idx = hooks[key].indexOf(fn)
        if (idx >= 0) {
            hooks[key].splice(idx, 1)
        }
        if (!hasHooks() && isObserving()) {
            stopObserving()
        }
    }

    function hasHooks() {
        var sum = 0
          , key

        for (key in hooks) {
            sum += hooks[key].length
        }

        return sum > 0
    }

    function initHooks() {
        lastCommentsCount = getCommentsCount()
        lastArticlesCount = getArticlesCount()
        lastCommentIds = getCommentIds()
        lastArticleIds = getArticleIds()
    }

    function checkAndInvoke() {
        if (hooks.ls_userfeed_get_more_after.length) {
            var articlesCount = getArticlesCount()
            if (articlesCount > lastArticlesCount) {
                lastArticlesCount = articlesCount
                var articleIds = getArticleIds()
                var newArticleIds = articleIds.filter(function(id) {
                    return lastArticleIds.indexOf(id) < 0
                })
                lastArticleIds = articleIds
                invokeHook('ls_userfeed_get_more_after', newArticleIds)
            }
        }

        if (hooks.ls_comments_load_after.length) {
            var commentCount = getCommentsCount()
            if (commentCount > lastCommentsCount) {
                lastCommentsCount = commentCount
                var commentIds = getCommentIds()
                var newCommentIds = commentIds.filter(function(id) {
                    return lastCommentIds.indexOf(id) < 0
                })
                lastCommentIds = commentIds
                invokeHook('ls_comments_load_after', newCommentIds)
            }
        }
    }

    function invokeHook(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        (hooks[name]||[]).forEach(function(fn) {
            fn.apply(global, args)
        })
    }

    function getArticlesCount() {
        return document.getElementsByTagName('article').length
    }

    function getCommentsCount() {
        return document.getElementsByClassName('comment').length
    }

    function getArticleIds() {
        return Array.prototype.map.call(document.querySelectorAll('ARTICLE.topic .topic-title A'), function(e) {
            return parseInt(/([0-9]+)\.html$/.exec(e.getAttribute('href'))[1], 10)
        })
    }

    function getCommentIds() {
        return Array.prototype.map.call(document.querySelectorAll('.comment'), function(e) {
            var link = e.querySelector('.comment-link A')
              , id = e.getAttribute('id')
            if (id) {
                return parseInt(/^comment_id_([0-9]+)$/.exec(id)[1], 10)
            } else if (link && link.getAttribute('href')) {
                return parseInt(/#comment([0-9]+)$/.exec(link.getAttribute('href'))[1], 10)
            } else {
                return null
            }
        }).filter(function(e) {
            return e != null
        })
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
})

define('narrow-tree', [])
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

define('open-nested-spoilers', [])
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

define('reformat-dates', [])
define(['jquery', 'module', 'basic-cfg-panel-applet', 'format-date', 'ls-hook'], function($, Module, BasicCfgPanelApplet, formatDate, lsHook) {
    function ReformatDatesModule() { }

    ReformatDatesModule.prototype = new Module()

    ReformatDatesModule.prototype.init = function reformatDates_init(config) {
        config = config || {
            format: 'd MMM yyyy, H:mm:ss',
        }
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    ReformatDatesModule.prototype.getLabel = function reformatDates_getLabel() {
        return "Сменить формат дат"
    }

    ReformatDatesModule.prototype.attach = function reformatDates_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    ReformatDatesModule.prototype.detach = function reformatDates_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    ReformatDatesModule.prototype.processPage = function reformatDates_processPage() {
        var self = this
          , cfg = self.getConfig()

        $('[datetime]').each(function() {
            var el = $(this)

            if (!el.data(self.attrName) && !el.children().length) {
                el.data(self.attrName, {
                    origText: el.text(),
                })
                el.html(formatDate(el.attr('datetime'), cfg.format, false))
            }
        })
    }

    ReformatDatesModule.prototype.unprocessPage = function reformatDates_unprocessPage() {
        var self = this

        $('[datetime]').each(function() {
            var el = $(this)
              , data = el.data(self.attrName)

            if (data) {
                el.text(data.origText)
                el.removeData(self.attrName)
            }
        })
    }

    ReformatDatesModule.prototype.createCfgPanelApplet = function reformatDates_createCfgPanelApplet() {
        var txtFormat = $('<input>')
            .attr('type', 'text')
            .attr('name', 'format')
            .css({
                width: 150,
             })

        return new BasicCfgPanelApplet(this.getLabel(), ": ", txtFormat, "<br/>",
                '<p style="padding-left: 20px">Формат — это строка вроде "d MMMM yyyy, HH:mm", где:<br/>' +
                'yyyy, yy — год (2011 или 11)<br/>' +
                'MMMM, MMM, MM, M — месяц (августа, авг, 08, 8)<br/>' +
                'dd, d, HH, H, mm, m, ss, s — день, часы, минуты, секунды (09 или 9)<br/>' +
                'Используйте \\ если нужны буквы y,M,d,H,m,s: \\M, \\s и т.д.</p>')
    }

    return ReformatDatesModule
})

define('reveal-lite-spoilers', [])
define(['module', 'cfg-panel-applet'], function(Module, CfgPanelApplet) {

    function RevealLiteSpoilersModule() { }

    RevealLiteSpoilersModule.prototype = new Module()

    RevealLiteSpoilersModule.prototype.init = function revealLiteSpoilers_init(config) {
        config = config || {
            revealOnHover: false,
            revealInCurrentComment: false,
            alwaysReveal: false,
        }
        return config
    }

    RevealLiteSpoilersModule.prototype.getLabel = function revealLiteSpoilers_getLabel() {
        return "Приоткрывать лайт-спойлеры"
    }

    RevealLiteSpoilersModule.prototype.attach = function revealLiteSpoilers_attach(config) {
        this._generateStyleSheet(config)
        if (this._style) {
            this._style.appendTo(document.head)
        }
    }

    RevealLiteSpoilersModule.prototype.detach = function revealLiteSpoilers_detach() {
        if (this._style) {
            this._style.remove()
            this._style = null
        }
    }

    RevealLiteSpoilersModule.prototype.createCfgPanelApplet = function revealLiteSpoilers_createCfgPanelApplet() {
        return new RevealLiteSpoilersCfgPanelApplet()
    }

    RevealLiteSpoilersModule.prototype._generateStyleSheet = function revealLiteSpoilers_generateStyleSheet(config) {
        // http://userstyles.org/styles/92211/night-tabun
        var nightTabun = getComputedStyle($('<span>').attr('class', 'spoiler-gray')[0]).backgroundColor == "rgb(63, 53, 61)"

        // always visible state
        var transBgColor           = nightTabun ? '#2F252D' : '#EEE'
        var transTextColor         = nightTabun ? '#8F8F8F' : '#999'
        var transATextColor        = nightTabun ? '#7C89CA' : '#66AAFF'
        var transAVisitedTextColor = nightTabun ? '#7C89CA' : '#66AAFF'
        var transIMGFilter         = nightTabun ? 'contrast(10%) brightness(70%)' : 'contrast(10%) brightness(146%)'

        // hover state (fully visible)
        var hoverTextColor         = nightTabun ? '#DFDFDF' : '#666'
        var hoverATextColor        = nightTabun ? '#7C89CA' : '#0099FF'
        var hoverAVisitedTextColor = nightTabun ? '#7C89CA' : '#0099FF'
        var hoverIMGFilter         = nightTabun ? 'interit' : 'inherit'

        var containers = ['.comment', '.comment-preview', '.topic', '.profile-info-about']
            // селекторы для спойлеров в обычном состоянии
          , selectorSpoiler = containers.map(function(s) { return s + ' .spoiler-gray' }).join(', ')
          , selectorA = containers.map(function(s) { return s + ' .spoiler-gray A' }).join(', ')
          , selectorAVisited = containers.map(function(s) { return s + ' .spoiler-gray A:visited' }).join(', ')
          , selectorIMG = containers.map(function(s) { return s + ' .spoiler-gray IMG'}).join(', ')
            // селекторы для наведённого коммента/поста
          , selectorPostHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray' }).join(', ')
          , selectorPostHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray A' }).join(', ')
          , selectorPostHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray A:visited' }).join(', ')
          , selectorPostHoverIMG = containers.map(function(s) { return s + ':hover .spoiler-gray IMG' }).join(', ')
            // селекторы для текущего коммента
          , selectorPostActiveSpoiler = '.comment.comment-current .spoiler-gray'
          , selectorPostActiveA = '.comment.comment-current .spoiler-gray A'
          , selectorPostActiveAVisited = '.comment.comment-current .spoiler-gray A:visited'
          , selectorPostActiveIMG = '.comment.comment-current .spoiler-gray IMG'
            // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
          , selectorHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray:hover' }).join(', ')
          , selectorHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A' }).join(', ')
          , selectorHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A:visited' }).join(', ')
          , selectorHoverIMG = containers.map(function(s) { return s + ':hover .spoiler-gray:hover IMG' }).join(', ')

        var css = ''
        if (config.alwaysReveal) {
            css += 
                selectorSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                selectorA + ' { color: ' + transATextColor + ' !important; } ' +
                selectorAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } ' +
                selectIMG + ' { filter: ' + transIMGFilter + ' !important; -webkit-filter: ' + transIMGFilter + ' !important; } '
        } else {
            if (config.revealOnHover) {
                css += 
                    selectorPostHoverSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorPostHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorPostHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } ' +
                    selectorPostHoverIMG + ' { filter: ' + transIMGFilter + ' !important; -webkit-filter: ' + transIMGFilter + ' !important; } '
            }

            if (config.revealInCurrentComment) {
                css +=
                    selectorPostActiveSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorPostActiveA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorPostActiveAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } ' +
                    selectorPostActiveIMG + ' { filter: ' + transIMGFilter + ' !important; -webkit-filter: ' + transIMGFilter + ' !important; } '
            }
        }

        if (css) {
            css +=
                // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
                selectorHoverSpoiler + ' { background-color: transparent !important; color: ' + hoverTextColor + ' !important; } ' +
                selectorHoverA + ' { background-color: transparent !important; color: ' + hoverATextColor + ' !important; } ' +
                selectorHoverAVisited + ' { background-color: transparent !important; color: ' + hoverAVisitedTextColor + ' !important; } ' +
                selectorHoverIMG + ' { filter: ' + hoverIMGFilter + ' !important; -webkit-filter: ' + hoverIMGFilter + ' !important; } '
                    
        }


        this._style = $('<style>').text(css)
    }

    function RevealLiteSpoilersCfgPanelApplet() { }

    RevealLiteSpoilersCfgPanelApplet.prototype = new CfgPanelApplet()

    RevealLiteSpoilersCfgPanelApplet.prototype.build = function revealLiteSpoilersApplet_build() {
        this.chkOnHover = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'revealOnHover')
        this.chkInCurrent = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'revealInCurrentComment')
        this.chkAlways = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'alwaysReveal')

        var div = $('<div>')
          , labelOnHover = $('<label>')
                .text("Приоткрывать лайт-спойлеры при наведении на пост/коммент")
                .prepend(this.chkOnHover)
          , labelInCurrent = $('<label>')
                .text("Светить лайт-спойлеры в активном комменте")
                .prepend(this.chkInCurrent)
          , labelAlways = $('<label>')
                .text("Всегда светить лайт-спойлеры")
                .prepend(this.chkAlways)

        div.append(labelOnHover, '<br/>', labelInCurrent, '<br/>', labelAlways)

        this.chkAlways.on('change', function() {
            if (this.chkAlways.is(':checked')) {
                this.chkOnHover.prop('checked', null)
                this.chkInCurrent.prop('checked', null)
            }
        }.bind(this))

        this.chkOnHover.on('change', function() {
            if (this.chkOnHover.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        this.chkInCurrent.on('change', function() {
            if (this.chkInCurrent.is(':checked')) {
                this.chkAlways.prop('checked', null)
            }
        }.bind(this))

        return div
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.setData = function revealLiteSpoilersApplet_setData(enabled, config) {
        CfgPanelApplet.prototype.setData.apply(this, arguments) // call to super()
        config = config || {}
        this.chkOnHover.prop('checked', config.revealOnHover ? 'checked' : null)
        this.chkInCurrent.prop('checked', config.revealInCurrentComment ? 'checked' : null)
        this.chkAlways.prop('checked', config.alwaysReveal ? 'checked' : null)
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getEnabled = function revealLiteSpoilersApplet_getEnabled() {
        return this.chkOnHover.is(':checked') || this.chkAlways.is(':checked') || this.chkInCurrent.is(':checked')
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getConfig = function revealLiteSpoilersApplet_getConfig() {
        var cfg = CfgPanelApplet.prototype.getConfig.apply(this, arguments) // call to super()
        cfg = cfg || {}

        cfg.revealOnHover = this.chkOnHover.is(':checked')
        cfg.revealInCurrentComment = this.chkInCurrent.is(':checked')
        cfg.alwaysReveal = this.chkAlways.is(':checked')

        return cfg
    }

    return RevealLiteSpoilersModule
})

define('shim', [])
// Т.к. наша урезанная версия define не поддерживает
// shim конфиг, нужные библиотеки объявим явно.
// Просто возвращаем глобальные объекты

define('jquery', function() {
    return jQuery
})

define('spacebar-move-to-next', [])
define(['jquery', 'module'], function($, Module) {
    function SpacebarMoveToNextModule() { }

    SpacebarMoveToNextModule.prototype = new Module()

    SpacebarMoveToNextModule.prototype.getLabel = function spacebarMoveToNext_getLabel() {
        return "По пробелу переходить на следующий пост/непрочитанный коммент"
    }

    SpacebarMoveToNextModule.prototype.attach = function spacebarMoveToNext_attach(config) {
        this.handler = this.onSpacebarPressed.bind(this)
        document.addEventListener('keypress', this.handler)
    }

    SpacebarMoveToNextModule.prototype.detach = function spacebarMoveToNext_detach() {
        document.removeEventListener('keypress', this.handler)
        this.handler = null
    }

    SpacebarMoveToNextModule.prototype.onSpacebarPressed = function spacebarMoveToNext_onSpacebarPressed(ev) {
        var el = ev.target
        if (el.tagName == 'INPUT' || el.tagName == 'SELECT' || el.tagName == 'TEXTAREA' || el.isContentEditable) {
            // ignore input fields (as in https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js)
            return
        }
        if (ev.which == 32 /* space */) {
            if (this.goToNext()) {
                ev.preventDefault()
            }
        }
    }

    SpacebarMoveToNextModule.prototype.goToNext = function spacebarMoveToNext_goToNext() {
        $(window).stop(true)
        if ($('#update-comments').length) { // we are on comments
            return ls.comments.goToNextComment()
        } else {
            var article
            $('ARTICLE').each(function() {
                var el = $(this)
                /* 40px - небольшой запас на случай микроскроллов, не очень заметных пользователю */
                if (el.offset().top > $(window).scrollTop() + 40) {
                    article = el
                    return false
                }
            })
            if (article) {
                $.scrollTo(article, 300, {offset: -10})
                return true
            } else {
                return false
            }
        }
    }

    return SpacebarMoveToNextModule
})

define('sync-config-among-tabs', [])
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

define('whats-new', [])
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

define('img/favicon', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAnklEQVQ4y6VTwQnDMAw8mS7RQQolUzR0zYRuUQIZJGNcHomIaisWjQ/8MNKdTpYs2EGS+AMiIgAgV8hWJIXksT8NkSRYw/BihBRWtHfHza1q+/4I2ygdvD8HuXtuR4U0diow9ttRskJF1IlxlH7ITgW3PZMn7hhzF98JWGa3QClgH0x7X+byjapT0CQVy+/5NrUsEsKMQKT5M0nrd14BXnj9gc+qGlMAAAAASUVORK5CYII=')

define('img/gear', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACHUlEQVQ4y62Sv0vVYRTGn3Pe9/3ebsEdcnBpqCiKK9wkIzKStMFF6AcW1VBkg2sN+g/k0uDQ1FZSBDokmYjrNYgMUfMamWlDoEuDi0P33u/7nvc0xA1Nb0ud6Zzn/ODw4QH+MehvzaGpUicRulV1oKe9eX23Gf5TeFJcyNbyxJr2jLO91phCTXtaXGio+8GzN6UHRNQdVa8R0UY2cc+d4c6qD4MVHwYIuEFMj2LUu3fOnxgBALv1QOLshjWclxhnCYTEmqw1DIX2gdDLRDkmKleDLNVl8HpuZYyJLimwScBDAOsKFADcI4ILEvuvnDo2WJeBqrYwk1fVtjTIcMWHbBAZIOA2gRCjduxgMDRVKhimR86axr0ZlwcwmXq5HFXXiNCoiuL11vyF8fnVNYnxQCUNZR9kSaJ2WQBwlg9lnO1IrIFhRhpkUzRaZ34xSIM0AECMWk6sARNlU8O5Suq3MxifXz3IRKU0CNIQDifWFpzh7mqQxyIxl3F22ll+39V8pHVXBhdPHv0mMY4YphwTTfsg+ys+DInEc8w0QQT4IJN1ffDi7ceWfXuSaWeMkxjhg0AVICY4wzDMqPpQ/lFNz9xqKyzu+MAw9zIRANxnorbE2WImsUisGWWiJgD9hska5s5dvT/87pMbnVnO1+qx2ZW+iQ9f9dXsl56a9nJmuXHrzjYn3jzb5AH8dpkPsghgLg3yuaZdPX38O/5n/ASdNN+15exi2wAAAABJRU5ErkJggg==')

define('img/star-big-checked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAACNklEQVQ4y52TPWtUQRSGn5k7dy9rNhvBTYpgDLqKElYiqE0aSSGx8ReIoE1WQ0BBQe0sBbWyun60YmNpYxcwhUJA4YpFEElwA5JNdpNsdu/XzFjsLiYkROPAA2fOHN7DzHkH9liBjzRzp64FPnKvOrmHgCiODBeFdJ4dLh4Z+C8RQCovcwNkLtfXezPwcfYtcrDQ1+M47lWQSJW5Arj7Egl8xMDgoUtCOv0IiZCqeOLM6YnAR/yzSP9gocdxM3fax22Ud+AWoHarF+bjwGOEcxEUQjojCOUiFG1c/sQdUCBUauE7OGDTd/LHfO2p0SwIKUZBulu7g2D7XoKQIIQSwj1p0vDrQvDpiTM5YWT1V+NDLp9VynXPg8PfkTrcWH0+PzfzMIladWfqMimQ1FcaXzzPrWS87AWsdLCSNg7dWBiNTZrherVyf/Hb51dAFWiKrjOBLFAYPjY0ne3J321fxYDVYOIOLRqN8P7PpeZrYAUIS2WMAiiVMYFPE1hVOhoyjSWwKVizYxIZwVGgBrRKZey2EXcShmjjrAlDTJRiYrMDtD0H6K7ADp/059SgTfRxE2tMrInD9H21Hl9PwnS2myPRo72ezO9qtsBHethxk2h0rCtrzXR6sZbcrrf0zEItmdxopvd0opdNolXeFeNbf/ZWByqhzVic8mI5ti8TwxKwBiRAZrll3ngRswVPTAkYA962X367iFiL7aN1zSawCTSApFTGBj4REEWGZqVlH/Q5ZDtOBOA3IsECgTKeLKoAAAAASUVORK5CYII=')

define('img/star-big-unchecked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAB50lEQVQ4y52TMWhTURSG//vOPff1vbQJKi/JEFPqIiikYAcR6hAHBadM4qLQDs4VHNwcBBcXOwg6O7WKkkVah8apFVscah1E0MWhdhAt6dMk797joJQG8l7Us91zf77h/+4FhszC0urlYRmVdbm4vFZRSr0TkaOXLpzZTct5WRDDNBMGJs9MM1m5VMjjF684DPxrhXyIYMTM/heENdVzoV/JjwbIhX7t2crr6X+CLC6vsW/0zVzoIwwMcoEPn/VcarELS6t3AJz/c64BYNaEw4dGUY4KCEYM4h9dbO98w9fve0gSCwA9AJu/zdin2hh9i4kqylNXlFJQCvCNRmEsgGENpRQMa+THQjgRdHsJRMAiMuWczBd2HtzbV/zm/ccbWtNdTykQeTCsobUHpRREBL3EottN4JzAifSSxF4/dfzY/a2HoL538mn7y0Ui7wmAIEPGrrWuMVEutQYWO1EuPbfOzWXptNbNHgQMtBPHnZpzLg2AdtyZGqq4HXfqiR0MSaxDe+/n2UxI8+VGSUROHFg9AjAJoLm/ETndbK0HqRBNXt03DCLvg4icq0bR1WoUbVajqCEiDU3eZ2M0E3n1VAgzTbOm2+JkcrxY7CtvvFhsishJw3qeNaV+AbQ2to7gL2Zl/W1f7hdPXqRVE0AkoQAAAABJRU5ErkJggg==')

define('img/star-small-checked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAABCklEQVQY04WQMUvDUBSFv5c2DtUO8kZxFEGyqaCL4mpnVxeHCCL1fxQ3B52yiT9Awd3FgF1EUKl0qjiJGltL8uK9Lq1gLPTAgXu5HxfOgYI0tr7G9oIR8v7BSg3Y1NhujIVRrQOI6G7xZDS2i4N5DrDA0WDPgQPgFWgBGLm258ZQY4xU9Ky0tdy/r075tuyZBUQZ5a+ui1oPHw0DcHfC/OxMZX+yUt4rfvzsusbzS/84CGl7AEHIo5fL03c/p+iS6G0Q0v7ThnGyMgDyrOeaQ9hzsjpkyr8BsnwpV1rvmR4mTpvTE2at6pu6Maz/6TmJsGkql52e7CROT4OQm7dMo05PttNUrpIIH+AHo7WPvp8+nRQAAAAASUVORK5CYII=')

define('img/star-small-unchecked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAABFUlEQVQY04WQIUsEURSFv/vePEat+xvswiyowbBJmKDVtCKYNC2aBNMKGwTTRsGRMVgsgsUsswYtBou/YYvFYWbfu4bdLbOCJx0uH4dzDzTUzwrXz4on/pBpHkRIrSW9uC06/8IukqMlZ4isHCwE9bMimflVY2itxHYYO6GsQv1ThV4IjIEvgEiEc4RdmaYSOyGODKq4iddhjaIASi4AV/evl0bkNIqE5WkFaq+UVWDiFa96drK3MZB5n+vHt2MjDK0RREAVfFCC0j3caefNB7/n4GwVrBFUdbywRlmFjg8KUAPPME0ua+0swF51HXhXaHfTZBvYUvj0oQEP7kYtK3ITlM39NPkA6KbJiyprVngY5CMH8Avqkmope7TXOQAAAABJRU5ErkJggg==')

define('start', [])
define(['app'], function(App) {

    new App('tabun-fixes')
        .add('cfg-panel',               { defaultEnabled:true })
        .add('add-onclick-to-spoilers', { defaultEnabled:true })
        .add('fast-scroll-to-comment',  { defaultEnabled:true })
        .add('sync-config-among-tabs',  { defaultEnabled:true })
        .add('alter-same-page-links',   { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('alter-links-to-mirrors',  { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('reveal-lite-spoilers',    { defaultEnabled:false, cfgPanel:{column:1} })
        .add('open-nested-spoilers',    { defaultEnabled:false, cfgPanel:{column:1} })
        .add('reformat-dates',          { defaultEnabled:false, cfgPanel:{column:1} })
        .add('spacebar-move-to-next',   { defaultEnabled:false, cfgPanel:{column:2} })
        .add('fav-as-icon',             { defaultEnabled:false, cfgPanel:{column:2} })
        .add('favicon-unread-count'  ,  { defaultEnabled:true,  cfgPanel:{column:2} })
        .add('narrow-tree',             { defaultEnabled:false, cfgPanel:{column:2} })
        .add('img-alt-to-title',        { defaultEnabled:false, cfgPanel:{column:2} })
        .add('fix-aside-toolbar',       { defaultEnabled:true,  cfgPanel:{column:2} })
        .add('autospoiler-images',      { defaultEnabled:false, cfgPanel:{column:2} })
        .add('whats-new',               { defaultEnabled:true,  cfgPanel:{column:2} },
            "• Добавлено автоскрытие больших картинок\n" +
            "• Приоткрывание лайтспойлеров подогнано под обновление табуна"
        )
        .start()

})

})
