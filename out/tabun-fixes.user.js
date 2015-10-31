// ==UserScript==
// @name    Tabun fixes
// @version    30
// @description    Автообновление комментов, возможность выбрать формат дат, а также добавление таймлайна комментов и несколько мелких улучшений для табуна. И всё это - с графическим конфигом!
//
// @updateURL https://github.com/lxyd/tabun-fixes/raw/master/out/tabun-fixes.meta.js
// @downloadURL https://github.com/lxyd/tabun-fixes/raw/master/out/tabun-fixes.user.js
//
// @grant none
//
// @include  http://tabun.everypony.ru/*
// @match    http://tabun.everypony.ru/*
// @include  http://tabun.everypony.info/*
// @match    http://tabun.everypony.info/*
// @include  http://табун.всепони.рф/*
// @match    http://табун.всепони.рф/*
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

        this._loadData()

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
        try {
            var data = JSON.parse(localStorage.getItem(this._id + '-data') || "{}") || {}
            this._configs = data.configs || {}
            this._enabled = data.enabled || {}
        } catch (err) {
            this.log(err)
            this._configs = {}
            this._enabled = {}
        }
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
define(['jquery', 'module', 'ls-hook'], function($, Module, lsHook) {

    function AddOnClickToSpoilersModule() {
    }

    AddOnClickToSpoilersModule.prototype = new Module()

    AddOnClickToSpoilersModule.prototype.attach = function addOnClickToSpoilers_attach(config) {
        this._hook = this.onDataLoaded.bind(this)
        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
        $('.spoiler-title').attr('onclick', '')
    }

    AddOnClickToSpoilersModule.prototype.detach = function addOnClickToSpoilers_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)
        this._hook = null
        $('.spoiler-title').attr('onclick', null)
    }

    AddOnClickToSpoilersModule.prototype.onDataLoaded = function addOnClickToSpoilers_onDataLoaded() {
        $('.spoiler-title').attr('onclick', '')
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

    AlterLinksToMirrorsModule.prototype.detach = function alterLinksToMirrors_detach(сonfig) {
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
        document.addEventListener('click', this.clickHandler, true)
        document.addEventListener('mouseover', this.mouseOverHandler)
        document.addEventListener('mouseout', this.mouseOutHandler)

        this.style = $('<style>').text(
                'A.' + this.cssClass + ', ' +
                'A.' + this.cssClass + ':hover, ' +
                'A.' + this.cssClass + ':visited {color: #0A0 !important}')
            .appendTo(document.head)
    }

    AlterSamePageLinksModule.prototype.detach = function alterSamePageLinks_detach(сonfig) {
        document.removeEventListener('click', this.clickHandler, true)
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
        var a = closestAnchor(ev.target)
          , id = getLinkedCommentId(a)

        if (!isSamePageComment(id)) {
            return
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
            '.topic-info .favourite   { ' + genFavStyle(11, 11) + '; padding:0 !important; margin:6px 11px 6px 0px }' +
            '.table-talk .favourite   { ' + genFavStyle(17, 17) + ' }'
        ).appendTo(document.head)
    }

    FavAsIconModule.prototype.detach = function favAsIcon_detach(сonfig) {
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

define('ls-hook', [])
define(['hook'], function(hook) {

    /* {
     *     name: [{
     *         key: key,
     *         val: val,
     *     }]
     * }
     */
    var hookMaps = {}

    var afterXhrHooks = {
        'ls_comments_load_after':     'ls.comments.load',
        'ls_userfeed_get_more_after': 'ls.userfeed.getMore',
    }

    function addLsHook(name, fn) {
        if (name in afterXhrHooks) {
            addAfterXhrHook(name, fn)
        } else {
            throw new Error("Unsupported livestreet hook '" + name + "'")
        }
    }

    function removeLsHook(name, fn) {
        if (name in afterXhrHooks) {
            removeAfterXhrHook(name, fn)
        }
    }

    function addAfterXhrHook(name, fn) {
        var wrap = createWrapper(fn)
        addWrapper(name, fn, wrap)

        hook.add(afterXhrHooks[name], wrap, true)
    }

    function removeAfterXhrHook(name, fn) {
        var wrap = getWrapper(name, fn)
        removeWrapper(name, fn)

        hook.remove(afterXhrHooks[name], wrap, true)
    }

    function createWrapper(fn) {
        return function hookXhr(xhr) {
            console.log('call wrapped function')
            var callback = xhr.success

            xhr.success = function callbackProxy() {
                xhr.success = callback
                callback.apply(this, arguments)
                fn.apply(this, arguments)
            }
        }
    }

    function addWrapper(name, fn, wrap) {
        hookMaps[name] = hookMaps[name] || []
        hookMaps[name].push({
            key: fn,
            val: wrap,
        })
    }

    function getWrapper(name, fn) {
        var map = hookMaps[name]
        if (!map) {
            return null
        }
        for (var i = 0; i < map.length; i++) {
            if (map[i].key === fn) {
                return map[i].val
            }
        }
        return null
    }

    function removeWrapper(name, fn) {
        var map = hookMaps[name]
        if (!map) {
            return
        }
        var idx = -1
        for (var i = 0; i < map.length; i++) {
            if (map[i].key === fn) {
                idx = i
                break
            }
        }
        if (idx >= 0) {
            map.splice(idx, 1)
        }
        if (map.length == 0) {
            delete hookMaps[name]
        }
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
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

    RevealLiteSpoilersModule.prototype.detach = function revealLiteSpoilers_detach(сonfig) {
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

        // hover state (fully visible)
        var hoverTextColor         = nightTabun ? '#DFDFDF' : '#666'
        var hoverATextColor        = nightTabun ? '#7C89CA' : '#0099FF'
        var hoverAVisitedTextColor = nightTabun ? '#7C89CA' : '#0099FF'

        var containers = ['.comment', '.comment-preview', '.topic', '.profile-info-about']
            // селекторы для спойлеров в обычном состоянии
          , selectorSpoiler = containers.map(function(s) { return s + ' .spoiler-gray' }).join(', ')
          , selectorA = containers.map(function(s) { return s + ' .spoiler-gray A' }).join(', ')
          , selectorAVisited = containers.map(function(s) { return s + ' .spoiler-gray A:visited' }).join(', ')
            // селекторы для наведённого коммента/поста
          , selectorPostHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray' }).join(', ')
          , selectorPostHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray A' }).join(', ')
          , selectorPostHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray A:visited' }).join(', ')
            // селекторы для текущего коммента
          , selectorPostActiveSpoiler = '.comment.comment-current .spoiler-gray'
          , selectorPostActiveA = '.comment.comment-current .spoiler-gray A'
          , selectorPostActiveAVisited = '.comment.comment-current .spoiler-gray A:visited'
            // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
          , selectorHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray:hover' }).join(', ')
          , selectorHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A' }).join(', ')
          , selectorHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A:visited' }).join(', ')

        var css = ''
        if (config.alwaysReveal) {
            css += 
                selectorSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                selectorA + ' { color: ' + transATextColor + ' !important; } ' +
                selectorAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
        } else {
            if (config.revealOnHover) {
                css += 
                    selectorPostHoverSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorPostHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorPostHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
            }

            if (config.revealInCurrentComment) {
                css +=
                    selectorPostActiveSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                    selectorHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                    selectorHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } '
            }
        }

        if (css) {
            css +=
                // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
                selectorHoverSpoiler + ' { background-color: transparent !important; color: ' + hoverTextColor + ' !important; } ' +
                selectorHoverA + ' { background-color: transparent !important; color: ' + hoverATextColor + ' !important; } ' +
                selectorHoverAVisited + ' { background-color: transparent !important; color: ' + hoverAVisitedTextColor + ' !important; } '
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
        this.chkOnHover.prop('checked', config.revealOnHover ? 'checked' : null)
        this.chkInCurrent.prop('checked', config.revealInCurrentComment ? 'checked' : null)
        this.chkAlways.prop('checked', config.alwaysReveal ? 'checked' : null)
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getEnabled = function revealLiteSpoilersApplet_getEnabled() {
        return this.chkOnHover.is(':checked') || this.chkAlways.is(':checked') || this.chkInCurrent.is(':checked')
    }

    RevealLiteSpoilersCfgPanelApplet.prototype.getConfig = function revealLiteSpoilersApplet_getConfig() {
        var cfg = CfgPanelApplet.prototype.getConfig.apply(this, arguments) // call to super()

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

    SpacebarMoveToNextModule.prototype.detach = function spacebarMoveToNext_detach(сonfig) {
        document.removeEventListener('keypress', this.handler)
        this.handler = null
    }

    SpacebarMoveToNextModule.prototype.onSpacebarPressed = function spacebarMoveToNext_onSpacebarPressed(ev) {
        var el = ev.target
        if (el.tagName == 'INPUT' || el.tagName == 'SELECT' || el.tagName == 'TEXTAREA' || el.isContentEditable) {
            // ignore input fields (as in https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js)
            return
        }
        if (ev.which == KeyEvent.DOM_VK_SPACE) {
            if (this.goToNext()) {
                ev.preventDefault()
            }
        }
    }

    SpacebarMoveToNextModule.prototype.goToNext = function spacebarMoveToNext_goToNext() {
        if ($.fn.stop) {
            $(window).stop(true)
        }
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

define('whats-new', [])
define(['jquery', 'module', 'app', 'cfg-panel-applet'], function($, Module, App, CfgPanelApplet) {

    function WhatsNewModule() { }

    WhatsNewModule.prototype = new Module()

    WhatsNewModule.prototype.init = function whatsNew_init(config, text) {
        config = config || {}

        if (config.text != text) {
            this._alertText = "Юзерскрипт tabun-fixes обновился!\nЧто нового:\n" + $("<p>").html(text.replace(/\<br\/?\>/g, "\n")).text()
        }

        config.text = text

        return config
    }

    WhatsNewModule.prototype.attach = function whatsNew_apply(config) {
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

define('img/gear', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACHUlEQVQ4y62Sv0vVYRTGn3Pe9/3ebsEdcnBpqCiKK9wkIzKStMFF6AcW1VBkg2sN+g/k0uDQ1FZSBDokmYjrNYgMUfMamWlDoEuDi0P33u/7nvc0xA1Nb0ud6Zzn/ODw4QH+MehvzaGpUicRulV1oKe9eX23Gf5TeFJcyNbyxJr2jLO91phCTXtaXGio+8GzN6UHRNQdVa8R0UY2cc+d4c6qD4MVHwYIuEFMj2LUu3fOnxgBALv1QOLshjWclxhnCYTEmqw1DIX2gdDLRDkmKleDLNVl8HpuZYyJLimwScBDAOsKFADcI4ILEvuvnDo2WJeBqrYwk1fVtjTIcMWHbBAZIOA2gRCjduxgMDRVKhimR86axr0ZlwcwmXq5HFXXiNCoiuL11vyF8fnVNYnxQCUNZR9kSaJ2WQBwlg9lnO1IrIFhRhpkUzRaZ34xSIM0AECMWk6sARNlU8O5Suq3MxifXz3IRKU0CNIQDifWFpzh7mqQxyIxl3F22ll+39V8pHVXBhdPHv0mMY4YphwTTfsg+ys+DInEc8w0QQT4IJN1ffDi7ceWfXuSaWeMkxjhg0AVICY4wzDMqPpQ/lFNz9xqKyzu+MAw9zIRANxnorbE2WImsUisGWWiJgD9hska5s5dvT/87pMbnVnO1+qx2ZW+iQ9f9dXsl56a9nJmuXHrzjYn3jzb5AH8dpkPsghgLg3yuaZdPX38O/5n/ASdNN+15exi2wAAAABJRU5ErkJggg==')

define('img/star-big-checked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAACNklEQVQ4y52TPWtUQRSGn5k7dy9rNhvBTYpgDLqKElYiqE0aSSGx8ReIoE1WQ0BBQe0sBbWyun60YmNpYxcwhUJA4YpFEElwA5JNdpNsdu/XzFjsLiYkROPAA2fOHN7DzHkH9liBjzRzp64FPnKvOrmHgCiODBeFdJ4dLh4Z+C8RQCovcwNkLtfXezPwcfYtcrDQ1+M47lWQSJW5Arj7Egl8xMDgoUtCOv0IiZCqeOLM6YnAR/yzSP9gocdxM3fax22Ud+AWoHarF+bjwGOEcxEUQjojCOUiFG1c/sQdUCBUauE7OGDTd/LHfO2p0SwIKUZBulu7g2D7XoKQIIQSwj1p0vDrQvDpiTM5YWT1V+NDLp9VynXPg8PfkTrcWH0+PzfzMIladWfqMimQ1FcaXzzPrWS87AWsdLCSNg7dWBiNTZrherVyf/Hb51dAFWiKrjOBLFAYPjY0ne3J321fxYDVYOIOLRqN8P7PpeZrYAUIS2WMAiiVMYFPE1hVOhoyjSWwKVizYxIZwVGgBrRKZey2EXcShmjjrAlDTJRiYrMDtD0H6K7ADp/059SgTfRxE2tMrInD9H21Hl9PwnS2myPRo72ezO9qtsBHethxk2h0rCtrzXR6sZbcrrf0zEItmdxopvd0opdNolXeFeNbf/ZWByqhzVic8mI5ti8TwxKwBiRAZrll3ngRswVPTAkYA962X367iFiL7aN1zSawCTSApFTGBj4REEWGZqVlH/Q5ZDtOBOA3IsECgTKeLKoAAAAASUVORK5CYII=')

define('img/star-big-unchecked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAYAAAA7bUf6AAAB50lEQVQ4y52TMWhTURSG//vOPff1vbQJKi/JEFPqIiikYAcR6hAHBadM4qLQDs4VHNwcBBcXOwg6O7WKkkVah8apFVscah1E0MWhdhAt6dMk797joJQG8l7Us91zf77h/+4FhszC0urlYRmVdbm4vFZRSr0TkaOXLpzZTct5WRDDNBMGJs9MM1m5VMjjF684DPxrhXyIYMTM/heENdVzoV/JjwbIhX7t2crr6X+CLC6vsW/0zVzoIwwMcoEPn/VcarELS6t3AJz/c64BYNaEw4dGUY4KCEYM4h9dbO98w9fve0gSCwA9AJu/zdin2hh9i4kqylNXlFJQCvCNRmEsgGENpRQMa+THQjgRdHsJRMAiMuWczBd2HtzbV/zm/ccbWtNdTykQeTCsobUHpRREBL3EottN4JzAifSSxF4/dfzY/a2HoL538mn7y0Ui7wmAIEPGrrWuMVEutQYWO1EuPbfOzWXptNbNHgQMtBPHnZpzLg2AdtyZGqq4HXfqiR0MSaxDe+/n2UxI8+VGSUROHFg9AjAJoLm/ETndbK0HqRBNXt03DCLvg4icq0bR1WoUbVajqCEiDU3eZ2M0E3n1VAgzTbOm2+JkcrxY7CtvvFhsishJw3qeNaV+AbQ2to7gL2Zl/W1f7hdPXqRVE0AkoQAAAABJRU5ErkJggg==')

define('img/star-small-checked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAABCklEQVQY04WQMUvDUBSFv5c2DtUO8kZxFEGyqaCL4mpnVxeHCCL1fxQ3B52yiT9Awd3FgF1EUKl0qjiJGltL8uK9Lq1gLPTAgXu5HxfOgYI0tr7G9oIR8v7BSg3Y1NhujIVRrQOI6G7xZDS2i4N5DrDA0WDPgQPgFWgBGLm258ZQY4xU9Ky0tdy/r075tuyZBUQZ5a+ui1oPHw0DcHfC/OxMZX+yUt4rfvzsusbzS/84CGl7AEHIo5fL03c/p+iS6G0Q0v7ThnGyMgDyrOeaQ9hzsjpkyr8BsnwpV1rvmR4mTpvTE2at6pu6Maz/6TmJsGkql52e7CROT4OQm7dMo05PttNUrpIIH+AHo7WPvp8+nRQAAAAASUVORK5CYII=')

define('img/star-small-unchecked', [], 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAABFUlEQVQY04WQIUsEURSFv/vePEat+xvswiyowbBJmKDVtCKYNC2aBNMKGwTTRsGRMVgsgsUsswYtBou/YYvFYWbfu4bdLbOCJx0uH4dzDzTUzwrXz4on/pBpHkRIrSW9uC06/8IukqMlZ4isHCwE9bMimflVY2itxHYYO6GsQv1ThV4IjIEvgEiEc4RdmaYSOyGODKq4iddhjaIASi4AV/evl0bkNIqE5WkFaq+UVWDiFa96drK3MZB5n+vHt2MjDK0RREAVfFCC0j3caefNB7/n4GwVrBFUdbywRlmFjg8KUAPPME0ua+0swF51HXhXaHfTZBvYUvj0oQEP7kYtK3ITlM39NPkA6KbJiyprVngY5CMH8Avqkmope7TXOQAAAABJRU5ErkJggg==')

define('start', [])
define(['app'], function(App) {

    new App('tabun-fixes')
        .add('cfg-panel',               { defaultEnabled:true })
        .add('add-onclick-to-spoilers', { defaultEnabled:true, cfgPanel:{column:1} })
        .add('alter-same-page-links',   { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('alter-links-to-mirrors',  { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('reveal-lite-spoilers',    { defaultEnabled:false, cfgPanel:{column:1} })
        .add('spacebar-move-to-next',   { defaultEnabled:false, cfgPanel:{column:2} })
        .add('fav-as-icon',             { defaultEnabled:false, cfgPanel:{column:2} })
        .add('whats-new',               { defaultEnabled:true,  cfgPanel:{column:2} },
            "• Новый модульный движок<br/>• Совместимость с новым Табуном"
        )
        //.add('fix-scroll',             { defaultEnabled:true, cfgPanel:{skip:true} })
        .start()

})

})
